# AddisonX Media

A WhatsApp marketing, websites & automation platform for Indian SMBs (Ranchi-based). Imported from a lovable.dev export and ported into the Replit pnpm-workspace multi-artifact stack.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Hono API server (port 8080; reads `PORT`)
- `pnpm --filter @workspace/addisonx run dev` — run the React + Vite frontend (port from `PORT`, base from `BASE_PATH`)
- `pnpm --filter @workspace/api-server run db:push` — push DB schema (Drizzle Kit, dev only; use `--force` for non-interactive)
- Required env/secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `MASTER_KEY` (>=32 chars), `TRUSTED_ORIGINS`, `ALLOWED_ORIGINS`

## Deploy on Render (external)

Deploys as a SINGLE web service: the Hono api-server also serves the built Vite SPA from `./dist` when `NODE_ENV=production` (the `SERVE_STATIC` block in `server/index.ts`). Config lives in `render.yaml` (blueprint) + `scripts/render-build.sh`.

- An EXISTING manual Render service keeps Render's default commands (`npm install … && npm run build`, `npm start`) — they work. The root `preinstall` guard rejects npm/yarn ONLY when Render's `$RENDER` env var is absent (i.e. local dev); on Render, root `build` routes to `scripts/render-build.sh` and root `start` runs the api-server with the staged SPA. `render.yaml` does NOT override an existing manual service's commands, which is why the first two deploy attempts kept failing on the old npm build command.
- Render deploys kept crashing during install with esbuild's `install.js` throwing `Expected "0.25.12" but got "0.27.3"` (path under `node_modules/.pnpm/.../esbuild`). Cause: `esbuild` was listed in `pnpm-workspace.yaml` `onlyBuiltDependencies`, so pnpm ran esbuild's postinstall, whose strict binary-version check explodes against Render's restored (stale) pnpm store. Fix: **remove `esbuild` from `onlyBuiltDependencies`**. esbuild does NOT need that postinstall here — its binary is supplied by the kept `@esbuild/linux-x64` optional dependency (every other platform is pruned in `overrides`), so esbuild/tsx/vite resolve the binary at runtime regardless of cache staleness. A plain redeploy fixes it — no dashboard change or cache-clear. (Verified with a clean `node_modules` reinstall + full frontend build.)
- Blueprint / explicit Build Command: `bash scripts/render-build.sh` (corepack→pnpm)
- Explicit Start Command: `cd artifacts/api-server && node_modules/.bin/tsx server/index.ts` (package-local tsx, no pnpm needed at runtime)
- The build sets `BASE_PATH=/` and `PORT` (vite.config requires both), builds the SPA, then copies `artifacts/addisonx/dist/public` → `artifacts/api-server/dist` (vite outDir is `dist/public`; the server serves `./dist`).
- DB schema push is gated behind `RUN_DB_PUSH=1` (set it for the first deploy and after schema changes; leave unset for routine deploys). Startup migrations only self-heal a few columns, not the full schema.
- Render env vars: `NODE_ENV=production`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (this service's https URL), `MASTER_KEY`, `TRUSTED_ORIGINS` + `ALLOWED_ORIGINS` (the service's https origin). Frontend calls relative `/api/*` → same origin, so no proxy/CORS gymnastics for a single-service deploy.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Backend: Hono + @hono/node-server, better-auth, Drizzle ORM (postgres-js), OpenAI, Resend, pino
- Frontend: React + Vite, react-router-dom, Tailwind v3 + shadcn/ui, TanStack Query, better-auth client
- DB: Replit PostgreSQL

## Where things live

- `artifacts/api-server/server/` — full Hono backend (entry `server/index.ts`, auth `server/auth/`, db `server/db/schema.ts`, crypto `server/crypto.ts`)
- `artifacts/addisonx/src/` — frontend (App router `src/App.tsx`, API wrapper `src/lib/api.ts`, auth client `src/lib/auth-client.ts`)
- `.migration-backup/` — untouched original lovable.dev export (frontend `src/`, backend `server/`)

## Architecture decisions

- This is NOT a typical lovable→Replit Supabase swap. The export already shipped a complete self-hosted backend (Hono + better-auth + Drizzle), so the migration was a structural port: backend → `artifacts/api-server`, frontend → `artifacts/addisonx`. No Supabase to replace.
- The api-server runs via `tsx server/index.ts` in both dev and prod (the original used tsx, not a bundler). The scaffold's esbuild `build.mjs` was removed.
- Frontend calls relative `/api/*`; the Replit path router proxies `/api`, `/biz`, `/biz-demo`, `/sitemap.xml`, `/robots.txt`, `/health` to the api-server. No Vite dev proxy is needed.
- DB schema lives in `server/db/schema.ts` (own drizzle.config.ts in the api-server), NOT in the shared `lib/db`. The shared `lib/*` scaffold packages are left unused.

## Product

WhatsApp Business API marketing platform: shared team inbox, AI auto-reply (Hindi), broadcasts, UPI payments in chat, CRM, billing, plus an admin panel. Signups are gated behind a feature flag (currently disabled) — sign-in only.

## User preferences

_Populate as you build._

## Gotchas

- `drizzle-kit push` prompts interactively; run with `--force` in this non-TTY environment. Even `--force` does NOT auto-dismiss the per-constraint "Do you want to truncate?" suggestion when adding a UNIQUE/NOT NULL constraint to a populated table — keep the DB in sync so push stays a no-op.
- Post-merge runs `scripts/post-merge.sh`, which must push the api-server's OWN schema (`pnpm --filter @workspace/api-server exec drizzle-kit push --force`). NEVER use `pnpm --filter db push` — `db` is the unused `lib/db` scaffold with an empty schema, and pushing it tries to DROP every real table (data loss).
- `MASTER_KEY` must be >=32 chars or the server throws in production (warns in dev). `BETTER_AUTH_SECRET` is required at startup.
- Browser-facing origin must be in `TRUSTED_ORIGINS` or better-auth rejects auth requests (CSRF protection).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
