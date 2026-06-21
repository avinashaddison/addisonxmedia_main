---
name: AddisonX build & typecheck quirks
description: Non-obvious gotchas when building/typechecking the addisonx Vite frontend
---

# AddisonX (artifacts/addisonx) build & typecheck quirks

- `vite.config.ts` throws at config-load time if `PORT` or `BASE_PATH` env vars are missing.
  To run `pnpm --filter @workspace/addisonx run build` manually (outside the dev workflow),
  prefix with `PORT=4321 BASE_PATH=/`. The dev workflow injects these automatically.

- `pnpm --filter @workspace/addisonx run typecheck` reports MANY pre-existing errors from the
  original lovable.dev export (auth-client `forgetPassword`, admin pages with implicit any,
  ResetPassword missing return, etc.). These are inherited tech debt, NOT regressions.
  **Why:** the `build` script uses Vite/esbuild (transpile-only) which ignores type errors, so
  the app builds and runs fine despite them. Don't panic at a red typecheck — confirm the error
  is in a file you actually touched before treating it as your bug.

- Two intentional, distinct business phone numbers exist across the app — do NOT "unify" them:
  Sales/Support line `919709707311` (tel:) and WhatsApp line `916206153116` (wa.me).
