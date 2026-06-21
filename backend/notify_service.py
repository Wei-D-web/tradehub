"""
TradeHub 通知服务 — iPhone Bark 推送 + 前端 WebSocket 推送

用法:
    from notify_service import notify_sync
    notify_sync("订单完成 ✅", "PO-2024001 已完成，利润 ¥12,500")
"""

import os
import threading
import logging

# Skip proxy for Bark push (prevents local proxy interference)
os.environ.pop("HTTPS_PROXY", None)
os.environ.pop("HTTP_PROXY", None)
os.environ.pop("https_proxy", None)
os.environ.pop("http_proxy", None)

import httpx

logger = logging.getLogger("tradehub.notify")

BARK_URL = os.getenv("BARK_URL", "https://api.day.app")
BARK_KEY = os.getenv("BARK_KEY", "")

# Global WebSocket broadcaster (set by main.py after app startup)
_ws_broadcast = None


def set_ws_broadcast(fn):
    """Register the WebSocket broadcast function from websocket.py."""
    global _ws_broadcast
    _ws_broadcast = fn


def notify_sync(title: str, body: str = "", group: str = "TradeHub") -> bool:
    """
    同步发送通知：Bark（iPhone）+ WebSocket（前端浏览器）。
    通过线程异步发送 WebSocket，避免阻塞 HTTP 响应。

    - Bark 依赖 BARK_KEY 环境变量，未配置时静默跳过
    - WebSocket 依赖 _ws_broadcast，未注册时静默跳过
    - 两个通道互不影响，一个挂了另一个继续
    """
    success = False

    # ── Bark push to iPhone (sync) ──
    if BARK_KEY:
        try:
            resp = httpx.post(
                f"{BARK_URL}/{BARK_KEY}/{title}/{body}",
                params={"isArchive": "1", "group": group},
                timeout=5,
            )
            if resp.status_code == 200:
                success = True
                logger.debug("Bark pushed: %s", title)
            else:
                logger.debug("Bark returned %d: %s", resp.status_code, resp.text[:100])
        except Exception as e:
            logger.debug("Bark push failed: %s", e)

    # ── WebSocket push to browser (fire-and-forget via thread) ──
    if _ws_broadcast:
        def _ws_fire():
            import asyncio
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(_ws_broadcast({
                    "type": "notification",
                    "title": title,
                    "body": body,
                    "group": group,
                }))
            except Exception as e:
                logger.debug("WS broadcast failed: %s", e)
        threading.Thread(target=_ws_fire, daemon=True).start()
        success = True

    return success
