---
name: Workspace scoping model (userId vs ownerUserId)
description: How AddisonX scopes data in its single-login / virtual-workspace model — which var to scope by, and the rule for cross-entity ownership validation.
---

# Single-login workspace scoping

AddisonX is a **single-login** app. `team_member` is a metadata roster (no team-member
logins). A "workspace" is a virtual project under one real human owner.

The auth middleware sets two distinct vars on the Hono context:

- `c.var.userId` — the **active/virtual workspace user** (may be swapped for impersonation
  or a selected workspace). Per-workspace operational data (tasks, contacts, deals,
  campaigns, broadcasts) is scoped by this.
- `c.var.ownerUserId` — the **real account owner**. Account-level rosters/config
  (`team_member.ownerId`) are scoped by this. It is stable across the owner's workspaces.

**Rule:** when one entity references another that lives at a *different* scope, validate the
reference against the owning scope before writing. Concretely, task assignment stores
`task.ownerId = c.var.userId` (workspace scope) but `task.assignedToMemberId` must be a
`team_member` where `ownerId === c.var.ownerUserId` (owner scope) — validate on both POST and
PATCH, else you open an IDOR (assigning to a member you don't own). The read join is safe
because the task list is already scoped to `userId` before joining the member.

**Why:** these two ids diverge whenever a workspace is virtual/impersonated; scoping a
cross-scope FK by the wrong var either leaks/links the wrong account's data or rejects valid
references.

## RBAC is NOT enforced (deliberate)

The Roles "Permission matrix" is a **planning reference only** — roles are assignable
metadata, but there is no runtime permission enforcement (it would be security theater in a
single-login model). Real multi-tenant RBAC enforcement (team-member logins, per-role gating)
is a separate future epic, not part of the dashboard work. Do not present the role matrix as
if it gates access.
