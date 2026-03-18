# Standardization Audit Checklist

Purpose: complete a full-file standardization sweep before any new UI tweaks or feature work.

Rule: do not mark this audit complete until every section below is checked and every tracked file in the inventory has been reviewed.

Current inventory baseline:
- Tracked files in `git ls-files`: `347`
- Pending new worktree files already included in this checklist: `2`
- Source of truth: `git ls-files`
- Last checklist refresh: `2026-03-17`

## Phase Progress

- [x] Phase 1 complete: root config and infrastructure reviewed on `2026-03-17`
- [x] Phase 2 complete: app routes, pages, layouts, and metadata reviewed on `2026-03-17`
- [ ] Phase 3: components, context, hooks, and types
- [ ] Phase 4: shared lib and server lib
- [ ] Phase 5: functions, Data Connect, and generated clients
- [ ] Phase 6: public assets, scripts, tests, and QA artifacts

## Audit Workflow

- [ ] Run `git ls-files` and confirm the tracked-file count still matches this checklist, or refresh this file first.
- [ ] Freeze feature work during the audit window.
- [ ] Review every file in inventory order, not just "likely problem areas."
- [ ] For each file, record one of: `OK`, `needs cleanup`, `needs refactor`, `needs follow-up`, or `delete candidate`.
- [ ] Do not close the audit until all delete candidates are either removed or explicitly justified.
- [ ] Do not start UI polish or new features until all `needs cleanup` and `needs refactor` items have an owner.

## Universal File Checklist

Apply these checks to every tracked file:

- [ ] Purpose is clear and still relevant to the current product.
- [ ] File name, exports, and default export shape match repo conventions.
- [ ] No dead code, dead exports, orphaned helpers, or unused props remain.
- [ ] Imports are current, minimal, and avoid duplicate local utilities.
- [ ] Timezone/date logic uses shared helpers, not ad hoc local math.
- [ ] Error handling is consistent and actionable.
- [ ] Logging is intentional and non-spammy.
- [ ] Analytics/telemetry usage is catalog-backed and parity-safe.
- [ ] Firebase usage is consistent with shared runtime/admin helpers.
- [ ] Permissions/auth/rate limiting use shared guard layers where appropriate.
- [ ] Async flows are race-safe and idempotent where needed.
- [ ] No stale copy, dead links, or outdated route targets remain.
- [ ] No legacy state shape is being written without canonical synchronization.
- [ ] Types are explicit where behavior is not obvious.
- [ ] Tests/QA coverage expectations are documented for risky paths.

## Route / API Checklist

Apply to every route handler in `src/app/api/**`:

- [ ] Auth mode is intentional: public, optional auth, user, admin, cron, or trusted-origin only.
- [ ] Shared `guardApiRequest(...)` is used unless there is a documented reason not to.
- [ ] Rate limit profile is appropriate for cost/risk.
- [ ] Origin/App Check expectations are consistent.
- [ ] Request parsing is validated and bounded.
- [ ] DB reads/writes are ordered safely for Firestore transactions.
- [ ] Writes are idempotent or protected by receipts / locks / dedupe keys.
- [ ] Analytics writes are canonical where needed and do not double count on retries.
- [ ] Time keys and lifecycle logic use shared helpers.
- [ ] Response semantics match actual business outcome and do not surface false failures.

## Client / UI Checklist

Apply to pages, components, hooks, and contexts:

- [ ] Logged-in and guest behavior are both intentional.
- [ ] Refresh behavior is explicit: snapshot, polling, focus revalidate, or realtime.
- [ ] Persistent state keys are centralized and consistent.
- [ ] Navigation destinations match current route model.
- [ ] UI actions map to the real runtime surface, not dead or generic fallbacks.
- [ ] Telemetry is emitted for important user actions and state transitions.
- [ ] Accessibility, mobile layout, and empty/error states are covered.
- [ ] Expensive providers or bridges are only mounted where necessary.

## Firebase / Data Checklist

Apply anywhere Firebase, Firestore, Storage, App Check, Messaging, RTDB, Data Connect, or generated clients are used:

- [ ] Client config comes from shared runtime config.
- [ ] Admin config comes from shared admin/runtime config.
- [ ] Storage bucket / database URL / project ID do not drift.
- [ ] App Check behavior is intentional for prod/dev/test.
- [ ] Firestore rules/indexes still match app behavior.
- [ ] Data Connect generated clients match current schema usage.
- [ ] Messaging and service worker flows have valid assets and cleanup.

