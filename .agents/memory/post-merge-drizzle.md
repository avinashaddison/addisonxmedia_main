---
name: Post-merge & drizzle push for the addisonx monorepo
description: Why post-merge db sync nearly dropped real tables, and how schema push must be wired in this project.
---

# Post-merge DB sync

The real DB schema is the **api-server** package (`artifacts/api-server/server/db/schema.ts` with its own `drizzle.config.ts`). The shared `lib/db` scaffold (pnpm package name `db`) is UNUSED and has an empty schema.

## Rule
`scripts/post-merge.sh` must run `pnpm --filter @workspace/api-server exec drizzle-kit push --force` to sync schema. It must NEVER run `pnpm --filter db push`.

**Why:** `--filter db` pushes the empty `lib/db` scaffold against the live DB, so drizzle wants to DROP every real table (site, booking, workspace, ai_agent, …) = data loss. It also failed on the closed stdin (no TTY). This was the actual post-merge failure.

**How to apply:** Any time post-merge fails or you touch the schema-sync step, confirm the filter targets `@workspace/api-server`, not `db`. Keep the post-merge timeout generous (~120s) — install + drizzle schema-pull runs ~20s.

## Drizzle push drift gotcha
`drizzle-kit push` matches constraints by NAME, and `--force` does NOT suppress its "truncate?" suggestion in drizzle-kit 0.31. Hand-written migrations that use inline `UNIQUE` get Postgres default `_key` names, while `.unique()` in the schema expects `_unique` names — that mismatch makes push perpetually try to re-add functionally-duplicate constraints and prompt for truncation.

**How to apply:** if push prompts on a table that already works, the cause is almost always a `_key` vs `_unique` constraint-name mismatch or a missing index — align names / add the index rather than forcing a destructive diff. Long-term, prefer migration-first (`drizzle-kit migrate`, migrations already committed in `server/db/migrations`) as source of truth and reserve push for controlled dev sync.
