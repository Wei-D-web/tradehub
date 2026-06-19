"""
TradeHub — 进贸通 后端入口
进口贸易全流程管理系统 · 小公司自用版

开发模式: python backend/main.py              → API :8890 + Vite :5174 分离
生产模式: python backend/main.py --production → API + 前端 都在 :8890

启动前先 build 前端: cd frontend && npm run build
"""

import os
import sys
import time
import hmac
import hashlib
import secrets
from collections import defaultdict
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse, Response
from starlette.types import ASGIApp, Scope, Receive, Send
import uvicorn

from security_headers import SecurityHeadersMiddleware

from database import engine, Base
from routers import (
    customers, suppliers, products,
    forwarders, quotations, orders,
    contracts, logistics, finance,
    tickets, rma, technicians, knowledge,
    dashboard, certifications, exhibitions, leads, pricing,
)

PRODUCTION = "--production" in sys.argv or os.getenv("TRADEHUB_PRODUCTION", "").lower() in ("1", "true", "yes")
# Resolve frontend dist: in Docker it's at /app/frontend/dist, locally at ../frontend/dist
_dist_docker = (Path(__file__).parent / "frontend" / "dist").resolve()
_dist_local = (Path(__file__).parent.parent / "frontend" / "dist").resolve()
FRONTEND_DIST = _dist_docker if _dist_docker.exists() else _dist_local

# ── 密码保护 ──
SECRET_KEY = os.getenv("TRADEHUB_SECRET_KEY", "tradehub-dev-secret-change-in-production")
TRADEHUB_PASSWORD = os.getenv("TRADEHUB_PASSWORD", "*#!ge@GxfR1xB1mu")
TRADEHUB_PASSWORD_HASH = os.getenv("TRADEHUB_PASSWORD_HASH", "")     # PBKDF2 hash (preferred)
TRADEHUB_PASSWORD_SALT = os.getenv("TRADEHUB_PASSWORD_SALT", "")     # hex salt for PBKDF2
AUTH_COOKIE = "tradehub_token"
TOKEN_MAX_AGE = 14 * 24 * 3600  # 14 days

# Rate limiting
RATE_LIMIT_WINDOW = 300         # 5 minutes
RATE_LIMIT_MAX_ATTEMPTS = 5     # max failed logins per window
RATE_LIMIT_LOCKOUT = 900        # 15 minutes lockout after exceeding

# CORS in production
TRADEHUB_ALLOWED_ORIGINS = os.getenv(
    "TRADEHUB_ALLOWED_ORIGINS",
    "https://tradehub-production-aaa6.up.railway.app",
)

# Public endpoints that don't need auth
PUBLIC_PATHS = {"/api/health", "/api/login", "/api/logout"}


# ── Password verification ──
def _verify_password(password: str) -> bool:
    """
    Verify password against stored credential.
    Prefers PBKDF2 hash (TRADEHUB_PASSWORD_HASH + TRADEHUB_PASSWORD_SALT).
    Falls back to plaintext comparison for backward compatibility.
    """
    # Preferred: PBKDF2 hash verification
    if TRADEHUB_PASSWORD_HASH and TRADEHUB_PASSWORD_SALT:
        try:
            salt = bytes.fromhex(TRADEHUB_PASSWORD_SALT)
            expected = bytes.fromhex(TRADEHUB_PASSWORD_HASH)
            derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
            return hmac.compare_digest(derived, expected)
        except (ValueError, AttributeError):
            pass  # malformed hash/salt → fall through to plaintext

    # Fallback: plaintext comparison (existing deployment)
    return hmac.compare_digest(password, TRADEHUB_PASSWORD)


def _hash_password(password: str) -> tuple[str, str]:
    """Generate PBKDF2 hash and salt for a password. Returns (hex_hash, hex_salt)."""
    salt = secrets.token_bytes(32)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
    return derived.hex(), salt.hex()


# ── Token management ──
def _make_token() -> str:
    """Create a time-limited HMAC token (uses SECRET_KEY only, not password)."""
    ts = int(time.time())
    sig = hmac.new(SECRET_KEY.encode(), str(ts).encode(), hashlib.sha256).hexdigest()[:32]
    return f"{ts}:{sig}"


