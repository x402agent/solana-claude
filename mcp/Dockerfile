# solana-clawd MCP Server — Fly.io Dockerfile
# Deploy: fly launch --config MCP/fly.toml && fly deploy

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install deps
COPY MCP/package.json MCP/package-lock.json MCP/tsconfig.json ./
RUN npm ci

# Copy source and build
COPY MCP/src ./src
RUN npm run build

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy only production deps
COPY MCP/package.json MCP/package-lock.json ./
RUN npm ci --omit=dev

# Copy built dist
COPY --from=builder /app/dist ./dist

# Copy SOUL.md and skills directory (for MCP resources)
COPY SOUL.md ./SOUL.md
COPY skills ./skills
COPY src ./src
COPY README.md ./README.md

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Health check for Fly.io
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http.js"]
