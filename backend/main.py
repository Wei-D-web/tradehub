"""
TradeHub — 进贸通 后端入口
进口贸易全流程管理系统 · 小公司自用版

开发模式: python backend/main.py              → API :8890 + Vite :5174 分离
生产模式: python backend/main.py --production → API + 前端 都在 :8890

启动前先 build 前端: cd frontend && npm run build
"""

import os
import sys
from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
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

# Public endpoints that don't need auth
PUBLIC_PATHS = {"/api/health", "/api/login", "/api/logout"}


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

# Session (for password protection)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY, same_site="lax", https_only=False)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if PRODUCTION else ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth middleware (pure ASGI — must be added before CORS but after Session) ──
from starlette.types import ASGIApp, Scope, Receive, Send
from itsdangerous import URLSafeTimedSerializer


class AuthMiddleware:
    """Pure ASGI middleware that checks session auth for /api/* routes.

    Manually verifies the session cookie to avoid BaseHTTPMiddleware
    incompatibility with SessionMiddleware.
    """
    def __init__(self, app: ASGIApp):
        self.app = app
        self.session_cookie = "session"
        self.signer = URLSafeTimedSerializer(SECRET_KEY, salt="cookie-session")

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith("/api/") and path not in PUBLIC_PATHS:
                # Manually parse session cookie from headers
                authenticated = False
                for header_name, header_value in scope.get("headers", []):
                    if header_name == b"cookie":
                        for part in header_value.decode("latin-1").split("; "):
                            if part.startswith(f"{self.session_cookie}="):
                                raw = part[len(self.session_cookie) + 1:]
                                try:
                                    data = self.signer.loads(raw)
                                    authenticated = data.get("authenticated", False)
                                except Exception:
                                    pass
                                break
                if not authenticated:
                    response = JSONResponse(status_code=401, content={"detail": "请先登录"})
                    await response(scope, receive, send)
                    return
        await self.app(scope, receive, send)


app.add_middleware(AuthMiddleware)

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
async def login(body: LoginBody, request: Request):
    if body.password != TRADEHUB_PASSWORD:
        return JSONResponse(status_code=401, content={"detail": "密码错误"})
    request.session["authenticated"] = True
    return {"ok": True}


@app.post("/api/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@app.get("/api/health")
def health(request: Request):
    return {
        "ok": True,
        "version": "1.0.0",
        "name": "TradeHub",
        "mode": "production" if PRODUCTION else "development",
        "authenticated": request.session.get("authenticated", False),
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
