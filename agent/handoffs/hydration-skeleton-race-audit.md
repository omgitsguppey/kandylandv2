# Codex Handoff

## Task
Audit hydration, skeleton, and race-condition risks sitewide.

## Result
Status: completed

## Summary
- Admin Analytics, Admin Debug, and Admin AI are the highest stale-risk surfaces because they combine `keepPreviousData` with muted focus revalidation and persistent browser state.
- Service worker versioning now refreshes the public shell, but admin/session snapshot state is still not version-scoped, so deploy freshness is still inconsistent.
- A few primary shells still collapse instead of reserving a stable frame during loading, especially generic admin loading and some list/detail surfaces.
- The clearest race candidates are chat thread/detail loading, admin users realtime refresh, support thread selection, and viewer watch session replay/flush ownership.
- The most obvious avoidable load delay is admin economy waiting for all six panels before any section becomes usable.

## Highest Priority Findings
- Rank: 1
  - Surface: Admin Analytics
  - Files: `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - Category: refresh freshness
  - Severity: critical
  - Exact issue: Historical overview snapshots and filter state are stored in `sessionStorage`, while multiple SWR reads use `keepPreviousData: true` and `revalidateOnFocus: false`.
  - Why it affects refresh/load speed/freshness: a refresh can hydrate last-session analytics before fresh admin truth arrives, and focus does not aggressively correct it.
  - Safe fix: version the analytics storage keys by app version or snapshot schema version, and stop suppressing focus revalidation on the core analytics reads.
  - Uncertainty: low

- Rank: 2
  - Surface: Admin Debug
  - Files: `src/app/admin/debug/page.tsx`
  - Category: refresh freshness
  - Severity: critical
  - Exact issue: core debug, preferences, and assistant summary all use `keepPreviousData: true` with `revalidateOnFocus: false`; manual refresh fans out across multiple mutates.
  - Why it affects refresh/load speed/freshness: after deploy, old debug truth can stay visible until polling or manual refresh completes, which undermines live-fix verification.
  - Safe fix: keep previous data only for clearly non-blocking slices, restore focus revalidation for primary truth cards, and centralize refresh ownership.
  - Uncertainty: low

- Rank: 3
  - Surface: Admin AI
  - Files: `src/app/admin/ai/hooks/useAdminAiState.tsx`
  - Category: hydration
  - Severity: high
  - Exact issue: the surface mixes polling SWR data with persisted collapsed-module preferences and local prompt draft state, while still using `keepPreviousData`.
  - Why it affects refresh/load speed/freshness: a fresh deploy can load an old panel shape and previous response while the latest AI runtime data is still in flight.
  - Safe fix: scope persisted UI state to app version or schema version and separate local draft hydration from server dashboard hydration.
  - Uncertainty: low

- Rank: 4
  - Surface: Deploy freshness across admin surfaces
  - Files: `src/lib/firebase-messaging.ts`, `src/components/PwaRuntimeBridge.tsx`, `public/firebase-messaging-sw.js`, `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - Category: refresh freshness
  - Severity: high
  - Exact issue: service worker cache names and registration are version-aware now, but admin `sessionStorage` snapshots are not.
  - Why it affects refresh/load speed/freshness: the app shell can update correctly while old admin snapshot state rehydrates immediately after reload.
  - Safe fix: clear or namespace persistent admin snapshot keys on app-version mismatch.
  - Uncertainty: low

- Rank: 5
  - Surface: Support inbox thread detail
  - Files: `src/components/Support/SupportInbox.tsx`
  - Category: race
  - Severity: high
  - Exact issue: thread list and selected thread both use `keepPreviousData: true`; switching `selectedThreadId` can leave the previous thread detail visible while the next request is pending.
  - Why it affects refresh/load speed/freshness: users can momentarily see stale message detail after selecting another ticket.
  - Safe fix: gate detail rendering by the active key or clear detail state on thread change unless the response key matches the current selection.
  - Uncertainty: low

