# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm run build

FROM base AS production-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile --ignore-scripts

FROM production-deps AS migrations
ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm add --save-prod --prod --save-exact --ignore-scripts prisma@7.9.0
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src/config/load-env.ts ./src/config/load-env.ts
CMD ["pnpm", "run", "db:migrate:deploy"]

FROM production-deps AS runtime
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY dataset-releases.json ./
COPY public ./public

EXPOSE 3000
CMD ["node", "dist/main.js"]
