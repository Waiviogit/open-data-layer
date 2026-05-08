FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install

COPY nx.json tsconfig.base.json ./
COPY apps/notifications ./apps/notifications
COPY libs ./libs

RUN pnpm install --frozen-lockfile

RUN pnpx nx run notifications:prune-lockfile

FROM node:24.12.0-alpine3.23 AS production

WORKDIR /app

COPY --from=builder /app/package.json .root-package.json
RUN corepack enable \
    && PNPM_VER=$(node -p 'require("./.root-package.json").packageManager.split("@")[1].split("+")[0]') \
    && corepack prepare "pnpm@${PNPM_VER}" --activate \
    && rm .root-package.json

COPY --from=builder /app/dist/apps/notifications ./

RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune && \
    rm -rf /tmp/* /var/tmp/*

CMD ["node", "main.js"]
