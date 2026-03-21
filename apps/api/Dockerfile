# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS workspace
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile

FROM workspace AS build
RUN cd "$(node -p "require(\"path\").dirname(require.resolve(\"bcrypt/package.json\", { paths: [\"./apps/api\"] }))")" \
  && npm run install
RUN pnpm --filter api prisma:generate
RUN pnpm --filter @org/domain build \
  && pnpm --filter @org/domain-adapters-prisma build \
  && pnpm --filter api build
RUN pnpm --filter api --prod deploy --legacy /app/deploy \
  && src_prisma_client_dir="$(node -p "const path=require('path'); const pkg=require.resolve('@prisma/client/package.json', { paths: ['./apps/api'] }); path.resolve(path.dirname(pkg), '..', '..', '.prisma', 'client')")" \
  && find /app/deploy/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d -print \
    | while read -r prisma_client_dir; do \
        dst_prisma_client_dir="$(node -p "const path=require('path'); path.resolve(process.argv[1], '..', '..', '.prisma', 'client')" "$prisma_client_dir")"; \
        rm -rf "$dst_prisma_client_dir"; \
        mkdir -p "$(dirname "$dst_prisma_client_dir")"; \
        cp -a "$src_prisma_client_dir" "$dst_prisma_client_dir"; \
      done \
  && test -f /app/deploy/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/default.js \
  && cd /app/deploy \
  && npm rebuild bcrypt --build-from-source \
  && test -f /app/deploy/node_modules/.pnpm/bcrypt@*/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node
RUN mkdir -p /app/uploads/media \
  && chown -R node:node /app/uploads

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--max-old-space-size=256
COPY --from=build --chown=node:node /app/deploy ./
COPY --from=build --chown=node:node /app/uploads ./uploads
USER node
EXPOSE 4000
CMD ["node", "dist/src/main.js"]

FROM workspace AS migrate
ENV NODE_ENV=production
CMD ["pnpm", "db:migrate"]
