---
name: Render single-service deploy
description: Non-obvious decisions behind deploying this monorepo to Render (external host). Operational runbook lives in replit.md.
---

# Render deploy — durable decisions

Full runbook (commands, env vars, build steps) is in `replit.md` → "Deploy on Render". This file keeps only the non-obvious *why*.

- **`render.yaml` does NOT override an existing manual Render service.** A Blueprint only configures services *created from* it. A user with a manually-created web service keeps their dashboard Build/Start commands, so committing a `render.yaml` changes nothing and the deploy keeps failing on the old command. This caused two repeated identical failures before we diagnosed it.
  **How to apply:** to fix a manual service *without* asking the user to edit dashboard commands, make Render's *default* npm commands work in the repo: gate the pnpm-only `preinstall` guard so it only blocks when `$RENDER` is unset (Render sets `RENDER=true` at build+runtime), route root `build`/`start` to pnpm + the staged SPA when `$RENDER` is set. Root has no `catalog:`/`workspace:` deps, so a root `npm install` is harmless; the real workspace install happens via pnpm inside the build script.

- **Render's `npm install` re-runs cached dependency install scripts and crashes on esbuild binary/version skew.** Render restores a build cache that includes the pnpm store; a plain `npm install` (Render's default build command) then executes cached dep lifecycle scripts — esbuild's `install.js` validates its platform binary and throws `Expected "X" but got "Y"` whenever the cached JS package and binary versions disagree (happens across an esbuild version bump). This breaks the build *before* the pnpm build script runs.
  **How to apply:** the root `preinstall` self-heals by `rm -rf node_modules` when it detects Render running npm (`$RENDER` set AND `$npm_config_user_agent` is not `pnpm/*`); pnpm then does a clean workspace install in `scripts/render-build.sh`. So a plain redeploy fixes it — no dashboard change or manual cache-clear. Keep the wipe gated to that exact condition so it never fires for local pnpm or for the build script's own `corepack pnpm install` (agent is `pnpm/*` → not wiped). The bulletproof alternative remains setting the Render Build Command to `bash scripts/render-build.sh` (skips npm entirely).

- **`corepack enable` fails on Render (`EROFS`).** It tries to write a global `pnpm` symlink into `/usr/bin`, which is read-only in Render's build container. Use `corepack pnpm …` directly instead (runs the `packageManager`-pinned version with no global shim), and set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` so the first-run prompt can't hang a non-interactive build.

- **Single web service serves both API and SPA.** The Hono server serves the built Vite SPA when `NODE_ENV=production`. The build must reconcile two path mismatches that are easy to miss: vite needs `BASE_PATH=/` + `PORT` at build time (it throws otherwise), and vite's `dist/public` output must be copied to where the server reads it (`./dist`).
  **Why:** there is no Replit-style path router on Render, so the frontend's relative `/api/*` calls only work because they hit the same origin as the API.

- **Schema creation is gated behind `RUN_DB_PUSH`.** The server's startup migrations only self-heal a few columns, not the full schema, so a fresh DB needs `drizzle-kit push`. But running push on *every* deploy can block a healthy deploy on the non-dismissable truncate prompt (populated-table constraint changes). So it is opt-in: on for first deploy / schema changes, off for routine deploys.