## Analytics / Telemetry Checklist

- [ ] Event names are catalog-backed and normalized.
- [ ] Canonical facts vs telemetry are clearly separated.
- [ ] Server and client event pipelines do not drift.
- [ ] Empty analytics modules are explainable by coverage, not hidden failure.
- [ ] GA4, first-party facts, rollups, and parity logic agree where expected.
- [ ] High-value user/admin/drop flows all emit meaningful events.

## Delete / Consolidate Checklist

- [ ] Every duplicate helper has been merged or justified.
- [ ] Every one-off validation or time-key helper has been folded into shared utilities where possible.
- [ ] Every generated or snapshot file still belongs in git.
- [ ] Every dependency still has at least one real consumer.
- [ ] Every unused asset, script, or test artifact is reviewed.

## Master Inventory

Use the section checkboxes below to make sure no tracked file is skipped.

### 1. Root Config And Infra

- [x] Audit every root/config/infra file below.

Phase 1 notes:
- Cleaned pre-commit workflow doc encoding and aligned it to the current `build.log` debug flow.
- Added `build.log` and `check.log` to root ignores.
- Added explicit `NEXT_PUBLIC_FIREBASE_DATABASE_URL` to App Hosting env declarations so Firebase runtime config is fully declared.
- Aligned ESLint ignores with the actual generated debug log filenames.

```text
.agent/workflows/pre-commit.md
.gitignore
.npmrc
.vscode/settings.json
.vscode/tailwind.json
AGENTS.md
apphosting.yaml
eslint.config.mjs
firebase.json
firestore.indexes.json
firestore.rules
makeAdmin.js
middleware.ts
next.config.ts
package-lock.json
package.json
playwright.config.ts
postcss.config.mjs
tsconfig.json
```

### 2. App Routes, Pages, Layouts, Metadata

- [x] Audit every file below.

Phase 2 notes:
- Added canonical metadata coverage for FAQ, Drops, Experiences, Terms, Privacy, and creator profile surfaces.
- Split client-only Experiences and Creator profile pages behind server wrappers so metadata stays standardized without changing UX behavior.
- Extended sitemap coverage to `/experiences`, tightened robots coverage for `/offline`, and aligned root GA injection with the current env naming scheme.
- Cleaned app-layer routing/copy drift by removing the banned-page double redirect and limiting home-page telemetry to actual guest views.
- Refreshed the section inventory to include the new wrapper-backed app files created during Phase 2.

```text
src/app/(legal)/privacy/page.tsx
src/app/(legal)/terms/page.tsx
src/app/admin/analytics/page.tsx
src/app/admin/content/page.tsx
src/app/admin/debug/page.tsx
src/app/admin/drops/page.tsx
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/app/admin/queue/page.tsx
src/app/admin/roster/page.tsx
src/app/admin/user/[userId]/page.tsx
src/app/admin/users/page.tsx
src/app/api/admin/analytics/route.ts
src/app/api/admin/balance/route.ts
src/app/api/admin/debug/route.ts
src/app/api/admin/drops/route.ts
src/app/api/admin/feedback/route.ts
src/app/api/admin/overview/route.ts
src/app/api/admin/queue/route.ts
src/app/api/admin/queue/toggle/route.ts
src/app/api/admin/tasks/route.ts
src/app/api/admin/user/[userId]/route.ts
src/app/api/admin/users/route.ts
src/app/api/analytics/ingest/route.ts
src/app/api/checkin/route.ts
src/app/api/creators/[username]/route.ts
src/app/api/cron/notify-active-drops/route.ts
src/app/api/cron/process-queue/route.ts
src/app/api/drops/[dropId]/click/route.ts
src/app/api/drops/content/route.ts
src/app/api/drops/impression/route.ts
src/app/api/drops/route.ts
src/app/api/drops/track/route.ts
src/app/api/drops/unlock/route.ts
src/app/api/notifications/route.ts
src/app/api/paypal/capture/route.ts
src/app/api/paypal/create/route.ts
src/app/api/privacy/consent/route.ts
src/app/api/security/log-attempt/route.ts
src/app/api/settings/landing/route.ts
src/app/api/settings/landing/upload/route.ts
src/app/api/tasks/claim/route.ts
src/app/api/tasks/feedback/route.ts
src/app/api/tasks/reminders/sync/route.ts
src/app/api/tasks/rotate/route.ts
src/app/api/tasks/track-share/route.ts
src/app/api/telemetry/track/route.ts
src/app/api/user/activity/route.ts
src/app/api/user/check-username/route.ts
src/app/api/user/complete-onboarding/route.ts
src/app/api/user/data/route.ts
src/app/api/user/delete/route.ts
src/app/api/user/follow/route.ts
src/app/api/user/profile/route.ts
src/app/api/user/register/route.ts
src/app/api/user/revoke-sessions/route.ts
src/app/banned/page.tsx
src/app/creators/[username]/CreatorProfileClient.tsx
src/app/creators/[username]/page.tsx
src/app/dashboard/DashboardClient.tsx
src/app/dashboard/layout.tsx
src/app/dashboard/library/LibraryClient.tsx
src/app/dashboard/library/page.tsx
src/app/dashboard/page.tsx
src/app/dashboard/profile/page.tsx
src/app/dashboard/viewer/ViewerClient.tsx
src/app/dashboard/viewer/page.tsx
src/app/drops/DropsClient.tsx
src/app/drops/[id]/opengraph-image.tsx
src/app/drops/loading.tsx
src/app/drops/page.tsx
src/app/error.tsx
src/app/experiences/ExperiencesClient.tsx
src/app/experiences/page.tsx
src/app/faq/FAQClient.tsx
src/app/faq/HowItWorksStory.tsx
src/app/faq/faq-data.ts
src/app/faq/page.tsx
src/app/favicon.ico
src/app/globals.css
src/app/layout.tsx
src/app/loading.tsx
src/app/not-found.tsx
src/app/offline/page.tsx
src/app/page.tsx
src/app/robots.ts
src/app/sitemap.ts
```

