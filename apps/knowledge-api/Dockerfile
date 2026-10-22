FROM node:24.22.1-alpine3.23 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install -g pnpm@10.30.3

COPY nx.json tsconfig.base.json ./
COPY apps/nest-webpack.shared.js ./apps/nest-webpack.shared.js
COPY apps/knowledge-api ./apps/knowledge-api
COPY libs ./libs
COPY docs ./docs
COPY tasks ./tasks
COPY AGENTS.md ./AGENTS.md
COPY apps/auth-api/AGENTS.md ./apps/auth-api/AGENTS.md
COPY apps/chain-indexer/AGENTS.md ./apps/chain-indexer/AGENTS.md
COPY apps/ipfs-gateway/AGENTS.md ./apps/ipfs-gateway/AGENTS.md
COPY apps/notifications/AGENTS.md ./apps/notifications/AGENTS.md
COPY apps/query-api/AGENTS.md ./apps/query-api/AGENTS.md
COPY apps/scheduler/AGENTS.md ./apps/scheduler/AGENTS.md
COPY apps/web/AGENTS.md ./apps/web/AGENTS.md
COPY scripts/stage-knowledge-workspace.ts ./scripts/stage-knowledge-workspace.ts

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run knowledge-api:build
RUN pnpm exec tsx --tsconfig tsconfig.base.json scripts/stage-knowledge-workspace.ts

RUN apk add --no-cache python3 make g++ \
    && mkdir -p /deploy \
    && cp apps/knowledge-api/package.json /deploy/package.json \
    && cp dist/apps/knowledge-api/main.js /deploy/main.js \
    && cd /deploy && pnpm install --prod --ignore-workspace --no-frozen-lockfile --config.strictDepBuilds=false

FROM node:24.22.1-alpine3.23 AS production

WORKDIR /app

COPY --from=builder /deploy ./
COPY --from=builder /app/dist/knowledge-workspace ./

ENV KNOWLEDGE_WORKSPACE_ROOT=/app
ENV KNOWLEDGE_STARTUP_REINDEX=true

CMD ["node", "main.js"]