- Rank: 6
  - Surface: Chat thread list/detail
  - Files: `src/components/Chat/ChatExperience.tsx`
  - Category: race
  - Severity: high
  - Exact issue: chat has multiple async owners for the same visible state: initial thread fetch, selected-thread detail fetch, Firestore thread listeners, RTDB presence, optimistic send updates, and route search-param sync.
  - Why it affects refresh/load speed/freshness: the file already uses request id refs for some paths, which shows prior races existed; remaining ownership complexity still makes stale overwrite or out-of-order hydration plausible.
  - Safe fix: keep one owner per visible slice: list, selected thread summary, selected thread detail, and optimistic composer state.
  - Uncertainty: medium

- Rank: 7
  - Surface: Admin Users
  - Files: `src/app/admin/users/page.tsx`
  - Category: race
  - Severity: high
  - Exact issue: summary, list, and behavior leaderboard refresh independently while a realtime event stream debounces invalidations and reconnects.
  - Why it affects refresh/load speed/freshness: separate fetches can land out of order, producing mixed-time admin truth after refresh or stream reconnect.
  - Safe fix: snapshot the refresh generation and only commit list/summary/leaderboard responses from the latest generation.
  - Uncertainty: medium

- Rank: 8
  - Surface: Platform Economy
  - Files: `src/app/admin/economy/components/PlatformEconomyConsole.tsx`
  - Category: waterfall
  - Severity: high
  - Exact issue: six endpoints are fetched in parallel, but the UI waits to write the combined result object after all requests settle.
  - Why it affects refresh/load speed/freshness: one slow admin-economy endpoint delays first useful content for the whole console.
  - Safe fix: commit each section slice as it resolves, while keeping the tab shell stable.
  - Uncertainty: low

- Rank: 9
  - Surface: Generic admin loading shell
  - Files: `src/app/admin/loading.tsx`
  - Category: skeleton
  - Severity: high
  - Exact issue: the generic admin loading state is a centered spinner in `h-[50vh]` instead of a shell-sized frame.
  - Why it affects refresh/load speed/freshness: routes can collapse during loading, then expand sharply when the real admin page hydrates.
  - Safe fix: replace the spinner-only placeholder with a stable min-height frame matching the admin route lane.
  - Uncertainty: low

- Rank: 10
  - Surface: Notifications inbox
  - Files: `src/hooks/useNotifications.ts`, `src/app/api/notifications/route.ts`, `src/components/Navigation/NotificationBell.tsx`
  - Category: refresh freshness
  - Severity: medium
  - Exact issue: the client combines optimistic local mutation, ETag-based `304` reads, visibility/focus refresh rules, and deferred warm loading.
  - Why it affects refresh/load speed/freshness: the inbox can intentionally lag until open/focus/warm-ready even when server notification state already changed.
  - Safe fix: keep ETag, but make the initial open path always force one authoritative refresh and treat optimistic local state as temporary.
  - Uncertainty: medium

## Hydration Ownership Map
- Surface: Beta/release notes
  - First-render source: bundled fallback in `src/lib/release-notes/public-release-notes.ts`
  - Refresh source: `fetch("/kandydrops-release-notes.json?v=<appVersion>")` in `src/hooks/usePublicReleaseNotes.ts`
  - Persistent storage involved: none
  - Server cache involved: public JSON plus service worker/static caching path
  - SWR involved: no
  - Risk: medium
  - Suggested restructuring: keep bundled fallback only as bootstrap; treat fetched JSON as the sole current-version truth after mount.

- Surface: PWA/service worker runtime
  - First-render source: current app shell assets and installed service worker
  - Refresh source: `registerAppServiceWorker()` plus worker `updatefound/controllerchange`
  - Persistent storage involved: browser Cache Storage
  - Server cache involved: service-worker-managed app shell/runtime caches
  - SWR involved: no
  - Risk: high
  - Suggested restructuring: keep versioned worker ownership, but pair it with version-scoped client snapshot invalidation.

- Surface: Admin Analytics
  - First-render source: session snapshot + SWR cached previous response + optional snapshot registry state
  - Refresh source: admin polling SWR endpoints and realtime hook
  - Persistent storage involved: `sessionStorage`
  - Server cache involved: admin hot-cache APIs and ephemeral route cache downstream
  - SWR involved: yes
  - Risk: critical
  - Suggested restructuring: one freshness order: versioned browser snapshot -> first live fetch -> realtime patch; remove silent stale reuse on focus.