### 3. Components, Context, Hooks, Types

- [ ] Audit every file below.

```text
src/components/Admin/AdminActivityLogPanel.tsx
src/components/Admin/AdminAnalyticsCharts.tsx
src/components/Admin/AdminPageHeader.tsx
src/components/Admin/AdminStatsBar.tsx
src/components/Admin/AdminTasksManager.tsx
src/components/Admin/AssetUploader.tsx
src/components/Admin/BalanceAdjustmentModal.tsx
src/components/Admin/CreateDropModal.tsx
src/components/Admin/RecentTransactionsPanel.tsx
src/components/Admin/TopDropsPanel.tsx
src/components/Admin/TransactionHistoryModal.tsx
src/components/Analytics/DeepTracker.tsx
src/components/Auth/AuthModal.tsx
src/components/Auth/GuestComponentBlur.tsx
src/components/Auth/GuidedOnboarding.tsx
src/components/CookieBanner.tsx
src/components/CoreLayoutWrapper.tsx
src/components/Dashboard/CollectionList.tsx
src/components/Dashboard/DailyCheckIn.tsx
src/components/Dashboard/DailyTasksModule.tsx
src/components/Dashboard/LiveDropsForYouCarousel.tsx
src/components/Dashboard/NotificationPromptBanner.tsx
src/components/Dashboard/OwnedDropGalleryCard.tsx
src/components/Dashboard/RecentActivityFeed.tsx
src/components/Dashboard/TaskGuidanceBanner.tsx
src/components/Debug/DebugBreakpoints.tsx
src/components/DropCard.tsx
src/components/DropGrid.tsx
src/components/DropPreviewModal.tsx
src/components/ErrorBoundary.tsx
src/components/FeaturedCarousel.tsx
src/components/Feedback/ReportBugButton.tsx
src/components/GlobalAuthModal.tsx
src/components/GlobalPurchaseModal.tsx
src/components/Hero.tsx
src/components/HomeDropTicker.tsx
src/components/InsufficientBalanceModal.tsx
src/components/KandyDropsAccountOverview.tsx
src/components/Landing/HomeActiveDropsCarousel.tsx
src/components/Landing/HowItWorks.tsx
src/components/Legal/LegalBackLink.tsx
src/components/Navbar.tsx
src/components/Navigation/AdminDropdown.tsx
src/components/Navigation/AnimateBalance.tsx
src/components/Navigation/AutoScrollToTop.tsx
src/components/Navigation/MobileBottomBar.tsx
src/components/Navigation/NotificationBell.tsx
src/components/Navigation/ProfileDropdown.tsx
src/components/Navigation/ProfileSidebar.tsx
src/components/Navigation/ScrollToTop.tsx
src/components/Notifications/NotificationRuntimeBridge.tsx
src/components/PayPalProvider.tsx
src/components/PromoCard.tsx
src/components/PurchaseModal.tsx
src/components/PwaRuntimeBridge.tsx
src/components/StickyFilterBar.tsx
src/components/Toasts/UnwrapSuccessToast.tsx
src/components/ui/Button.tsx
src/components/ui/GlassCard.tsx
src/components/ui/Icon.tsx
src/context/AuthContext.tsx
src/context/SWRProvider.tsx
src/context/UIContext.tsx
src/hooks/useAdminOverview.ts
src/hooks/useAuthSWR.ts
src/hooks/useDrops.ts
src/hooks/useNotifications.ts
src/types/analytics.ts
src/types/db.ts
src/types/gtag.d.ts
```

