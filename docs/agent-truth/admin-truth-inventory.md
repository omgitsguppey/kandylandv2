# Admin Truth Inventory

Generated: 2026-06-16
Scope: Phase 1 inventory after deploy-readiness fix.
Evidence class: source inspection plus generated snapshot review. This document is not runtime/provider/admin proof.

## Current Gate State

- Deploy gate: `npm run typecheck`, `npm run build`, `npm run check:release-notes`, `npm run check:beta-score`, and `npm run check:current-beta-exit-status` passed on `main`.
- Public beta score: 69.89, status `Stale evidence`.
- Formal evidence still required: provider smoke, manual screenshot QA, runtime/admin truth samples where reports name stale or missing artifacts.
- PR inventory: 0 open PRs by GitHub connector after local `gh` was unavailable. No PRs need merging or closure for this cleanup phase.

## Surface Inventory

| Surface | Admin route | Source owner | Route owner | Hydration / evidence | Stale or duplicate state | Cleanup action |
| --- | --- | --- | --- | --- | --- | --- |
| Overview | `/admin` | `src/app/admin/page.tsx` | `src/app/api/admin/overview/route.ts` | Admin dashboard source panels and generated readiness summaries | Depends on stale score/evidence snapshots for launch confidence | Keep summary-first. Do not show stale generated reports as healthy. |
| Analytics | `/admin/analytics` | `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` | `/api/admin/analytics`, `/historical`, `/realtime`, `/refresh` | Snapshot modules, hot cache, live pulse panel | `live` language and realtime-ish panels still need contract review; no polling should remain unless explicit realtime owner exists | Phase 2/3: classify snapshot vs realtime lanes; remove redundant live badges; keep cached/refresh_due distinct from stale truth. |
| Debug / Control Tower | `/admin/debug` | `src/lib/admin-debug-control-tower.ts`, `src/app/admin/debug/components/*` | `/api/admin/debug`, `/api/admin/debug/control-tower` | Generated report cards plus debug evidence store | Many reports are stale snapshots; live evidence is separate from source-only proof | Keep generated reports evidence-only; compact root causes and next actions; raw lanes stay drilldown. |
| Users | `/admin/users` | `src/app/admin/users/page.tsx` | `/api/admin/users`, `/api/admin/users/realtime` | Admin user summary snapshots and optional realtime route | User/person truth must not be cleared by global activity; realtime route needs explicit owner if retained | Phase 2: verify missing-vs-zero labels and remove nonessential realtime dependency. |
| User Detail | `/admin/user/[userId]` | `src/app/admin/user/[userId]/page.tsx` | `/api/admin/user/[userId]` | User facts, watch sessions, transactions, support, creator ops | Protected identity and watch-time truth; missing daily rows must not imply zero | Preserve collecting/source_missing/materializer_missing states and bounded read caps. |
| Drops / Queue | `/admin/drops`, `/admin/queue` | `src/app/admin/drops/page.tsx`, `src/app/admin/queue/page.tsx` | `/api/admin/drops`, `/api/admin/queue`, `/api/admin/queue/toggle` | Admin queue and creator drop state | Creator submitted/user visible approval truth is protected | Keep creator-visible/user-hidden approval chain intact; compact duplicate queue status panels. |
| Roster / Creator Review | `/admin/roster` | `src/app/admin/roster/page.tsx` | `/api/admin/roster`, creator admin action routes | Creator onboarding, queue, relationship samples | Broad bounded reads; creator approval and permissions are protected | Keep statuses explicit: pending, review, approved, denied, missing docs, source cap reached. |
| Economy / Treasury | `/admin/economy` | `src/app/admin/economy/components/PlatformEconomyConsole.tsx` | `/api/admin/economy/*`, `/api/admin/balance` | Platform economy, treasury, packages, promos, redemptions, drift | Payment/GumDrop math/provider proof is protected. Unknown legacy cannot display as exact truth | Phase 4 only: show paid GD, bonus GD, reward GD, grants, refunds, adjustments, inferred/pending/reversed labels. |
| Support | `/admin/support` | `src/app/admin/support/page.tsx`, `src/components/Support/SupportInbox.tsx` | `/api/admin/support/threads/*` | Unified support inbox and debug evidence adjacency | Admin support actions must not count as user behavior | Preserve retryable failure, permission denial, missing thread, submitted, received states. |
| Moderation | `/admin/moderation` | `src/app/admin/moderation/page.tsx` | `/api/admin/moderation/*` | Source-confirmed risk alerts and threads | Browser/PWA screenshot heuristics must not be treated as confirmed platform proof | Keep weak heuristic labels and source-confirmed risk distinction. |
| Content | `/admin/content` | `src/app/admin/content/page.tsx` | `/api/admin/content` | Storage asset listing/upload/delete controls | Archive/delete lanes must be hidden, disabled, or unavailable if not implemented | Phase 3: simplify unavailable states without exposing private media or entitlement truth. |
| Privacy | `/admin/privacy` | `src/app/admin/privacy/page.tsx` | `/api/admin/privacy/preflight` | Privacy preflight and consent policy | Privacy/consent gates must share account/server telemetry truth | Keep source labels explicit; do not imply external analytics proof. |
| AI Ops | `/admin/ai` | `src/app/admin/ai/hooks/useAdminAiState.tsx` | `/api/admin/ai/*` | Admin AI budget, model, prompt, gallery, feedback | AI/provider availability is not deploy proof | Keep budget/source/fallback state compact; no provider calls during cleanup. |

## Manual Gates To Replace Where Safe

- Replace source-only manual gates with user/server/activity truth for auth, creator drops, chat/support, tasks, notifications, drops/watch, user tracking, admin hydration, route health.
- Keep payment/provider/billing and final visual layout QA as manual/external proof gates.
- Public user activity can support runtime/parity only when normalizers, identity handoff, event envelope, and materializers are connected; it cannot clear provider proof.

## Risk Register For Later Phases

- Admin analytics still contains live/realtime naming and display logic that needs snapshot-vs-realtime separation.
- Control Tower consumes many generated snapshots; stale reports must stay visibly stale, missing, or unavailable.
- Admin user and user-detail surfaces are identity-sensitive; global activity must not clear person-level truth.
- Economy/Treasury is protected. Do not touch PayPal callbacks, wallet balances, GumDrop source-of-funds, pricing, or creator revenue math without targeted tests.
- Admin browser smoke evidence is unauthenticated boundary evidence only. It does not prove authenticated admin UI layout or admin truth samples.

## Next Phase Entry Points

1. `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` and `/api/admin/analytics/*`: classify realtime vs snapshot, remove noncontracted polling/live language.
2. `src/app/admin/debug/components/DebugControlTower*.tsx` and `src/lib/admin-debug-control-tower.ts`: compact stale/missing next actions and reduce duplicate badges.
3. `src/app/admin/users/page.tsx`, `src/app/admin/user/[userId]/page.tsx`, and user admin routes: verify missing-vs-zero and identity/materializer labels.
4. `src/app/admin/economy/components/PlatformEconomyConsole.tsx`: inventory protected treasury labels only; defer math/provider changes.

## Validators For Phase 2/3

- `npm run check:admin-debug-control-tower`
- `npm run check:admin-truth`
- `npm run check:admin-analytics-realtime-dependency-audit`
- `npm run check:refresh-based-hot-cache`
- `npm run check:telemetry-identified-parity`
- `npm run check:global-cost`
- `npm run check:agent-context`
