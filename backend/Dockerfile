# syntax=docker/dockerfile:1

# ─── Base ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package.json package-lock.json* ./

# Local file dependency used by package.json
COPY src/dataconnect-admin-generated ./src/dataconnect-admin-generated

# ─── Development ────────────────────────────────────────────────────────────
FROM base AS development

ENV NODE_ENV=development

RUN npm ci

COPY . .

EXPOSE 5000

CMD ["dumb-init", "npm", "run", "dev"]

# ─── Production dependencies ────────────────────────────────────────────────
FROM base AS prod-deps

ENV NODE_ENV=production

RUN npm ci --omit=dev && npm cache clean --force

# ─── Production ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache dumb-init \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001 -G nodejs

COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs src ./src

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["dumb-init", "npm", "start"]