- Surface: Admin Debug
  - First-render source: previous SWR response and persisted debug preferences
  - Refresh source: polling SWR, realtime debug hooks, and manual `Promise.all` refresh
  - Persistent storage involved: debug preferences route-backed persistence
  - Server cache involved: admin debug snapshot routes
  - SWR involved: yes
  - Risk: critical
  - Suggested restructuring: one authoritative debug snapshot owner per panel, with focus refresh enabled for primary truth.

- Surface: Admin Users
  - First-render source: local React state after independent summary/list fetches
  - Refresh source: realtime event stream + debounced summary/list/leaderboard fetches
  - Persistent storage involved: none found
  - Server cache involved: uncertain
  - SWR involved: no
  - Risk: high
  - Suggested restructuring: refresh generation token across summary/list/leaderboard so responses cannot interleave stale and fresh slices.

- Surface: Platform Economy
  - First-render source: client `useEffect` fetch fanout in `PlatformEconomyConsole`
  - Refresh source: none after mount
  - Persistent storage involved: none found
  - Server cache involved: admin economy APIs may use hot-cache route doctrine downstream
  - SWR involved: no
  - Risk: high
  - Suggested restructuring: section-by-section hydration with per-slice loading states instead of one full fan-in commit.

- Surface: Dashboard home
  - First-render source: server props in `src/app/dashboard/page.tsx`
  - Refresh source: route reload/navigation only
  - Persistent storage involved: none found in page entry
  - Server cache involved: `dynamic = "force-dynamic"`
  - SWR involved: no
  - Risk: low
  - Suggested restructuring: none required from the audited evidence.

- Surface: Chat
  - First-render source: client state in `ChatExperience`
  - Refresh source: thread fetch, detail fetch, Firestore listener, RTDB presence, optimistic send reconciliation
  - Persistent storage involved: none found
  - Server cache involved: none obvious at client boundary
  - SWR involved: no
  - Risk: high
  - Suggested restructuring: reduce visible state owners; detail should be keyed strictly to current `selectedThreadId`.

- Surface: Drops
  - First-render source: mixed; public/server routes plus client viewer state
  - Refresh source: route navigation and asset fetches
  - Persistent storage involved: none found in inspected files
  - Server cache involved: public route SWR/cache contracts
  - SWR involved: uncertain across all drops routes
  - Risk: medium
  - Suggested restructuring: keep public/server seeding, but ensure viewer-side asset state stays keyed to drop id and asset index only.

- Surface: Experiences
  - First-render source: server props for drops/creator rail, then client auth/UI state
  - Refresh source: route reload/navigation
  - Persistent storage involved: auth/session context outside inspected file
  - Server cache involved: public route cache contract
  - SWR involved: no in inspected entry
  - Risk: low
  - Suggested restructuring: none clear from inspected evidence.

- Surface: Wallet/Purchase
  - First-render source: fixed local package constants
  - Refresh source: client fetch to `/api/wallet/packages` on modal open
  - Persistent storage involved: none
  - Server cache involved: public package route cache headers
  - SWR involved: no
  - Risk: medium
  - Suggested restructuring: keep static bootstrap, but key modal package hydration to a cancellable request and stable loading frame.

- Surface: Notifications
  - First-render source: local React state, empty until user/open/warm-ready gate passes
  - Refresh source: `authFetch("/api/notifications")`, ETag `304`, focus/visibility sync, optimistic local reconciliation
  - Persistent storage involved: none
  - Server cache involved: ETag/private revalidate on `/api/notifications`
  - SWR involved: no
  - Risk: medium
  - Suggested restructuring: keep optimistic local state isolated from authoritative refresh and force a keyed refresh on open.

