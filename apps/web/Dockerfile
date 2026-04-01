# Production image for Next.js standalone output (not Vercel).
# Build from repo root: docker build -f apps/web/Dockerfile .
#
# Requires `output: 'standalone'` in apps/web/next.config.js (see that file).

FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next app (workspace package @opden-data-layer/web — see apps/web/package.json).
WORKDIR /app
RUN pnpm exec next build ./apps/web

FROM node:24.12.0-alpine3.23 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone bundle: server + traced node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Static assets (must sit next to standalone server per Next.js Docker guide)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

# Nx monorepo layout: entry is under apps/web/ (see Next standalone output)
CMD ["node", "apps/web/server.js"]
