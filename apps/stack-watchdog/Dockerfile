FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY apps/stack-watchdog ./apps/stack-watchdog
COPY libs ./libs

RUN pnpm install --frozen-lockfile

RUN pnpx nx run stack-watchdog:prune-lockfile

FROM node:24-bookworm-slim AS production

WORKDIR /app

RUN npm install -g pnpm \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && chmod a+r /etc/apt/keyrings/docker.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
    > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist/apps/stack-watchdog ./

RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune && \
    rm -rf /tmp/* /var/tmp/*

CMD ["node", "main.js"]
