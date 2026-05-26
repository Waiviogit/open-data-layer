FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install

COPY nx.json tsconfig.base.json ./
COPY apps/auth-api ./apps/auth-api
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run auth-api:build

RUN pnpm --filter @opden-data-layer/auth-api --legacy --prod deploy /deploy \
    && cp dist/apps/auth-api/main.js /deploy/main.js

FROM node:24.12.0-alpine3.23 AS production

WORKDIR /app

COPY --from=builder /deploy ./

CMD ["node", "main.js"]
