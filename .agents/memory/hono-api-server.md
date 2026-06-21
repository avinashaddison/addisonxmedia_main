---
name: Hono api-server on Replit
description: Conventions for running an imported Hono backend inside the api-server artifact.
---

When repurposing `artifacts/api-server` to host an imported Hono backend:

- Run via `tsx server/index.ts` for both dev and prod if the original used tsx. Remove the scaffold's esbuild `build.mjs`; make `build` a no-op and `start` = the tsx command. Put `tsx` in dependencies (not devDependencies) so production installs keep it.
- The imported backend keeps its own `server/db/schema.ts` + `drizzle.config.ts`; the shared `lib/db`, `lib/api-zod`, `lib/api-client-react`, `lib/api-spec` scaffolds are left unused.
- `artifact.toml` `paths` must list every top-level route the backend serves (e.g. `/api`, `/biz`, `/sitemap.xml`, `/robots.txt`, `/health`), not just `/api` — the Replit proxy only forwards listed paths.
- Set the health check `path` to a route that returns 200 without auth (`/health`), not an authed endpoint.
- `pnpm-workspace.yaml` catalog has no `typescript` entry — pin a concrete version in the package instead of `catalog:`.

**Why:** tsx-based startup matches the original runtime and avoids esbuild bundling fragility; unlisted proxy paths are silently dropped; authed health checks fail startup probes.
