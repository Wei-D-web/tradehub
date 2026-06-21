"""
TradeHub WebSocket — 实时推送通知到前端浏览器

ws://localhost:8890/ws/notifications  — 每个连接收通知推送

用法 (server-side):
    from websocket import broadcast
    await broadcast({"type": "notification", "title": "...", "body": "..."})

用法 (frontend):
    const ws = new WebSocket(`ws://localhost:8890/ws/notifications`);
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        showToast(data.title, data.body);
    };
"""

import json
import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("tradehub.ws")

_connections: list[WebSocket] = []


async def handle_notifications(ws: WebSocket):
    """WebSocket endpoint — accepts connection, sends heartbeat, listens for close."""
    await ws.accept()
    _connections.append(ws)
    logger.debug("WS client connected (%d total)", len(_connections))
    try:
        # Keep connection alive — client sends pong, we wait for disconnect
        while True:
            await ws.receive_text()  # discard incoming (keep-alive or pong)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug("WS error: %s", e)
    finally:
        _connections.remove(ws)
        logger.debug("WS client disconnected (%d remaining)", len(_connections))


async def broadcast(message: dict[str, Any]) -> None:
    """Push a JSON message to all connected WebSocket clients."""
    if not _connections:
        return
    payload = json.dumps(message, ensure_ascii=False)
    dead: list[WebSocket] = []
    for ws in _connections:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _connections.remove(ws)
