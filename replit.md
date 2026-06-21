# AddisonX Media

A WhatsApp marketing, websites & automation platform for Indian SMBs (Ranchi-based). Imported from a lovable.dev export and ported into the Replit pnpm-workspace multi-artifact stack.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Hono API server (port 8080; reads `PORT`)
- `pnpm --filter @workspace/addisonx run dev` — run the React + Vite frontend (port from `PORT`, base from `BASE_PATH`)
- `pnpm --filter @workspace/api-server run db:push` — push DB schema (Drizzle Kit, dev only; use `--force` for non-interactive)
- Required env/secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `MASTER_KEY` (>=32 chars), `TRUSTED_ORIGINS`, `ALLOWED_ORIGINS`

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

- `drizzle-kit push` prompts interactively; run with `--force` in this non-TTY environment.
- `MASTER_KEY` must be >=32 chars or the server throws in production (warns in dev). `BETTER_AUTH_SECRET` is required at startup.
- Browser-facing origin must be in `TRUSTED_ORIGINS` or better-auth rejects auth requests (CSRF protection).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
