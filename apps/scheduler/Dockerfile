FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install

COPY nx.json tsconfig.base.json ./
COPY apps/scheduler ./apps/scheduler
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run scheduler:build

RUN pnpm --filter @opden-data-layer/scheduler --legacy --prod deploy /deploy \
    && cp dist/apps/scheduler/main.js /deploy/main.js

FROM node:24.12.0-alpine3.23 AS production

WORKDIR /app

COPY --from=builder /deploy ./

CMD ["node", "main.js"]
