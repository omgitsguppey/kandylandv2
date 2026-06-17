# Admin Truth Inventory

Generated: 2026-06-17
Scope: Phase 1 admin truth inventory after deploy-readiness repair, current-head score refresh, and operator-verified App Hosting rollout.
Evidence class: source inspection plus generated snapshot review. This document is not runtime/provider/admin proof.
Current code version reviewed: `5b41d01b75aa3e2a7600257c7b8c6b1d860c6611`.

## Current Gate State

- Deploy source baseline: `npm run typecheck`, `npm run build`, `npm run check:release-notes`, `npm run check:beta-score`, and `npm run check:current-beta-exit-status` passed after deploy-readiness and score-refresh commits through `5b41d01b`.
- External check boundary: `96cb4353` classifies Firebase App Hosting, Google Cloud Build, and Graphite as external check providers. Source validators cannot clear those app/provider checks.
- Operator deploy evidence: Firebase App Hosting / deploy gate was verified externally by the operator on 2026-06-17. Treat this as operator-provided external provider evidence, not as source-only proof and not as PayPal/provider smoke evidence.
- Current local source validators after `5b41d01b`: `npm run check:ci-release-discipline`, `npm run check:environment-deployment-truth`, `npm run typecheck`, `npm run build`, `npm run check:release-notes`, `npm run check:beta-score`, and `npm run check:current-beta-exit-status` passed.
- Current beta/generated evidence was refreshed in `5b41d01b`; the committed `public-beta-score` and `current-beta-exit-status` artifacts embed source head `96cb4353` because they were generated before the artifact commit. Formal proof lanes inside them still show stale/missing provider, runtime, visual, and admin truth evidence.
- Public beta score evidence remains blocked by formal evidence, not source-only failures. Payment/provider/billing, runtime provider proof, and admin truth sample evidence remain external/formal gates.
- PR inventory: 7 open PRs were visible through public GitHub REST during this pass, all Dependabot dependency-update PRs (#353 through #359). Treat them as a separate dependency window, not merge-wholesale release cleanup.

## Account-Free Admin UI Test Access

Source owner: `src/lib/admin/admin-ui-test-session.ts`.
Bootstrap route: `src/app/api/admin-ui-test-session/route.ts`.
Auth bridge: `src/app/layout.tsx` and `src/context/AuthContext.tsx`.
Validator: `tests/unit/admin-ui-test-session.spec.ts`.

The repo already has a local-only reusable admin UI fixture. It is hard-disabled in production, requires `NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1`, expires after 30 minutes, can only redirect to `/admin` paths, and cannot issue Firebase ID tokens. It is suitable for local admin layout and source-state browser checks without creating real test accounts.

Direct in-app browser path:

1. Start local dev with `NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1`.
2. Open `/api/admin-ui-test-session?redirect=/admin`.
3. Navigate admin routes normally.

What it proves: local admin route rendering, local fixture source-missing states, compact layout smoke.
What it does not prove: real admin permissions, Firebase token access, provider/runtime/admin truth, payment/GumDrop evidence, or deployed Firebase App Hosting health.

## Surface Inventory

| Surface | Admin route | Source owner | Route owner | Telemetry / debug owner | Hydration / live evidence | Last updated evidence | Stale or duplicate state | Manual gate | Cleanup action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Overview | `/admin` | `src/app/admin/page.tsx` | `src/app/api/admin/overview/route.ts` | Admin overview diagnostics and Control Tower summaries | Dashboard source panels plus readiness snapshots | Source inspected at `5b41d01b`; readiness artifacts refreshed in `5b41d01b` with embedded source head `96cb4353` | Can inherit stale proof-lane snapshots even when score artifacts are refreshed | Formal release/provider/admin truth gates | Keep summary-first; show stale/current explicitly; do not treat generated reports as live truth. |
| Analytics | `/admin/analytics` | `src/app/admin/analytics/page.tsx`, `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` | `src/app/api/admin/analytics/*` | `src/lib/admin-analytics-*`, panel hydration resolver, telemetry parity reports | Snapshot-first hot cache, manual refresh, limited realtime/fallback route | Source inspected at `5b41d01b`; prior source-label commits current | `realtime` language and fallback evidence still need cleanup; duplicate chips can sprawl | Runtime/provider/admin truth samples; external analytics evidence | Phase 2/3: retain snapshot/hot-cache states, remove non-owned realtime presentation, compact source labels. |
| Debug / Control Tower | `/admin/debug` | `src/app/admin/debug/page.tsx`, `src/lib/admin-debug-control-tower.ts`, `src/app/admin/debug/components/*` | `src/app/api/admin/debug/*` | Debug evidence contracts, route runtime health, Control Tower report normalization | Generated report cards plus debug evidence and realtime route hooks | Control Tower source current; many report inputs stale | Generated snapshots can look authoritative unless currentHead/sourceCommit is checked | Formal runtime/admin/provider proof lanes | Keep raw lanes drilldown; default to grouped root cause and next action; stale reports stay stale. |
| Users | `/admin/users` | `src/app/admin/users/page.tsx` | `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/realtime/route.ts` | Person metrics, identity handoff, behavioral rollup, runtime facts | User summary snapshots plus optional realtime route | Identity/person metric fixes landed before current head; generated parity is incomplete/stale | Global activity must not clear user/person truth | Runtime route sample and admin truth sample | Phase 2: confirm missing-vs-zero labels in UI; retire nonessential realtime dependency unless explicitly owned. |
| User Detail | `/admin/user/[userId]` | `src/app/admin/user/[userId]/page.tsx` | `src/app/api/admin/user/[userId]/route.ts` | Watch-time rollup, user behavior rollup, support, transactions | Per-user facts, watch sessions, purchases, support, creator state | Source current; proof artifacts still stale by head | Diagnostic estimates and legacy watch totals must not become canonical watch time | Real admin sample for a bounded user record | Preserve collecting/source_missing/materializer_missing states; keep payment/provider facts protected. |
| Drops / Queue | `/admin/drops`, `/admin/queue` | `src/app/admin/drops/page.tsx`, `src/app/admin/queue/page.tsx` | `src/app/api/admin/drops/*`, `src/app/api/admin/queue/*` | Creator drop workflow diagnostics, queue parity, route runtime health | Admin review queue, creator submission status, visibility decisions | Source current; formal runtime queue evidence not current | Creator-visible/user-hidden approval chain is protected | Admin truth sample and runtime queue health | Keep approval status explicit; do not expose pending creator drops to users without admin approval. |
| Roster / Creator Review | `/admin/roster` | `src/app/admin/roster/page.tsx` | `src/app/api/admin/roster/*`, creator admin action routes | Creator onboarding diagnostics, queue parity, creator account controls | Creator onboarding, agreements, ID docs, fan experience settings | Source current; generated creator evidence not reviewed in this pass | Broad bounded reads and dense panels can mask source_missing fixture state | Real admin session for creator records and document access | Compact roster rows; full legal/source detail belongs in Debug/details. |
| Economy / Treasury | `/admin/economy` | `src/app/admin/economy/components/PlatformEconomyConsole.tsx` | `src/app/api/admin/economy/*`, `src/app/api/admin/balance/route.ts` | Treasury reconciliation, canonical math ledger, recovery queue, payment evidence | Platform economy snapshots, grants, promos, redemptions, adjustments | Source current; treasury/math/provider evidence not current | Unknown legacy and analytics-only events must not display as exact money truth | Payment/provider/billing and protected manual review | Phase 4 only: label paid GD, bonus GD, reward GD, grants, refunds, adjustments, unknown legacy without changing math. |
| Support | `/admin/support` | `src/app/admin/support/page.tsx`, `src/components/Support/SupportInbox.tsx` | `src/app/api/admin/support/*` | Support policy surface, debug evidence, route runtime health | Unified support inbox; support thread refresh remains realtime-like by product need | Source current | Polling every 10 seconds is acceptable only if support doctrine keeps support realtime | Runtime sample for support route health | Preserve retryable, permission denied, missing thread, submitted, received states; avoid raw error leakage. |
| Moderation | `/admin/moderation` | `src/app/admin/moderation/page.tsx` | `src/app/api/admin/moderation/*` | Moderation risk/debug evidence | Evidence-weighted moderation rows | Source current | Screenshot-like/browser heuristics must remain weak context | Real moderation evidence sample | Do not claim confirmed scrape/screenshot evidence from browser/PWA heuristics. |
| Content | `/admin/content` | `src/app/admin/content/page.tsx` | `src/app/api/admin/content/route.ts` | Media lifecycle and private access validators | Storage asset listing and actions; fixture mode says source_missing | Source current | Archive/delete affordances must not look live if not implemented | Storage/provider proof and private media access verification | Phase 3: hide/disable unavailable lanes; no media deletion/provider calls from cleanup. |
| Privacy | `/admin/privacy` | `src/app/admin/privacy/page.tsx`, `src/app/admin/AdminPrivacyPreflight.tsx` | `src/app/api/admin/privacy/preflight/route.ts` | Privacy consent truth, telemetry gates, identity handoff | Privacy preflight and consent policy status | Recent consent handoff commits current | Fixture mode correctly reports source_missing; external analytics proof remains external | Real admin/privacy sample if needed | Keep client/server/admin consent mode reconstruction aligned; do not imply external analytics proof. |
| AI Ops | `/admin/ai` | `src/app/admin/ai/hooks/useAdminAiState.tsx`, AI section components | `src/app/api/admin/ai/*` | AI admin debug assistant, route runtime health, cost guardrails | Snapshot refresh interval and reference/gallery/template routes | Source current | AI/provider availability is not deploy proof; polling must remain bounded | Provider/runtime evidence for AI actions | Keep budget/source/fallback state compact; no provider calls during admin cleanup. |
| Release / Readiness | Admin Debug and release docs | `src/lib/release-readiness/*`, `src/lib/config-hardening/*` | Source validators and Cloud Build/App Hosting external providers | Public beta score, release notes, CI discipline, generated report authority | Source-owned validators plus external proof lanes | `ci-release-discipline` passed after `96cb4353`; beta score/current-exit refreshed in `5b41d01b`; App Hosting gate operator-verified externally | External provider checks can stall independently of source config; generated score artifacts still cannot clear stale proof lanes | Firebase App Hosting, Cloud Build trigger, provider smoke, admin truth sample | Attach operator/provider evidence outside source checks; keep payment/provider/admin truth proof lanes explicit. |

## Evidence Boundary Snapshot

| Artifact | Current state | What it proves | What it does not prove | Next action |
| --- | --- | --- | --- | --- |
| `ci-release-discipline` | Current source boundary passed after `96cb4353` | GitHub workflows, Cloud Build YAML, App Hosting/Cloud Build/Graphite boundaries are classified | Actual Firebase/GCP/GitHub provider health | Keep external provider checks separate from source release discipline. |
| `environment-deployment-truth` | Passed after `5b41d01b` validation run | Source deploy config is registered and sane | App Hosting rollout success or provider secret presence | Use the operator-verified deploy gate as external evidence; do not convert it into source proof. |
| `current-beta-exit-status` | Refreshed in `5b41d01b`; embedded source head `96cb4353`; status remains stale evidence | Current beta exit classification for the refreshed source snapshot | Runtime/provider/admin proof or payment/provider smoke | Keep stale proof lanes visible until formal artifacts are refreshed or attached. |
| `public-beta-score` | Refreshed in `5b41d01b`; embedded source head `96cb4353`; health score `69.89`, launch gate `owner_review` | Public beta source/readiness score snapshot | Runtime/provider/admin proof or payment/provider smoke | Treat score as current source evidence only; formal proof lanes remain separate. |
| `admin-browser-surface-smoke` | Source-only, stale by head | Local/admin browser boundary classification | Authenticated runtime/admin truth or provider proof | Use local fixture for Browser audits; attach real admin evidence separately. |
| `admin-truth-source-sample` | Source-ready but stale | Admin sample path existed historically | Current redacted admin truth sample | Refresh with current redacted admin sample when approved. |
| `admin-truth-sample-evidence` | Historical formal pass, stale | A formal sample existed on June 3 | Current admin truth gate | Attach fresh sample evidence for current head. |
| `route-health-reconciliation` | Delayed with last sample, stale | Route health listener has prior sample state | Current route health | Keep delayed visible; do not mark healthy from source-only checks. |
| `telemetry-identified-parity` | Source pass shape, incomplete envelope metadata | Source-level identified parity checks passed historically | Runtime/provider/admin proof or current-head formal lock | Refresh final parity lock only in telemetry/final signoff slice. |
| `final-parity-telemetry-lock` | Source gate true, runtime/provider/admin gates false, stale | Formal proof boundaries exist | Full telemetry proof | Keep review/blocked until runtime/provider/admin proof classes are fresh. |

## Manual Gates To Replace Where Safe

- Replace source-only manual gates with user/server/activity truth for auth, creator drops, chat/support, tasks, notifications, drops/watch, user tracking, admin hydration, route health, and generated report freshness.
- Use public user activity as runtime/parity evidence only when event envelopes, normalizers, identity handoff, person metrics, materializers, panel hydration, and source-state display are connected.
- Keep payment/provider/billing and final visual layout QA as manual/external proof gates.
- Account-free admin UI fixture removes the need for a real test account for local layout audits, but does not clear real admin data or provider gates.

## Phase 2/3 Cleanup Queue

1. Admin Analytics: finish snapshot-vs-realtime separation; remove non-owned live language; use cached/refresh_due instead of stale for verified hot cache.
2. Debug / Control Tower: group duplicate generated-report warnings and show compact root cause plus next action by default.
3. Admin Users / User Detail: verify missing-vs-zero and identity/materializer labels in visible UI; keep global activity separate from user/person truth.
4. Content / CMS: hide or disable unavailable archive/delete lanes instead of showing them as broken live tools.
5. Economy / Treasury: relabel protected money states only; do not change math, wallet, PayPal, pricing, or creator revenue.
6. Release / Readiness: keep refreshed score/exit artifacts attached to their source snapshot; external provider checks and proof lanes stay external.

## Validators For The Next Slices

- `npm run check:admin-debug-control-tower`
- `npm run check:admin-truth`
- `npm run check:admin-analytics-no-pure-realtime`
- `npm run check:refresh-based-hot-cache`
- `npm run check:telemetry-identified-parity`
- `npm run check:global-cost`
- `npm run check:agent-context`
- `npm run agent:test -- tests/unit/admin-ui-test-session.spec.ts`
