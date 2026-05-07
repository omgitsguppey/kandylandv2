# Phase 1 Truth Audit

Generated: 2026-05-06  
Scope: source-only Phase 1 overnight truth gate.  
Method: repo inspection plus targeted deterministic validators. No deploy, Playwright, Cypress, Lighthouse, or full `npm run check`.

## Starting State
- latest commit SHA: `aec5d53347d2b1c8cd5e364c1391ce9a645053a8`
- worktree at start: clean
- dirty files at start: `0`
- deleted files at start: `0`
- untracked files at start: `0`

## Category Audit

### 1. Versioning and release notes
- true:
  - Visible version is `1.2.1`.
  - Odometer versioning is implemented through `src/lib/release-notes/beta-odometer-version.ts`.
  - `src/lib/release-notes/public-release-notes.ts` and `public/kandydrops-release-notes.json` agree on `currentVersion`, `betaReleaseCounter`, and note payload.
  - Release-note UI is user-facing and the badge wiring is real.
- false:
  - Release-note automation coverage for recent Admin Debug and daily-task lifecycle truth changes is incomplete; two validators fail on required copy strings in `scripts/release/update-public-changelog.ts`.
- stale:
  - none proven in the generated public/bundled artifacts themselves.
- legacy:
  - `migrateLegacyVersionToBetaCounter("1.113.4")` exists as a legacy migration path.
- score: `88`

### 2. Service worker/cache freshness
- true:
  - `src/lib/firebase-messaging.ts` registers the worker with `?v=${PUBLIC_APP_VERSION}`.
  - `public/firebase-messaging-sw.js` versions managed cache names, clears older managed caches on activate, and limits shell caching to selected public routes.
  - `src/components/PwaRuntimeBridge.tsx` exposes a refresh prompt on `KANDYDROPS_APP_UPDATE_EVENT`.
- stale risk:
  - Worker script still has a default internal fallback version string (`v3`) if query params are absent.
  - Browser/runtime verification was not run, so this lane cannot exceed source-only confidence.
- safe to keep visible:
  - update prompt and public route caching
- score: `91`

### 3. Admin Analytics
- true:
  - Session storage keys are version-scoped by `PUBLIC_APP_VERSION`.
  - Snapshot truth/freshness/source labels are pervasive.
  - Estimated guest/public traffic is explicitly labeled rather than forced to zero.
