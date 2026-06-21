---
name: AddisonX validation method
description: How to actually verify AddisonX builds/runs — strict tsc is NOT the gate.
---

# AddisonX is validated by Vite build + tsx runtime, NOT strict `tsc`

To verify the AddisonX monorepo compiles/runs, use:
- Frontend: `BASE_PATH=/ PORT=<n> pnpm --filter @workspace/addisonx run build` (Vite). Must be green.
- Backend: it runs via `tsx server/index.ts` (no bundler/typecheck) — confirm it boots from workflow logs (200s, no throw).

**Why:** `pnpm --filter @workspace/addisonx exec tsc -b --noEmit` fails with TS6310 on the referenced
`lib/api-client-react` project ("may not disable emit") — a project-references/emit config issue, not real
type errors in app code. `pnpm --filter @workspace/api-server exec tsc --noEmit` reports MANY pre-existing
errors in `server/lib/*` (admin-agent, human-seller, marketing-agent, job-queue, whatsapp-commerce),
`server/middleware/*`, `server/routes/admin.ts`, and `*.test.ts` (vitest types). These predate current work
and do NOT block runtime because the server runs on tsx and the frontend ships via Vite.

**How to apply:** When asked to "make the build green" or to verify changes, run the Vite build + check the
api-server boots. Treat strict-tsc output as advisory; only worry about new errors in files you actually
edited, and confirm them against the Vite build before treating them as real.