### 4. Shared Lib And Server Lib

- [ ] Audit every file below.

```text
src/lib/activity-sync.ts
src/lib/analytics-client-engine.ts
src/lib/analytics-metric-catalog.ts
src/lib/analytics-semantics.ts
src/lib/app-check.ts
src/lib/authFetch.ts
src/lib/browser-notification-enrollment.ts
src/lib/browser-utils.ts
src/lib/daily-checkin.ts
src/lib/drop-engagement.ts
src/lib/drop-normalizers.ts
src/lib/drop-presentation.ts
src/lib/drop-queue-schedule.ts
src/lib/drop-runtime.ts
src/lib/drop-status.ts
src/lib/firebase-data.ts
src/lib/firebase-messaging.ts
src/lib/firebase-runtime.ts
src/lib/firebase.ts
src/lib/firebase/admin-actions.ts
src/lib/gumdrop-economics.ts
src/lib/landing-assets.ts
src/lib/legal-documents.ts
src/lib/marketing-copy.ts
src/lib/media-hosts.ts
src/lib/monitoring.ts
src/lib/navigation-persistence.ts
src/lib/notification-contracts.ts
src/lib/notifications.ts
src/lib/privacy-consent.ts
src/lib/privacy-policy.ts
src/lib/security-events.ts
src/lib/server/admin-analytics-shared.ts
src/lib/server/analytics-event-utils.ts
src/lib/server/analytics-metrics.ts
src/lib/server/analytics-parity.ts
src/lib/server/analytics-semantics.ts
src/lib/server/analytics.ts
src/lib/server/auth.ts
src/lib/server/daily-tasks.ts
src/lib/server/drop-queue.ts
src/lib/server/drop-references.ts
src/lib/server/drop-runtime.ts
src/lib/server/drops.ts
src/lib/server/fcm-utils.ts
src/lib/server/firebase-admin.ts
src/lib/server/notification-inbox.ts
src/lib/server/privacy-consent.ts
src/lib/server/push-notifications.ts
src/lib/server/rate-limit.ts
src/lib/server/request-guard.ts
src/lib/server/request-origin.ts
src/lib/server/username-suggestions.ts
src/lib/site-origin.ts
src/lib/task-guidance.ts
src/lib/tasks/task-catalog.ts
src/lib/telemetry-catalog.ts
src/lib/telemetry.ts
src/lib/timezone.ts
src/lib/transaction-normalizers.ts
src/lib/user-profile-validation.ts
src/lib/user-utils.ts
src/lib/utils.ts
```

### 5. Functions, Data Connect, Generated Clients

- [ ] Audit every file below.

```text
dataconnect/.dataconnect/schema/main/input.gql
dataconnect/.dataconnect/schema/main/mutation.gql
dataconnect/.dataconnect/schema/main/query.gql
dataconnect/.dataconnect/schema/main/relation.gql
dataconnect/.dataconnect/schema/prelude.gql
dataconnect/dataconnect.yaml
dataconnect/example/connector.yaml
dataconnect/example/mutations.gql
dataconnect/example/queries.gql
dataconnect/schema/machine_learning.gql
dataconnect/schema/schema.gql
functions/.eslintrc.js
functions/.gitignore
functions/eslint.config.js
functions/package-lock.json
functions/package.json
functions/src/analytics-core.ts
functions/src/dataconnect-admin-generated/esm/index.esm.js
functions/src/dataconnect-admin-generated/esm/package.json
functions/src/dataconnect-admin-generated/index.cjs.js
functions/src/dataconnect-admin-generated/index.d.ts
functions/src/dataconnect-admin-generated/package.json
functions/src/firebase-admin.ts
functions/src/gumdrop-economics.ts
functions/src/index.ts
functions/tsconfig.dev.json
functions/tsconfig.json
src/dataconnect-admin-generated/esm/index.esm.js
src/dataconnect-admin-generated/esm/package.json
src/dataconnect-admin-generated/index.cjs.js
src/dataconnect-admin-generated/index.d.ts
src/dataconnect-admin-generated/package.json
src/dataconnect-generated/.guides/config.json
src/dataconnect-generated/.guides/setup.md
src/dataconnect-generated/.guides/usage.md
src/dataconnect-generated/README.md
src/dataconnect-generated/esm/index.esm.js
src/dataconnect-generated/esm/package.json
src/dataconnect-generated/index.cjs.js
src/dataconnect-generated/index.d.ts
src/dataconnect-generated/package.json
src/dataconnect-generated/react/README.md
src/dataconnect-generated/react/esm/index.esm.js
src/dataconnect-generated/react/esm/package.json
src/dataconnect-generated/react/index.cjs.js
src/dataconnect-generated/react/index.d.ts
src/dataconnect-generated/react/package.json
```

