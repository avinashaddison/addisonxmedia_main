#!/usr/bin/env bash
# Render build for the AddisonX pnpm monorepo.
#
# This app deploys as a SINGLE Render web service: the Hono API server also
# serves the built Vite SPA (see artifacts/api-server/server/index.ts, the
# SERVE_STATIC block). This script must run with pnpm — the root package.json
# preinstall guard rejects npm/yarn, which is why a plain `npm install` fails.
set -euo pipefail

echo "==> Enabling pnpm via corepack"
corepack enable
corepack prepare pnpm@10.26.1 --activate

echo "==> Installing dependencies (pnpm, workspace-wide)"
pnpm install --frozen-lockfile

echo "==> Building the Vite frontend"
# vite.config.ts requires PORT and BASE_PATH at build time. On Render the SPA is
# served at the domain root by the API server, so BASE_PATH must be "/".
PORT=8080 BASE_PATH=/ pnpm --filter @workspace/addisonx run build

echo "==> Staging the built SPA where the API server serves it (./dist)"
# Vite outputs to artifacts/addisonx/dist/public; the server reads ./dist
# (relative to the api-server dir) and expects index.html + assets/ at its root.
rm -rf artifacts/api-server/dist
cp -r artifacts/addisonx/dist/public artifacts/api-server/dist

# The server's startup migrations only self-heal a few columns; the full schema
# must be created with drizzle-kit. This is GATED behind RUN_DB_PUSH so routine
# deploys never touch the database: a schema change on a populated table can make
# `push` block on a non-dismissable truncate prompt (see replit.md gotchas) and
# would break an otherwise healthy deploy.
# Set RUN_DB_PUSH=1 in the Render environment for the FIRST deploy (to create the
# schema) and whenever you change server/db/schema.ts; unset it for normal deploys.
if [ "${RUN_DB_PUSH:-0}" = "1" ]; then
  echo "==> Pushing the database schema (drizzle-kit, RUN_DB_PUSH=1)"
  pnpm --filter @workspace/api-server exec drizzle-kit push --force
else
  echo "==> Skipping DB schema push (set RUN_DB_PUSH=1 to enable)"
fi

echo "==> Render build complete"
