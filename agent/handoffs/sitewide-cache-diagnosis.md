# Codex Handoff

## Task
Diagnose sitewide caching and stale live deploy behavior.

## Result
Status: completed

## Summary
- The highest-risk stale layer is the registered service worker in [public/firebase-messaging-sw.js](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js): it caches navigations and static assets, but registration does not include a deploy/build version, and there is no client-side version-mismatch refresh flow.
- Public APIs intentionally use SWR and ETag behavior in several places, while admin/debug surfaces also layer sessionStorage snapshots, SWR `keepPreviousData`, and server in-memory stale-while-revalidate caches. That is enough to make one page look fresh while another still renders older verified data.
- Cookies are mostly navigation/consent state here. Manual “clear storage” works because the stale owners are primarily service-worker caches, session/local-storage snapshots, and client-side cached admin state, not auth cookies alone.

## Cache Layers Found
- Layer: Next route segment cache
  - Files: [src/app/page.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/page.tsx), [src/app/dashboard/page.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/page.tsx), [src/app/dashboard/chat/page.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/chat/page.tsx), [src/app/drops/page.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/drops/page.tsx), [src/app/experiences/page.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/experiences/page.tsx), [src/app/creators/[username]/page.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/creators/%5Busername%5D/page.tsx)
  - Current behavior: many important pages explicitly export `dynamic = "force-dynamic"`.
  - Staleness risk: low
  - Why it may affect live testing: these routes themselves are trying to stay fresh, so if they still look stale the cause is likely below the page layer.
  - Safe fix suggestion: keep dynamic behavior for user/admin/dashboard surfaces; focus fixes on service worker, API cache headers, and client persistence instead.

- Layer: Next fetch/API response cache contracts
  - Files: [src/lib/server/route-cache-contract.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/route-cache-contract.ts), [src/app/api/wallet/packages/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/wallet/packages/route.ts), [src/app/api/settings/landing/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/settings/landing/route.ts), [src/app/api/creator/discovery/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/creator/discovery/route.ts), [src/app/api/creators/[username]/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/creators/%5Busername%5D/route.ts)
  - Current behavior: public routes use explicit SWR-style `Cache-Control` with `max-age`, `s-maxage`, and `stale-while-revalidate`.
  - Staleness risk: medium
  - Why it may affect live testing: a public page or public client fetch can legitimately serve old-but-acceptable CDN/browser data for minutes after deploy while admin or authenticated surfaces update immediately.
  - Safe fix suggestion: keep SWR only on clearly public sanitized data; tighten TTLs where live-fix verification matters, and expose visible freshness/version labels on public merchandising surfaces that intentionally cache.

- Layer: Private API ETag + browser revalidation
  - Files: [src/lib/http-cache.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/http-cache.ts), [src/app/api/drops/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/route.ts), [src/app/api/notifications/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/notifications/route.ts), [src/app/api/user/activity/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/activity/route.ts)
  - Current behavior: these routes use weak ETags plus `private, no-cache, must-revalidate`, so the browser may keep a local response and revalidate.
  - Staleness risk: medium
  - Why it may affect live testing: if the ETag does not change because the version key or payload signature did not change, the browser can keep returning 304-backed stale-looking content even after code changed around the UI.
  - Safe fix suggestion: keep ETags for user-scoped data, but ensure ETag inputs include the right freshness/version/runtime markers where UI correctness depends on more than raw payload rows.

- Layer: Server in-memory stale-while-revalidate cache
  - Files: [src/lib/server/ephemeral-route-cache.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/ephemeral-route-cache.ts), [src/app/api/admin/analytics/historical/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts), [src/app/api/user/activity/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/activity/route.ts)
  - Current behavior: process-local Maps keep fresh and stale entries, and stale entries are returned while refresh happens in the background.
  - Staleness risk: high
  - Why it may affect live testing: after deploy, one instance can still hand back stale-but-verified payloads for up to its stale TTL while another instance computes fresh data. That produces inconsistent “some pages updated, others didn’t” behavior.
  - Safe fix suggestion: add build/version salt to ephemeral cache keys, or clear/ignore old entries when app version changes; shorten stale TTL on admin/debug routes used for live verification.

