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
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Scope, Receive, Send
import uvicorn

from database import engine, Base
from routers import (
    customers, suppliers, products,
    forwarders, quotations, orders,
    contracts, logistics, finance,
    tickets, rma, technicians, knowledge,
    dashboard,
)

PRODUCTION = "--production" in sys.argv or os.getenv("TRADEHUB_PRODUCTION", "").lower() in ("1", "true", "yes")
FRONTEND_DIST = (Path(__file__).parent.parent / "frontend" / "dist").resolve()

# ── 密码保护 ──
SECRET_KEY = os.getenv("TRADEHUB_SECRET_KEY", "tradehub-dev-secret-change-in-production")
TRADEHUB_PASSWORD = os.getenv("TRADEHUB_PASSWORD", "tradehub123")
AUTH_COOKIE = "tradehub_token"
TOKEN_MAX_AGE = 14 * 24 * 3600  # 14 days

# Public endpoints that don't need auth
PUBLIC_PATHS = {"/api/health", "/api/login", "/api/logout"}


def _make_token(password: str) -> str:
    """Create a time-limited HMAC token from password."""
    ts = int(time.time())
    msg = f"{password}:{ts}"
    sig = hmac.new(SECRET_KEY.encode(), msg.encode(), hashlib.sha256).hexdigest()[:24]
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
            f"{TRADEHUB_PASSWORD}:{ts}".encode(),
            hashlib.sha256,
        ).hexdigest()[:24]
        return hmac.compare_digest(sig, expected)
    except (ValueError, AttributeError):
        return False


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="进贸通 TradeHub",
    description="进口贸易全流程管理系统 — 客户→询价→合同→采购→物流→售后→利润",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware order: Auth (outermost) → CORS → Router
app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if PRODUCTION else ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
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


# ── Auth endpoints ──
from pydantic import BaseModel

class LoginBody(BaseModel):
    password: str


@app.post("/api/login")
async def login(body: LoginBody):
    if body.password != TRADEHUB_PASSWORD:
        return JSONResponse(status_code=401, content={"detail": "密码错误"})
    token = _make_token(body.password)
    response = JSONResponse(content={"ok": True})
    response.set_cookie(
        AUTH_COOKIE, token,
        max_age=TOKEN_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return response


@app.post("/api/logout")
async def logout():
    response = JSONResponse(content={"ok": True})
    response.delete_cookie(AUTH_COOKIE, path="/")
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


# ── 生产模式：直接提供前端静态文件 ──
if PRODUCTION:
    if FRONTEND_DIST.exists():
        assets_dir = FRONTEND_DIST / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        from fastapi.responses import FileResponse

        @app.get("/{full_path:path}")
        async def serve_frontend(full_path: str):
            file_path = FRONTEND_DIST / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(FRONTEND_DIST / "index.html"))

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
