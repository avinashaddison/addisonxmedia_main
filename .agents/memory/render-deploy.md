---
name: Render single-service deploy
description: Non-obvious decisions behind deploying this monorepo to Render (external host). Operational runbook lives in replit.md.
---

# Render deploy — durable decisions

Full runbook (commands, env vars, build steps) is in `replit.md` → "Deploy on Render". This file keeps only the non-obvious *why*.

- **`render.yaml` does NOT override an existing manual Render service.** A Blueprint only configures services *created from* it. A user with a manually-created web service keeps their dashboard Build/Start commands, so committing a `render.yaml` changes nothing and the deploy keeps failing on the old command. This caused two repeated identical failures before we diagnosed it.
  **How to apply:** to fix a manual service *without* asking the user to edit dashboard commands, make Render's *default* npm commands work in the repo: gate the pnpm-only `preinstall` guard so it only blocks when `$RENDER` is unset (Render sets `RENDER=true` at build+runtime), route root `build`/`start` to pnpm + the staged SPA when `$RENDER` is set. Root has no `catalog:`/`workspace:` deps, so a root `npm install` is harmless; the real workspace install happens via pnpm inside the build script.

- **esbuild's postinstall (`install.js`) crashes pnpm installs against a stale store with `Expected "X" but got "Y"`.** The error path is under `node_modules/.pnpm/.../esbuild` — that virtual store is pnpm's, so the failing script runs during the *pnpm* install in `scripts/render-build.sh`, NOT during Render's `npm install`. esbuild's `install.js` does a strict binary-version check; Render restores a stale build cache (its pnpm store), so the cached binary/JS versions disagree and the check throws.
  **Why:** the script only runs because `esbuild` is in `pnpm-workspace.yaml` `onlyBuiltDependencies` (pnpm 10 skips dep build scripts unless approved). esbuild does NOT need it here — the binary is supplied by the kept `@esbuild/linux-x64` optional dep (all other platforms pruned in `overrides`), so esbuild/tsx/vite resolve the binary at runtime without any postinstall.
  **How to apply:** **remove `esbuild` from `onlyBuiltDependencies`** (leave the `@esbuild/linux-x64` override KEPT). Then the fragile check never runs and a plain redeploy succeeds — no dashboard change, no cache-clear. Verified by wiping `node_modules`, reinstalling `--frozen-lockfile` (esbuild script skipped), and running a full frontend build. Do NOT try to fix this via the root `preinstall` `rm -rf node_modules` — that was tried twice and failed, because the crash is in the pnpm phase that rebuilds the store afterward, not the npm phase.

- **`corepack enable` fails on Render (`EROFS`).** It tries to write a global `pnpm` symlink into `/usr/bin`, which is read-only in Render's build container. Use `corepack pnpm …` directly instead (runs the `packageManager`-pinned version with no global shim), and set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` so the first-run prompt can't hang a non-interactive build.

- **Single web service serves both API and SPA.** The Hono server serves the built Vite SPA when `NODE_ENV=production`. The build must reconcile two path mismatches that are easy to miss: vite needs `BASE_PATH=/` + `PORT` at build time (it throws otherwise), and vite's `dist/public` output must be copied to where the server reads it (`./dist`).
  **Why:** there is no Replit-style path router on Render, so the frontend's relative `/api/*` calls only work because they hit the same origin as the API.

- **Schema creation is gated behind `RUN_DB_PUSH`.** The server's startup migrations only self-heal a few columns, not the full schema, so a fresh DB needs `drizzle-kit push`. But running push on *every* deploy can block a healthy deploy on the non-dismissable truncate prompt (populated-table constraint changes). So it is opt-in: on for first deploy / schema changes, off for routine deploys.