### 6. Public Assets, Scripts, Tests, QA Artifacts

- [ ] Audit every file below.

```text
public/candy-3d-glass.png
public/candy-main.svg
public/file.svg
public/firebase-messaging-sw.js
public/globe.svg
public/icon-192x192.png
public/icon-512x512.png
public/manifest.json
public/next.svg
public/vercel.svg
public/window.svg
qa-screenshots/desktop-admin-create-full.png
qa-screenshots/desktop-admin-create-viewport.png
qa-screenshots/desktop-admin-drops-full.png
qa-screenshots/desktop-admin-drops-viewport.png
qa-screenshots/desktop-admin-full.png
qa-screenshots/desktop-admin-viewport.png
qa-screenshots/desktop-dashboard-full.png
qa-screenshots/desktop-dashboard-viewport.png
qa-screenshots/desktop-drops-full.png
qa-screenshots/desktop-drops-viewport.png
qa-screenshots/desktop-experiences-full.png
qa-screenshots/desktop-experiences-viewport.png
qa-screenshots/desktop-experiences.png
qa-screenshots/desktop-home-full.png
qa-screenshots/desktop-home-viewport.png
qa-screenshots/desktop-home.png
qa-screenshots/mobile-admin-create-full.png
qa-screenshots/mobile-admin-create-viewport.png
qa-screenshots/mobile-admin-drops-full.png
qa-screenshots/mobile-admin-drops-viewport.png
qa-screenshots/mobile-admin-full.png
qa-screenshots/mobile-admin-viewport.png
qa-screenshots/mobile-dashboard-full.png
qa-screenshots/mobile-dashboard-viewport.png
qa-screenshots/mobile-drops-full.png
qa-screenshots/mobile-drops-viewport.png
qa-screenshots/mobile-experiences-full.png
qa-screenshots/mobile-experiences-viewport.png
qa-screenshots/mobile-experiences.png
qa-screenshots/mobile-home-full.png
qa-screenshots/mobile-home-viewport.png
qa-screenshots/mobile-home.png
qa-screenshots/tablet-dashboard-full.png
qa-screenshots/tablet-drops-full.png
qa-screenshots/tablet-experiences.png
qa-screenshots/tablet-home-full.png
qa-screenshots/tablet-home.png
scripts/backfill-analytics-parity.ts
scripts/promote-admin.ts
scripts/remove-hovers.mjs
scripts/replace-colors.js
scripts/replace-icons.mjs
tests/auth.spec.ts
tests/drops.spec.ts
tests/launch-qa.spec.ts
tests/qa-audit.spec.ts
tests/visual.spec.ts
tests/visual.spec.ts-snapshots/admin-login-chromium-win32.png
tests/visual.spec.ts-snapshots/drops-grid-chromium-win32.png
tests/visual.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png
tests/visual.spec.ts-snapshots/home-hero-chromium-win32.png
```

## Exit Criteria

- [ ] Every master-inventory section is checked.
- [ ] Every route has correct guard/auth/rate-limit behavior.
- [ ] Every Firebase touchpoint uses shared config and consistent permissions.
- [ ] Every analytics path is catalog-backed and parity-reviewed.
- [ ] Every dead/orphaned file and export is either removed or justified.
- [ ] Every test/script/public artifact still has a purpose.
- [ ] Remaining issues are captured in a prioritized follow-up list before feature work resumes.
