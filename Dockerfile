# syntax=docker/dockerfile:1.7

ARG APP_BUILD_DATE=
ARG APP_SHA=
ARG APP_VERSION=

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm \
    PATH=$PNPM_HOME/bin:$PATH \
    NODE_ENV=production

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

# SvelteKit's post-build `analyse` step imports server modules and exercises
# them, which reads env.ts and opens the SQLite DB via createDb() in
# client.ts. Provide harmless placeholders at build time only — real values
# are injected at `docker run -e` and never enter the final image.
ENV BETTER_AUTH_SECRET=build-time-placeholder \
    BETTER_AUTH_URL=http://localhost:11085 \
    DB_FILE_NAME=/tmp/build-analyse.db

RUN pnpm run build

FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# --ignore-scripts avoids the project-level `prepare` script which requires
# devDependencies (svelte-kit sync, lefthook). better-sqlite3's native addon
# is rebuilt explicitly since it can't be bundled.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm rebuild better-sqlite3

FROM base AS runner

LABEL org.opencontainers.image.title="sinnau" \
      org.opencontainers.image.description="Sinnau SvelteKit app (adapter-node)" \
      org.opencontainers.image.source="https://github.com/falentio/sinnau.com" \
      org.opencontainers.image.licenses="UNLICENSED"

ENV APP_BUILD_DATE=$APP_BUILD_DATE \
    APP_SHA=$APP_SHA \
    APP_VERSION=$APP_VERSION \
    NODE_ENV=production \
    ENVIRONMENT=production \
    NODE_OPTIONS="--enable-source-maps --unhandled-rejections=strict" \
    PORT=11085 \
    HOST=0.0.0.0 \
    BODY_SIZE_LIMIT=50M \
    DB_FILE_NAME=/app/data/data.db

# Pre-create the data volume target as root, chown to node, THEN switch user
# — order matters because the chown must run while we still have CAP_CHOWN.
RUN mkdir -p /app/data && chown -R node:node /app/data

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder   --chown=node:node /app/build       ./build
COPY --from=builder   --chown=node:node /app/drizzle     ./drizzle
COPY --from=builder   --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 11085
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:11085/').then(()=>process.exit(0)).catch(()=>process.exit(1))"

CMD ["node", "build"]