- Layer: Admin/debug hot-cache and snapshot APIs
  - Files: [src/app/api/admin/analytics/historical/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts), [src/app/api/admin/analytics/realtime/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/realtime/route.ts), [src/app/api/admin/debug/control-tower/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/debug/control-tower/route.ts)
  - Current behavior: analytics routes are `force-dynamic`/`force-no-store`, but historical analytics still uses the in-process stale cache; control tower returns `private, max-age=30, stale-while-revalidate=120`.
  - Staleness risk: high
  - Why it may affect live testing: admin pages intended to validate a fix can still show older snapshots or a 30-second cached control tower model even after deploy.
  - Safe fix suggestion: make admin debug/control-tower and live verification surfaces `private, no-store`; keep snapshot freshness explicit, but do not allow browser/CDN caching on deploy-verification routes.

- Layer: Client SWR cache
  - Files: [src/context/SWRProvider.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/context/SWRProvider.tsx), [src/app/admin/analytics/AnalyticsHelpers.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/analytics/AnalyticsHelpers.tsx), [src/app/admin/debug/page.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/debug/page.tsx), [src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx)
  - Current behavior: global SWR uses `revalidateOnFocus: true`, but several admin surfaces override with `keepPreviousData: true` and `revalidateOnFocus: false`.
  - Staleness risk: high
  - Why it may affect live testing: old data stays rendered until a manual refresh path or interval runs. A deployed fix can exist on the server while the admin UI keeps showing the previous payload.
  - Safe fix suggestion: for admin/debug verification surfaces, disable `keepPreviousData` where it masks a deploy change, or pair it with visible build/freshness/version mismatch prompts and a hard refresh action.

- Layer: Admin sessionStorage snapshots and filters
  - Files: [src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx)
  - Current behavior: admin analytics stores last validated overview snapshot and filter state in `sessionStorage`.
  - Staleness risk: high
  - Why it may affect live testing: the page can hydrate from a previous browser-tab snapshot even after deploy, especially when backend refresh has not completed yet.
  - Safe fix suggestion: namespace stored keys by app version or last commit SHA, and discard prior snapshot records when deployed version changes.

- Layer: Service worker / PWA app-shell cache
  - Files: [public/firebase-messaging-sw.js](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js), [src/lib/firebase-messaging.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-messaging.ts), [src/components/PwaRuntimeBridge.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PwaRuntimeBridge.tsx), [public/manifest.json](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/manifest.json)
  - Current behavior: the Firebase messaging service worker also acts as an app-shell/runtime cache. It precaches `/`, `/drops`, `/offline`, `manifest.json`, images, and serves cached navigations/static assets. Registration URL contains Firebase config query params, but no build/release version.
  - Staleness risk: critical
  - Why it may affect live testing: a deployed app can keep serving cached navigations or shell assets from the previous worker until the worker updates. Because the URL does not change per deploy and there is no in-app version mismatch recovery, clearing site storage forces the update that the app is otherwise not surfacing.
  - Safe fix suggestion: include app/build version in the service-worker registration URL and cache names, add deployed-version mismatch detection, and show a refresh-app prompt when a newer build is available.

- Layer: Release notes public JSON vs bundled fallback
  - Files: [public/kandydrops-release-notes.json](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/kandydrops-release-notes.json), [src/hooks/usePublicReleaseNotes.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/usePublicReleaseNotes.ts), [src/lib/release-notes/public-release-notes.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/release-notes/public-release-notes.ts), [src/components/ReleaseNotes/BetaBadge.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/ReleaseNotes/BetaBadge.tsx)
  - Current behavior: client fetches `/kandydrops-release-notes.json?v=<appVersion>` with `cache: "no-store"`, but it falls back to a bundled JSON constant embedded in the build.
  - Staleness risk: medium
  - Why it may affect live testing: if the public JSON or app shell is stale, the Beta badge can still show an older bundled fallback matching the currently loaded JS bundle, not the just-deployed build.
  - Safe fix suggestion: keep the fallback, but add a version/build mismatch banner and ensure the live notes fetch also validates against a deploy-manifest endpoint, not only the bundled app version.

- Layer: Browser localStorage/sessionStorage app state
  - Files: [src/lib/privacy-consent.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/privacy-consent.ts), [src/lib/navigation-persistence.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/navigation-persistence.ts), [src/hooks/client-runtime.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/client-runtime.ts), [src/context/RolloutContext.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/context/RolloutContext.tsx), [src/lib/client-session.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/client-session.ts)
  - Current behavior: the app persists privacy consent, last visited path, rollout exposure state, referral code, client session markers, and runtime events in browser storage.
  - Staleness risk: medium
  - Why it may affect live testing: these stores can preserve old routing/context/UI assumptions across deploys. They are not the primary stale-content owner, but they explain why clearing storage can “fix” behavior that is not actually cookie-related.
  - Safe fix suggestion: version browser-persisted UI/runtime state and clear or migrate it on app-version mismatch.

