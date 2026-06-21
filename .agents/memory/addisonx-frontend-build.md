---
name: addisonx frontend build & typecheck
description: How to actually build/verify the addisonx React+Vite artifact, and why tsc is not the gate
---

# Building / verifying the addisonx frontend

- `vite build` (and `vite dev`) reads `PORT` from the config at load time and
  **throws "PORT environment variable is required"** if it's unset. Run builds
  as `PORT=5000 BASE_PATH=/ npx vite build --config vite.config.ts` (or via the
  workflow, which sets it).

- `tsc --noEmit` reports **hundreds of pre-existing project-wide errors** — the
  dashboard payload from `api.getDashboard()` is typed `unknown`, and many
  ads/ai/analytics pages have implicit-any + missing-export errors. These are
  NOT from your change. The real pass/fail gate for refactors is the Vite build
  (esbuild, no typecheck). Don't try to "fix the typecheck" as part of an
  unrelated task — scope it.

**Why:** A perf refactor (lazy-splitting Landing/Dashboard) produced zero new
errors but `tsc` still printed a wall of red; filtering to the touched files and
relying on `vite build` is the correct verification path here.

**How to apply:** After editing addisonx frontend, verify with `vite build`
(PORT set). Only treat `tsc` output as relevant if errors point at the specific
files you changed.
