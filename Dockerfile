# ── Stage 1: Build frontend ──
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ──
FROM python:3.11-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Data directory (mount Railway volume here)
RUN mkdir -p /app/data

ENV TRADEHUB_PRODUCTION=true
ENV TRADEHUB_PORT=8890

EXPOSE 8890

CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8890}
