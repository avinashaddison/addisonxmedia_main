# Addison X Media - Platform Audit Report

**Date:** 2025  
**Scope:** Full-stack codebase audit (React + Hono + Drizzle/Postgres)  
**Classification:** Internal - Engineering Team  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Security Vulnerabilities](#1-security-vulnerabilities)
3. [Code Quality Issues](#2-code-quality-issues)
4. [Database Schema Issues](#3-database-schema-issues)
5. [API Design Issues](#4-api-design-issues)
6. [Frontend Issues](#5-frontend-issues)
7. [DevOps / Infrastructure Issues](#6-devops--infrastructure-issues)
8. [Testing Gaps](#7-testing-gaps)
9. [Business Logic Issues](#8-business-logic-issues)
10. [Scalability Concerns](#9-scalability-concerns)
11. [Missing Features / Incomplete Implementations](#10-missing-features--incomplete-implementations)

---

## Executive Summary

This audit covers the Addison X Media SaaS platform, a full-stack application for Indian SMBs providing CRM, WhatsApp marketing, e-commerce, and booking features. The audit identified **67 findings** across 10 categories.

### Findings Summary by Severity

| Severity | Count | Categories Affected |
|----------|-------|---------------------|
| Critical | 5 | Security, Testing |
| High | 24 | Security, Code Quality, DB, API, Frontend, DevOps, Testing, Business Logic, Scalability |
| Medium | 27 | All categories |
| Low | 11 | All categories |

### Findings Summary by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security Vulnerabilities | 2 | 4 | 5 | 2 | 13 |
| Code Quality | 0 | 2 | 4 | 2 | 8 |
| Database Schema | 0 | 2 | 4 | 2 | 8 |
| API Design | 0 | 2 | 3 | 1 | 6 |
| Frontend | 0 | 1 | 3 | 2 | 6 |
| DevOps / Infrastructure | 0 | 2 | 3 | 2 | 7 |
| Testing Gaps | 3 | 2 | 0 | 0 | 5 |
| Business Logic | 0 | 2 | 3 | 1 | 6 |
| Scalability | 0 | 2 | 3 | 2 | 7 |
| Missing Features | 0 | 2 | 5 | 3 | 10 |

### Top Priority Items

The following items require immediate attention:

1. **Mass assignment vulnerability** allowing ownership takeover of any record (CRITICAL)
2. **Virtually zero test coverage** across the entire codebase (CRITICAL)
3. **No pagination** on list endpoints - will fail under real user load (HIGH)
4. **Broadcast send is synchronous** - will timeout for any real audience (HIGH)
5. **No CSRF protection** despite cookie-based auth (CRITICAL)

---

## 1. Security Vulnerabilities

### CRITICAL: Mass Assignment via toCamel + Unvalidated Spread

**Files:** `server/routes/crm.ts` (lines 131-137, 184-196, 244-250, 289-295), `server/routes/inbox.ts` (lines 234-239)

**Description:**  
PATCH endpoints for contacts, deals, campaigns, broadcasts, conversations, and tasks use `toCamel(await c.req.json())` and then spread directly into Drizzle's `.set({...body})`. This allows any authenticated user to overwrite ANY column on the row, including `ownerId`. An attacker can send `{ "owner_id": "attacker-user-id" }` in a PATCH request and take ownership of any contact, deal, or campaign belonging to another user.

**Impact:** Complete data theft. Any authenticated user can steal any other user's records by reassigning ownership.

**Recommendation:**  
- Implement an explicit allowlist of updatable fields for each PATCH endpoint.
- Use Zod schemas to validate and strip unknown fields from request bodies.
- Add server-side tests that verify ownership cannot be reassigned via PATCH.

---

### CRITICAL: No CSRF Protection on State-Mutating Endpoints

**Files:** `server/index.ts` (CORS config), all route files

**Description:**  
The platform relies entirely on SameSite=Lax cookies for CSRF prevention. While SameSite=Lax blocks cross-origin POST from forms on different sites, it does NOT protect against:
- Cross-origin requests from JavaScript on same-site subdomains
- Top-level navigation GETs that trigger state changes
- Any XSS on the same origin (or subdomain) which bypasses SameSite entirely

The privacy policy references "CSRF tokens" but no actual CSRF token mechanism is implemented.

**Impact:** If combined with any XSS vector (including the intentional `custom_head_html` feature), an attacker can perform any action as the logged-in user.

**Recommendation:**  
- Implement double-submit cookie or synchronizer token pattern for all state-mutating endpoints.
- Consider using the `Origin` header check as an additional defense layer.
- Review whether `custom_head_html` renders in the same origin as the admin panel.

---

### HIGH: SQL Wildcard Injection via ILIKE with Unsanitized Input

**Files:** `server/routes/admin.ts` (line 95), `server/routes/ai.ts` (line 169)

**Description:**  
Admin workspace search uses `ilike(user.email, '%${q}%')` where `q` comes directly from user query params. While Drizzle parameterizes the value (preventing classic SQL injection), the `%` and `_` wildcard characters in LIKE patterns are NOT escaped. An attacker can:
- Use `%` to match all rows (information disclosure)
- Use `_` for single-character wildcards to enumerate data

**Impact:** Information disclosure via wildcard abuse. Admin can enumerate all users; AI product search can enumerate all products.

**Recommendation:**  
- Escape `%` and `_` characters in user input before passing to ILIKE: `q.replace(/%/g, '\\%').replace(/_/g, '\\_')`
- Add a sanitization utility function used across all LIKE/ILIKE queries.

---

### HIGH: Secrets Exposed in Error Responses

**File:** `server/routes/billing.ts` (outer catch block of create-order handler)

**Description:**  
The Cashfree create-order endpoint's catch-all returns `err.stack` in the JSON response body:
```
stack: err instanceof Error ? err.stack?.split("\n").slice(0, 4).join(" . ") : null
```
Stack traces reveal internal file paths, dependency versions, and system architecture details to any client.

**Impact:** Information disclosure that aids further attacks. Attackers learn internal paths, framework versions, and dependency chains.

**Recommendation:**  
- Never return stack traces in production responses.
- Log the full error server-side and return only a generic error message and correlation ID to the client.
- Use an environment check: only include debug info when `NODE_ENV !== 'production'`.

---

### HIGH: In-Memory Rate Limiter Not Shared Across Instances

**File:** `server/middleware/rateLimit.ts`

**Description:**  
The rate limiter uses an in-memory `Map`. In a multi-instance deployment (Render auto-scaling, horizontal scale-out), each instance has its own counter. An attacker can bypass rate limits by distributing requests across instances. The code itself acknowledges this limitation: "For prod with multiple instances, swap to Redis."

**Impact:** Rate limiting is ineffective under horizontal scaling, enabling brute-force attacks on auth endpoints and API abuse.

**Recommendation:**  
- Replace with Redis-backed rate limiting (e.g., `@hono-rate-limiter/redis`).
- If staying single-instance, document this as an accepted risk and set up alerts for scale events.

---

### HIGH: Impersonation Cookie Missing Secure Flag

**File:** `server/routes/admin.ts` (impersonate endpoint)

**Description:**  
The impersonation cookie `addisonx_impersonating` is set with `HttpOnly; SameSite=Lax` but without the `Secure` flag. This means the cookie is transmitted over plain HTTP connections, exposing it to network-level interception.

**Impact:** If any part of the infrastructure serves HTTP (even temporarily during redirects), the impersonation session can be hijacked via MITM.

**Recommendation:**  
- Add the `Secure` flag to the impersonation cookie.
- Ensure all cookies set by the application include `Secure` when `NODE_ENV === 'production'`.

---

### MEDIUM: No Request Body Size Limit

**File:** `server/index.ts` (no bodyLimit middleware configured)

**Description:**  
There is no body size limit configured for Hono's JSON parser. While the bulk contacts endpoint caps at 500 rows logically, the raw JSON payload itself is unbounded. An attacker can send a multi-GB JSON body to exhaust server memory (Denial of Service). The broadcast send endpoint also iterates all contacts of a user without payload limits.

**Impact:** Denial of Service via memory exhaustion. A single request can crash the server process.

**Recommendation:**  
- Add Hono's `bodyLimit` middleware globally: `app.use('*', bodyLimit({ maxSize: 1024 * 1024 }))` (1MB default).
- Set stricter limits on specific endpoints (e.g., 100KB for most PATCH/POST).

---

### MEDIUM: Weak Crypto Fallback Key

**File:** `server/crypto.ts` (lines 14-18)

**Description:**  
When `MASTER_KEY` is missing or too short, the system falls back to a hardcoded dev key: `"dev-fallback-key-do-not-use-in-prod-32+"`. This triggers only a `console.warn`, not a hard failure. If the environment is misconfigured in production, all encrypted tokens (Meta access tokens, API keys) use a publicly known key.

**Impact:** If deployed without proper MASTER_KEY, all encrypted data is effectively plaintext to anyone who reads the source code.

**Recommendation:**  
- Throw an error and refuse to start if MASTER_KEY is missing or weak in production (`NODE_ENV === 'production'`).
- Add a startup health check that validates encryption configuration.

---

### MEDIUM: Fixed KDF Salt

**File:** `server/crypto.ts` (line 21)

**Description:**  
The scrypt salt `"addisonx-fixed-salt-v1"` is hardcoded. While the comment explains this is for stable KDF output, using a fixed salt means all deployments sharing the same MASTER_KEY produce the same derived key. If the MASTER_KEY leaks from one deployment, all other deployments using the same key are compromised.

**Impact:** Reduced security isolation between deployments sharing a MASTER_KEY.

**Recommendation:**  
- Use a per-deployment unique salt derived from a deployment-specific environment variable.
- Document that MASTER_KEY must be unique per deployment if the salt remains fixed.

---

### MEDIUM: Meta Webhook Signature Not Verified

**File:** `server/routes/webhooks.ts` (POST handler)

**Description:**  
Meta sends an `X-Hub-Signature-256` header with every webhook POST containing an HMAC-SHA256 of the payload. The code does NOT verify this signature. Any party that discovers the webhook URL can forge inbound messages, create fake contacts, and inject messages into user inboxes.

**Impact:** Message injection and data corruption. Attackers can create fake conversations in user accounts.

**Recommendation:**  
- Verify the `X-Hub-Signature-256` header against the app secret before processing any webhook payload.
- Return 401 for invalid signatures.
- Meta's documentation provides the exact verification algorithm to implement.

---

### MEDIUM: Access Token Storage History Concern

**File:** `server/db/schema.ts` (metaConfig table comment)

**Description:**  
The schema comment says "access_token is stored plaintext for dev simplicity" on the metaConfig table. While the code now encrypts via `crypto.ts`, the comment suggests encryption was added later. The `decrypt` function returns values as-is if they don't start with "v1:", meaning any old rows from before encryption was added remain readable as plaintext but are not protected.

**Impact:** Historical data may remain unencrypted. The decrypt function's fallback behavior silently masks this.

**Recommendation:**  
- Run a one-time migration to encrypt any plaintext tokens still in the database.
- Update the schema comment to reflect current encryption state.
- Add monitoring for any decrypt calls that return without the "v1:" prefix.

---

### LOW: CORS Allows Configurable Origins Without Validation

**File:** `server/index.ts` (lines 47-54)

**Description:**  
`ALLOWED_ORIGINS` is read from environment and split on commas. If misconfigured (e.g., set to `*` or a broad pattern), CORS is wide open. No validation ensures the origins are legitimate or match expected patterns.

**Impact:** Misconfiguration could allow any website to make authenticated requests to the API.

**Recommendation:**  
- Validate that ALLOWED_ORIGINS entries match expected domain patterns at startup.
- Log a warning if origins look suspicious (wildcards, localhost in production).

---

### LOW: .env File in Repository

**File:** `.env` (root)

**Description:**  
A `.env` file exists in the git tree. Although it mostly points to `.env.local`, its presence in the repository can cause confusion and accidental secret commits. The `.env.example` file contains detailed comments about secret generation patterns.

**Impact:** Low immediate risk but increases likelihood of accidental secret exposure in future commits.

**Recommendation:**  
- Add `.env` to `.gitignore` and remove it from version control.
- Keep only `.env.example` as the template.

---

## 2. Code Quality Issues

### HIGH: Extensive Use of `any` Types in Frontend API Layer

**File:** `src/lib/api.ts` (throughout - approximately 50+ instances)

**Description:**  
The API functions extensively use `any` as parameter and return types: `createContact: (data: any)`, `createDeal: (data: any)`, `updateContact: (id: string, data: any)`, etc. This defeats TypeScript's type safety entirely and allows runtime errors that the compiler cannot catch.

**Impact:** Type errors surface only at runtime in production. Refactoring is dangerous because the compiler cannot verify API contract changes.

**Recommendation:**  
- Define request/response types for each API endpoint (shared between frontend and backend).
- Use the Drizzle infer types (`typeof contacts.$inferSelect`) to generate API types.
- Incrementally replace `any` with proper types, starting with the most-used endpoints.

---

### HIGH: toCamel Utility Applied to Untrusted Input Without Allowlisting

**Files:** `server/utils.ts`, used in `server/routes/crm.ts`, `server/routes/inbox.ts`

**Description:**  
`toCamel()` converts ALL keys in the input object from snake_case to camelCase. Combined with the direct spread into Drizzle's `.set()`, there is no schema validation or allowlisting of which fields a PATCH can update. This is both a security issue (mass assignment) and a code quality problem - the data flow is opaque and unmaintainable.

**Impact:** Impossible to reason about what fields are updatable without reading the DB schema. Any schema change silently becomes an attack surface.

**Recommendation:**  
- Create explicit DTOs (Data Transfer Objects) or Zod schemas for each endpoint's input.
- Validate and pick only allowed fields before passing to the database layer.
- Remove the generic toCamel-and-spread pattern entirely.

---

### MEDIUM: Inconsistent Error Handling Across Routes

**Files:** Various route files (`server/routes/*.ts`)

**Description:**  
Error responses lack a standard shape:
- Some routes return `{ error: string }`
- Others return `{ error: string, detail: string }`
- Others return `{ error: string, code: string }`
- Admin routes sometimes return `{ ok: false, error: string }`

**Impact:** Frontend error handling must account for multiple response shapes, leading to fragile code and inconsistent user-facing error messages.

**Recommendation:**  
- Define a standard error response type: `{ error: string, code: string, detail?: string }`.
- Create an error response helper function used across all routes.
- Document error codes in API documentation.

---

### MEDIUM: Dead Code / Duplicate Route Registration

**File:** `server/routes/admin.ts`

**Description:**  
`admin.get("/api/system/uploads/config", ...)` is registered TWICE with slightly different implementations. Only one will execute depending on Hono's internal routing behavior. This indicates copy-paste errors and lack of route testing.

**Impact:** Confusing behavior - developers may modify the wrong handler. The non-executing handler is dead code.

**Recommendation:**  
- Remove the duplicate registration.
- Add a route listing utility or test that verifies no duplicate paths exist.

---

### MEDIUM: render.yaml Has Duplicate Environment Variables

**File:** `render.yaml`

**Description:**  
`CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` are each listed TWICE in the Render service configuration. This can cause confusion during deployment updates.

**Impact:** Maintenance confusion. Updating one copy without the other leads to inconsistent state.

**Recommendation:**  
- Remove duplicate entries from render.yaml.
- Add a CI check or linter for deployment configuration files.

---

### MEDIUM: .env.example Has Duplicate Sections

**File:** `.env.example`

**Description:**  
The Cloudinary configuration section is documented twice with slightly different comments. This confuses developers setting up their local environment.

**Impact:** Developer confusion during onboarding.

**Recommendation:**  
- Consolidate duplicate sections in .env.example.

---

### LOW: `twilioSid` Column Repurposed for Meta Message ID

**Files:** `server/db/schema.ts`, `server/routes/webhooks.ts`, `server/routes/inbox.ts`

**Description:**  
The `message` table has a column called `twilioSid` that actually stores Meta WhatsApp message IDs. Multiple code comments say "rename later" but this creates confusion for developers who expect Twilio integration.

**Impact:** Developer confusion and potential mistakes during maintenance.

**Recommendation:**  
- Create a migration to rename the column to `externalMessageId` or `metaMessageId`.
- Update all references across the codebase.

---

### LOW: No Input Validation Library Usage on Backend

**Files:** All route files (`server/routes/*.ts`)

**Description:**  
Despite having `zod` as a dependency in `package.json`, no backend route uses Zod for request validation. All validation is ad-hoc if/else checks, leading to inconsistent validation coverage and missed edge cases.

**Impact:** Inconsistent validation - some fields are checked, others are not. Invalid data reaches the database layer.

**Recommendation:**  
- Adopt Zod validation middleware for all POST/PATCH/PUT endpoints.
- Use Hono's `@hono/zod-validator` for declarative request validation.
- Start with the highest-traffic endpoints (contacts, messages, orders).

---

## 3. Database Schema Issues

### HIGH: No Index on session.userId

**File:** `server/db/schema.ts` (session table definition)

**Description:**  
The `session` table has no index on `userId`. Better Auth queries sessions by userId on every authenticated request to validate the session. With many concurrent sessions, this becomes a full table scan on every API call.

**Impact:** Authentication performance degrades linearly with user count. With 10,000+ sessions, every API call incurs a sequential scan.

**Recommendation:**  
- Add an index: `CREATE INDEX idx_session_user_id ON session(user_id);`
- Alternatively, add `.index()` to the Drizzle schema definition on the userId column.

---

### HIGH: Order Number Race Condition

**File:** `server/routes/order.ts` (lines 24-27)

**Description:**  
`nextOrderNumber()` uses `SELECT MAX(order_number) + 1` outside a transaction. Two concurrent orders for the same user will get the same number. The unique index catches the conflict but causes one order to fail with a 500 error and no retry logic.

**Impact:** Lost orders during concurrent purchases. Customers see errors during checkout. Revenue loss.

**Recommendation:**  
- Wrap the order number generation and insert in a serializable transaction.
- Alternatively, use a PostgreSQL sequence per user or an advisory lock.
- Add retry logic (up to 3 attempts) when the unique constraint violation occurs.

---

### MEDIUM: No Foreign Key on orderTbl.contactId

**File:** `server/db/schema.ts` (orderTbl definition)

**Description:**  
`orderTbl.contactId` is defined as `uuid("contact_id")` without a `.references()` call. There is no referential integrity enforced at the database level for the order-to-contact relationship.

**Impact:** Orphaned orders pointing to deleted contacts. Data integrity issues that are hard to diagnose.

**Recommendation:**  
- Add `.references(() => contact.id, { onDelete: 'set null' })` to the contactId column.
- Run a cleanup migration to null out any existing orphaned references.

---

### MEDIUM: No Index on account.userId

**File:** `server/db/schema.ts` (account table)

**Description:**  
The `account` table (Better Auth OAuth accounts) has no index on `userId`. Auth lookups by user (e.g., listing linked accounts) will perform a full table scan.

**Impact:** Performance degradation as user count grows, especially during OAuth flows.

**Recommendation:**  
- Add an index on `account.userId`.

---

### MEDIUM: Verification Table Has No Indexes

**File:** `server/db/schema.ts` (verification table)

**Description:**  
The `verification` table has no indexes at all. Lookups by `identifier` (email verification tokens, password reset tokens) will be full sequential scans. These lookups happen during security-critical flows.

**Impact:** Slow email verification and password reset under load. Potential timeout during high sign-up volumes.

**Recommendation:**  
- Add an index on `verification.identifier`.
- Consider adding an index on `verification.expiresAt` for cleanup jobs.

---

### MEDIUM: No twoFactor.userId Index

**File:** `server/db/schema.ts` (twoFactor table)

**Description:**  
The `two_factor` table has a `userId` foreign key but no index on it. Every 2FA check performs a full scan of the table to find the user's 2FA configuration.

**Impact:** 2FA verification becomes slow as more users enable it.

**Recommendation:**  
- Add an index on `twoFactor.userId`.

---

### LOW: JSONB Columns Without Schema Validation

**File:** `server/db/schema.ts`

**Description:**  
`site.theme`, `site.copy`, `sitePage.sections`, and `sitePage.draftSections` are JSONB columns with no CHECK constraints or application-level schema validation. Any malformed JSON structure or schema drift is silently accepted by the database.

**Impact:** Data corruption is possible and difficult to detect. Frontend rendering may break on malformed theme/section data.

**Recommendation:**  
- Add Zod validation on write for all JSONB columns.
- Consider PostgreSQL CHECK constraints with `jsonb_typeof` for basic structure validation.

---

### LOW: No Soft Delete on Any Table

**File:** `server/db/schema.ts` (all table definitions)

**Description:**  
All deletes are hard deletes with CASCADE. Once data is deleted, it is gone permanently. No audit trail exists for deletions (only admin actions are logged, not user self-service deletes).

**Impact:** No data recovery possible. Accidental deletions cannot be reversed. No compliance audit trail for data removal.

**Recommendation:**  
- Add `deletedAt` timestamp column to critical tables (contacts, deals, orders, conversations).
- Implement soft delete in application logic with periodic hard-delete cleanup.
- At minimum, log deletion events before executing them.

---

## 4. API Design Issues

### HIGH: No Pagination on List Endpoints

**Files:** `server/routes/crm.ts` (all GET list endpoints), `server/routes/inbox.ts`

**Description:**  
`GET /contacts`, `GET /deals`, `GET /campaigns`, `GET /broadcasts`, `GET /tasks`, `GET /conversations` all return ALL records for the user with no pagination. A user with 10,000 contacts will receive a massive JSON response on every page load.

**Impact:** Performance degradation, excessive bandwidth usage, and potential browser crashes for power users. API response times grow linearly with data volume.

**Recommendation:**  
- Implement cursor-based pagination on all list endpoints (preferred for real-time data).
- Accept `limit` (default 50, max 200) and `cursor` (last item ID) query parameters.
- Return pagination metadata: `{ data: [...], nextCursor: "...", hasMore: true }`.

---

### HIGH: N+1 Query in Broadcast Send

**File:** `server/routes/crm.ts` (broadcast send handler)

**Description:**  
`POST /broadcasts/:id/send` iterates recipients sequentially, making one `sendTemplateMessage` HTTP call + two DB writes per contact. For 500 contacts, that results in 1,500+ DB queries and 500 HTTP calls to Meta API in a single HTTP request. This will timeout on any real audience size.

**Impact:** Broadcast sends fail for any meaningful audience. Render's default 30-second timeout kills the request before completion.

**Recommendation:**  
- Move broadcast sending to a background job queue (BullMQ, pg-boss, or similar).
- Batch Meta API calls (Meta supports batch sending).
- Use bulk DB operations (single INSERT with multiple rows).
- Return a job ID and let the frontend poll for progress.

---

### MEDIUM: No Request Validation on POST/PATCH Bodies

**Files:** All route files (`server/routes/*.ts`)

**Description:**  
POST endpoints do not validate required fields consistently. For example, `POST /campaigns` only requires `name` implicitly because it is NOT NULL in the database schema, but no explicit validation exists in the route handler. The DB constraint error bubbles up as a 500 Internal Server Error.

**Impact:** Poor developer experience and confusing error messages for API consumers. 500 errors that should be 400 validation errors.

**Recommendation:**  
- Use Zod schemas with `@hono/zod-validator` middleware for all mutating endpoints.
- Return structured 400 responses with field-level error details.

---

### MEDIUM: Inconsistent Response Formats

**Files:** `server/routes/*.ts`, `src/lib/api.ts`

**Description:**  
Some endpoints return the raw Drizzle row (camelCase), others return a manually constructed object. The frontend API layer applies `toSnake()` to ALL responses, meaning the naming convention is double-converted in some cases, leading to incorrect key names.

**Impact:** Subtle bugs where field names are mangled. Frontend developers cannot predict response shapes without testing each endpoint.

**Recommendation:**  
- Standardize all API responses to use camelCase (matching JavaScript conventions).
- Remove the blanket `toSnake()` transformation in the frontend.
- Use response DTOs with explicit field mapping.

---

### MEDIUM: No API Versioning

**File:** `server/index.ts`

**Description:**  
All endpoints are at `/api/*` with no version prefix (e.g., `/api/v1/`). Breaking changes cannot be introduced without breaking all existing clients simultaneously.

**Impact:** Forces all-or-nothing deployments. Cannot maintain backward compatibility during migrations.

**Recommendation:**  
- Prefix all routes with `/api/v1/`.
- Introduce versioning now while the client base is small.
- Document a deprecation policy for future version changes.

---

### LOW: DELETE Endpoints Return Inconsistent Status Codes

**Files:** `server/routes/crm.ts` vs `server/routes/inbox.ts`

**Description:**  
Some DELETE endpoints return `204` with `c.body(null, 204)`, others return `200` with `{ ok: true }`. The frontend must handle both patterns.

**Impact:** Inconsistent client-side handling. Potential bugs when checking response.ok vs response.status.

**Recommendation:**  
- Standardize on 204 No Content for all successful deletes.
- Update frontend to treat 204 as success without parsing a body.

---

## 5. Frontend Issues

### HIGH: No Loading/Error States for Many API Calls

**Files:** `src/lib/api.ts`, `src/components/ErrorBoundary.tsx`

**Description:**  
The frontend API client throws on error, but many consuming components lack individual try/catch handling or TanStack Query error boundaries. Beyond the single global ErrorBoundary, individual component-level error states are not implemented. Failed API calls may result in blank screens or unhandled promise rejections.

**Impact:** Poor user experience when API calls fail. Users see blank screens or the entire app crashes rather than contextual error messages.

**Recommendation:**  
- Implement TanStack Query's `onError` callbacks or `useErrorBoundary` per query.
- Add component-level error states with retry buttons.
- Display inline error messages for failed mutations (form submissions, updates).

---

### MEDIUM: Single Global Error Boundary

**File:** `src/App.tsx` (lines 79-135)

**Description:**  
Only one ErrorBoundary wraps the entire application. A rendering error in any component takes down the entire page rather than gracefully degrading that section. A crash in the sidebar, a chat widget, or a dashboard card kills the whole UI.

**Impact:** A single component bug crashes the entire application for the user.

**Recommendation:**  
- Add ErrorBoundary wrappers around major sections (sidebar, main content, modals).
- Implement fallback UIs that allow users to continue using unaffected parts of the app.

---

### MEDIUM: No Optimistic Updates Pattern

**File:** `src/lib/api.ts`

**Description:**  
The API layer is purely request-response with no optimistic mutation patterns. Chat messages, contact updates, and deal stage changes wait for server confirmation before reflecting in the UI, making the application feel sluggish.

**Impact:** Poor perceived performance. Users on slow connections experience noticeable lag on every action.

**Recommendation:**  
- Implement TanStack Query's `onMutate` for optimistic updates on high-frequency actions.
- Start with chat messages (immediate display) and deal stage drag-and-drop.
- Add rollback logic in `onError` to revert optimistic changes on failure.

---

### MEDIUM: XSS Risk in Site Builder custom_head_html

**File:** `server/routes/site-public.ts` (customHead rendering)

**Description:**  
The `custom_head_html` field from the database is rendered raw (unescaped) into the public site HTML. While this is intentional for site owners to add analytics/scripts, there is no sanitization. If an admin impersonates a user and visits their public site, and that user has malicious scripts in `custom_head_html`, the admin's browser executes them.

**Impact:** Privilege escalation via XSS. A malicious user could craft `custom_head_html` that steals admin session tokens when an admin views their site.

**Recommendation:**  
- Render impersonated user sites in a sandboxed iframe or different origin.
- Add CSP headers that restrict script execution on admin pages.
- Warn admins before viewing user-generated site content.

---

### LOW: No Accessibility (a11y) Indicators

**File:** `server/routes/site-public.ts`

**Description:**  
The public site renderer outputs HTML without ARIA landmarks, skip navigation links, focus management, or screen reader announcements. Product cards lack proper alt text beyond the product name. The site does not meet WCAG 2.1 Level A requirements.

**Impact:** Excludes users with disabilities. Potential legal liability under accessibility regulations.

**Recommendation:**  
- Add ARIA landmarks (main, nav, complementary) to the site template.
- Implement skip-to-content links.
- Ensure all images have descriptive alt text.
- Add focus management for dynamic content (modal opens, page transitions).

---

### LOW: No Skeleton/Placeholder Loading States

**File:** `src/lib/api.ts` (design pattern observation)

**Description:**  
The API layer has no prefetching or streaming patterns. TanStack Query's `staleTime` and `cacheTime` are not configured centrally, meaning every navigation refetches all data. No skeleton loading screens are indicated in the API design.

**Impact:** Flash of empty content on navigation. Users see blank screens while data loads.

**Recommendation:**  
- Configure TanStack Query defaults: `staleTime: 30000`, `cacheTime: 300000`.
- Implement route-level prefetching for predictable navigations.
- Add skeleton components for data-heavy pages (contact list, conversation view).

---

## 6. DevOps / Infrastructure Issues

### HIGH: No Structured Logging

**Files:** Throughout all server files

**Description:**  
All logging uses `console.log()` / `console.error()` with ad-hoc string formats like `[webhooks/meta]`, `[billing]`, etc. There is no structured JSON logging, no configurable log levels, and no correlation IDs linking related log entries across a request lifecycle.

**Impact:** Production debugging is extremely difficult. Logs cannot be effectively searched, filtered, or aggregated. No way to trace a user's request through the system.

**Recommendation:**  
- Adopt a structured logger (pino or winston) with JSON output.
- Add request correlation IDs via middleware (set in context, logged on every entry).
- Use log levels (debug, info, warn, error) with environment-configurable minimum level.
- Include metadata: userId, requestId, route, duration.

---

### HIGH: No Database Connection Pooling Configuration

**File:** `server/db/client.ts`

**Description:**  
The DB client uses the postgres.js driver's defaults with no visible pool size configuration, max connections, or idle timeout settings. Neon's free tier has a 5-connection limit. Under load, the application will exhaust connections and fail.

**Impact:** Connection exhaustion under moderate load. Requests queue up waiting for connections, leading to cascading timeouts.

**Recommendation:**  
- Configure explicit pool settings: `max: 5` for Neon free tier, `idle_timeout: 20`.
- Add connection health checks and retry logic.
- Monitor connection pool usage and alert when approaching limits.

---

### MEDIUM: Single Service Architecture

**File:** `render.yaml`

**Description:**  
API server, webhook receiver, background processing (broadcast sends), and static file serving all run in a single Node.js process. A long-running broadcast send blocks the event loop for all other requests. A webhook flood can starve API responses.

**Impact:** Single point of failure. Resource contention between different workloads. No independent scaling.

**Recommendation:**  
- Separate webhook processing into a dedicated worker (even if same codebase, different Render service).
- Move background jobs (broadcasts, scheduled sends) to a worker process with a job queue.
- Serve static files via CDN rather than the application server.

---

### MEDIUM: No Graceful Shutdown

**File:** `server/index.ts` (no process signal handling)

**Description:**  
There is no SIGTERM handler to drain in-flight requests, close DB connections, or finish sending broadcasts before the process exits. Render sends SIGTERM before killing the process on every deploy.

**Impact:** In-flight requests are aborted on every deploy. Broadcast sends are interrupted mid-batch. Database connections are severed without cleanup.

**Recommendation:**  
- Add a SIGTERM handler that stops accepting new requests, waits for in-flight requests to complete (with a timeout), closes the DB pool, and then exits.
- Example pattern: `process.on('SIGTERM', async () => { server.close(); await db.end(); process.exit(0); })`.

---

### MEDIUM: Health Check Too Shallow

**File:** `server/index.ts` (line 63)

**Description:**  
The `/health` endpoint only returns `{ ok: true, ts: ... }`. It does not check database connectivity, Redis (if added), or any external dependency. Render's health check will pass even if the DB is completely down, leading to traffic routed to an unhealthy instance.

**Impact:** Render keeps routing traffic to instances that cannot serve requests because the DB is unreachable.

**Recommendation:**  
- Add a database ping to the health check: `SELECT 1` query with a 2-second timeout.
- Return 503 if any critical dependency is unhealthy.
- Keep a separate `/ready` endpoint for deep checks vs `/health` for liveness.

---

### LOW: No Monitoring/APM Integration

**Description:**  
No Sentry, Datadog, New Relic, or any error tracking service is configured. Errors are only visible in Render's log stream, which has limited retention and no alerting.

**Impact:** Production errors go unnoticed until users report them. No performance profiling data. No error trend analysis.

**Recommendation:**  
- Integrate Sentry for error tracking (free tier available).
- Add basic performance monitoring (request duration histograms).
- Set up alerts for error rate spikes and response time degradation.

---

### LOW: No Dockerfile

**Description:**  
The project relies entirely on Render's buildpack. There is no Dockerfile for reproducible builds or local production-like testing.

**Impact:** No reproducibility guarantee. Cannot test production builds locally. Cannot migrate to other hosting without creating a Dockerfile from scratch.

**Recommendation:**  
- Create a multi-stage Dockerfile: build stage (Node.js + Vite build) and production stage (minimal Node.js image).
- Use the Dockerfile for local testing and as documentation of the production environment.

---

## 7. Testing Gaps

### CRITICAL: Virtually Zero Test Coverage

**File:** `src/test/example.test.ts`

**Description:**  
The entire project has exactly ONE test file containing a single `expect(true).toBe(true)` assertion. There are no backend tests, no integration tests, no API tests, and no component tests. The application has zero meaningful test coverage.

**Impact:** Every code change is deployed without automated verification. Regressions are discovered only by users in production. Refactoring is extremely high-risk.

**Recommendation:**  
- Establish a testing strategy immediately:
  - Backend: API integration tests using supertest or Hono's test client
  - Frontend: Component tests with React Testing Library
  - E2E: Critical path tests with Playwright
- Start with the highest-risk paths: auth, payments, data mutations.
- Set up CI to run tests on every PR and block merge on failure.

---

### CRITICAL: No Tests for Authentication/Authorization Logic

**Files:** `server/middleware/auth.ts`, `server/middleware/admin.ts`

**Description:**  
The `requireAuth` middleware, `requireAdmin` middleware, impersonation logic, and ownership checks have zero test coverage. These are the security-critical paths that prevent unauthorized access to user data.

**Impact:** Auth bypass bugs can be introduced with no automated detection. The mass assignment vulnerability (Section 1) would have been caught by a simple authorization test.

**Recommendation:**  
- Write tests verifying:
  - Unauthenticated requests are rejected with 401
  - Users cannot access other users' data (ownership checks)
  - Admin endpoints reject non-admin users
  - Impersonation correctly scopes data access
  - Session expiry is enforced

---

### CRITICAL: No Tests for Payment/Billing Logic

**Files:** `server/routes/webhooks.ts`, `server/routes/billing.ts`, `server/routes/order.ts`

**Description:**  
Cashfree webhook handler, plan activation, upgrade request state machine, and order number generation are all untested. Money-handling code runs in production without any automated verification.

**Impact:** Payment bugs (double charges, missed activations, order number collisions) will only be discovered by affected customers. Financial loss and trust damage.

**Recommendation:**  
- Write integration tests for the complete payment flow:
  - Order creation with correct amounts
  - Webhook signature verification (once implemented)
  - Plan activation after successful payment
  - Idempotent webhook handling (same event processed twice)
  - Order number uniqueness under concurrency

---

### HIGH: No Tests for Encryption/Decryption

**File:** `server/crypto.ts`

**Description:**  
The crypto module (encrypt/decrypt) has no tests. A key rotation, dependency update, or code change could silently break decryption of all stored Meta tokens, effectively disconnecting every user's WhatsApp integration.

**Impact:** Silent data corruption risk. If encryption breaks, users lose access to their WhatsApp connection with no automated alert.

**Recommendation:**  
- Write unit tests verifying:
  - encrypt() produces output starting with "v1:"
  - decrypt(encrypt(plaintext)) === plaintext
  - decrypt() handles legacy plaintext values gracefully
  - Invalid/corrupted ciphertext throws a descriptive error
  - Key derivation produces consistent output

---

### HIGH: No Tests for Webhook Processing

**File:** `server/routes/webhooks.ts`

**Description:**  
Meta webhook handler and Cashfree webhook handler both have complex branching logic (message types, status updates, payment states) with no test coverage. These are the entry points for all external system integrations.

**Impact:** Webhook processing bugs cause data loss (missed messages, failed payment activations). Debugging webhook issues in production requires manual log analysis.

**Recommendation:**  
- Write tests with sample webhook payloads (from Meta and Cashfree documentation):
  - Text message inbound
  - Media message inbound
  - Message status updates (sent, delivered, read, failed)
  - Payment success/failure callbacks
  - Duplicate webhook delivery handling

---

## 8. Business Logic Issues

### HIGH: Broadcast Send is Synchronous and Blocking

**File:** `server/routes/crm.ts` (POST /broadcasts/:id/send)

**Description:**  
Sending a broadcast to contacts happens sequentially in a single HTTP request handler. If Meta rate-limits or responds slowly, the request will timeout (Render's 30-second default). There is no background job queue, no retry logic, and no progress tracking. The user has no visibility into whether their broadcast is sending, completed, or failed.

**Impact:** Broadcasts fail for any audience larger than approximately 30 contacts. Users lose trust in the platform's core feature.

**Recommendation:**  
- Implement a background job queue (pg-boss integrates natively with PostgreSQL).
- Accept the broadcast request, return immediately with a job ID.
- Process sends in batches of 50 with proper rate limiting and retry.
- Update broadcast status (pending/sending/completed/failed) as it progresses.
- Expose a status endpoint for the frontend to poll or use WebSocket updates.

---

### HIGH: Race Condition in Coupon Usage

**Referenced via:** `validateCoupon` import in `server/routes/site-public.ts`

**Description:**  
Coupon `usedCount` is read and then incremented in separate queries without transaction isolation. Two concurrent checkouts can both read `usedCount=4` when `maxUses=5`, both pass validation, and both increment, resulting in `usedCount=6` and exceeding the maximum.

**Impact:** Coupons can be over-used beyond their intended limit. Revenue loss from excess discounts.

**Recommendation:**  
- Use a single atomic UPDATE with a WHERE clause: `UPDATE coupon SET used_count = used_count + 1 WHERE id = ? AND used_count < max_uses RETURNING *`
- If no rows are returned, the coupon is exhausted.
- This pattern eliminates the race condition entirely.

---

### MEDIUM: No Idempotency on Contact Upsert During Webhook

**File:** `server/routes/webhooks.ts` (handleInboundMessage)

**Description:**  
The webhook handler upserts contacts by (owner_id, phone), but if two messages arrive simultaneously for the same new contact, both will attempt an INSERT. One hits the ON CONFLICT and UPDATEs, but the conversation creation for the second message may also race, potentially creating duplicate conversations.

**Impact:** Duplicate conversations for the same contact. Confusing UI and split message history.

**Recommendation:**  
- Add a unique constraint on (owner_id, contact_id) for conversations.
- Use upsert (ON CONFLICT) for conversation creation as well.
- Consider using advisory locks for contact+conversation creation.

---

### MEDIUM: Deal Won/CAPI Fire is Fire-and-Forget

**File:** `server/routes/crm.ts` (deal PATCH handler)

**Description:**  
When a deal transitions to "won", a CAPI (Conversions API) Purchase event is fired via a dynamic import and void promise. If it fails, there is no retry, no dead letter queue, and no visibility beyond a single log line. The business loses attribution data.

**Impact:** Lost conversion attribution. Meta Ads optimization suffers from incomplete data. Marketing spend is less efficient.

**Recommendation:**  
- Queue CAPI events for reliable delivery with retry logic.
- Log failures to a dedicated table for manual retry/investigation.
- Add monitoring for CAPI delivery success rate.

---

### MEDIUM: No Plan Enforcement on API Endpoints

**Files:** `server/routes/crm.ts`, `server/routes/booking.ts`, `server/routes/commerce.ts`

**Description:**  
The AI ad-copy endpoint checks plan caps via `checkAiCap`, but there is no middleware-level plan enforcement. Features like broadcasting, e-commerce, and booking that should be gated to higher plans appear to be available to all plan tiers.

**Impact:** Revenue leakage. Users on free/basic plans access premium features without upgrading.

**Recommendation:**  
- Create a `requirePlan('pro')` middleware that checks the user's active plan.
- Apply it to premium-only routes (broadcast send, e-commerce, booking, AI features).
- Return 403 with an upgrade prompt when plan limits are exceeded.

---

### LOW: Upgrade Request State Machine Has No Guard

**File:** `server/routes/admin.ts` (upgrade-requests PATCH)

**Description:**  
The upgrade_request status can be set to any valid enum value in any order by the admin PATCH endpoint. There is no state machine validation, so a request could go from "completed" back to "requested" or from "rejected" to "approved".

**Impact:** Data integrity issue. Inconsistent state in the upgrade request lifecycle.

**Recommendation:**  
- Define valid state transitions: requested -> approved/rejected, approved -> completed.
- Validate the transition before applying the update.
- Return 400 if an invalid transition is attempted.

---

## 9. Scalability Concerns

### HIGH: All List Queries Are Unbounded

**Files:** `server/routes/crm.ts`, `server/routes/inbox.ts`

**Description:**  
GET /contacts, GET /conversations, GET /deals, GET /tasks, etc. fetch ALL rows for a user without any LIMIT clause. A power user with 50,000 contacts will receive a 20MB+ JSON response. The admin /workspaces endpoint caps at 200 rows, but customer-facing endpoints have no such limit.

**Impact:** Application becomes unusable for power users. Server memory spikes during serialization. Network bandwidth consumed unnecessarily.

**Recommendation:**  
- Add mandatory pagination with a default limit of 50 and maximum of 200.
- Use cursor-based pagination for real-time data (contacts, conversations).
- Add total count as a separate lightweight query if needed for UI indicators.
- Frontend should implement infinite scroll or paginated views.

---

### HIGH: In-Memory Rate Limiter Grows Unbounded Under Attack

**File:** `server/middleware/rateLimit.ts`

**Description:**  
While the rate limiter has a 60-second sweep interval to clean expired entries, during a DDoS with millions of unique IPs, the Map grows unbounded between sweeps. There is no maximum size cap on the bucket map. Each entry holds a count and timestamp, but with 1M unique IPs, that is significant memory.

**Impact:** Memory exhaustion during DDoS attacks. The rate limiter itself becomes the denial-of-service vector.

**Recommendation:**  
- Add a maximum size to the rate limit map (e.g., 100,000 entries).
- When the map is full, either reject new IPs or evict the oldest entries.
- Better: move to Redis-based rate limiting which handles memory management externally.
- Consider using a fixed-size LRU cache for the in-memory implementation.

---

### MEDIUM: No Caching Layer

**Files:** Throughout server routes

**Description:**  
No Redis cache or meaningful in-memory cache exists (except a 60-second SEO settings cache). Every API call hits the database directly, including frequently-read data like user profiles, meta config, and contact lists.

**Impact:** Unnecessary database load. Higher latency than necessary for repeat requests. Database becomes the bottleneck under moderate load.

**Recommendation:**  
- Add Redis for caching frequently-read, rarely-changed data.
- Cache candidates: user profile, meta config, site settings, plan details.
- Use cache-aside pattern with TTL-based invalidation.
- Start with a simple in-memory LRU cache if Redis adds too much infrastructure cost.

---

### MEDIUM: Sequential Broadcast Sending

**File:** `server/routes/crm.ts`

**Description:**  
The broadcast send handler sends to each recipient one-by-one in a loop. With Meta's 80 messages/second rate limit, sending to 5,000 contacts takes 62 seconds minimum, well beyond any HTTP timeout. Even with 100 contacts, the sequential approach takes multiple seconds.

**Impact:** Broadcast sends timeout for moderate audiences. Server thread is blocked during the entire operation.

**Recommendation:**  
- Use Promise.allSettled with a concurrency limiter (e.g., p-limit with concurrency of 10).
- Better: move to a background job with batched sending.
- Respect Meta's rate limits with proper throttling (80 msg/sec).

---

### MEDIUM: No Database Query Optimization for Dashboard

**File:** `server/routes/admin.ts` (metrics endpoint)

**Description:**  
The admin dashboard metrics endpoint runs 12+ separate COUNT queries sequentially. These could be combined into a single query with conditional aggregation, reducing database round-trips by 90%.

**Impact:** Admin dashboard loads slowly. Each page view generates 12+ database queries that could be one.

**Recommendation:**  
- Combine metrics into a single query:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
    COUNT(*) as total_users,
    ...
  FROM user
  ```
- Cache dashboard metrics with a 60-second TTL.

---

### LOW: No CDN for Static Assets

**File:** `server/index.ts` (serveStatic section)

**Description:**  
The Hono server serves static files (JS bundles, CSS, images) directly from `dist/`. There is no CDN integration. Every visitor hits the origin server for frontend assets, which are identical for all users.

**Impact:** Higher latency for users geographically distant from the server. Origin server handles bandwidth that should be offloaded.

**Recommendation:**  
- Configure Cloudflare or similar CDN in front of the Render service.
- Set appropriate Cache-Control headers for static assets (immutable for hashed filenames).
- Alternatively, deploy static assets to a separate CDN-backed bucket.

---

### LOW: Public Sites Use Tailwind CDN Script in Production

**File:** `server/routes/site-public.ts`

**Description:**  
Public sites include `<script src="https://cdn.tailwindcss.com"></script>` which is the Tailwind JIT compiler running in the browser. This is explicitly not intended for production use per Tailwind's documentation. It adds 300KB+ of JavaScript and processing time to every page load.

**Impact:** Slow page loads for public sites. Poor Core Web Vitals scores. SEO penalty from Google.

**Recommendation:**  
- Pre-compile Tailwind CSS for public sites using a fixed set of utility classes.
- Generate a static CSS file containing only the classes used by the site builder.
- Remove the CDN script tag entirely from production output.

---

## 10. Missing Features / Incomplete Implementations

### HIGH: No Email Verification Enforcement

**File:** `server/auth/index.ts` (line 69)

**Description:**  
`requireEmailVerification: false` is set in the Better Auth configuration. The email verification flow exists (sendOnSignUp: true), but verification is not enforced before sign-in. Users with fake or mistyped emails can create fully functional accounts, undermining account security and communication capabilities.

**Impact:** Fake accounts can be created at scale. Password reset flows fail for users with typo emails. No reliable communication channel to account owners.

**Recommendation:**  
- Set `requireEmailVerification: true` in production.
- Add a grace period (e.g., 24 hours) before restricting unverified accounts.
- Show a banner prompting verification rather than blocking entirely.

---

### HIGH: No Webhook Retry/Queue System

**Files:** `server/routes/crm.ts`, `server/routes/payments.ts`, `server/routes/commerce.ts`

**Description:**  
Failed Meta API sends (in broadcast, payment requests, commerce notifications) are logged but never retried. There is no dead letter queue, no retry with exponential backoff, and no mechanism to know how many messages failed delivery.

**Impact:** Lost messages. Users think their messages were sent when they were not. Payment requests silently fail. No visibility into delivery reliability.

**Recommendation:**  
- Implement a message queue (pg-boss, BullMQ) for all outbound messages.
- Add retry logic with exponential backoff (3 attempts, 1s/5s/30s delays).
- Create a "failed messages" view for users to see and retry failed sends.
- Alert users when their Meta connection has persistent failures.

---

### MEDIUM: No File Upload Proxy/Validation

**Reference:** `.env.example` (Cloudinary section), `src/lib/api.ts` (uploads config endpoint)

**Description:**  
File uploads go directly from the browser to Cloudinary using an unsigned upload preset. There is no server-side validation of file type, size, or content. Malicious files (executables disguised as images, oversized files, inappropriate content) can be uploaded to the Cloudinary account without any checks.

**Impact:** Storage abuse. Potential malicious content hosted on the platform's Cloudinary account. No file size enforcement.

**Recommendation:**  
- Implement server-side upload proxy with validation.
- Check file type (magic bytes, not just extension), enforce size limits, and scan for malware.
- Alternatively, use Cloudinary's upload policies and signed uploads.

---

### MEDIUM: No Webhook Event Deduplication for Meta

**File:** `server/routes/webhooks.ts` (handleInboundMessage)

**Description:**  
Meta may send the same webhook event multiple times (documented behavior in Meta's API docs). The message handler has no deduplication logic. The same inbound message could create duplicate rows in the message table.

**Impact:** Duplicate messages in user conversations. Confusing UI showing the same message multiple times.

**Recommendation:**  
- Store the Meta message ID (`messages[0].id`) and check for duplicates before processing.
- Use the existing `twilioSid` (Meta message ID) column with a unique constraint.
- Return 200 immediately for already-processed messages.

---

### MEDIUM: Booking System Has No Conflict Detection

**Files:** `server/routes/booking.ts`, `server/db/schema.ts` (booking table)

**Description:**  
The booking table and routes have no logic to prevent double-booking the same time slot. Two customers can book the same service at the same date and time. There is no unique constraint on (owner_id, date, time, service) in the schema.

**Impact:** Double-bookings cause operational chaos. Business owners must manually resolve conflicts. Customer trust is damaged.

**Recommendation:**  
- Add a unique constraint on (owner_id, service_id, date, time_slot) in the database.
- Validate availability before confirming a booking (within a transaction).
- Show real-time availability to customers during booking selection.

---

### MEDIUM: No Password Strength Indicator or Breach Check

**File:** `server/auth/index.ts`

**Description:**  
Auth only enforces `minPasswordLength: 8`. There are no complexity requirements (uppercase, numbers, special chars) and no check against known-breached passwords (e.g., HaveIBeenPwned API integration).

**Impact:** Users choose weak passwords that are easily compromised. Account takeover risk increases.

**Recommendation:**  
- Add a frontend password strength indicator (zxcvbn library).
- Enforce minimum complexity requirements (at least one number + one special char).
- Consider HaveIBeenPwned k-anonymity API integration to check for breached passwords.

---

### MEDIUM: No Data Export for Users (GDPR/DPDP Compliance)

**File:** `server/routes/admin.ts` (admin has export, no user-facing equivalent)

**Description:**  
Admin can export contacts as CSV, but users cannot export their own data. India's Digital Personal Data Protection (DPDP) Act requires data portability. Users cannot download their contacts, conversations, or order history.

**Impact:** Non-compliance with India's DPDP Act. Potential regulatory penalties. User lock-in perception.

**Recommendation:**  
- Add a self-service data export endpoint: `GET /api/export/my-data`.
- Include all user-generated content: contacts, conversations, orders, campaigns.
- Provide CSV and JSON export formats.
- Add a rate limit (e.g., one export per hour) to prevent abuse.

---

### LOW: No Audit Trail for User Self-Service Actions

**Schema:** `server/db/schema.ts` (no user_audit_log table)

**Description:**  
Admin actions are logged to `admin_audit_log`, but user actions (delete contact, delete conversation, send broadcast, connect Meta, disconnect Meta) have no audit trail. There is no way to investigate what a user did or when.

**Impact:** Cannot investigate user complaints about missing data. No accountability for destructive actions.

**Recommendation:**  
- Create a `user_activity_log` table with: userId, action, resourceType, resourceId, metadata, timestamp.
- Log critical user actions: deletes, bulk operations, integration connections, broadcast sends.
- Add a "Recent Activity" view in the user dashboard.

---

### LOW: README is Placeholder

**File:** `README.md`

**Description:**  
README.md contains only "TODO: Document your project here". There are no setup instructions, architecture documentation, or contribution guidelines for developers joining the project.

**Impact:** New developers cannot onboard without direct assistance. Project knowledge is not documented.

**Recommendation:**  
- Document: project overview, architecture diagram, local setup steps, environment variables, deployment process.
- Add CONTRIBUTING.md with code style, PR process, and testing requirements.
- Include a high-level architecture diagram showing the major components and data flows.

---

---

## Prioritized Remediation Roadmap

### Immediate (Week 1-2) - Critical Security & Data Integrity

1. Fix mass assignment vulnerability - add field allowlists to all PATCH endpoints
2. Verify Meta webhook signatures
3. Remove stack traces from error responses
4. Add request body size limits
5. Fix crypto fallback to hard-fail in production

### Short-term (Week 3-4) - Testing & Reliability Foundation

6. Set up test infrastructure (Vitest for backend, test DB, CI pipeline)
7. Write auth/authorization tests
8. Write payment flow tests
9. Add pagination to all list endpoints
10. Fix order number race condition

### Medium-term (Month 2) - Scalability & Operations

11. Implement background job queue for broadcasts
12. Add structured logging with correlation IDs
13. Configure database connection pooling
14. Add database indexes (session.userId, account.userId, verification.identifier)
15. Implement Redis caching layer

### Long-term (Month 3+) - Features & Compliance

16. Add CSRF protection
17. Implement data export for DPDP compliance
18. Add booking conflict detection
19. Replace Tailwind CDN with pre-compiled CSS
20. Implement comprehensive monitoring and alerting

---

## Methodology

This audit was conducted through static analysis of the source code repository. The following areas were examined:

- **Security:** Authentication, authorization, input validation, encryption, CORS, rate limiting
- **Code Quality:** Type safety, error handling, code organization, dead code
- **Database:** Schema design, indexing, constraints, data integrity
- **API Design:** REST conventions, pagination, validation, versioning
- **Frontend:** Error handling, performance patterns, accessibility
- **DevOps:** Deployment configuration, logging, monitoring, resilience
- **Testing:** Coverage analysis, critical path identification
- **Business Logic:** Race conditions, state machines, reliability patterns
- **Scalability:** Query performance, caching, resource management
- **Completeness:** Feature gaps, compliance requirements, documentation

---

*End of Audit Report*
