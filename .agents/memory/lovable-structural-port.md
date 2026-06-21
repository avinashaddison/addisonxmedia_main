---
name: Lovable structural port
description: When a lovable.dev import already has its own backend, the Replit migration is structural, not a Supabase swap.
---

Not every lovable.dev export is a thin Supabase frontend. Some ship a complete, self-hosted backend (e.g. Hono + better-auth + Drizzle + Postgres) with only stray Supabase comments/type names left over.

**Why:** The default lovable-migration assumption (replace Supabase with Replit DB/auth) wastes effort and risks breaking a working backend when there is essentially no Supabase to replace.

**How to apply:** During detection, grep for an actual server dir and a real auth/db stack before assuming Supabase. If a full backend exists, do a structural port: backend → `artifacts/api-server`, frontend → a new `react-vite` artifact, wire relative `/api/*` through the Replit path router. Keep `.migration-backup/` intact and diff against it to prove files copied faithfully (cp does not corrupt — trust `diff -rq` over ripgrep highlighted output).
