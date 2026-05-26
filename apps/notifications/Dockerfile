FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install

COPY nx.json tsconfig.base.json ./
COPY apps/notifications ./apps/notifications
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run notifications:build

RUN pnpm --filter @opden-data-layer/notifications --legacy --prod deploy /deploy \
    && cp dist/apps/notifications/main.js /deploy/main.js

FROM node:24.12.0-alpine3.23 AS production

WORKDIR /app

COPY --from=builder /deploy ./

CMD ["node", "main.js"]