- stale:
  - `src/app/admin/analytics/AnalyticsHelpers.tsx` uses `keepPreviousData: true` and `revalidateOnFocus: false` for historical override reads.
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` also uses `keepPreviousData: true` in multiple slices.
- simulative:
  - Override slices can continue showing prior range data while the new range is refetching, which looks current unless the operator notices slice truth labels.
- algorithmic refinement:
  - conversion/range slices still need stronger per-slice stale invalidation and a clearer "loading next range" state.
- safe to keep visible:
  - core analytics modules, because source/freshness labels are explicit and the overview validator passes
- score: `78`

### 4. Admin Debug
- true:
  - Primary reads on `src/app/admin/debug/page.tsx` now revalidate on focus and visibility return.
  - Polling remains.
  - Manual refresh remains.
  - Route unseen/no-sample handling is grounded by `src/lib/server/route-runtime-health.ts` default `lastResult: "no_sample"`.
  - AI assistant fallback/live distinction is explicit in `src/lib/server/ai-debug-assistant.ts` via `fallback_used`, `response_state`, and `displayed_summary_freshness`.
- false:
  - `check:admin-debug-control-tower` fails because release-note automation text coverage is behind the current debug truth lane.
- stale:
  - Secondary advanced data-validation reads still use `keepPreviousData: true` with `revalidateOnFocus: false`.
- simulative:
  - no current evidence of fake healthy route rows from source; the no-sample default is explicit
- quarantine:
  - none applied in source tonight
  - if manual browser review finds the advanced validation panel misleading operators, quarantine that non-core subpanel rather than broad Debug truth
- score: `74`

### 5. Admin AI
- true:
  - Persisted UI state is version-scoped by `ADMIN_AI_UI_SCHEMA_VERSION` and `PUBLIC_APP_VERSION`.
  - Server dashboard hydration and local prompt draft hydration are separated.
  - Main dashboard poller does not keep prior server data.
  - Shared model registry exists in `src/lib/admin-ai-models.ts`.
  - Reference cap is explicitly enforced at `2`.
  - Debug assistant fallback/live distinction is explicit.
- uncertain:
  - exact provider-side runtime model resolution beyond configured aliases remains provider-dependent.
- stale:
  - none proven on the primary dashboard fetch.
- score: `88`

### 6. Platform Economy/GumDrops
- true:
  - Treasury truth is server-derived in `src/lib/server/platform-economy.ts`.
  - `$1 = 100 GD` base and `$0.50 / 100 GD` warning floor are codified.
  - Paid/bonus/reward source split is explicit and validator-backed.
  - Progressive hydration is implemented in `src/app/admin/economy/components/PlatformEconomyConsole.tsx`.
- stale/review:
  - Some treasury freshness labels are still `unknown` or `review` when upstream snapshot freshness is not live.
- algorithmic refinement:
  - none urgent in treasury math from this audit; current remaining work is mostly freshness presentation and browser confirmation
- safe to keep visible:
  - current economy console
- score: `89`

### 7. Tasks
- true:
  - `DAILY_TASK_LIMIT = 3`.
  - Daily check-in is pinned outside the random pool.
  - Reward bounds are clamped between `10` and `1000`.
  - Reset window/state fields are explicit (`dailyTaskWindowId`, `assignedAtUtc`, `expiresAtUtc`, `resetAtUtc`).
  - Daily task telemetry validator passes.
- false:
  - lifecycle validator currently fails on missing release-note automation copy, not on a source-lifecycle contradiction found in code.
- algorithmic refinement:
  - none immediate from source; next work is release-note coverage plus browser confirmation that reset/open states render honestly
- score: `82`

### 8. Telemetry/parity/event facts
- true:
  - Event-fact contract is explicit and validator-backed.
  - Alias normalization is broad and deterministic.
  - Notification behavioral truth is normalized to `notification_read`; opened/clicked remain diagnostics.
  - Identified parity score passes `100/100`.
- legacy:
  - `legacy` remains a valid event source label, but not canonical current truth.
- simulative:
  - no validator-backed evidence of string-check-only parity pretending to be runtime truth in the lanes run tonight
- score: `92`

### 9. Watch/viewer/library
- true:
  - Viewer watch-session capture quality distinguishes `full`, `replayed`, `gap_detected`, `flush_degraded`, and `close_missing`.
  - Server rollups still label `legacy_page_duration` fallback explicitly.
  - Watch-time validator passes.
- stale:
  - Pending replay storage key `kd_viewer_watch_pending_v1` is not app-version-scoped.
- algorithmic refinement:
  - replay storage invalidation should include app version
  - remaining confidence/recovery scoring still depends on deterministic thresholds that deserve future tuning, not copy changes
- score: `84`

### 10. Notifications
- true:
  - `/api/notifications` is user-scoped, trusted-origin guarded, and uses ETag plus runtime version invalidation.
  - First open/visibility focus refresh exists in `useNotifications`.
  - Notification read telemetry validator passes.
  - Actor/target ownership is explicit in notification-read and clear events.
- stale:
  - 304 reuse is intentional; stale risk is low because runtime versions invalidate the ETag.
- score: `87`

### 11. Chat/support
- true:
  - Chat shell uses dedicated mobile viewport shell constants and route-stable recovery logic.
  - Support uses focus revalidation and polling.
- stale/simulative:
  - `src/components/Support/SupportInbox.tsx` uses `keepPreviousData: true` for both thread list and selected-thread detail, so prior thread detail can stay visible during selection changes.
- algorithmic refinement:
  - support selected-thread ownership should switch to a no-stale-detail transition model
- safe to keep visible:
  - chat route
  - support inbox, with the stale-detail risk documented
- score: `80`

### 12. Drops/purchase/wallet
- true:
  - Drops feed uses ETag and `private, no-cache, must-revalidate`.
  - Purchase telemetry and unlock telemetry validators pass.
  - PayPal capture route is strongly guarded and verifies user, package, and price before crediting balances.
  - Wallet single-PayPal button validator passes.
- stale:
  - `src/app/api/wallet/packages/route.ts` is publicly cacheable with `stale-while-revalidate=3600`.
  - `src/components/PurchaseModal.tsx` loads packages once per mounted session using `fetch('/api/wallet/packages')` and `packagesLoaded`, so the modal can keep stale package data after deploy or config change.
- algorithmic refinement:
  - wallet package freshness should be versioned or explicitly invalidated on focus/open
- safe to keep visible:
  - current purchase flow, because core balance/price verification is server-enforced
- score: `79`

### 13. Legacy/junk/codebase hygiene
- true:
  - Legacy registry is explicit and validator-backed.
  - Current worktree started clean.
- legacy keep:
  - guarded drop preview modal fallback
  - guarded `/drops?drop=` flow until removal deadline
  - synthetic admin view-as as deprecated/guarded
  - realtime-ish admin users route until hot-cache migration closes
- remove later:
  - all registry items already marked `remove_by_deadline` or `deprecated`
- score: `86`

## False Surfaces
- surface: Admin Debug release-note readiness
  - file: `scripts/release/update-public-changelog.ts`
  - what it claims: release-note automation is current enough to satisfy debug readiness validation
  - why false: `check:admin-debug-control-tower` fails on missing required copy strings for current debug truth improvements
  - severity: medium
  - safe fix: add the required user-facing/internal note strings without weakening the validator
- surface: Daily task lifecycle release-note readiness
  - file: `scripts/release/update-public-changelog.ts`
  - what it claims: release-note automation covers current daily-task lifecycle truth
  - why false: `check:daily-task-lifecycle` fails on a missing required release-note copy string
  - severity: medium
  - safe fix: add the missing daily-task lifecycle note string without weakening the validator

## Simulative Surfaces
- surface: Admin Analytics override slices
  - file: `src/app/admin/analytics/AnalyticsHelpers.tsx`
  - what looks real: prior historical range data stays visible while a new range fetch is in flight
  - missing source/proof: fresh confirmation on focus and explicit "reloading next range" state
  - whether to fix, quarantine, or remove: fix
  - severity: medium
- surface: Support selected thread detail
  - file: `src/components/Support/SupportInbox.tsx`
  - what looks real: previously selected thread detail can linger while another thread is loading
  - missing source/proof: authoritative current-thread load completion before rendering detail
  - whether to fix, quarantine, or remove: fix
  - severity: medium

## Stale Surfaces
- surface: Admin Analytics historical override slices
  - stale owner: `src/app/admin/analytics/AnalyticsHelpers.tsx`
  - current invalidation: 60s polling
  - missing invalidation: focus refresh and stricter no-carryover behavior for primary truth slices
  - safe fix: restore `revalidateOnFocus` for primary override reads or stop preserving previous data where freshness matters
- surface: Purchase modal package list
  - stale owner: `src/components/PurchaseModal.tsx`, `src/app/api/wallet/packages/route.ts`
  - current invalidation: first successful modal fetch and server cache TTL
  - missing invalidation: client version/focus/open invalidation after deploy or package config change
  - safe fix: refetch on open/focus with version-aware keying
- surface: Viewer pending watch-session replay storage
  - stale owner: `src/hooks/useViewerWatchSession.ts`
  - current invalidation: owner UID check and age cap
  - missing invalidation: app-version scoping
  - safe fix: include `PUBLIC_APP_VERSION` or schema version in the storage key

## Algorithmic Refinements Needed
- algorithm: Admin Analytics slice invalidation
  - current weakness: prior override-range data can appear current until refetch settles
  - proposed deterministic refinement: split primary-truth vs secondary-truth slice policy and revalidate primary slices on focus
  - files likely involved: `src/app/admin/analytics/AnalyticsHelpers.tsx`, `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - risk: medium
  - whether to do before KreditFlow or after: before
