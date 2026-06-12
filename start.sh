#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║       进贸通 TradeHub — 一键启动脚本               ║
# ║       进口贸易全流程管理系统 · 小公司自用版         ║
# ╚══════════════════════════════════════════════════════╝
#
# 用法:
#   bash start.sh              → 开发模式 (后端 :8890 + 前端 :5174)
#   bash start.sh --production  → 生产模式 (单端口 :8890)
#
# 生产模式使用前需要先构建前端:
#   cd frontend && npm install && npm run build

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

PRODUCTION=false
if [[ "$1" == "--production" ]]; then
    PRODUCTION=true
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║      📦 进贸通 TradeHub 启动中...               ║"
if $PRODUCTION; then
    echo "║      模式: 生产 (单端口 :8890)                  ║"
    echo "║      打开: http://localhost:8890                ║"
else
    echo "║      模式: 开发                                  ║"
    echo "║      后端: http://localhost:8890/docs            ║"
    echo "║      前端: http://localhost:5174                 ║"
fi
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Backend ──
echo "📦 安装后端依赖..."
cd "$SCRIPT_DIR/backend"
pip3 install -q -r requirements.txt 2>/dev/null || pip3 install -q fastapi uvicorn sqlalchemy 2>/dev/null

if $PRODUCTION; then
    # Check frontend built
    if [ ! -d "$SCRIPT_DIR/frontend/dist" ]; then
        echo "📦 构建前端..."
        cd "$SCRIPT_DIR/frontend"
        if [ ! -d "node_modules" ]; then
            npm install --silent
        fi
        npm run build
    fi

    echo "🚀 启动生产服务器 (port 8890)..."
    cd "$SCRIPT_DIR/backend"
    python3 main.py --production
else
    echo "🚀 启动后端 (port 8890)..."
    cd "$SCRIPT_DIR/backend"
    python3 main.py &
    BACKEND_PID=$!

    # ── Frontend ──
    echo "📦 检查前端依赖..."
    cd "$SCRIPT_DIR/frontend"
    if [ ! -d "node_modules" ]; then
        echo "   正在安装前端依赖 (npm install)..."
        npm install --silent
    fi

    echo "🚀 启动前端 (port 5174)..."
    npx vite --port 5174 --host &
    FRONTEND_PID=$!

    echo ""
    echo "✅ 服务已启动!"
    echo "   后端 PID: $BACKEND_PID"
    echo "   前端 PID: $FRONTEND_PID"
    echo ""
    echo "   打开浏览器: http://localhost:5174"
    echo "   API 文档:   http://localhost:8890/docs"

    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
fi
