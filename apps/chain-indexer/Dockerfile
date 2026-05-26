FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install

COPY nx.json tsconfig.base.json ./
COPY apps/nest-webpack.shared.js ./apps/nest-webpack.shared.js
COPY apps/chain-indexer ./apps/chain-indexer
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run chain-indexer:build

RUN apk add --no-cache python3 make g++ \
    && mkdir -p /deploy \
    && cp apps/chain-indexer/package.json /deploy/package.json \
    && cp dist/apps/chain-indexer/main.js /deploy/main.js \
    && cd /deploy && pnpm install --prod --ignore-workspace --no-frozen-lockfile --config.strictDepBuilds=false

FROM node:24.12.0-alpine3.23 AS production

WORKDIR /app

COPY --from=builder /deploy ./

CMD ["node", "main.js"]