- algorithm: Support selected-thread state ownership
  - current weakness: detail fetch keeps previous thread content visible across selection changes
  - proposed deterministic refinement: clear thread detail on thread-id change unless the cache matches the same thread id
  - files likely involved: `src/components/Support/SupportInbox.tsx`
  - risk: medium
  - whether to do before KreditFlow or after: before
- algorithm: Wallet package freshness
  - current weakness: one-shot modal fetch plus public SWR cache can preserve stale package truth
  - proposed deterministic refinement: version-scoped or focus/open-triggered package refresh, while keeping server verification strict
  - files likely involved: `src/components/PurchaseModal.tsx`, `src/app/api/wallet/packages/route.ts`
  - risk: medium
  - whether to do before KreditFlow or after: before
- algorithm: Viewer replay storage invalidation
  - current weakness: replay storage is schema-only, not release-version-aware
  - proposed deterministic refinement: add app-version scoping to the pending replay storage key
  - files likely involved: `src/hooks/useViewerWatchSession.ts`
  - risk: low
  - whether to do before KreditFlow or after: after, if the current replay diagnostics stay truthful

## Safe To Keep Visible
- Beta badge and release-note drawer
- PWA update prompt
- Admin AI control tower
- Platform Economy console
- Chat shell
- Drops feed and unlock flow
- Notifications bell and inbox

