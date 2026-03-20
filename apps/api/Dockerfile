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
RUN pnpm --filter api prisma:generate
RUN pnpm --filter @org/domain build \
  && pnpm --filter @org/domain-adapters-prisma build \
  && pnpm --filter api build
RUN mkdir -p /app/uploads/media \
  && chown -R node:node /app/uploads

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--max-old-space-size=256
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build --chown=node:node /app/packages/domain/dist ./packages/domain/dist
COPY --from=build --chown=node:node /app/packages/domain-adapters-prisma/package.json ./packages/domain-adapters-prisma/package.json
COPY --from=build --chown=node:node /app/packages/domain-adapters-prisma/dist ./packages/domain-adapters-prisma/dist
COPY --from=build --chown=node:node /app/uploads ./uploads
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/src/main.js"]

FROM workspace AS migrate
ENV NODE_ENV=production
CMD ["pnpm", "db:migrate"]
