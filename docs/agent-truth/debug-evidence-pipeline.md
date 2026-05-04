# Debug Evidence Pipeline

Status: public beta diagnostics doctrine  
Recorded: 2026-05-03  
Artifacts: `agent/state/debug-evidence-index.generated.json`, `agent/state/precatch-runtime-issues.generated.json`

## Doctrine

KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits. Runtime issues already detected by the app must become pre-catcher issue candidates before relying on manual bug reports. Support uses one unified inbox model, with admin routes able to list/read/reply to all support threads and users scoped only to their own threads. Debug evidence writes must never block user flows.

## Buckets

- `debug_evidence`: append-only event records for individual runtime/client/server/admin findings.
- `debug_evidence_rollups`: fingerprint rollups used by audits and pre-catcher scripts.
- `runtime_warning_records`: existing runtime warning lane that remains a canonical observability source.

## Evidence Contract

The shared contract lives in `src/lib/debug-evidence-contract.ts`.

Records include source, severity, category, route/component, optional entity ids, a human message, sanitized technical detail, fingerprint, first/last seen timestamps, occurrence count, status, and optional report/support links. Public generated artifacts use redacted audit summaries only and must not include support message bodies, emails, authorization tokens, or protected content URLs.

## Write Paths

- Client issue reports use `reportClientIssue`, store local diagnostics, then enqueue a non-blocking same-origin write to `/api/debug/evidence`.
- Server route diagnostics use `recordRouteDiagnostic` and write evidence in parallel with existing `server_diagnostics`.
- API auth/permission failures are captured through `handleApiError`, including support/admin 401 and 403 outcomes.
- Evidence write failures are swallowed after a console warning. They must never fail a user, support, admin, payment, auth, or content flow.

## Audit Injection

`scripts/agent/inject-debug-evidence.ts` writes the redacted evidence index. `scripts/agent/load-debug-evidence-for-audit.ts` maps recent records into deterministic audit domains:

- layout receives layout/chat/performance evidence.
- hydration receives hydration/runtime/network and layout-adjacent evidence.
- economy receives wallet/purchase/unlock evidence.
- telemetry receives telemetry, route, support, permissions, and runtime evidence.
- contentProtection receives drops/content protection evidence.
- support receives support, permissions, auth, route, and Firestore rule evidence.

Each domain gets at most 10 records sorted by severity, occurrence count, and recency.

## Admin Debug Control Tower

`GET /api/admin/debug/control-tower` loads recent redacted debug evidence through `listRecentDebugEvidence` and combines it with generated score reports through `src/lib/admin-debug-control-tower.ts`. The admin UI shows concise evidence cards with source, fingerprint, last seen, and occurrence count. It does not render raw support message bodies, emails, protected URLs, tokens, or giant JSON blocks by default.

Missing generated evidence renders as missing or unavailable. Stale generated evidence renders as stale. The Control Tower must never convert absent runtime evidence into a healthy state.

## Pre-Catcher

`npm run precheck:runtime-issues` reads the redacted evidence index and writes `agent/state/precatch-runtime-issues.generated.json`.

The pre-catcher groups repeated or high-severity diagnostics into issue candidates for repeated layout warnings, chat focus instability, API 401/403/500, support permission failures, Firebase read failures, unsupported telemetry events, purchase/unlock failures, notification fetch errors, content protection warnings, and hydration/module failures.

## Support Truth

The Admin Support Workspace uses the admin support API routes as the source of truth:

- `GET /api/admin/support/threads`
- `GET /api/admin/support/threads/[threadId]`
- `POST /api/admin/support/threads/[threadId]`
- `PATCH /api/admin/support/threads/[threadId]`

The user support API remains scoped to the caller. Firestore rules allow admin reads and owner reads for `support_threads` and nested `support_messages`, while all client writes remain denied.

## Validation

Use:

- `npm run debug:evidence:inject`
- `npm run precheck:runtime-issues`
- `npm run check:debug-evidence-pipeline`

Do not use Playwright, Lighthouse, Cypress, full `npm run check`, or broad UI audit lanes for this pipeline unless a deterministic finding explicitly escalates to runtime visual verification.
