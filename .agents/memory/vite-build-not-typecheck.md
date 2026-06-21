---
name: Vite build is not a type-check
description: Why a green `pnpm run build` can still ship a runtime crash, and what to run instead
---

The frontend (`artifacts/addisonx`) bundles with Vite/esbuild, which transforms TS
without full type-checking. A JSX component that references an identifier never
imported (classic case: a `lucide-react` icon used in JSX but missing from the
import list) compiles and **builds green**, then throws `ReferenceError` at runtime
when that branch renders.

**Why:** esbuild only strips types; it does not resolve undefined names. `replit.md`
says validate with "Vite prod build + tsx boot (not strict tsc)", but that combo
will NOT catch this class of crash.

**How to apply:** For frontend changes, also run `pnpm --filter @workspace/addisonx run typecheck`
(`tsc -p tsconfig.json --noEmit`) and treat undefined-name errors (TS2304/TS2552)
as real runtime crashes to fix, even if the build is green. Pre-existing errors in
untouched files are fair game when they live in the always-rendered app shell
(e.g. `AppSidebar`'s PlanUpsellCard), since they break every dashboard page.
