# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

FROM node:24-bookworm-slim@sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7 AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV HUSKY=0
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
  pnpm install --prod --frozen-lockfile --ignore-scripts \
  && pnpm rebuild @prisma/engines \
  && test -x ./node_modules/.bin/prisma \
  && ./node_modules/.bin/prisma version >/dev/null \
  && find ./node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines \
    -type f -name 'schema-engine-*' -perm -0100 -print -quit \
    | grep -q .

FROM production-deps AS runtime
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY dataset-releases.json ./
COPY public ./public
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src/config/load-env.ts ./src/config/load-env.ts

RUN chown -R node:node /app

USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