## Routes Likely Needing No-Store/Freshness
- `admin`: prefer `no-store` for debug/control-tower, admin users, admin AI, moderation, storage, privacy preflight, and any deploy-verification surface. Hot-cache only where snapshots are intentional and visibly labeled.
- `dashboard`: prefer dynamic page shells and authenticated `authFetch(..., cache: "no-store")`; user-scoped APIs should stay private revalidate or no-store, not public SWR.
- `chat`: `no-store` or must-not-cache for thread/message APIs and any unread/session counters.
- `wallet`: package metadata can stay public cacheable; balances, capture state, purchase eligibility, and payment flows should stay no-store.
- `analytics`: admin analytics pages should stay dynamic; historical/realtime verification APIs should avoid browser/CDN caching and keep any server hot-cache explicitly versioned and visible.
- `economy`: admin economy/treasury/drift/offers/promos/redemptions should stay no-store.
- `drops`: public drops list/detail can use bounded SWR; authenticated content and unlock/media routes must stay no-store.
- `public/static`: hashed JS/CSS/image assets can stay immutable; HTML/app-shell navigation should not be trapped by long-lived service-worker shell caches without deploy-aware invalidation.

## Service Worker / PWA Findings
- present or not present: present
- cache strategy if found: [public/firebase-messaging-sw.js](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js) precaches app-shell URLs, caches runtime navigations, and stale-serves static assets/images/styles/fonts from Cache Storage.
- update risk: critical. The worker cache names are only `kandydrops-app-shell-v3` and `kandydrops-runtime-v3`; registration URL is based on Firebase config, not release/build version. There is no user-facing “new version available” recovery path.
- suggested fix: version the service worker registration URL and cache names by build/release version, add client-side version ping + reload prompt, and narrow what the worker caches for live-verification-sensitive routes.

## Client Storage Findings
- localStorage/sessionStorage/indexedDB keys or helpers found:
  - privacy: `kandydrops.privacy.settings` in [src/lib/privacy-consent.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/privacy-consent.ts)
  - navigation: `kandydrops:last-visited-path`, `kandydrops:last-visited-path-owner` in [src/lib/navigation-persistence.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/navigation-persistence.ts)
  - admin analytics overview snapshot/filter keys in [src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx)
  - rollout exposure session cache in [src/context/RolloutContext.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/context/RolloutContext.tsx)
  - client runtime session keys in [src/hooks/client-runtime.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/client-runtime.ts)
- stale-state risk: medium for general browser state, high for admin analytics snapshot/session state
- suggested fix: add a single app-version/build key and invalidate storage-backed UI snapshots when it changes; keep pure preference/consent data, but clear derived admin/debug snapshot caches.

## Version/Build Visibility
- whether app exposes current build/version/commit: partially. Beta notes expose app version and commit metadata through [src/lib/release-notes/public-release-notes.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/release-notes/public-release-notes.ts) and [public/kandydrops-release-notes.json](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/kandydrops-release-notes.json).
- whether client can detect deployed version mismatch: not deterministically. I did not find a general runtime build/version ping that compares the loaded bundle/service worker against the newly deployed version and prompts a refresh.
- suggested fix: add a small deploy-version endpoint or static manifest that the client checks periodically/on focus; if deployed version differs from loaded version, surface “Update available” and refresh/clear versioned caches automatically.

