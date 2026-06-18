"""
TradeHub security headers middleware — pure ASGI, zero dependencies.
Adds HSTS, content-type protection, frame denial, referrer policy,
and permissions policy to every response.
"""

from starlette.types import ASGIApp, Scope, Receive, Send, Message


# ── Security headers to add to every response ──
_SECURITY_HEADERS = [
    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"x-xss-protection", b"1; mode=block"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
]


class SecurityHeadersMiddleware:
    """
    Pure ASGI middleware — injects security headers into every HTTP response.
    Registered after AuthMiddleware so auth errors also get security headers.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                existing_names = {h[0].lower() for h in headers}
                for name, value in _SECURITY_HEADERS:
                    if name not in existing_names:
                        headers.append((name, value))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
