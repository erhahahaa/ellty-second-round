FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# ===================================
# Dependencies stage
# ===================================
FROM base AS deps

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace package.json files
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/
COPY packages/infra/package.json ./packages/infra/

# Install dependencies
RUN bun install

# ===================================
# Development stage
# ===================================
FROM base AS dev

# Copy all from deps (node_modules hoisted at root)
COPY --from=deps /app ./

# Copy source code
COPY apps/web ./apps/web
COPY packages ./packages

# Copy root package files (needed for workspace resolution)
COPY package.json bun.lock ./

WORKDIR /app/apps/web

EXPOSE 3001

CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# ===================================
# Production build stage
# ===================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/apps/web
RUN bun run build

# ===================================
# Production stage
# ===================================
FROM base AS prod

COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/package.json ./

EXPOSE 3001

CMD ["bun", "run", "serve"]
