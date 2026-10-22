# Ephemeral migrations / data tools: Kysely schema CLI and tsx scripts (mongo import, backfills).
# Default: apply schema migrations to latest. Override command for mongo imports, etc.
FROM node:24.22.1-alpine3.23

WORKDIR /app

RUN npm install -g pnpm@10.30.3 && npm cache clean --force

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./

COPY libs ./libs
COPY apps ./apps
COPY scripts ./scripts

RUN touch .env

RUN pnpm install --frozen-lockfile --ignore-scripts \
    && rm -rf /root/.local/share/pnpm/store

# Avoid tsx --env-file=.env (file may be absent); DATABASE_URL must be set in the environment.
CMD ["pnpm", "exec", "tsx", "libs/migrations/src/cli.ts", "latest"]
