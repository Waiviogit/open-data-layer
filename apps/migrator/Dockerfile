# Ephemeral migrations / data tools: Kysely schema CLI and tsx scripts (mongo import, backfills).
# Default: apply schema migrations to latest. Override command for mongo imports, etc.
FROM node:24.12.0-alpine3.23

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY libs ./libs
COPY scripts ./scripts

RUN touch .env

RUN pnpm install --frozen-lockfile

# Avoid tsx --env-file=.env (file may be absent); DATABASE_URL must be set in the environment.
CMD ["pnpm", "exec", "tsx", "libs/migrations/src/cli.ts", "latest"]
