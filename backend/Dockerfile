# syntax=docker/dockerfile:1
# Multi-stage build — final image is ~150MB (node:20-alpine + dist + prod deps)

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install prod deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Migrations are run via a separate command (not baked into the image startup)
# so the same image works for both migrating and running
COPY src/database/migrations ./dist/database/migrations

# Non-root user
RUN addgroup -S travirt && adduser -S travirt -G travirt
USER travirt

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/health | grep -q '"status"' || exit 1

CMD ["node", "dist/server.js"]
