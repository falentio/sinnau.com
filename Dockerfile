# syntax=docker/dockerfile:1.7

# ---- base ------------------------------------------------------------------
# Common foundation. `corepack enable` activates pnpm shipped via corepack;
# the exact version is locked by `packageManager` in package.json.
FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm \
    PATH=$PNPM_HOME/bin:$PATH \
    NODE_ENV=production

RUN corepack enable

WORKDIR /app

# ---- deps ------------------------------------------------------------------
# Installs the full dependency tree (dev + prod). Used by the `builder` stage
# to run `vite build` with all devDependencies present.
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- builder ---------------------------------------------------------------
# Produces the SvelteKit build artifact under ./build via @sveltejs/adapter-node.
FROM deps AS builder

COPY . .

# SvelteKit's post-build `analyse` step imports server modules and exercises
# them enough to discover the server graph. It (a) reads env vars validated in
# src/lib/server/infras/env.ts and (b) opens the SQLite database via
# createDb() in src/lib/server/infras/db/client.ts. Provide harmless
# placeholders at build time only — the real values are injected at `docker
# run` time via `-e`, so nothing here ends up in the final image.
ENV BETTER_AUTH_SECRET=build-time-placeholder \
    BETTER_AUTH_URL=http://localhost:3000 \
    DB_FILE_NAME=/tmp/build-analyse.db

RUN pnpm run build

# ---- prod-deps -------------------------------------------------------------
# Installs ONLY production dependencies. After the recent dependency moderation,
# this resolves to `better-sqlite3` and a small set of transitive helpers
# (`bindings`, `file-uri-to-path`, `prebuild-install`). Everything else from
# package.json is bundled into build/ at build time.
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- runner ----------------------------------------------------------------
# Final, minimal runtime image. Runs as the prebuilt `node` user (uid 1000)
# which matches typical Linux host bind-mount semantics.
FROM node:24-bookworm-slim AS runner

LABEL org.opencontainers.image.title="sinnau" \
      org.opencontainers.image.description="Sinnau SvelteKit app (adapter-node)" \
      org.opencontainers.image.source="https://github.com/anomalyco/2sinnau" \
      org.opencontainers.image.licenses="UNLICENSED"

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_FILE_NAME=/app/data/data.db

# Pre-create the data volume target with the correct ownership BEFORE switching
# to the non-root user, so the non-root runtime can persist the SQLite file.
RUN mkdir -p /app/data && chown -R node:node /app/data

WORKDIR /app

# Copy artifacts. Order matters: larger / more-frequently-changing layers last
# so they don't invalidate earlier cached layers.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder   --chown=node:node /app/build       ./build
COPY --from=builder   --chown=node:node /app/drizzle     ./drizzle
COPY --from=builder   --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000
VOLUME ["/app/data"]

# `node build` runs build/index.js — the adapter-node entry point.
# It also runs Drizzle migrations on boot, using ./drizzle + the volume at
# DB_FILE_NAME. No entrypoint wrapper is needed.
CMD ["node", "build"]