def _verify_token(token: str) -> bool:
    """Verify a token is valid and not expired."""
    try:
        ts_str, sig = token.split(":", 1)
        ts = int(ts_str)
        if time.time() - ts > TOKEN_MAX_AGE:
            return False
        expected = hmac.new(
            SECRET_KEY.encode(),
            ts_str.encode(),
            hashlib.sha256,
        ).hexdigest()[:32]
        return hmac.compare_digest(sig, expected)
    except (ValueError, AttributeError):
        return False


# ── Rate limiter (in-memory, per IP) ──
_failed_attempts: dict[str, list[float]] = defaultdict(list)
_ip_lockout_until: dict[str, float] = {}


def _check_rate_limit(client_ip: str) -> bool:
    """
    Check if client IP is rate-limited.
    Returns True if allowed, False if blocked.
    Also purges stale entries.
    """
    now = time.time()

    # Check lockout
    if client_ip in _ip_lockout_until:
        if now < _ip_lockout_until[client_ip]:
            return False
        else:
            del _ip_lockout_until[client_ip]
            _failed_attempts.pop(client_ip, None)

    # Purge old attempts outside window
    cutoff = now - RATE_LIMIT_WINDOW
    attempts = [t for t in _failed_attempts.get(client_ip, []) if t > cutoff]
    _failed_attempts[client_ip] = attempts

    return len(attempts) < RATE_LIMIT_MAX_ATTEMPTS


def _record_failed_attempt(client_ip: str):
    """Record a failed login attempt. Triggers lockout if threshold exceeded."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW
    attempts = [t for t in _failed_attempts.get(client_ip, []) if t > cutoff]
    attempts.append(now)
    _failed_attempts[client_ip] = attempts

    if len(attempts) >= RATE_LIMIT_MAX_ATTEMPTS:
        _ip_lockout_until[client_ip] = now + RATE_LIMIT_LOCKOUT


def _get_token_from_scope(scope: Scope) -> str | None:
    """Extract tradehub_token cookie value from ASGI scope headers."""
    for header_name, header_value in scope.get("headers", []):
        if header_name == b"cookie":
            for part in header_value.decode("latin-1").split("; "):
                if part.startswith(f"{AUTH_COOKIE}="):
                    return part[len(AUTH_COOKIE) + 1:]
    return None


# ── Auth middleware (pure ASGI, no third-party deps) ──
class AuthMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith("/api/") and path not in PUBLIC_PATHS:
                token = _get_token_from_scope(scope)
                if not token or not _verify_token(token):
                    response = JSONResponse(status_code=401, content={"detail": "请先登录"})
                    await response(scope, receive, send)
                    return
        await self.app(scope, receive, send)


def _migrate_db():
    """
    Auto-discover ALL SQLAlchemy model tables and add missing columns
    to the SQLite database. Non-destructive — never removes columns.
    Uses model definitions as the source of truth, so it never goes stale.
    """
    import sqlite3
    from sqlalchemy import inspect as sa_inspect, types as sa_types

    db_path = Path(__file__).parent / "data" / "tradehub.db"
    if not db_path.exists():
        return

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    try:
        for table in Base.metadata.sorted_tables:
            table_name = table.name
            try:
                cur.execute(f"PRAGMA table_info({table_name})")
                db_columns = {r[1] for r in cur.fetchall()}
            except Exception:
                continue  # table doesn't exist yet → create_all() handles it next restart

            for col in table.columns:
                if col.name in db_columns:
                    continue

                # Map SQLAlchemy type → SQLite type string
                if isinstance(col.type, sa_types.Integer):
                    type_str = "INTEGER"
                elif isinstance(col.type, sa_types.Float):
                    type_str = "FLOAT"
                elif isinstance(col.type, sa_types.Boolean):
                    type_str = "BOOLEAN DEFAULT 0"
                elif isinstance(col.type, sa_types.Date):
                    type_str = "DATE"
                elif isinstance(col.type, sa_types.DateTime):
                    type_str = "TIMESTAMP"
                elif isinstance(col.type, sa_types.Text):
                    type_str = "TEXT DEFAULT ''"
                else:
                    length = getattr(col.type, "length", None)
                    if length:
                        type_str = f"VARCHAR({length}) DEFAULT ''"
                    else:
                        type_str = "VARCHAR(500) DEFAULT ''"

                # Attach foreign key if present
                fks: list = list(col.foreign_keys) if col.foreign_keys else []
                if fks:
                    fk = fks[0]
                    fk_table = fk.column.table.name
                    fk_col = fk.column.name
                    type_str += f" REFERENCES {fk_table}({fk_col})"

                try:
                    cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {type_str}")
                    print(f"  📦 迁移: 添加列 {table_name}.{col.name} {type_str}")
                except sqlite3.OperationalError as e:
                    print(f"  ⚠️  迁移跳过 {table_name}.{col.name}: {e}")

        conn.commit()

        # Backfill NULL updated_at → created_at for rows that predate the column migration
        for table in Base.metadata.sorted_tables:
            table_name = table.name
            col_names = {c.name for c in table.columns}
            if "updated_at" in col_names and "created_at" in col_names:
                try:
                    cur.execute(
                        f"UPDATE {table_name} SET updated_at = created_at WHERE updated_at IS NULL"
                    )
                    if cur.rowcount > 0:
                        print(f"  📦 回填: {table_name}.updated_at ← created_at ({cur.rowcount} 行)")
                except Exception:
                    pass
        conn.commit()
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup + migrate missing columns."""
    Base.metadata.create_all(bind=engine)
    _migrate_db()
    yield