- Surface: Viewer/Library
  - First-render source: library uses server props + auth state; viewer uses client content fetch and session storage replay buffer
  - Refresh source: route reload, viewer asset fetch, watch session flush/replay
  - Persistent storage involved: `sessionStorage` for pending watch sessions
  - Server cache involved: asset/API routes, uncertain from inspected subset
  - SWR involved: no
  - Risk: medium
  - Suggested restructuring: keep watch replay storage versioned/owned by session schema, not indefinitely reusable pending entries.

- Surface: Support
  - First-render source: SWR previous data + selected-thread state
  - Refresh source: 10s poll and manual mutate
  - Persistent storage involved: none found
  - Server cache involved: authenticated support APIs
  - SWR involved: yes
  - Risk: high
  - Suggested restructuring: selected-thread detail should clear or skeletonize on key change unless the matching response arrives.

## Skeleton / Loading State Issues
- Surface: Generic admin shell
  - File: `src/app/admin/loading.tsx`
  - Loading state: centered spinner in `h-[50vh]`
  - Loaded state: full admin route shell
  - Collapse/shift risk: high; primary shell height is not reserved
  - Safe fix: replace with a stable full-lane skeleton frame.

- Surface: Admin Analytics
  - File: `src/app/admin/analytics/loading.tsx`
  - Loading state: header + four cards only
  - Loaded state: dense multi-panel analytics console
  - Collapse/shift risk: medium; top cards are reserved, but the rest of the admin analytics lane appears later.
  - Safe fix: extend the loading frame to reserve more of the final page structure.

- Surface: Support inbox detail
  - File: `src/components/Support/SupportInbox.tsx`
  - Loading state: short “Loading thread...” block
  - Loaded state: full transcript + reply composer
  - Collapse/shift risk: high
  - Safe fix: reserve the transcript/reply frame while the selected thread is loading.

- Surface: Library empty/loading
  - File: `src/app/dashboard/library/LibraryClient.tsx`
  - Loading state: pulse blocks for a grid
  - Loaded state: full header/filter/grid shell
  - Collapse/shift risk: medium
  - Safe fix: keep the filter/header lane visible during auth-gated loading.

- Surface: Notification dropdown
  - File: `src/components/Navigation/NotificationBell.tsx`
  - Loading state: compact skeleton rows
  - Loaded state: full notification cards
  - Collapse/shift risk: low
  - Safe fix: none urgent; skeleton height is reasonably close.

## Race Condition Candidates
- Surface: Chat
  - File/function: `src/components/Chat/ChatExperience.tsx` / `loadThreads`, `loadThreadDetail`, realtime thread listener, optimistic send reconciliation
  - Async trigger: route param changes, thread selection, listener updates, send completion
  - State written: `threads`, `selectedThreadId`, `selectedDetail`
  - Existing guard: request id refs for thread list/detail; selected-thread ref checks
  - Missing guard: no single owner for list/detail/live merge ordering
  - Safe fix: keep request-id gating and add one reducer-style owner per visible slice
  - Confidence: medium

- Surface: Admin Users
  - File/function: `src/app/admin/users/page.tsx` / realtime `connect`, `scheduleRefresh`, `fetchSummary`, `fetchUsers`, `fetchBehaviorLeaderboard`
  - Async trigger: SSE invalidation, reconnects, page/filter changes
  - State written: summary, users, behavior leaderboard, realtime state
  - Existing guard: `AbortController`, `cancelled`, reconnect timer cleanup
  - Missing guard: no refresh generation token across the three independent fetches
  - Safe fix: stamp each refresh wave and ignore stale responses
  - Confidence: high

- Surface: Support
  - File/function: `src/components/Support/SupportInbox.tsx` / selected thread SWR key changes + `mutateSelectedThread`
  - Async trigger: selecting a thread, creating a thread, replying, reopening
  - State written: selected thread detail
  - Existing guard: SWR keying
  - Missing guard: visible detail is allowed to reuse previous data for a new key
  - Safe fix: clear or key-lock detail render on `selectedThreadId` transition
  - Confidence: high