## Should Be Quarantined
- none proven enough for code quarantine from a source-only audit
- if manual browser review confirms misleading operator states, the best quarantine candidates are non-core Admin Debug advanced subpanels rather than core admin routes

## Needs Uylus Decision
- Whether to treat the release-note automation validator failures as a hard Phase 1 blocker tonight or defer them into a small documentation-only cleanup before KreditFlow.
- Whether wallet package freshness should be tightened before Phase 2 even though server-side purchase verification remains correct.

## Scores
- Versioning/release notes: `88`
- Service worker/cache freshness: `91`
- Admin Analytics: `78`
- Admin Debug: `74`
- Admin AI: `88`
- Platform Economy: `89`
- Tasks: `82`
- Telemetry/event facts: `92`
- Watch/viewer: `84`
- Notifications: `87`
- Chat/support: `80`
- Drops/purchase/wallet: `79`
- Legacy/code hygiene: `86`
- Overall Phase 1 readiness: `81`

## Validation Summary
- pass:
  - `npm run typecheck`
  - `npm run check:beta-versioning`
  - `npm run check:beta-release-notes`
  - `npm run check:pwa-service-worker`
  - `npm run check:admin-analytics-overview`
  - `npm run check:admin-ai-control-tower`
  - `npm run check:admin-user-behavior-truth`
  - `npm run check:platform-economy-treasury`
  - `npm run check:gumdrop-source-of-funds-truth`
  - `npm run check:daily-task-reward-economy`
  - `npm run check:daily-task-telemetry-truth`
  - `npm run check:event-fact-truth`
  - `npm run check:telemetry-identified-parity`
  - `npm run check:watch-time-truth-v2`
  - `npm run check:notification-read-truth`
  - `npm run check:purchase-telemetry-truth`
  - `npm run check:unlock-telemetry-truth`
  - `npm run check:privacy-consent-truth`
  - `npm run check:legacy-phaseout`
  - `npm run check:wallet-single-paypal-button`
- fail:
  - `npm run check:admin-debug-control-tower`
  - `npm run check:daily-task-lifecycle`

## KreditFlow Readiness
Answer: `No`

Blockers before KreditFlow:
- release-note automation text coverage must catch up to current Admin Debug and daily-task truth validators
- Admin Analytics override slice freshness still allows stale carryover
- wallet package freshness is not self-reliant enough yet for Phase 2 confidence
- support selected-thread detail still risks stale carryover during thread changes
