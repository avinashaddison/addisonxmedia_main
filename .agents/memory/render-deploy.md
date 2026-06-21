---
name: Render single-service deploy
description: How this monorepo deploys to Render (external host) as one web service, and the non-obvious pitfalls.
---

# Render deploy (single web service)

The app deploys to Render as ONE web service: the Hono api-server serves both `/api` and the built Vite SPA from `./dist` when `NODE_ENV=production` (`SERVE_STATIC` block in `artifacts/api-server/server/index.ts`). Config: root `render.yaml` (blueprint) + `scripts/render-build.sh`.

**Why pnpm, not npm:** the root `package.json` `preinstall` guard hard-rejects npm/yarn. Render's default `npm install …` therefore fails instantly. The build script uses `corepack enable` + pnpm. `packageManager: pnpm@<ver>` is set at root so corepack picks the right version.

**Non-obvious wiring that must stay in sync:**
- vite.config.ts THROWS unless `PORT` and `BASE_PATH` are set at build time. Single-service serves at the domain root, so build with `BASE_PATH=/`.
- vite outDir is `dist/public`, but the server serves `./dist` and reads `dist/index.html`. The build must copy `artifacts/addisonx/dist/public` → `artifacts/api-server/dist`.
- Start command runs from the api-server dir so `./dist` resolves: `cd artifacts/api-server && node_modules/.bin/tsx server/index.ts` (package-local tsx; no pnpm needed at runtime).

**DB schema:** the server's startup migrations only self-heal a FEW columns (+ one CREATE TABLE IF NOT EXISTS) — they do NOT create the full schema. Fresh DBs need `drizzle-kit push`. This is gated behind `RUN_DB_PUSH=1` so routine deploys don't risk the non-dismissable truncate prompt on populated tables.
**Why gated:** running `drizzle-kit push --force` on every deploy can block/break a healthy deploy when a schema change needs destructive resolution.
**How to apply:** set `RUN_DB_PUSH=1` for the first deploy and after any `server/db/schema.ts` change; leave unset otherwise.

**Auth/CORS:** browser origin must be in `TRUSTED_ORIGINS` (better-auth CSRF) and `ALLOWED_ORIGINS` (CORS). For single-service, both = the service's https URL. Frontend calls relative `/api/*` → same origin, so no cross-origin setup needed.