- Surface: Viewer watch session
  - File/function: `src/hooks/useViewerWatchSession.ts`
  - Async trigger: heartbeat flush, close flush retry, replay recovery, asset switches, visibility changes
  - State written: pending session storage, flush queue refs, watch session state
  - Existing guard: refs, retry cleanup, queued flush ownership
  - Missing guard: version/schema invalidation for replayed pending entries
  - Safe fix: scope pending watch-session storage to app/session schema version
  - Confidence: medium

## Refresh Freshness Risks
- Surface: Admin Analytics
  - File: `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - Stale owner: `sessionStorage` snapshots + `keepPreviousData`
  - Current invalidation: none tied to app version
  - Missing invalidation: deploy/app-version invalidation
  - Safe fix: versioned storage keys and stricter refresh ownership.

- Surface: Admin Debug
  - File: `src/app/admin/debug/page.tsx`
  - Stale owner: `keepPreviousData` with `revalidateOnFocus: false`
  - Current invalidation: polling and manual refresh
  - Missing invalidation: focus/deploy freshness correction
  - Safe fix: restore focus refresh for primary truth reads.

- Surface: Admin AI
  - File: `src/app/admin/ai/hooks/useAdminAiState.tsx`
  - Stale owner: local persisted module state + previous SWR responses
  - Current invalidation: none tied to app version
  - Missing invalidation: app-version or preference-schema invalidation
  - Safe fix: namespace persisted preferences/drafts by versioned schema.

- Surface: Notifications
  - File: `src/hooks/useNotifications.ts`
  - Stale owner: optimistic local state + ETag `304` + delayed warm/open fetch
  - Current invalidation: focus if older than 120s, runtime sync event, open
  - Missing invalidation: explicit authoritative refresh on panel open
  - Safe fix: one forced refresh on first open after mount.

- Surface: Viewer watch replay
  - File: `src/hooks/useViewerWatchSession.ts`
  - Stale owner: `sessionStorage` replay buffer
  - Current invalidation: max-age cleanup and owner uid filtering
  - Missing invalidation: app/session schema version
  - Safe fix: add schema/app version to the pending watch key.

## Fetch Waterfalls
- File/function: `src/app/admin/economy/components/PlatformEconomyConsole.tsx` / `load`
  - Sequential calls: render waits for full `Promise.all` result before any section state is committed
  - Dependency check: independent endpoints
  - Safe restructuring: commit each section slice as it resolves while preserving the existing tab shell
  - Confidence: high

## Do Not Touch Yet
- Chat race severity is real, but the exact remaining stale overwrite path is uncertain because the file already has several request-id and ref guards. Fixing it needs a targeted chat-only pass, not a generic audit assumption.
- Public drops hydration ownership is uncertain from the inspected subset; I did not verify every route/component pair under `src/app/drops/**`.
- Admin economy server-cache freshness is partially inferred from route-cache doctrine and client behavior; I did not inspect every underlying `/api/admin/economy/**` route in this audit.

## Files Inspected
- `agent/context/surface-doctrine-map.json`: resolve primary surface routing
- `docs/doctrine/03-surface-hierarchy.md`: confirm surface boundaries
- `control-tower/00-START-HERE.md`: repo control-tower entrypoint
- `src/app/layout.tsx`: root hydration shell ownership
- `src/components/CoreLayoutWrapper.tsx`: staged hydration lanes and shell ownership
- `src/context/SWRProvider.tsx`: global SWR defaults
- `src/components/PwaRuntimeBridge.tsx`: runtime update prompt behavior
- `src/hooks/usePublicReleaseNotes.ts`: bundled fallback vs fetched release notes ownership
- `src/lib/firebase-messaging.ts`: service worker registration/update flow
- `public/firebase-messaging-sw.js`: app shell/runtime cache ownership
- `src/lib/server/ephemeral-route-cache.ts`: server stale-while-revalidate cache behavior
- `src/lib/http-cache.ts`: ETag/private revalidate helpers
- `src/lib/server/route-cache-contract.ts`: declared cache doctrine
- `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`: admin analytics storage/SWR ownership
- `src/app/admin/debug/page.tsx`: admin debug polling/refresh ownership
- `src/app/admin/ai/hooks/useAdminAiState.tsx`: admin AI persisted UI state
- `src/app/admin/users/page.tsx`: admin users realtime/list/summary race surface
- `src/components/Chat/ChatExperience.tsx`: chat list/detail/composer async ownership
- `src/components/Support/SupportInbox.tsx`: support thread list/detail polling and previous-data behavior
- `src/hooks/useNotifications.ts`: notification fetch/local reconcile freshness
- `src/components/Navigation/NotificationBell.tsx`: notification dropdown loading behavior
- `src/components/PurchaseModal.tsx`: wallet package bootstrap and modal loading behavior
- `src/app/dashboard/page.tsx`: dashboard server seed ownership
- `src/app/HomeClient.tsx`: home redirect/hydration lane timing
- `src/app/experiences/ExperiencesClient.tsx`: experiences shell/client hydration
- `src/app/dashboard/library/LibraryClient.tsx`: library loading and route refresh behavior
- `src/app/dashboard/viewer/ViewerClient.tsx`: viewer shell loading behavior
- `src/app/dashboard/viewer/hooks/useViewerState.ts`: viewer asset fetch and thumbnail background loading
- `src/hooks/useViewerWatchSession.ts`: replay/flush/storage ownership
- `src/app/api/notifications/route.ts`: notification ETag and revalidate behavior
- `src/app/api/wallet/packages/route.ts`: wallet package cache behavior
- `src/hooks/useAuthSWR.ts`: auth SWR keying
- `src/hooks/useAdminPollingSWR.ts`: admin polling SWR defaults
- `src/app/admin/analytics/loading.tsx`: analytics loading frame
- `src/app/admin/loading.tsx`: generic admin loading frame

## Commands Run
- `Get-Content agent\context\surface-doctrine-map.json -TotalCount 220`
- `Get-Content docs\doctrine\03-surface-hierarchy.md -TotalCount 260`
- `Get-Content control-tower\00-START-HERE.md -TotalCount 220`
- `Get-ChildItem src -Recurse -File | Select-String -Pattern 'loading|Loading|skeleton|Skeleton|placeholder|empty state|isLoading|loadingState|pending|isPending|isFetching|fetching|hydrating|hydrated|ready|isReady' ...`
- `Get-ChildItem src -Recurse -File | Select-String -Pattern 'keepPreviousData|fallbackData|initialData|sessionStorage|localStorage|persist|stale|revalidateOnFocus|revalidateOnMount|dedupingInterval|mutate\(|router.refresh|refresh\(' ...`
- `Get-ChildItem src -Recurse -File | Select-String -Pattern 'useEffect\(|AbortController|requestId|isMounted|cancelled|ignore|unsubscribe|onSnapshot|Promise.all|Promise.allSettled|setTimeout|setInterval|clearInterval|clearTimeout' ...`
- `Get-ChildItem src -Recurse -File | Select-String -Pattern 'fetch\(|authFetch|cache:|no-store|no-cache|force-dynamic|revalidate|ETag|Cache-Control' ...`
- `Get-ChildItem src -Recurse -File | Select-String -Pattern 'min-h-0|overflow-y-auto|h-screen|100vh|dvh|svh|visualViewport|safe-area|bottom-nav|loading.*height|skeleton.*height' ...`
- `Get-ChildItem src -Recurse -File | Select-String -Pattern 'appVersion|version|build|release|serviceWorker|controllerchange|updatefound|kandydrops:app-update-available|sessionStorage|localStorage' ...`
- targeted `Get-Content` and `Select-String` reads for the files listed above
- `git status --short`

## Files Changed
Only:
- `CODEX_HANDOFF.md`
- `agent/handoffs/hydration-skeleton-race-audit.md`

## Needs Uylus / ChatGPT Review
- Highest-risk issue to fix first: `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` stale snapshot ownership.
- Uncertain item: remaining chat stale-overwrite path after existing request-id guards in `src/components/Chat/ChatExperience.tsx`.
- Screenshots/pages needed: `/admin/analytics`, `/admin/debug`, `/dashboard/chat`, `/dashboard/support`, `/dashboard/library`, notification dropdown after deploy and hard refresh.
