FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install

COPY nx.json tsconfig.base.json ./
COPY apps/ipfs-gateway ./apps/ipfs-gateway
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run ipfs-gateway:build

RUN pnpm --filter @opden-data-layer/ipfs-gateway --legacy --prod deploy /deploy \
    && cp dist/apps/ipfs-gateway/main.js /deploy/main.js

FROM node:24.12.0-alpine3.23 AS production

WORKDIR /app

COPY --from=builder /deploy ./

CMD ["node", "main.js"]