app = FastAPI(
    title="进贸通 TradeHub",
    description="进口贸易全流程管理系统 — 客户→询价→合同→采购→物流→售后→利润",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware order: Auth (outermost) → SecurityHeaders → CORS → Gzip → Router
app.add_middleware(AuthMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)

_cors_origins = (
    TRADEHUB_ALLOWED_ORIGINS.split(",")
    if PRODUCTION
    else ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API 路由 ──
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(forwarders.router)
app.include_router(quotations.router)
app.include_router(orders.router)
app.include_router(contracts.router)
app.include_router(logistics.router)
app.include_router(finance.router)
app.include_router(tickets.router)
app.include_router(rma.router)
app.include_router(technicians.router)
app.include_router(knowledge.router)
app.include_router(dashboard.router)
app.include_router(certifications.router)
app.include_router(exhibitions.router)
app.include_router(leads.router)
app.include_router(pricing.router)   # Pricing Intelligence — auto-learns customer price tolerance


# ── Auth endpoints ──
from pydantic import BaseModel

class LoginBody(BaseModel):
    password: str


@app.post("/api/login")
async def login(body: LoginBody, request: Request):
    client_ip = request.client.host if request.client else "unknown"

    # Rate limit check
    if not _check_rate_limit(client_ip):
        return JSONResponse(
            status_code=429,
            content={"detail": "登录尝试次数过多，请15分钟后再试"},
        )

    if not _verify_password(body.password):
        _record_failed_attempt(client_ip)
        return JSONResponse(status_code=401, content={"detail": "密码错误"})

    token = _make_token()
    response = JSONResponse(content={"ok": True})
    is_secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(
        AUTH_COOKIE, token,
        max_age=TOKEN_MAX_AGE,
        httponly=True,
        samesite="strict",
        secure=is_secure,
        path="/",
    )
    return response


@app.post("/api/logout")
async def logout(request: Request):
    response = JSONResponse(content={"ok": True})
    is_secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.delete_cookie(AUTH_COOKIE, path="/", secure=is_secure)
    return response


@app.get("/api/health")
def health(request: Request):
    token = request.cookies.get(AUTH_COOKIE)
    return {
        "ok": True,
        "version": "1.0.0",
        "name": "TradeHub",
        "mode": "production" if PRODUCTION else "development",
        "authenticated": bool(token and _verify_token(token)),
    }


# ── Admin utilities ──
@app.get("/api/admin/backup")
def trigger_backup():
    """
    Trigger an on-demand SQLite backup.
    Backup files are stored in /app/data/backups/ (kept 7 days).
    """
    import sqlite3

    db_path = Path(__file__).parent / "data" / "tradehub.db"
    backup_dir = Path(__file__).parent / "data" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    ts = time.strftime("%Y%m%d-%H%M%S")
    backup_path = backup_dir / f"tradehub-{ts}.db"

    try:
        src = sqlite3.connect(str(db_path))
        dst = sqlite3.connect(str(backup_path))
        src.backup(dst)
        dst.close()
        src.close()

        # Cleanup: keep only last 7 backups
        existing = sorted(backup_dir.glob("tradehub-*.db"))
        for old in existing[:-7]:
            old.unlink()

        size_kb = backup_path.stat().st_size / 1024
        return {"ok": True, "path": str(backup_path.name), "size_kb": round(size_kb, 1)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "detail": str(e)})


@app.get("/api/admin/hash-password")
def generate_password_hash(password: str = ""):
    """
    Generate a PBKDF2 hash for the given password.
    Use this to set TRADEHUB_PASSWORD_HASH and TRADEHUB_PASSWORD_SALT env vars.
    Only usable in development mode.
    """
    if PRODUCTION:
        raise HTTPException(403, "仅开发模式可用")
    if not password:
        return {"hint": "Usage: GET /api/admin/hash-password?password=YOUR_PASSWORD"}
    h, s = _hash_password(password)
    return {
        "hash": h,
        "salt": s,
        "env_vars": f"TRADEHUB_PASSWORD_HASH={h}\nTRADEHUB_PASSWORD_SALT={s}",
    }


@app.get("/api/admin/db-check")
def db_check():
    """
    Debug endpoint: show database table-column matrix.
    Reports: which columns are in the DB vs which are in the models,
    plus row counts. Useful for diagnosing schema drift.
    """
    import sqlite3
    from sqlalchemy import inspect as sa_inspect

    db_path = Path(__file__).parent / "data" / "tradehub.db"
    if not db_path.exists():
        return {"ok": False, "detail": "数据库文件不存在", "path": str(db_path)}

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    tables_info: dict = {}
    try:
        for table in Base.metadata.sorted_tables:
            tname = table.name
            try:
                cur.execute(f"PRAGMA table_info({tname})")
                db_cols = {r[1]: r[2] for r in cur.fetchall()}
            except Exception:
                db_cols = {}
            cur.execute(f"SELECT COUNT(*) FROM {tname}")
            row_count = cur.fetchone()[0]
            model_cols = {c.name: str(c.type) for c in table.columns}
            missing_in_db = {k: v for k, v in model_cols.items() if k not in db_cols}
            extra_in_db = {k: v for k, v in db_cols.items() if k not in model_cols}
            tables_info[tname] = {
                "rows": row_count,
                "db_columns": len(db_cols),
                "model_columns": len(model_cols),
                "missing_in_db": missing_in_db,
                "extra_in_db": extra_in_db,
            }
    finally:
        conn.close()

    return {
        "ok": True,
        "db_path": str(db_path),
        "tables": tables_info,
    }


# ── 生产模式：直接提供前端静态文件 ──
if PRODUCTION:
    if FRONTEND_DIST.exists():
        assets_dir = FRONTEND_DIST / "assets"
        if assets_dir.exists():
            # Vite-built assets have content-hash filenames → cache forever
            class CachedStaticFiles(StaticFiles):
                async def __call__(self, scope: Scope, receive: Receive, send: Send):
                    async def send_with_cache(message):
                        if message["type"] == "http.response.start":
                            headers = list(message.get("headers", []))
                            headers.append((b"cache-control", b"public, max-age=31536000, immutable"))
                            message["headers"] = headers
                        await send(message)
                    await super().__call__(scope, receive, send_with_cache)

            app.mount("/assets", CachedStaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}")
        async def serve_frontend(full_path: str):
            file_path = FRONTEND_DIST / full_path
            if file_path.exists() and file_path.is_file():
                resp = FileResponse(str(file_path))
                # Non-hashed files (favicon, etc) get short cache; index.html never cached
                if full_path == "index.html" or full_path.endswith(".html"):
                    resp.headers["Cache-Control"] = "no-cache"
                else:
                    resp.headers["Cache-Control"] = "public, max-age=86400"
                return resp
            resp = FileResponse(str(FRONTEND_DIST / "index.html"))
            resp.headers["Cache-Control"] = "no-cache"
            return resp

        print(f"✅ 生产模式：前端已挂载 ({FRONTEND_DIST})")
        print(f"   打开 http://localhost:8890 即可使用")
    else:
        print(f"⚠️  生产模式但前端未构建：{FRONTEND_DIST} 不存在")
        print(f"   请先运行: cd frontend && npm run build")


if __name__ == "__main__":
    mode_info = "生产模式" if PRODUCTION else "开发模式"
    print(f"🚀 进贸通 TradeHub v1.0.0 ({mode_info})")
    if not PRODUCTION:
        print(f"   API:  http://localhost:8890/docs")
        print(f"   前端需单独启动: cd frontend && npx vite --port 5174")
    uvicorn.run("main:app", host="0.0.0.0", port=8890, reload=not PRODUCTION)