## Files Inspected
- [next.config.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/next.config.ts): app-wide headers, no cache overrides
- [firebase.json](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/firebase.json): hosting config, no explicit cache/header rules here
- [package.json](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/package.json): build/release scripts and cache-related validators
- [src/app/layout.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/layout.tsx): manifest and shell ownership
- [src/components/CoreLayoutWrapper.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/CoreLayoutWrapper.tsx): PWA runtime bridge and shell-level persistent behavior
- [src/lib/server/route-cache-contract.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/route-cache-contract.ts): intended cache policy map
- [public/manifest.json](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/manifest.json): PWA manifest
- [public/firebase-messaging-sw.js](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js): active service worker cache behavior
- [src/lib/firebase-messaging.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-messaging.ts): service worker registration URL and update behavior
- [src/components/PwaRuntimeBridge.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PwaRuntimeBridge.tsx): runtime registration bridge
- [src/hooks/usePublicReleaseNotes.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/usePublicReleaseNotes.ts): no-store fetch + bundled fallback
- [src/lib/release-notes/public-release-notes.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/release-notes/public-release-notes.ts): bundled release/version fallback
- [src/lib/http-cache.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/http-cache.ts): private revalidation helpers
- [src/lib/server/ephemeral-route-cache.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/ephemeral-route-cache.ts): in-process cache owner
- [src/app/api/admin/analytics/historical/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts): hot/stale admin analytics response cache
- [src/app/api/admin/debug/control-tower/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/debug/control-tower/route.ts): private SWR cache on debug truth surface
- [src/app/api/user/activity/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/activity/route.ts): user-scoped stale-while-revalidate cache
- [src/app/api/wallet/packages/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/wallet/packages/route.ts): public package config caching
- [src/app/api/settings/landing/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/settings/landing/route.ts): public landing asset caching
- [src/app/api/drops/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/route.ts): ETag/private revalidation path
- [src/app/api/notifications/route.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/notifications/route.ts): ETag/private revalidation notifications
- [src/context/SWRProvider.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/context/SWRProvider.tsx): global SWR defaults
- [src/lib/privacy-consent.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/privacy-consent.ts): localStorage snapshot
- [src/lib/navigation-persistence.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/navigation-persistence.ts): session/cookie path persistence
- [src/hooks/client-runtime.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/client-runtime.ts): runtime event/session storage helpers
- [middleware.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/middleware.ts): cookie-driven redirects, relevant to why clearing storage/cookies changes route behavior

## Commands Run
- `Get-ChildItem -Path . -Recurse -File | Where-Object { ... } | Select-Object -ExpandProperty FullName`
- `Get-ChildItem -Path src -Recurse -File | Select-String -Pattern 'cache|Cache-Control|revalidate|dynamic|force-dynamic|force-static|no-store|no-cache|stale|serviceWorker|service-worker|workbox|manifest|localStorage|sessionStorage|indexedDB|persist|version|buildId|release|etag|router\\.refresh|cookies\\(|headers\\(|next:|cache:'`
- `Get-Content next.config.ts`
- `Get-Content firebase.json`
- `Get-Content package.json`
- `Get-Content src/app/layout.tsx`
- `Get-Content src/components/CoreLayoutWrapper.tsx`
- `Get-Content src/lib/server/route-cache-contract.ts`
- `Get-Content public/manifest.json`
- `Get-Content public/firebase-messaging-sw.js`
- `Get-Content src/components/PwaRuntimeBridge.tsx`
- `Get-Content src/lib/firebase-messaging.ts`
- `Get-Content src/hooks/usePublicReleaseNotes.ts`
- `Get-Content src/lib/release-notes/public-release-notes.ts`
- `Get-Content src/lib/http-cache.ts`
- `Get-Content src/lib/server/ephemeral-route-cache.ts`
- `Get-Content src/app/api/admin/analytics/historical/route.ts`
- `Get-Content src/app/api/admin/debug/control-tower/route.ts`
- `Get-Content src/app/api/user/activity/route.ts`
- `Get-Content src/app/api/wallet/packages/route.ts`
- `Get-Content src/app/api/settings/landing/route.ts`
- `Get-Content src/app/api/drops/route.ts`
- `Get-Content src/app/api/notifications/route.ts`
- `Get-Content src/context/SWRProvider.tsx`
- `Get-Content src/lib/privacy-consent.ts`
- `Get-Content src/lib/navigation-persistence.ts`
- `Get-Content src/hooks/client-runtime.ts`
- `Get-Content middleware.ts`
- `git status --short`

## Files Not Touched
No source files were edited.

## Needs Uylus / ChatGPT Review
- Highest-risk cache layer: [public/firebase-messaging-sw.js](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js) plus [src/lib/firebase-messaging.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-messaging.ts). This is the likeliest reason older builds keep showing until storage is cleared.
- Recommended first surgical fix: deploy-version-aware service worker registration and cache invalidation, plus an in-app “new version available” refresh path.
- Pages to test live after that fix: `/drops`, `/dashboard`, `/dashboard/chat`, `/admin/debug`, `/admin/analytics`, and the Beta badge changelog panel.
