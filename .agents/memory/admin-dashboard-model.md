---
name: Admin dashboard data model
description: Data-source decisions behind the AddisonX admin dashboard — which modules are fully built vs honest scaffolds, and why.
---

# Admin dashboard data model

The admin dashboard (`artifacts/addisonx` admin pages, AdminShell menu) splits into
fully-built core modules and honest scaffolds. Data-source decisions, made with architect review:

- **Clients (active/suspended)** — reuse the workspaces endpoint filtered by `user.accountStatus`; suspend/unsuspend already exist. No new client table.
- **Plans** — backed by a `subscription_plan` table; `user.plan` stays a string key referencing it. Defaults are seeded on first read.
- **Renewals** — driven by nullable `user.planRenewsAt`, falling back to trial end. **Why:** deriving renewal dates purely from upgrade-request completion + billing cycle is unreliable for manual plan changes, cancellations, and legacy rows.
- **Admin coupons** — separate `platform_coupon` table. **Why:** the existing owner-scoped `coupon` table is per-customer storefront discounts — a different concept; do not overload it.
- **Finance** — real figures from paid/completed upgrade-request rows plus summed MRR of active accounts. Refunds come from the audit log and are surfaced as "refunds/adjustments", **never relabeled as payouts**.
- **Payouts** — honest scaffold (minimal table). **Why:** this SaaS has no real merchant-payout flow, so inventing one or aliasing refunds would be dishonest.
- **Login logs** — sourced from the better-auth `session` table (active sessions), since there is no login-event log / auth hook in this phase; UI copy says so.
- **Activity logs** — existing user-activity table.
- **Permissions** — read-only role→capability matrix computed in code from the `requireAdmin` role gates; no new schema, not enforcement.
- **Scaffold-only** (titled shell + empty state + minimal GET): WhatsApp Mgmt, Support Center (tickets have a table; announcements/KB are pure empty states), API Keys (store hash only, never plaintext), Backups.

## Route organization

New admin surface lives in focused per-area Hono route files (not piled into the large existing
`admin.ts`), each with its own `requireAdmin()` gate. They must mount AFTER the main admin routes
but BEFORE per-resource sub-apps that apply a catch-all `requireAuth`, or those would swallow the
admin paths. Role scope: reads = any staff; billing mutations = super_admin|billing;
security/system mutations = super_admin.

**Gotcha:** numeric SQL aggregates (SUM/COUNT) come back as strings from postgres-js — wrap in
`Number()` before charting/math. Keep new tables/columns nullable/empty so drizzle-kit push stays
free of truncate prompts.
