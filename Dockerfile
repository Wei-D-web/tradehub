# ── Stage 1: Build frontend ──
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ──
FROM python:3.11-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code (__pycache__ excluded via .dockerignore)
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Data directory (Railway volume mount point)
RUN mkdir -p /app/data

# Shrink image: remove pip cache, pycache
RUN pip cache purge 2>/dev/null || true && \
    find /usr/local -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true && \
    find /usr/local -name '*.pyc' -delete 2>/dev/null || true

ENV TRADEHUB_PRODUCTION=true
ENV TRADEHUB_PORT=8890
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8890

CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8890}
