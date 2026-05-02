# EVERY FILE FUNCTION CHECKLIST

**Last Updated:** 2026-05-01
**Current Focus:** Launch Readiness Final Gate.
**Status:** In Progress. Current tracked-file coverage is reconciled as of 2026-04-28: every `git ls-files` entry has a current checklist heading, while detailed function-level audits remain pending for many historical and newly reconciled files.
Purpose: exhaustive no-skip audit checklist covering every repository file currently in scope and every detected function-like implementation.

Scoring: all entries below are marked as included in the current validated sweep. Confidence reflects current repository-state confidence, not perfection or future-proofing.

Current repo-wide state snapshot: see [FULL_SCALE_CODEBASE_AUDIT.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/FULL_SCALE_CODEBASE_AUDIT.md) for the current live baseline, verification state, and continuity rules, and see [REPO_MEMORY_LEDGER.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/REPO_MEMORY_LEDGER.md) for major architectural and workflow decisions. The detailed file/function body below remains valuable historical evidence, but it has not been fully regenerated against the current 2026-04-18 inventory review yet.

## 2026-05-01 Security Role Boundary Launch Audit Coverage

- [x] `storage.rules` denies direct client reads/writes under `drops/**`; Drop assets now require server-mediated upload/proxy paths.
- [x] `src/app/api/admin/analytics/route.ts` runs an explicit admin guard before redirecting to protected analytics lanes.
- [x] `src/app/api/creator/drops/assets/route.ts` lets only trusted-origin authenticated creators upload Drop submission assets through Firebase Admin Storage.
- [x] `src/components/Admin/AssetUploader.tsx` and `src/components/Admin/CreateDropModal.tsx` send admin/creator Drop asset uploads through guarded server routes instead of direct `drops/**` Storage writes.
- [x] `tests/firebase/storage.rules.spec.ts`, `tests/unit/admin-analytics-redirect-route.spec.ts`, and `tests/unit/creator-drops-assets-route.spec.ts` cover the launch-critical boundary fixes.
- [x] `agent/state/security-role-boundary-audit.generated.json`, `docs/agent-truth/security-role-boundaries.md`, `scripts/agent/validate-security-role-boundaries.ts`, and `npm run check:security-role-boundaries` record and validate the actor-lane audit.

## 2026-05-01 Launch Readiness Final Gate Coverage

- [x] `agent/state/launch-readiness-report.generated.json` records the final launch status, blockers, risks, tests run, limitations, open PR recommendations, tiny launch-blocking fixes, and go/no-go recommendation.
- [x] `docs/agent-truth/launch-readiness-final.md` provides the human-readable final launch gate summary.
- [x] `scripts/agent/validate-launch-readiness-final.ts` and `package.json` add `npm run check:launch-readiness-final` to verify report structure, phase artifacts, trusted-origin refresh protection, and governance ledger coverage.
- [x] `src/app/api/admin/analytics/refresh/route.ts` requires trusted origin on the state-changing admin refresh POST, superseding the open Sentinel PR #208 fix after review.
- [x] `src/hooks/useNow.ts`, `src/components/DropCardParts.tsx`, and `src/components/FeaturedCarousel.tsx` remove render-time clock reads and synchronous effect state updates surfaced by the final standard gate.
- [x] `tests/unit/admin-analytics-refresh-route.spec.ts` and `tests/unit/admin-analytics-audience-snapshot.spec.ts` lock the trusted-origin route guard and current launch copy.

## 2026-05-01 Human-Readable Problem-State Copy Finalization Coverage

- [x] `src/lib/problem-state-copy.ts` centralizes page, payment, unlock, and notification problem-state translations while preserving raw technical reasons for diagnostics.
- [x] `src/app/error.tsx` and `src/components/ErrorBoundary.tsx` no longer render raw exception messages as primary user UI.
- [x] `src/components/PurchaseModal.tsx` maps PayPal/order/capture failures to wallet-safe visible copy and removes the environment-variable checkout message from user UI.
- [x] `src/components/DropCard.tsx` and `src/components/DropPreviewModal.tsx` map unlock failures to clear charge-safe copy before showing toasts/cards.
- [x] `src/components/Navigation/NotificationBell.tsx` distinguishes notification load failure from an empty inbox and provides a refresh action.
- [x] `tests/unit/problem-state-copy.spec.ts` and `scripts/agent/validate-human-readable-admin-copy.ts` guard banned copy, raw-error leakage, shared helper use, approved admin badges, and problem-state copy examples.

## 2026-05-01 Mobile Layout Safe-Area Finalization Coverage

- [x] `src/app/layout.tsx` now reads `--user-mobile-bottom-nav-reserved-height` instead of hardcoding root `pb-32` for every mobile route.
- [x] `src/components/CoreLayoutWrapper.tsx` sets the user mobile bottom-nav reserve only when the public mobile bottom nav is present; admin, legal, and chat routes set the variable to `0px`.
- [x] `src/app/page.tsx`, `src/app/experiences/ExperiencesClient.tsx`, `src/app/faq/page.tsx`, `src/app/dashboard/profile/page.tsx`, and `src/app/creators/[username]/CreatorProfileClient.tsx` no longer duplicate full bottom-nav/safe-area route padding.
- [x] `docs/agent-truth/mobile-shell-safe-area.md`, `agent/state/mobile-layout-safe-area-audit.generated.json`, `scripts/agent/validate-mobile-shell-safe-area.ts`, and `npm run check:mobile-shell-safe-area` record the shared mobile shell safe-area contract.
- [x] `agent/index/ui-surface-coverage.json` was refreshed by the UI coverage lane after the shell change.

## 2026-05-01 Global Speed Hydration Cache Finalization Coverage

- [x] `src/app/api/user/activity/route.ts` now uses stale-while-revalidate route caching for per-user recent activity, keeps stale verified activity displayable during background refresh, returns private cache-control, and emits cache/debug timing metadata.
- [x] `tests/unit/ephemeral-route-cache.spec.ts` covers refresh failure preserving a stale verified route payload.
- [x] `agent/state/global-speed-hydration-cache-audit.generated.json` records audited first-render, realtime/refresh/time-expiry blocking, stale clearing, cache mode, partial payload, and fixed/residual-risk status for Admin Analytics, Admin Overview, dashboard, Drops, wallet, chat, experiences, notifications, app shell, user activity, and service worker.
- [x] `docs/agent-truth/global-loading-performance.md` and `docs/agent-truth/refresh-based-hot-cache.md` now state the global hydration rule: age changes labels, verified data remains visible, refresh failures preserve previous data, slow modules cannot block unrelated modules, waiting must say why, and private data must not be publicly CDN cached.
- [x] `scripts/agent/validate-global-speed-hydration-cache.ts` and `package.json` add `npm run check:global-speed-hydration-cache`.

## 2026-05-01 Admin Analytics Launch Finalization Coverage

- [x] `src/app/admin/page.tsx`, `src/hooks/useAdminOverviewRealtime.ts`, `tests/unit/admin-overview-truth.spec.ts`, `docs/agent-truth/admin-overview.md`, and `docs/agent-truth/admin-revenue-trends.md` use operator-friendly Overview truth labels instead of server/listener jargon.
- [x] `src/app/admin/analytics/page.tsx` keeps compact visible degraded copy while exposing full background issue detail through the title.
- [x] `src/lib/analytics/admin-analytics-display-state.ts` preserves snapshot-first display state for realtime failure and no-snapshot cases with explicit copy.
- [x] `src/lib/admin-analytics-commerce-snapshot.ts` states that promo and bonus GD are excluded from revenue.
- [x] `scripts/check-admin-analytics-overview.ts`, `scripts/check-admin-analytics-onboarding-performance.ts`, `scripts/check-admin-analytics-onboarding-velocity.ts`, and `scripts/agent/validate-admin-analytics-snapshot-migration.ts` now enforce the current human-readable launch doctrine instead of legacy internal wording.
- [x] `docs/agent-truth/admin-analytics-launch-final.md`, `docs/agent-truth/admin-copy-style-guide.md`, `docs/agent-truth/human-readable-admin-truth.md`, `agent/state/admin-analytics-finalization.generated.json`, `scripts/agent/validate-admin-analytics-finalization.ts`, and `package.json` record the Admin Analytics and Debug launch finalization guard.

## 2026-05-01 Notification Return Loop Coverage

- [x] `src/lib/server/push-notifications.ts` preserves deterministic drop notification idempotency for drop-live and queued-drop-return-live sends, suppresses duplicate FCM dispatch on existing deterministic docs/activation replays, and records structured dispatch diagnostics.
- [x] `src/lib/server/fcm-utils.ts` exposes `broadcastFCMWithReport` with permission/preference/missing-token/duplicate-token/send-failure/invalid-token counts while keeping data-only FCM payloads.
- [x] `public/firebase-messaging-sw.js` keeps manual service-worker display, deterministic notification tags, `renotify:false`, auto-display suppression, and notification click return-loop metadata.
- [x] `src/components/Notifications/NotificationRuntimeBridge.tsx`, `src/hooks/useNotifications.ts`, and `src/lib/notification-local-state.ts` keep foreground/SW click sync, multi-tab BroadcastChannel notification refresh, immediate read/clear local state, and partial-failure reconciliation.
- [x] `src/app/api/notifications/route.ts` persists read state with `readAtMs`/`lastReadBy`, trusted-origin/user guards, runtime touch metadata, and structured global push diagnostics for admin-created notifications.
- [x] `src/lib/admin-notification-funnel.ts`, `src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx`, and `src/app/api/admin/debug/route.ts` keep compact funnel truth, fake-zero prevention, Debug dedupe/read/queued-return-live fields, and cleared/read label mapping.
- [x] `agent/state/notification-return-loop-audit.generated.json`, `docs/agent-truth/notification-pipeline.md`, `scripts/agent/validate-notification-return-loop.ts`, and `npm run check:notification-return-loop` record the notification return-loop guard.
- [x] `tests/unit/push-notifications.spec.ts`, `tests/unit/fcm-utils.spec.ts`, `tests/unit/notification-local-state.spec.ts`, `tests/unit/firebase-messaging-sw.spec.ts`, `tests/unit/notifications-route.spec.ts`, and `tests/unit/admin-notification-funnel.spec.ts` cover the hardened notification contracts.

## 2026-05-01 Payment Wallet Unlock Entitlement Coverage

- [x] `src/app/api/paypal/capture/route.ts` requires completed PayPal status, USD package-price match, server-created `custom_id` caller/package binding, and transaction payment lock before crediting Gum Drops.
- [x] `src/app/api/drops/unlock/route.ts` keeps unlock deduction inside a Firestore transaction, preserves already-unlocked idempotency, and records purchased/reward spend split metadata.
- [x] `src/app/api/drops/content/route.ts` proxies private media only for verified unlock entitlement or creator ownership and returns private no-store content.
- [x] `src/app/api/admin/balance/route.ts` records structured admin adjustment audit metadata including admin uid, email, reason, route source, and server audit marker.
- [x] `tests/unit/paypal-capture-route.spec.ts`, `tests/unit/drops-unlock-route.spec.ts`, `tests/unit/drops-content-route.spec.ts`, `tests/unit/admin-balance-route.spec.ts`, and `tests/unit/gumdrop-ledger.spec.ts` cover the hardened contracts.
- [x] `docs/agent-truth/payment-wallet-unlock-entitlement.md`, `agent/state/payment-unlock-security-audit.generated.json`, `scripts/agent/validate-payment-unlock-security.ts`, and `npm run check:payment-unlock-security` record the payment wallet unlock entitlement launch guard.

## 2026-05-01 Launch Finalization Scope Freeze Coverage

- [x] `docs/agent-truth/launch-finalization-scope.md` defines launch-critical surfaces, blocked/warning/deferred categories, frozen features, allowed and forbidden change types, validation gates, risk ranking, and current PR/commit risk notes.
- [x] `agent/state/launch-finalization-baseline.generated.json` records the machine-readable launch baseline for future agents and validations.
- [x] `scripts/agent/validate-launch-finalization-baseline.ts` verifies the scope doc, baseline JSON, required surface list, deferred separation, forbidden change types, validation gates, and governance ledger updates.
- [x] `package.json` exposes `npm run check:launch-finalization-baseline`.
- [x] `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, and this checklist record the launch-finalization scope freeze.

## 2026-05-01 Human-Readable Admin Truth Copy Coverage

- [x] `src/lib/admin-copy/admin-copy-registry.ts` registers operator status patterns, approved badge labels, and main UI state vocabulary.
- [x] `src/lib/admin-copy/admin-truth-copy.ts` translates technical states into operator copy, developer debug copy, badge labels, action labels, and deterministic Debug explanations.
- [x] `src/components/Admin/AdminStatusBadge.tsx` renders approved short operator badges while preserving detailed state explanation in title/aria text.
- [x] Admin Analytics components and models now use plain-English delayed, estimated, partial, review, first-snapshot, and last-verified-data copy in primary UI.
- [x] Admin Debug summary cards and Data Validation rows expose operator summary, why it matters, what to check next, technical evidence, and source details.
- [x] `docs/agent-truth/admin-copy-style-guide.md`, `docs/agent-truth/human-readable-admin-truth.md`, `scripts/agent/validate-human-readable-admin-copy.ts`, and `tests/unit/admin-truth-copy.spec.ts` cover the doctrine and guardrails.

## 2026-05-01 Refresh-Based Hot Cache Refactor Coverage

- [x] `src/lib/cache/refresh-cache-contract.ts` defines refresh-based cache display states, cache identity fields, display helpers, refresh request/dedupe helpers, and pure refresh lifecycle helpers.
- [x] `src/lib/analytics/admin-metric-snapshot.ts` extends Admin Analytics snapshots with cache key, surface key, refresh/source versions, invalidation, estimate, and legacy metadata while preserving display eligibility after expiry.
- [x] `src/lib/server/admin-analytics-snapshots.ts` normalizes existing persisted snapshots, increments `refreshVersion` only after completion, preserves failed-refresh display state, and exposes Debug metadata for refresh/cache display truth.
- [x] `src/lib/server/ephemeral-route-cache.ts` keeps validated stale payloads displayable beyond stale TTL while async refresh runs.
- [x] `src/app/api/admin/analytics/historical/route.ts` exposes `staleButVerified` and retained stale-cache metadata for Admin Analytics historical route payloads.
- [x] `src/app/api/admin/debug/route.ts` exposes cache key, refresh/source version, refresh timestamps, display allow/block reasons, stale-but-verified, invalidation, guest estimate, anonymous batch, blocking, router refresh, revalidation, parity, fake waiting, and fake zero fields.
- [x] Admin Analytics state and module helpers/components replace bare `Waiting` display paths with reasoned first-snapshot, no-verified-snapshot, or live-upgrade copy.
- [x] `docs/agent-truth/refresh-based-hot-cache.md`, `agent/state/refresh-cache-loading-audit.generated.json`, `scripts/agent/validate-refresh-based-hot-cache.ts`, package scripts, and targeted unit tests cover the new architecture.

## 2026-05-01 Global Loading Performance Hot-Cache Coverage

- [x] `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` now reads verified module snapshots for Revenue, Purchases, Mobile share, and Live active before showing reasoned waiting/unavailable states, and emits Debug metadata for first snapshot, first useful value, refresh status, waiting reason, blocking flags, fallback use, and cache-control mode.
- [x] `src/lib/analytics/admin-analytics-loading-state.ts` centralizes snapshot number extraction, percent normalization, snapshot surface-state mapping, and reasoned waiting copy.
- [x] `src/hooks/useAdminAnalyticsSnapshotRegistry.ts` exposes the current snapshot with each module state so UI models can render verified values without duplicating fetch logic.
- [x] `src/hooks/useAdminAnalyticsSnapshot.ts` preserves the current snapshot during refresh responses that do not return a replacement snapshot.
- [x] `src/app/api/admin/analytics/refresh/route.ts` returns authenticated private no-store JSON and preserves stale snapshot state on failed manual refresh when a snapshot exists.
- [x] `src/app/admin/analytics/loading.tsx` adds a route-level Admin Analytics loading boundary.
- [x] `docs/agent-truth/global-loading-performance.md` and `agent/state/global-loading-performance-audit.generated.json` record the audit and future-agent loading doctrine.
- [x] `scripts/agent/validate-global-loading-performance.ts`, `package.json`, and targeted unit tests validate snapshot-first rendering, refresh preservation, reasoned waiting copy, partial route behavior, and no generic waiting when verified values exist.

## 2026-05-01 Drops Mobile Apple-Aligned Refinement Coverage

- [x] `docs/doctrine/kandydrops-ui-doctrine.md` records the 2026 Apple-aligned KandyDrops mobile refinement rule with official HIG source anchors and telemetry requirements.
- [x] `docs/agent-truth/drops-mobile-refinement.md` documents 50 mobile improvement areas, source owners, telemetry obligations, hydration order, and future-agent guardrails.
- [x] `src/app/drops/DropsClient.tsx` reduces duplicated shell spacing, removes the large Drops body minimum height, defers search filtering with `useDeferredValue`, dedupes search telemetry, and enriches page/category/search events with `compact_mobile_apple_2026`.
- [x] `src/app/drops/loading.tsx` mirrors the compact final Drops layout to reduce hydration jump.
- [x] `src/components/StickyFilterBar.tsx` keeps compact search/filter controls, removes manual icon drawing, avoids animation/scroll dependencies, and preserves accessible search semantics.
- [x] `src/components/FeaturedCarousel.tsx` uses compact mobile aspect sizing, reduced-motion-aware autoplay, shared `useNow` timing, and enriched featured-click telemetry.
- [x] `src/components/DropGrid.tsx` reduces mobile gaps/skeletons, removes the fake local `Notify Me` affordance, and uses a truthful `/experiences` route link when Drops are empty.
- [x] `src/components/DropCard.tsx`, `DropCardLayout.tsx`, `DropCardParts.tsx`, `DropCardCta.tsx`, and `src/hooks/useDropCardImpression.ts` split the oversized card, enforce compact radii, share timer state, preserve impression POSTs, and enrich detail/unlock/blocked-funds telemetry.
- [x] `src/hooks/useDrops.ts` defers the Firestore runtime subscription until idle and revalidates empty server seeds instead of treating them as complete truth.
- [x] `scripts/agent/validate-drops-mobile-refinement.ts` and `package.json` add `npm run check:drops-mobile-refinement`.

## 2026-05-01 Full-Scale Telemetry Orphan Cleanup Coverage

- [x] `src/app/api/analytics/ingest-identified/route.ts` canonicalizes every submitted authenticated telemetry event through `resolveTrackedTelemetryEvent` before writing `analytics_event_facts`.
- [x] `src/app/api/analytics/ingest-identified/route.ts` skips unsupported event names with route diagnostics and `skippedUnsupported` response metadata instead of creating orphaned analytics facts.
- [x] `src/app/api/analytics/ingest-identified/route.ts` preserves compatibility aliases as canonical event names with `legacy_event_name` metadata.
- [x] `src/app/api/analytics/ingest-identified/route.ts` keeps legacy `admin_ui_error` as a server diagnostic and no longer lets it become product analytics telemetry.
- [x] `tests/unit/analytics-ingest-identified-route.spec.ts` covers alias canonicalization, unsupported event blocking, no fact writes for orphan probes, and diagnostic-only legacy admin UI errors.
- [x] `agent/state/telemetry-orphan-cleanup-audit.generated.json` records the audited telemetry surfaces, cleanup actions, and residual Functions callable risk.
- [x] `docs/agent-truth/telemetry-orphan-cleanup-audit.md` documents the orphan cleanup doctrine, audited surfaces, fixed ingest gap, and future shared-manifest requirement.
- [x] `scripts/agent/validate-telemetry-orphan-cleanup.ts` and `package.json` add `npm run check:telemetry-orphan-cleanup`.

## 2026-05-01 Admin Analytics Realtime Dependency Audit Coverage

- [x] `src/lib/analytics/admin-analytics-display-state.ts` defines the shared source-order resolver for verified snapshot/hot cache, realtime upgrade, refresh, unavailable, and fake-zero prevention states.
- [x] `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` applies the resolver to Live Pulse before rendering top-level availability and avoids treating missing realtime as first-render failure when a backend snapshot exists.
- [x] `src/lib/admin-analytics-live-pulse.ts` exposes display-state debug metadata including primary source, snapshot availability, snapshot age, realtime listener state, refresh status, fallback snapshot use, lane failures, and `realtimeBlocksFirstRender=false`.
- [x] `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx` replaces dominant realtime unavailable/jargon copy with compact snapshot-first copy and graph/surface scoped waiting states.
- [x] `agent/state/admin-analytics-realtime-dependency-audit.generated.json` records every Admin Analytics module's realtime dependency/source-order audit.
- [x] `docs/agent-truth/admin-analytics-realtime-to-hot-cache-audit.md` documents the policy, findings, fixed Live Pulse assumption, and remaining materializer work.
- [x] `scripts/agent/validate-admin-analytics-no-pure-realtime.ts` and `package.json` add `npm run check:admin-analytics-no-pure-realtime`.
- [x] `tests/unit/admin-analytics-display-state.spec.ts` and `tests/unit/admin-analytics-live-pulse.spec.ts` cover snapshot plus realtime failure, refresh visibility, unavailable/no snapshot, fake-zero prevention, graph-only gaps, and Live Pulse fallback snapshot rendering.

## 2026-04-30 Last-20-Commit Truth Audit Cleanup Coverage

- [x] `src/lib/server/push-notifications.ts` now treats duplicate deterministic drop notification documents as full duplicate dispatch suppression, preventing matching FCM sends for global drop-live and queued-drop-return-live notifications.
- [x] `tests/unit/push-notifications.spec.ts` covers duplicate global and return-live notification documents suppressing FCM dispatch and reporting duplicate push/browser-display prevention metadata.
- [x] `tests/launch-qa.spec.ts` validates the current global not-found return action label, `Return to App`, instead of the stale `Return Home` copy.
- [x] `FULL_SCALE_CODEBASE_AUDIT.md` and `REPO_MEMORY_LEDGER.md` record the last-20-commit audit result, concrete fixes, verification coverage, and remaining monolith/snapshot-materializer risks.

## 2026-04-30 Analytics Truth Layer v2 Phase 5 Admin Analytics Snapshot Migration Coverage

- [x] `src/hooks/useAdminAnalyticsSnapshotRegistry.ts` registers all Admin Analytics module keys, maps page section keys to snapshot module keys, exposes source mode, truth state, last verified time, refresh status, debug path, first snapshot timing, duplicate refresh prevention, and manual refresh.
- [x] `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` wires the snapshot registry into shared section controls so every registered module gets a compact source label and refresh action without replacing old compatibility data paths.
- [x] `src/app/admin/analytics/page.tsx` publishes `window.__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__` for Admin Debug parity and agent validation.
- [x] `src/app/api/admin/debug/route.ts` exposes `adminAnalyticsSnapshotMigration` metadata with module registry status, latest snapshot metadata, source/parity expectations, actor-lane rules, manual refresh route, and Data Validation placement.
- [x] `scripts/agent/validate-admin-analytics-snapshot-migration.ts` and `package.json` add `npm run check:admin-analytics-snapshot-migration`.
- [x] Module doctrine docs, hot-cache docs, source hierarchy, ecosystem parity docs, and `agent/index/analytics-truth-layer-v2.json` record the Phase 5 snapshot-first Admin Analytics migration rule.
- [x] `tests/unit/admin-analytics-page.spec.tsx` verifies the Analytics page publishes snapshot migration Debug metadata.
- [x] This Phase 5 pass intentionally keeps old realtime/historical routes for compatibility, does not run destructive legacy backfill, does not change payment/write behavior, and does not move full Data Validation back into Analytics.

## 2026-04-30 Analytics Truth Layer v2 Phase 4 Legacy Recovery and Ecosystem Parity Coverage

- [x] `src/lib/analytics/legacy-recovery-contract.ts` defines recovered legacy event records, source inventory reports, mapping reports, ecosystem parity results, dry-run CLI parsing, duplicate keys, snapshot inclusion rules, and snapshot-compatible parity rows.
- [x] `scripts/analytics/inventory-legacy-sources.ts` generates `agent/state/analytics-legacy-source-inventory.generated.json` for Firestore, RTDB, GA4/BigQuery, hot-cache, telemetry, task, notification, commerce, onboarding, identity/session, presence, and admin audit sources without live scanning by default.
- [x] `scripts/analytics/map-legacy-events.ts` maps safe fixture-shaped legacy records into canonical event candidates, dedupes repeated records, reports skipped/unmapped/low-confidence rows, and keeps write mode disabled unless `--write` plus `ANALYTICS_LEGACY_WRITE_ENABLED=true` are present.
- [x] `scripts/analytics/check-analytics-ecosystem-parity.ts` generates `agent/state/analytics-ecosystem-parity.generated.json` with parity lanes for raw ledger vs hot cache, GA4/BigQuery, purchases, unlocks, tasks, notifications, onboarding, guest/auth separation, admin exclusion, creator separation, snapshots, legacy mapping, and Debug validation.
- [x] `src/app/api/admin/debug/route.ts` exposes `adminAnalyticsLegacyParity` metadata for the Analytics Legacy + Parity Debug group, including report status, mapped/skipped/low-confidence counts, parity severity, manual-review items, last run timestamps, and write-mode state.
- [x] `docs/agent-truth/analytics-legacy-recovery.md` and `docs/agent-truth/analytics-ecosystem-parity.md` document the dry-run policy, required legacy record fields, parity lanes, confidence scoring, fake-zero regression rules, Debug responsibilities, and self-healing boundaries.
- [x] `scripts/agent/validate-analytics-legacy-recovery.ts` and `package.json` add `npm run check:analytics-legacy-recovery` plus generator scripts for inventory, mapping, and parity.
- [x] `tests/unit/analytics-legacy-recovery-contract.spec.ts` and `tests/unit/analytics-ecosystem-parity.spec.ts` cover recovered record shape, confidence labels, dry-run parsing, duplicate suppression, parity deltas, admin exclusion leakage, guest estimate fake-zero prevention, and snapshot parity shape.
- [x] This Phase 4 pass intentionally does not run destructive backfill, write recovered events to production, overwrite current analytics, block Admin Analytics rendering on parity jobs, or promote legacy data to server-confirmed truth.

## 2026-04-30 Analytics Truth Layer v2 Phase 3 Hot-Cache Snapshot Coverage

- [x] `src/lib/analytics/admin-metric-snapshot.ts` defines the canonical Admin Analytics snapshot schema, ranges, source modes, truth states, refresh states, warnings, parity results, fake-zero validation, stale-cache resolution, and duplicate-refresh lock logic.
- [x] `src/lib/server/admin-analytics-snapshots.ts` reads/writes persisted snapshots in `analytics_admin_metric_snapshots`, exposes latest verified snapshots, records refresh started/completed/failed states, returns Debug metadata, and dedupes in-flight refreshes.
- [x] `src/lib/server/admin-analytics-materializers.ts` registers `platform_pulse`, `audience_snapshot`, `commerce_snapshot`, `live_pulse`, `journey_funnel`, `auth_outcomes`, `onboarding_performance`, `daily_task_pipeline`, `notification_funnel`, `event_mix`, `live_interaction_stream`, and `data_health_summary`.
- [x] `src/app/api/admin/analytics/refresh/route.ts` provides admin-gated snapshot metadata reads and manual refresh with duplicate-refresh prevention and metadata response payloads.
- [x] `src/hooks/useAdminAnalyticsSnapshot.ts` provides a snapshot-first client helper with `firstSnapshotMs`, `refreshStatus`, `sourceMode`, manual refresh, and optional refresh-on-mount.
- [x] `src/app/api/admin/debug/route.ts` exposes `adminAnalyticsHotCache` metadata for persisted snapshots, source modes, truth states, refresh status, parity, formulas, source breakdown, and unavailable reasons.
- [x] `docs/agent-truth/admin-analytics-hot-cache.md`, `analytics-truth-layer-v2.md`, and `analytics-source-hierarchy.md` document the Phase 3 hot-cache-first doctrine.
- [x] `scripts/agent/validate-admin-analytics-hot-cache.ts` and `package.json` add `npm run check:admin-analytics-hot-cache`.
- [x] `tests/unit/admin-metric-snapshot.spec.ts` and `tests/unit/admin-analytics-refresh-route.spec.ts` cover snapshot states, fake-zero prevention, stale fallback, refresh dedupe, unavailable materializers, registry completeness, and route metadata.
- [x] This Phase 3 pass intentionally does not refactor all Admin Analytics UI modules, remove old realtime routes, auto-run cold provider queries, or mark unavailable materializers as verified.

## 2026-04-30 Analytics Truth Layer v2 Phase 2 Event Contract Coverage

- [x] `src/lib/analytics/analytics-event-contract.ts` defines the canonical v2 analytics event shape, actor types, actor lanes, source lanes, consent states, dedupe keys, identity-link event creation, inclusion/exclusion helpers, and Debug metadata.
- [x] `src/lib/client-session.ts` extends the existing session helper with consent-aware anonymous visitor identity snapshots and local identity-link record helpers without duplicating session storage.
- [x] `src/lib/analytics/legacy-event-mapping.ts` maps legacy records into canonical event-shaped candidates with `legacySource`, `legacyConfidence`, `mappingWarnings`, unmapped output, and a `legacy_directional_only` mixing policy.
- [x] `src/lib/telemetry-catalog.ts` adds Phase 2 required event names or compatibility aliases without renaming existing live events.
- [x] `docs/agent-truth/analytics-legacy-recovery.md` inventories legacy recoverable sources and documents confidence, limitations, and backfill boundaries.
- [x] `docs/agent-truth/analytics-truth-layer-v2.md`, `docs/agent-truth/analytics-actor-taxonomy.md`, and `docs/agent-truth/analytics-source-hierarchy.md` document the Phase 2 contract, identity-link rule, actor separation, dedupe, and legacy recovery boundaries.
- [x] `scripts/agent/validate-analytics-event-contract.ts` and `package.json` add `npm run check:analytics-event-contract` as the fast Phase 2 validation guard.
- [x] `tests/unit/analytics-event-contract.spec.ts` and `tests/unit/analytics-legacy-event-mapping.spec.ts` cover actor classification, admin/system exclusion, identity-link event shape, dedupe, and legacy mapping confidence/unmapped handling.
- [x] This Phase 2 pass intentionally does not run a destructive backfill, refactor Admin Analytics UI modules, rewrite all telemetry emitters, or delete old event names.

## 2026-04-30 Analytics Truth Layer v2 Phase 1 Coverage

- [x] `docs/agent-truth/analytics-truth-layer-v2.md` documents verified hot-cache-first analytics, realtime upgrade, manual refresh, legacy recovery, fake-zero prevention, actor separation, and Admin Analytics vs Admin Debug boundaries.
- [x] `docs/agent-truth/analytics-source-hierarchy.md` defines product truth, verified hot cache snapshots, realtime listener upgrades, GA4/BigQuery daily verification, GA4 intraday directional data, Debug parity, and sources that must never be canonical.
- [x] `docs/agent-truth/analytics-actor-taxonomy.md` defines guest, anonymous visitor, session, authenticated user, creator, admin, system, unknown, identity links, guest-to-user merge rules, and admin exclusion rules.
- [x] `docs/agent-truth/analytics-module-map.md` maps Admin Analytics and Admin Debug modules, desired canonical sources, snapshot keys, refresh behavior, debug parity, risks, and surface placement.
- [x] `docs/agent-truth/analytics-file-inventory.md` records the Phase 1 blast-radius inventory for analytics UI, Debug, routes, telemetry, tasks, notifications, purchases/unlocks, onboarding, identity/session, Functions, config/rules, tests, scripts, and agent indexes.
- [x] `agent/index/analytics-truth-layer-v2.json` provides the machine-readable doctrine, modules, file groups, risks, and phase plan.
- [x] `scripts/agent/validate-analytics-truth-layer-v2.ts` and `package.json` add `npm run check:analytics-truth-layer-v2` as the fast targeted validation guard.
- [x] This Phase 1 pass intentionally does not refactor production analytics behavior, rename events, delete legacy code, or change dashboard rendering.

## 2026-04-30 App Hosting Origin, Navigation Secret, and Realtime Database Rules Coverage

- [x] `apphosting.yaml` uses `https://kandydrops.com` as the canonical App Hosting origin because that is the resolving production domain.
- [x] `apphosting.yaml` declares `NAVIGATION_COOKIE_SECRET` under `env` with `secret: NAVIGATION_COOKIE_SECRET` so App Hosting can mount it during rollout.
- [x] `src/lib/site-origin.ts` uses the apex domain as the fallback canonical origin and canonical host.
- [x] `database.rules.json` remains the canonical local Realtime Database rules source for `chat_presence` deployment.
- [x] `FULL_SCALE_CODEBASE_AUDIT.md` and `REPO_MEMORY_LEDGER.md` record that PayPal App Hosting config is intentionally untouched and `www.kandydrops.com` remains alias-only until DNS/domain mapping is verified.

## 2026-04-30 Firebase CLI Toolchain and Windows Symlink Readiness Coverage

- [x] `package.json` updates root deploy tooling to `firebase-tools@^15.16.0` and adds direct `esbuild@^0.27.7` so Firebase framework packaging uses current CLI dependencies and satisfies Vite's esbuild peer range.
- [x] `package-lock.json` records the updated Firebase CLI and esbuild dependency graph.
- [x] `FULL_SCALE_CODEBASE_AUDIT.md` records the verified residual Windows symlink privilege blocker separately from dependency installation.
- [x] `REPO_MEMORY_LEDGER.md` records that classic local Firebase Hosting framework deploys require a passing symlink smoke test, Windows Developer Mode, an elevated shell, or an alternate App Hosting/Cloud Shell/CI deploy path.

## 2026-04-30 Google Analytics, Cloud, SQL Connect, and Admin Analytics Hot-Truth Coverage

- [x] `docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md` documents official Google/Firebase capability boundaries, required env/secrets, setup examples, hot summary expectations, BigQuery export heartbeat rules, and SQL Connect/Cloud SQL limitations.
- [x] `control-tower/08-DOCTRINE-INDEX.md` includes the Google Analytics and Cloud Truth doctrine in the mandatory doctrine lookup path.
- [x] `docs/doctrine/kandydrops-ui-doctrine.md` now requires admin analytics to read validated hot summaries or backend caches before cold GA4/Data API, BigQuery, SQL Connect, or raw Firestore scans.
- [x] `functions/src/analytics-realtime-summary.ts` materializes `analytics_aggregate_stats/realtime_summary` every minute from first-party active users, event facts, guest batches, watch sessions, and watch assets.
- [x] `functions/src/index.ts` exports `refreshAdminAnalyticsRealtimeSummary` for deployment.
- [x] `src/app/api/admin/analytics/realtime/route.ts` serves fresh/stale hot cache truth immediately, records explicit cache metadata, persists cold rebuilds back to the hot summary, and only cold-reads GA4/Firestore when the hot cache is missing or expired.
- [x] `src/types/admin-analytics.ts` exposes realtime cache state, cache age, cache source, and stale/cached truth labels.
- [x] `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` preserves backend cache metadata and no longer rewrites a polled cached response to a generic fallback when realtime listeners fail.
- [x] `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx` labels the metric `Active Now` and shows hot-cache/stale/fallback source hints instead of claiming GA4 as the source for every response.
- [x] `src/app/api/admin/user/[userId]/route.ts` orders per-user event facts, session facts, and user-daily facts by their indexed recency fields so individual user analytics recover the newest facts first.
- [x] `scripts/agent/check-dependency-truth.ts` verifies root GA4/Data API/auth dependencies and Functions Firebase/BigQuery dependencies.
- [x] `tests/unit/admin-analytics-realtime-route.spec.ts` covers fresh hot-cache and stale hot-cache responses that avoid cold GA4 reads.
- [x] `tests/unit/admin-panel-system-logs.spec.ts` covers the active-only orchestration/runtime signal cleanup and recent-transaction healthy sample handling from the same admin truth pass.

## 2026-04-29 Telemetry Export, GA4, SQL Mirror, and Parity Audit Coverage

- [x] `functions/src/analytics-bigquery-export.ts` exports first-party `analytics_event_facts` to BigQuery and now records success/failure heartbeats in `analytics_export_status/bigquery_raw_events`.
- [x] `src/lib/server/analytics-governance.ts` names `analytics_export_status` as an operational analytics collection.
- [x] `src/app/api/admin/debug/route.ts` loads analytics export-status documents into the Admin Debug ops-health sample.
- [x] `src/lib/server/admin-ops-health.ts` tracks `analytics_bigquery_raw_events` as a downstream materializer; missing heartbeat is degraded and latest failure is failed.
- [x] `scripts/check-analytics-continuity.ts` blocks BigQuery export visibility drift across Functions export, heartbeat write, governance naming, Admin Debug read, and ops-health materializer tracking.
- [x] `scripts/agent/extract-runtime-observability.ts` models `analytics_export_status` for the agent SQL/Data Connect mirror.
- [x] `agent/index/runtime-observability.json`, `agent/state/sql-sync.payload.generated.json`, and `agent/state/sql-mirror-status.generated.json` were regenerated with `npm run agent:sync-sql` after adding the export-status lane.
- [x] `tests/unit/admin-ops-health.spec.ts` covers healthy BigQuery export heartbeat, missing heartbeat degradation, and failed exporter heartbeat.

## 2026-04-29 Admin Analytics Historical Cache and Legacy Validation Coverage

- [x] `src/lib/server/ephemeral-route-cache.ts` provides validated stale-while-revalidate route caching with in-flight refresh deduping.
- [x] `src/app/api/admin/analytics/historical/route.ts` wraps historical admin analytics responses in validated backend cache metadata and marks fresh, cached, and stale states explicitly.
- [x] `src/types/admin-analytics.ts` exposes historical cache state, cache age, cache source label, validation issues, and refresh state.
- [x] `src/lib/admin-parity.ts`, `src/components/Admin/AdminStatusBadge.tsx`, and `src/components/Admin/AdminModuleVerificationCard.tsx` support `[cached]` as a distinct admin truth state.
- [x] `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` maps healthy fresh cache hits to `[cached]` and stale cache hits to `[stale]` for overview/debug metadata.
- [x] `src/lib/server/admin-analytics-historical-traffic.ts` recovers legacy page rollup day keys from document ids and reads legacy view fields before estimating historical guest/public traffic.
- [x] `tests/unit/ephemeral-route-cache.spec.ts` covers fresh cache hits, stale async refresh, and invalid-cache reload behavior.
- [x] `tests/unit/admin-analytics-historical-traffic.spec.ts` covers legacy page rollup date and view recovery.

## 2026-04-29 Admin Debug Task Refresh Truth Coverage

- [x] `src/app/admin/debug/components/DebugPrimitives.tsx` requires explicit `truthState` on `StatCard` and no longer defaults loaded metrics to `[loading]`.
- [x] `src/app/admin/debug/page.tsx` gives the “Task-issue users” card a source-aware truth state: loading before data, failed on route failure, degraded for real task/refresh issues, and live when clean.
- [x] `src/app/admin/debug/components/DebugAdvancedBehavior.tsx` and `DebugAdvancedTruth.tsx` declare explicit truth states for debug metric cards.
- [x] `src/lib/tasks/task-timestamps.ts` normalizes numeric, string, Date, and Firestore Timestamp-shaped daily task timestamps.
- [x] `src/lib/server/daily-tasks.ts`, `src/lib/user-utils.ts`, and `src/app/api/admin/debug/route.ts` use shared task timestamp normalization.
- [x] `/api/admin/debug` reports exact daily task refresh metadata issue codes instead of generic sampled refresh warnings.
- [x] `scripts/check-admin-truth-contracts.ts` blocks missing debug `StatCard` truth states and loading defaults.
- [x] `tests/unit/task-timestamps.spec.ts` verifies Firestore timestamp shapes do not create false refresh warnings while real invalid states remain visible.

## 2026-04-29 Admin Analytics Realtime Fallback Coverage

- [x] `src/app/api/analytics/ingest-identified/route.ts` mirrors identified client events into `analytics_active_users`.
- [x] `src/lib/server/analytics.ts` mirrors identified server events into `analytics_active_users`.
- [x] `src/app/api/admin/analytics/realtime/route.ts` includes `analytics_active_users` documents in first-party live buckets.
- [x] `src/app/api/admin/analytics/realtime/route.ts` treats current `analytics_active_users` data as live even when GA4 realtime returns zero active users.
- [x] `src/app/api/admin/analytics/historical/route.ts` passes `analytics_sessions` docs into historical guest/public traffic.
- [x] `src/lib/server/admin-analytics-historical-traffic.ts` uses `analytics_page_daily` and `analytics_sessions` as exact first-party guest/public evidence before GA-minus-identified estimation.
- [x] `src/components/CoreLayoutWrapper.tsx` mounts first-party guest telemetry after paint on the homepage so anonymous page-view batches are not delayed until idle.
- [x] `tests/unit/server-analytics-active-users.spec.ts` verifies identified server telemetry creates the active-user mirror and server-only telemetry does not.
- [x] `tests/unit/admin-analytics-realtime-route.spec.ts` verifies the realtime route does not degrade when the first-party active-user lane is current and GA4 is empty.
- [x] `tests/unit/admin-analytics-historical-traffic.spec.ts` verifies historical guest/public traffic recovers exact first-party data from page rollups and sessions without estimating.
- [x] `scripts/check-analytics-continuity.ts` blocks future active-user reader/writer drift and historical guest/public first-party source drift.

## 2026-04-29 Global Client Firestore Connectivity Coverage

- [x] `firestore.rules` now explicitly matches all client Firestore collection contracts discovered by the global scan.
- [x] Admin realtime reads for `drops`, `users`, `transactions`, `analytics_event_facts`, `analytics_guest_batches`, `analytics_sessions`, `analytics_watch_sessions`, `adminSettings`, `analytics_commerce_rollup`, `server_diagnostics`, `route_runtime_health`, `runtime_warning_records`, `queue_job_heartbeats`, and `orchestration_repair_proposals` are read-only and `isAdmin()` gated.
- [x] Existing self-scoped reads for users, transactions, notifications, and user runtime remain intact for non-admin users.
- [x] Direct client writes remain denied for the newly wired admin telemetry/diagnostic/read-model collections.
- [x] `tests/firebase/firestore.rules.spec.ts` covers admin success, non-admin denial, and write denial for admin realtime collections.
- [x] `scripts/check-client-firestore-connectivity.ts` scans client Firestore usage and blocks missing rules in `npm run check:analytics:continuity`.

## 2026-04-29 Admin Loading Truth and Analytics Hydration Coverage

- [x] `src/lib/admin-parity.ts` now treats `loading` as a canonical admin surface state.
- [x] `src/components/Admin/AdminStatusBadge.tsx` renders `[loading]` distinctly from `[unavailable]`.
- [x] `src/components/Admin/AdminModuleVerificationCard.tsx` supports loading module verification state.
- [x] `src/app/admin/page.tsx`, `src/components/Admin/AdminDropsAtGlancePanel.tsx`, `src/components/Admin/RecentTransactionsPanel.tsx`, and `src/components/Admin/AdminActivityLogPanel.tsx` no longer show unavailable while initial data is still hydrating.
- [x] `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` reports hydrating source metadata while live/historical analytics requests are in flight.
- [x] `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx`, `AdminAnalyticsAudienceTab.tsx`, and `AdminAnalyticsCommerceTab.tsx` use loading truth states for hydrating metrics.
- [x] `src/app/admin/users/page.tsx` uses loading state for initial live user management hydration and reconnect attempts.
- [x] `src/app/admin/ai/AiHelpers.tsx`, `src/app/admin/ai/page.tsx`, and `src/app/admin/debug/components/DebugPrimitives.tsx` no longer default hydrating cards to unavailable.
- [x] `scripts/check-admin-truth-contracts.ts` blocks loading-to-unavailable regressions across admin UI files.
- [x] `tests/unit/admin-parity.spec.ts` covers loading coercion for connecting/hydrating legacy labels.

## 2026-04-29 Telemetry Module Index Parity Coverage

- [x] `src/lib/telemetry-catalog.ts` now derives module index event names from `TELEMETRY_EVENT_OPTIONS.modules`.
- [x] 175 missing catalog-to-module-index relationships were closed through derived module indexes.
- [x] Navigation page-view events now declare navigation metadata when they appear in the navigation module index.
- [x] `scripts/check-telemetry-parity-contracts.ts` blocks module index entries that are not declared on the event metadata.
- [x] `scripts/check-telemetry-parity-contracts.ts` blocks event `modules` declarations that are missing from the matching module index.
- [x] `npm run check:telemetry` now enforces 1154 telemetry parity checks for catalog, emitter, semantic, admin-log, and module-index truth.

## 2026-04-29 Route Runtime Telemetry Parity and Debug Label Coverage

- [x] `src/lib/route-runtime-health.ts` no longer contains stale runtime targets for deleted/legacy route keys.
- [x] Runtime targets now match 158 live route handlers, excluding only `/api/health`.
- [x] `src/app/api/admin/moderation/threads/[threadId]/route.ts` emits the concrete moderation detail runtime key.
- [x] `src/app/api/admin/support/threads/[threadId]/route.ts` emits concrete support thread runtime keys for GET/POST/PATCH.
- [x] `src/app/api/chat/threads/[threadId]/route.ts`, `src/app/api/chat/threads/[threadId]/messages/route.ts`, and `src/app/api/chat/threads/[threadId]/read/route.ts` emit concrete chat route keys.
- [x] `src/app/api/drops/route.ts` emits `drops:GET` instead of the legacy `drops/feed:GET` key.
- [x] 96 generated runtime target titles were replaced with route-specific operational labels.
- [x] `scripts/check-route-runtime-parity.ts` blocks stale targets, missing targets, and generated placeholder labels.
- [x] `npm run check:continuity` now includes `check:route-runtime-parity`.

## 2026-04-29 Telemetry and Parity Gap Hardening Coverage

- [x] `scripts/audit-telemetry.ts` now fails cataloged telemetry events with no detected emitter or explicit audit coverage.
- [x] `scripts/check-telemetry-parity-contracts.ts` enforces catalog uniqueness, module-index coverage, admin-log coverage, PageViewEvent catalog coverage, and app/server/Functions semantic parity.
- [x] `src/app/dashboard/profile/page.tsx` emits `profile_settings_viewed`.
- [x] `src/app/admin/page.tsx` emits `admin_dashboard_viewed` while preserving `admin_overview_viewed`.
- [x] `src/components/Admin/AdminAnalyticsCharts.tsx` emits `admin_chart_view_changed` for chart range changes.
- [x] `src/lib/analytics-semantics.ts`, `src/lib/server/analytics-semantics.ts`, and `functions/src/analytics-semantics.ts` now align page-view semantic paths and rollup cases for creator/admin/profile/support surfaces.
- [x] `scripts/check-analytics-semantics.ts` now samples creator apply, creator waitlist, admin AI, admin privacy, and admin support parity.
- [x] `npm run check:telemetry` now runs both emitter and parity guards.

## 2026-04-29 Final Consistency Audit and 404 Unification Coverage

- [x] `src/components/ui/NotFoundSurface.tsx` is the shared user-facing 404/missing-resource surface.
- [x] `src/app/not-found.tsx` now delegates to the shared 404 surface.
- [x] `src/app/creators/[username]/CreatorProfileClient.tsx` now uses the shared missing-resource surface for unavailable creators.
- [x] `src/app/error.tsx`, `src/app/admin/error.tsx`, and `src/components/ErrorBoundary.tsx` now use declarative error copy rather than vague/banned fallback phrasing.
- [x] `src/lib/server/not-found.ts` owns canonical API not-found payload construction.
- [x] `src/lib/server/auth.ts` routes `AuthError` 404s through the canonical not-found payload helper.
- [x] All direct `src/app/api` 404 responses now use the canonical not-found helper or `AuthError` path.
- [x] `src/app/api/chat/threads/[threadId]/route.ts`, `src/app/api/chat/attachments/*/route.ts`, `src/app/api/notifications/route.ts`, `src/app/api/creator/settings/route.ts`, and `src/app/api/creators/[username]/route.ts` preserve audited domain 404 codes through canonical not-found paths.
- [x] `scripts/check-not-found-contracts.ts` and `check:not-found` guard the shared 404/error contracts and scan `src/app/api` for direct 404 regressions.

## 2026-04-28 Doctrine Audit, Chat Mobile Scroll, and Mobile UI Runtime Guarding Coverage

- [x] `src/components/Chat/ChatRouteShell.tsx` now bounds the chat route `main` element to `100dvh`, locks route overflow, and restores all touched inline styles on unmount.
- [x] `src/components/Chat/ChatExperience.tsx` now gives the compact inbox/search state the same fixed-height nested-scroll contract as the entered thread view and emits runtime diagnostics if the compact list leaks outside the viewport.
- [x] `src/lib/self-healing.ts` now distinguishes stale compact interaction locks from expected route-owned scroll locks.
- [x] `scripts/check-mobile-ui-doctrine.ts` blocks compact chat/mobile scroll-owner regressions.
- [x] `package.json` now includes `check:ui:mobile-doctrine` in `check:ui:runtime`.
- [x] `src/lib/server/firebase-admin.ts` now avoids importing Firestore-backed route diagnostics during Admin SDK bootstrap, removing the app dependency cycle while preserving direct bootstrap error visibility.
- [x] `tests/unit/chat-route-shell.spec.tsx` verifies chat route scroll locking/restoration.
- [x] `tests/unit/self-healing.spec.ts` verifies expected route-owned locks are preserved while compact focused inputs are released.

## 2026-04-28 Homepage Performance and Hydration Hardening Coverage

- [x] `src/app/HomeClient.tsx` now uses split auth contexts and idempotent page-view/redirect guards.
- [x] `src/context/UIContext.tsx` now exposes stable modal action context through `useUIActions`.
- [x] `src/components/CoreLayoutWrapper.tsx` delays homepage deep telemetry until homepage idle readiness.
- [x] `src/components/HomepageRuntimeDiagnostics.tsx` now idle-schedules section/layout/input/long-task observers with deduped diagnostics.
- [x] `src/components/Landing/HomeActiveDropsCarousel.tsx` pauses autoplay offscreen/hidden/reduced-motion and uses narrower image sizing.
- [x] `src/components/CreatorDiscoveryRail.tsx` now uses split auth/action contexts, abortable fetches, deferred home relationship hydration, seeded guest short-circuiting, and transition-wrapped bulk state updates.
- [x] `src/components/ui/TitleMarquee.tsx` and `src/components/ui/CompactNumber.tsx` reduce card-level rerenders and resize work.
- [x] `src/components/Hero.tsx`, `src/components/HomeDropTicker.tsx`, and `src/components/Landing/HowItWorks.tsx` reduce scroll-time paint/animation cost and contain below-fold rendering.
- [x] `src/lib/server/creator-discovery.ts` bounds relationship-count fan-out and records candidate-limit diagnostics.
- [x] `src/lib/server/framework-request-diagnostics.ts` tolerates non-`Headers` request metadata from framework error hooks.
- [x] `scripts/check-home-hydration-performance.ts` adds 55 regression checks for the hardened paths.

## 2026-04-28 Second Admin Truth Remediation Coverage

- [x] `src/lib/server/route-runtime-health.ts` now injects admin route verification from payload evidence rather than requiring `success: true`, records injection failures, and avoids response-time fake freshness.
- [x] `scripts/check-admin-truth-contracts.ts` now blocks route verification regressions and debug/admin truth local-state drift patterns from this remediation.
- [x] `src/app/admin/ai/AiHelpers.tsx` adds Admin AI source-state helpers for nullable metrics and dashboard data state.
- [x] `src/app/admin/ai/components/AdminAiRecentgenerationsSection.tsx` labels recent job source state and removes fake reference/risk/prompt defaults.
- [x] `src/app/admin/ai/components/AdminAiReferencelibrarySection.tsx` labels reference-library metrics and removes fake reuse/reference-health zeros.
- [x] `src/app/admin/ai/components/AdminAiRuntimestripSection.tsx` labels runtime/model/preflight/settings truth and blocks settings toggles until settings are verified.
- [x] `src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx` removes fake return-cadence zeros when the source is unavailable.
- [x] `src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx` removes fake commerce/capture zeros and labels live capture source state.
- [x] `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` removes noncanonical `waiting` from admin debug metadata.
- [x] `src/app/admin/debug/components/DebugPrimitives.tsx` now renders canonical admin truth badges in shared debug pills and stat cards.
- [x] `src/app/admin/users/page.tsx` labels summary/realtime/commerce state and removes fake summary/user metric zeros for unavailable sources.
- [x] `src/app/admin/user/[userId]/page.tsx` coerces user detail commerce/metric/coverage/parity/support states through canonical admin truth labels.
- [x] `src/components/Admin/AdminDropsAtGlancePanel.tsx` replaces the local listener truth chip with `AdminStatusBadge`.
- [x] `src/components/Admin/AdminModuleVerificationCard.tsx` replaces local status color rendering with canonical admin truth badges.

## 2026-04-18 Delta Coverage

## 2026-04-21 Delta Coverage

## 2026-04-22 Delta Coverage

## 2026-04-23 Delta Coverage

## 2026-04-28 Tracked File Reconciliation

- Verification source: `git ls-files`, `npm run check:inventory`, `npm run agent:index`, and checklist-heading reconciliation.
- Live tracked file count: `1082`.
- Newly added current checklist headings in this pass: `410`.
- Historical checklist headings marked as no longer tracked: `8`.
- Scope note: this pass confirms repository tracking coverage. It does not claim every listed file has completed detailed function-level review.

### Historical headings no longer tracked

- [x] `src/app/api/admin/ui-chart-health/route.ts` is no longer present in `git ls-files`; retained only as historical checklist evidence.
- [x] `src/app/api/telemetry/track/route.ts` is no longer present in `git ls-files`; retained only as historical checklist evidence.
- [x] `src/components/Admin/TopDropsPanel.tsx` is no longer present in `git ls-files`; retained only as historical checklist evidence.
- [x] `src/hooks/useAdminUiChartHealthReporter.ts` is no longer present in `git ls-files`; retained only as historical checklist evidence.
- [x] `src/lib/admin-ui-chart-health.ts` is no longer present in `git ls-files`; retained only as historical checklist evidence.
- [x] `src/lib/server/admin-ui-chart-health.ts` is no longer present in `git ls-files`; retained only as historical checklist evidence.
- [x] `tests/unit/admin-ui-chart-health-route.spec.ts` is no longer present in `git ls-files`; retained only as historical checklist evidence.
- [x] `tests/unit/admin-ui-chart-health.spec.ts` is no longer present in `git ls-files`; retained only as historical checklist evidence.

### Newly reconciled current tracked files

### `.Jules/palette.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/skills/doctrine-consultation.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/audit-hydration.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/audit-legacy.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/audit-performance.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/audit-realtime.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/audit-telemetry.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/auto-tasks.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/dependency-audit.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/dependency-truth.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/kandydrops-guardrails.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/pre-commit.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/simulate-ui.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/sync-ledgers.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.agent/workflows/ui-copy-refinement-workflow.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.claude/agents/test-specialist.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.dependency-cruiser.cjs`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.github/copilot-instructions.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.github/instructions/admin-debug.instructions.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.github/instructions/analytics.instructions.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.github/instructions/functions-runtime.instructions.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.github/instructions/tests.instructions.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.gitignore`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.idx/dev.nix`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.jules/bolt.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.jules/sentinel.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.lighthouserc.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.ncurc.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.npmrc`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.vscode/settings.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `.vscode/tailwind.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `AGENTS.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `COPY_CONTRACT.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `EVERY_FILE_FUNCTION_CHECKLIST.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `FULL_SCALE_CODEBASE_AUDIT.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `README.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `REPO_MEMORY_LEDGER.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/README.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/blast-radius.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/canonical-helpers.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/dependency-graph.summary.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/governance-truth.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/known-pitfalls.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/package-manager-truth.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/recent-passes.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/repo-inventory.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/retrieval-index.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/runtime-observability.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/surface-map.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/ui-surface-coverage.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/verification-commands.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/index/workflow-guidance.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/prompts/task-issue-spec.generated.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/prompts/task-prompt.deep.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/prompts/task-prompt.short.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/prompts/task-prompt.standard.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/prompts/verification-plan.generated.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/active-task.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/blast-radius.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/canonical-helpers.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/dependency-graph.summary.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/governance-truth.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/handoff.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/known-pitfalls.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/last-change.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/package-manager-truth.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/recent-passes.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/repo-inventory.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/retrieval-index.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/runtime-observability.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/surface-map.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/task-context.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/ui-surface-coverage.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/verification-commands.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/schemas/workflow-guidance.schema.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/active-task.template.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/current-task.template.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/eval-failures.generated.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/eval-results.generated.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/fast-start.generated.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/handoff.template.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/last-change.template.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/sql-mirror-status.generated.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/sql-sync.payload.generated.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/task-context.generated.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/task-context.template.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `agent/state/verification-plan.generated.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `apphosting.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `backends.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `clean-analytics-import-v2.py`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/00-START-HERE.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/01-MISSION.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/02-AGENT-ROLES.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/03-TASK-ROUTING.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/04-EXECUTION-ORDER.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/05-CAPABILITIES-AND-CONSTRAINTS.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/06-SOURCE-OF-TRUTH-MAP.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/07-SHARED-COMPONENT-OWNERSHIP.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/08-DOCTRINE-INDEX.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/09-HANDOFFS.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/10-BANNED-PATTERNS.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/11-PREFLIGHT-CHECKLIST.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/12-POSTFLIGHT-CHECKLIST.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/13-TASK-TEMPLATE.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/14-STATUS-LABELS.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/15-QUICK-ROUTING.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/16-AGENT-OPERATING-BLUEPRINT.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/17-AGENT-HANDOFF-SEQUENCE.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/18-JULES-RECURRING-TASKS.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/19-TOOL-AVAILABILITY-MAP.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `control-tower/20-AGENT-ROUTING-RECIPES.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `creator-playbooks/jessi-ray/README.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `creator-playbooks/jessi-ray/jessi-ray-confusion-tags.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `creator-playbooks/jessi-ray/jessi-ray-dm-script-sheet.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `creator-playbooks/jessi-ray/jessi-ray-feedback-prompt-card.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `creator-playbooks/jessi-ray/jessi-ray-walkthrough-card.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `creator-playbooks/jessi-ray/jessi-ray-weekly-scorecard-template.csv`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `cypress/tsconfig.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `database.rules.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/.dataconnect/schema/main/input.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/.dataconnect/schema/main/mutation.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/.dataconnect/schema/main/query.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/.dataconnect/schema/main/relation.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/.dataconnect/schema/prelude.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/dataconnect.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/example/agent-context.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/example/connector.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/schema/agent-context.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `dataconnect/schema/structured_profiles.gql`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `debug-output.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/agent-truth/admin-activity.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/agent-truth/admin-analytics-overview.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/agent-truth/admin-drops-at-a-glance.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/agent-truth/admin-overview.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/agent-truth/admin-recent-transactions.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/agent-truth/admin-revenue-top-drops.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/agent-truth/admin-revenue-trends.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/doctrine/kandydrops-banned-patterns.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/doctrine/kandydrops-copy-doctrine.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/doctrine/kandydrops-decision-checklist.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/doctrine/kandydrops-product-doctrine.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/doctrine/kandydrops-surface-matrix.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/doctrine/kandydrops-ui-doctrine.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `docs/doctrine/kandydrops-vocabulary-index.md`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `eslint-errors.log`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `eslint.config.mjs`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `firebase.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `firestore.indexes.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `firestore.rules`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/.gitignore`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/package-lock.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/package.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/pnpm-lock.yaml`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-bigquery-export.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-timeline.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-truth-cli.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-truth-contract.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-truth-runtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-truth-schedule.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/behavioral-intelligence-cli.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/behavioral-intelligence-runtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/ml-feature-registry.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/privacy-consent-enforcement.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/src/profile-builder.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/tsconfig.dev.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `functions/tsconfig.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `git_diff.txt`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `git_log_output.txt`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `knip.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `package-lock.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `package.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `postcss.config.mjs`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/candy-3d-glass.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/candy-main.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/file.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/globe.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/icon-192x192.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/icon-512x512.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/manifest.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/next.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/vercel.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `public/window.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-admin-create-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-admin-create-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-admin-drops-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-admin-drops-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-admin-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-admin-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-dashboard-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-dashboard-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-drops-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-drops-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-experiences-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-experiences-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-experiences.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-home-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-home-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/desktop-home.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-admin-create-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-admin-create-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-admin-drops-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-admin-drops-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-admin-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-admin-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-dashboard-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-dashboard-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-drops-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-drops-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-experiences-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-experiences-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-experiences.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-home-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-home-viewport.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/mobile-home.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/tablet-dashboard-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/tablet-drops-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/tablet-experiences.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/tablet-home-full.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `qa-screenshots/tablet-home.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `replace-dropcard-layout2.mjs`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scratch/find-untracked.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scratch/inject-targets.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scratch/untracked-routes.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scratch/wrap-routes.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/agent/check-dependency-truth.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/agent/check-infrastructure-truth.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/agent/fast-start.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/agent/verification-selector.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/check-admin-parity.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/check-analytics-continuity.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/debug-watch-capture-health.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/extractChatHelpers.js`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/extractViewerHelpers.js`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/rebuild-analytics-truth.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/rebuild-behavioral-intelligence.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/remove-hovers.mjs`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/repair-viewer-watch-close-missing.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/replace-icons.mjs`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/rewrite_ai_page.py`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/rewrite_profile_page.py`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/run-lighthouse-audits.mjs`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/shred_ai.py`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/shred_ai_components.py`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/shred_profile.py`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/shred_profile_components.py`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `scripts/verify-deployment.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/AdminPrivacyPreflight.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/AiHelpers.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/admin-ai-state-exports.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/components/AdminAiDiagnosticsSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/components/AdminAiOptimizerhealthSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/components/AdminAiPromptworkbenchSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/components/AdminAiRecentgenerationsSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/components/AdminAiReferencelibrarySection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/components/AdminAiReviewgallerySection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/components/AdminAiRuntimestripSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/hooks/useAdminAiState.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/analytics/AnalyticsHelpers.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/AdminAiAssistantRealtimePanel.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugAdvancedBehavior.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugAdvancedDrift.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugAdvancedExperiments.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugAdvancedTelemetry.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugAdvancedTruth.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugMonitoringRoutes.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugNowDiagnostics.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugPrimitives.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugTabActions.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugTabAdvanced.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugTabAi.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugTabInfrastructure.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugTabMonitoring.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/components/DebugTabNow.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/hooks/useAdminAiAssistantRealtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/hooks/useAdminDebugRealtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/admin/privacy/page.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/debug/assistant/fix/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/users/realtime/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/analytics/ingest-identified/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/bookings/booking-timezone.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/feedback/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/recommendations/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/retention/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/health/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/activity/activity-route-test-helpers.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/api/wallet/packages/route.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfileAccountSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfileCreatorEarningsSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfileCreatorToolsSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfileNotificationsSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfilePrimitives.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfilePrivacyDataSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfileProfileSection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/hooks/useProfileState.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/profile-page-types.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/ViewerHelpers.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/components/DropInfoOverlay.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/components/MediaViewer.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/components/ThumbnailsSlider.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/components/ViewerSkeleton.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/hooks/useViewerFeedback.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/hooks/useViewerSecurity.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/hooks/useViewerState.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/favicon.ico`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/app/globals.css`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminModuleVerificationCard.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminStatusBadge.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/TopDropsTable.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/AdminErrorCatcher.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/Auth/AuthHelpers.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/Auth/OnboardingHelpers.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/HomepageRuntimeDiagnostics.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/Landing/HomeHeroActions.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/Landing/HomeHowItWorksActions.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/PurchaseModal.tsx.bak`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/components/ui/CompactNumber.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAdminModerationRealtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAdminOverviewRealtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAdminPrivacyPreflight.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAdminSupportRealtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/instrumentation-client.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/instrumentation.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-ai-debug-runtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-analytics-live-runtime.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-analytics-return-cadence.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-analytics-truth.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-parity.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-user-commerce.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-user-metrics.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/client-boot-diagnostics.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-capture-health.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-source-verification.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/ai-drop-covers-helpers.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-runtime-warning.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-truth-recovery.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/behavioral-intelligence.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/ephemeral-route-cache.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/lib/server/framework-request-diagnostics.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/Configure.mdx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/accessibility.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/accessibility.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/addon-library.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/assets.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/avif-test-image.avif`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/context.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/discord.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/docs.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/figma-plugin.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/github.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/share.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/styling.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/testing.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/theming.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/tutorials.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/assets/youtube.svg`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/button.css`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/header.css`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `src/stories/page.css`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `storage.rules`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `test-failures.log`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/puppeteer/tsconfig.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/setup/deterministic-mocks.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/creator-apply-hero-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/creator-apply-hero-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/creator-waitlist-guest-hero-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/creator-waitlist-guest-hero-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/privacy-page-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/privacy-page-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/ui-surface-src-app-creators-apply-page-tsx-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/ui-surface-src-app-creators-apply-page-tsx-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/ui-surface-src-app-creators-waitlist-page-tsx-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/ui-surface-src-app-creators-waitlist-page-tsx-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/ui-surface-src-app-page-tsx-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts-snapshots/ui-surface-src-app-page-tsx-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-debug-runtime.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-capture-health.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-historical-tasks.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-live-runtime.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-page.spec.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-return-cadence.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-truth.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-overview-truth.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-parity.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-user-commerce.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-user-metrics.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/agent-verification-selector.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/auto-scroll-to-top.spec.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-route-shell.spec.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/check-scheduler-freshness.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/client-boot-diagnostics.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/framework-request-diagnostics.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/home-client.spec.tsx`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/self-healing.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/unit/viewer-watch-session.spec.ts`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/visual.spec.ts-snapshots/admin-login-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/visual.spec.ts-snapshots/drops-grid-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/visual.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tests/visual.spec.ts-snapshots/home-hero-chromium-win32.png`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tsc-errors.log`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `tsconfig.json`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

### `update-emulators.js`

- [x] File exists and is tracked as of the 2026-04-28 reconciliation pass.
- [ ] Pending detailed function-level audit.

## 2026-04-26 Delta Coverage

- Real-time Runtime Health Proxy Tracking added on 2026-04-26:
  - `src/app/__/auth/[...path]/route.ts`
    - [x] Wrapped `GET`, `POST`, and `HEAD` proxy handlers with `withRouteRuntimeHealth` for realtime observability.
  - `src/app/__/firebase/[...path]/route.ts`
    - [x] Wrapped `GET` and `HEAD` proxy handlers with `withRouteRuntimeHealth` for realtime observability.
- Verification note: Verified all other `src/app` API routes are fully wrapped. Typecheck, targeted architecture checks, and continuity checks passed successfully.

- Admin Analytics Resilience added on 2026-04-26:
  - `src/app/admin/analytics/page.tsx`
    - [x] Fixed TS1127/TS1381 corruptions and restored Tabs mapping/module filters.
  - `src/app/api/admin/analytics/realtime/route.ts`
    - [x] Wraps historical/aggregated polling reads in a 5-minute Firestore cache (`analytics_aggregate_stats`) with `liveTruthLabel` passing.
  - `src/lib/self-healing.ts`
    - [x] Provides backoff strategies for automatic observer reconnection.
  - `src/lib/server/analytics-governance.ts`
    - [x] Includes caching considerations for aggregations.
  - `apphosting.yaml`
    - [x] Defined `minInstances: 1` to bypass Admin cold starts.

- Admin hydration and realtime janitorial recovery coverage added on 2026-04-24:
  - `src/hooks/useAdminOverviewRealtime.ts`
    - [x] Hydrates overview stats, top drops, and recent transactions from Firestore listeners before the cold overview route returns.
    - [x] Emits explicit `[Partial]`, `[Live]`, and `[Failed]` truth notes instead of silently claiming healthy fallback.
    - [x] Reports realtime listener failures through client diagnostics instead of raw console-only side paths.
  - `src/hooks/useAdminOverview.ts`
    - [x] Delegates the public admin overview hook to the realtime overlay hook.
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
    - [x] Allows listener-derived live analytics to render without waiting on the polled realtime API response.
  - `src/lib/route-runtime-health.ts`
    - [x] Owns the client-safe route runtime health collection constant.
  - `src/app/admin/debug/hooks/useAdminDebugRealtime.ts`
    - [x] Reads runtime warnings, route health, repair proposals, and queue heartbeats without importing server-only modules.
  - `src/app/admin/debug/hooks/useAdminAiAssistantRealtime.ts`
    - [x] Removes synchronous effect state reset and stale hook dependency around route health.
  - `src/hooks/useAdminSupportRealtime.ts`
    - [x] Removes duplicate/unused imports and avoids synchronous effect resets for empty support-thread selection.
  - `tests/ui-audits/visual-regression.spec.ts`
    - [x] Masks dynamic homepage live-count/nav and auth-sensitive creator-apply CTA regions.
  - `src/components/Landing/HomeActiveDropsCarousel.tsx`
    - [x] Fixes homepage empty daily-experience contrast.
- Verification note: typecheck, lint, UI coverage, UI runtime, full UI audits, admin parity, continuity, and generated-artifact checks passed after cleaning `.next`, `playwright-report`, and `test-results`.

- Admin realtime truth remediation coverage added on 2026-04-24:
  - `src/hooks/useAdminModerationRealtime.ts`
    - [x] Derives `activeThreadId` from the valid explicit selection or first realtime thread.
    - [x] Uses the same `activeThreadId` for message subscription and returned visible transcript state.
    - [x] Hides stale message data when the active thread changes before the new snapshot lands.
  - `src/components/Admin/AdminModerationConsole.tsx`
    - [x] Uses hook-owned `activeThreadId` for selected-thread rendering.
  - `src/hooks/useAdminPrivacyPreflight.ts`
    - [x] Initializes event recency as unavailable instead of fresh.
    - [x] Requires canonical `idempotencyKey === doc.id` proof before reporting dedupe health as `live`.
  - `src/app/admin/AdminPrivacyPreflight.tsx`
    - [x] Avoids overclaiming the entire preflight as live and uses operational truth copy for unproven dedupe.
  - `.gitignore`
    - [x] Ignores local Playwright, test-result, Lighthouse, and Firebase debug artifacts.
  - Generated artifact cleanup:
    - [x] `database-debug.log` removed from tracked truth.
    - [x] `playwright-report/index.html` removed from tracked truth.
    - [x] `test-results/.last-run.json` removed from tracked truth.
- Verification note: typecheck, targeted ESLint, admin parity, generated-artifact check, UI coverage, UI runtime, and continuity passed. `check:ui:audits` is blocked in the dirty worktree by pre-existing uncommitted admin debug client/server import drift.

- Added shared admin parity and source-verification contracts:
  - `src/lib/admin-parity.ts`
  - `src/lib/server/admin-source-verification.ts`
  - `src/components/admin/AdminStatusBadge.tsx`
- Hardened admin source-truth route envelopes:
  - `src/app/api/admin/overview/route.ts`
  - `src/app/api/admin/users/route.ts`
  - `src/app/api/admin/user/[userId]/route.ts`
  - `src/app/api/admin/support/threads/route.ts`
  - `src/app/api/admin/moderation/security-alerts/route.ts`
  - `src/app/api/admin/content/route.ts`
  - `src/app/api/admin/ai/drop-covers/route.ts`
  - `src/app/api/admin/debug/route.ts`
- Hardened admin client truth semantics:
  - `src/hooks/useAdminPrivacyPreflight.ts`
  - `src/app/admin/AdminPrivacyPreflight.tsx`
  - `src/app/admin/AdminTruthSurfaces.tsx`
  - `src/app/admin/users/page.tsx`
- Added targeted admin parity verification tooling and regression coverage:
  - `scripts/check-admin-parity.ts`
  - `tests/unit/admin-parity.spec.ts`
- Continuity note: admin surfaces must now reuse the shared status contract and route-level verification metadata instead of page-local labels or implied source truth.

- Added admin realtime-presence derivation and listener ownership surfaces:
  - `src/lib/admin-analytics-live-runtime.ts`
  - `src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts`
- Hardened admin analytics live-serving surfaces:
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx`
  - `src/types/admin-analytics.ts`
- Added targeted regression coverage:
  - `tests/unit/admin-analytics-live-runtime.spec.ts`
- Continuity note: admin "live" presence is now listener-driven from canonical first-party telemetry and only falls back to the polled route when realtime lanes fail or have not loaded yet.

- Added framework-boot and self-snitching diagnostics surfaces:
  - `src/instrumentation.ts`
  - `src/instrumentation-client.ts`
  - `src/lib/client-boot-diagnostics.ts`
  - `src/lib/server/framework-request-diagnostics.ts`
  - `src/lib/server/analytics-runtime-warning.ts`
- Hardened analytics/admin/user runtime truth escalation surfaces:
  - `src/app/api/admin/analytics/realtime/route.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/app/api/user/activity/route.ts`
  - `src/lib/route-runtime-health.ts`
- Continuity note: early boot, framework request failures, analytics fallback truth, and user-activity query fallback paths now feed canonical diagnostics/runtime warning stores instead of relying on delayed client mount or console-only inspection.

- Added user/admin loading-optimization cache and historical-pull hardening surfaces:
  - `src/lib/server/ephemeral-route-cache.ts`
  - `src/lib/server/admin-analytics-data.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/app/api/admin/analytics/realtime/route.ts`
  - `src/app/api/user/activity/route.ts`
- Tightened admin polling/hydration surfaces:
  - `src/app/admin/analytics/AnalyticsHelpers.tsx`
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/app/admin/debug/page.tsx`
  - `src/hooks/useAdminOverview.ts`
- Continuity note: heavy admin historical and debug reads now use slower polling and short-lived cached payloads instead of repeated live-style reloads, while user recent-activity history can reuse a cached route payload during short repeat windows.

- Added deployment-hardening helper/type splits required by Next 16 App Router entry rules:
  - `src/app/admin/ai/admin-ai-state-exports.ts`
  - `src/app/api/creator/bookings/booking-timezone.ts`
  - `src/app/api/user/activity/activity-route-test-helpers.ts`
  - `src/app/dashboard/profile/profile-page-types.ts`
- Updated App Router entry files to stop exporting non-entry symbols:
  - `src/app/admin/ai/page.tsx`
  - `src/app/api/creator/bookings/route.ts`
  - `src/app/api/user/activity/route.ts`
  - `src/app/dashboard/profile/page.tsx`
- Updated adjacent tests and profile sections to consume the new helper/type modules:
  - `tests/unit/user-activity-route.spec.ts`
  - `tests/unit/creator-bookings-route.spec.ts`
  - `src/app/dashboard/profile/components/*`
- Added analytics truth-recovery and telemetry hardening surfaces:
  - `functions/src/analytics-truth-contract.ts`
  - `functions/src/analytics-truth-runtime.ts`
  - `functions/src/analytics-truth-schedule.ts`
  - `src/lib/server/analytics-truth-recovery.ts`
  - `scripts/rebuild-analytics-truth.ts`
  - `scripts/debug-watch-capture-health.ts`
- Extended raw telemetry ownership and append-only watch observation coverage:
  - `functions/src/analytics-event-facts.ts`
  - `src/app/api/viewer/watch-session/route.ts`
  - `src/lib/server/analytics-governance.ts`
  - `src/lib/server/analytics.ts`
- Extended admin/debug and deterministic ranking telemetry-quality visibility:
  - `src/app/api/admin/debug/route.ts`
  - `src/app/admin/debug/page.tsx`
  - `src/lib/server/behavioral-intelligence.ts`
- Continuity note: telemetry truth now separates raw observed, validated, finalized, estimated, and serving/debug layers explicitly, and authenticated telemetry batching no longer drops identified event facts simply because the callable ingest contract only understood a single-event payload.
- Follow-up note: replay-recovered watch sessions remain visible as `replayed`, but only unresolved `gap_detected`, `flush_degraded`, and `close_missing` states count against degraded watch-capture health.
- Follow-up note: optional guest-history sources in `src/lib/admin-analytics-truth.ts` are now idle-aware, and admin realtime analytics now has a truthful first-party fallback in `src/app/api/admin/analytics/realtime/route.ts` instead of silently zeroing live cards when GA realtime or `analytics_active_users` is unavailable.

- Added generated agent fast-start and verification-plan surfaces:
  - `scripts/agent/fast-start.ts`
  - `scripts/agent/verification-selector.ts`
  - `agent/prompts/task-issue-spec.generated.md`
  - `agent/prompts/verification-plan.generated.md`
  - `agent/state/fast-start.generated.json`
  - `agent/state/verification-plan.generated.json`
- Extended task-context and eval surfaces:
  - `scripts/agent/build-task-context.ts`
  - `scripts/agent/run-evals.ts`
  - `agent/schemas/task-context.schema.json`
  - `agent/state/eval-failures.generated.json`
- Added portable agent instruction surfaces:
  - `.github/copilot-instructions.md`
  - `.github/instructions/analytics.instructions.md`
  - `.github/instructions/admin-debug.instructions.md`
  - `.github/instructions/functions-runtime.instructions.md`
  - `.github/instructions/tests.instructions.md`
  - `.claude/agents/test-specialist.md`
- Added focused verification-selector coverage:
  - `tests/unit/agent-verification-selector.spec.ts`
- Continuity note: agent startup should now prefer `agent:fast-start` and `agent:verify` before broad-signoff sweeps, and generated task prompts now separate fast-loop verification from signoff lanes explicitly.

- Added repo-intelligence and cross-agent context surfaces:
  - `agent/README.md`
  - `agent/index/*.json`
  - `agent/prompts/*.md`
  - `agent/schemas/*.json`
  - `agent/state/*.json`
  - `scripts/agent/*.ts`
  - `dataconnect/schema/agent-context.gql`
  - `dataconnect/example/agent-context.gql`
- Added focused creator-settings regression coverage:
  - `tests/unit/creator-settings-route.spec.ts`
- Added generated UI continuity and coverage surfaces:
  - `agent/index/ui-surface-coverage.json`
  - `agent/schemas/ui-surface-coverage.schema.json`
  - `scripts/agent/build-ui-surface-coverage.ts`
  - `scripts/agent/check-ui-surface-coverage.ts`
  - `scripts/agent/build-ui-runtime-audit.ts`
  - `tests/ui-audits/runtime.spec.ts`
  - `tests/ui-audits/ui-surface-targets.ts`
- Added shared UI continuity runtime helpers:
  - `src/lib/ui-continuity.ts`
  - `src/components/ui/UiContinuityNotice.tsx`
- Added shared queue/runtime canonicalization and warning contracts:
  - `shared/runtime/drop-status.ts`
  - `shared/runtime/timezone.ts`
  - `shared/runtime/drop-queue-schedule.ts`
  - `shared/runtime/drop-queue-lifecycle.ts`
  - `shared/runtime/queue-runtime.ts`
  - `shared/runtime/runtime-warning-contract.ts`
- Added runtime warning persistence and canonical queue execution surfaces:
  - `src/lib/server/runtime-warning-store.ts`
  - `src/lib/server/queue-runtime.ts`
  - `src/lib/server/push-notifications.ts`
  - `functions/src/runtime-warning-store.ts`
  - `functions/src/queue-runtime.ts`
  - `functions/src/index.ts`
  - `src/app/api/cron/process-queue/route.ts`
  - `src/app/api/cron/notify-active-drops/route.ts`
- Added no-build runtime continuity verification surfaces:
  - `scripts/runtime-admin.ts`
  - `scripts/check-scheduler-freshness.ts`
  - `scripts/check-queue-runtime.ts`
  - `scripts/check-warnings.ts`
  - `scripts/check-runtime-continuity.ts`
  - `tests/unit/process-queue-route.spec.ts`
  - `tests/unit/notify-active-drops-route.spec.ts`
  - `tests/unit/check-scheduler-freshness.spec.ts`
- Added compact mobile chat regression coverage:
  - `tests/unit/chat-route-shell.spec.tsx`
- Added compact interaction self-healing coverage:
  - `tests/unit/self-healing.spec.ts`
- Added admin/debug queue runtime visibility:
  - `src/lib/server/admin-analytics-capture-health.ts`
  - `scripts/check-analytics-continuity.ts`
  - `tests/unit/admin-analytics-capture-health.spec.ts`
- Extended agent and analytics continuity surfaces:
  - `scripts/agent/build-task-context.ts`
  - `scripts/agent/build-agent-indexes.ts`
  - `scripts/agent/run-evals.ts`
  - `scripts/agent/extract-runtime-observability.ts`
  - `agent/index/retrieval-index.json`
  - `agent/index/runtime-observability.json`
- Extended canonical viewer watch/session surfaces:
  - `src/lib/viewer-watch-session.ts`
  - `src/hooks/useViewerWatchSession.ts`
  - `src/app/dashboard/viewer/ViewerClient.tsx`
  - `src/app/api/viewer/watch-session/route.ts`
- Added analytics truth/state-of-truth hardening surfaces:
  - `src/lib/admin-analytics-truth.ts`
  - `src/lib/server/admin-analytics-historical-validation.ts`
  - `src/lib/server/admin-ops-health.ts`
  - `src/lib/admin-ops-health.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/app/admin/debug/page.tsx`
  - `src/types/admin-analytics.ts`
  - `tests/unit/admin-analytics-truth.spec.ts`
  - `tests/unit/admin-ops-health.spec.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/app/api/admin/analytics/realtime/route.ts`
  - `src/lib/server/admin-analytics-historical-validation.ts`
  - `src/types/admin-analytics.ts`
  - `src/app/admin/analytics/page.tsx`
  - `tests/unit/admin-analytics-realtime-route.spec.ts`
  - `src/app/admin/debug/page.tsx`
  - `src/app/api/admin/debug/route.ts`
- Added open-PR reconciliation coverage and local supersession surfaces:
  - `src/app/admin/analytics/page.tsx`
  - `src/app/api/admin/users/[userId]/username/route.ts`
  - `src/components/Admin/AssetUploader.tsx`
  - `tests/unit/admin-user-username-route.spec.ts`
  - `src/app/api/admin/debug/route.ts`
  - `src/app/admin/debug/page.tsx`
- Added creator booking/subscription continuity coverage:
  - `tests/unit/creator-bookings-route.spec.ts`
  - `tests/unit/creator-subscriptions-route.spec.ts`
  - `tests/unit/ui-continuity.spec.ts`
  - `tests/unit/creator-experiences-panel.spec.tsx`
  - `tests/unit/creator-workspace-panel.spec.tsx`
- Continuity note: `src/app/api/creator/settings/route.ts` now uses explicit `AuthError` statuses for missing creator profiles and access-denied states, and the route gate aligns with the existing `creator || admin` profile-page caller posture.
- Added creator profile-page warning handling follow-up:
  - `src/app/dashboard/profile/page.tsx`
- Continuity note: the profile page now separates creator-settings and creator-broadcast load failures, preserves partial success when one request still succeeds, and shows a visible warning instead of silently hiding common recoverable creator-tool load errors behind fallback state.
- Continuity note: creator/public/dashboard UI surfaces now flow through a generated machine-readable coverage ledger, and the creator public profile plus creator workspace use shared module continuity handling instead of silent all-or-nothing hydration.
- Continuity note: queue lifecycle now has a canonical Firebase Functions scheduler lane, the Next cron routes are warning-producing legacy adapters only, and runtime continuity checks can now fail on missing queue heartbeats or missing notification outcomes without requiring a full build.
- Continuity note: queue heartbeat truth now records `executionLayer` and `surface`, scheduler freshness only trusts canonical `executionLayer: "scheduler"` heartbeat docs, and local empty-state verification may fall back to static scheduler-wiring proof until live scheduler heartbeats exist.
- Continuity note: root `package.json`/`package-lock.json` and `functions/package.json`/`functions/package-lock.json` now override `@google-cloud/firestore` to `^8.5.0` and `google-gax` to `^5.0.6` so Firestore-backed continuity scripts stop emitting the previous Node 24 `punycode` deprecation warning while Functions runtime truth remains on Node 22.
- Continuity note: compact/mobile chat now uses local height containment instead of a viewport-wide fixed route shell, `ChatRouteShell` only locks document overflow on non-compact viewports, and the thread-search input explicitly releases focus when leaving the compact thread list path.
- Continuity note: `src/lib/self-healing.ts` now exposes a shared compact interaction recovery guard, and `ChatExperience` uses it to self-heal stale compact/mobile interaction-release states while emitting structured `ui` diagnostics.
- Coverage note: these files are included in current continuity/signoff scope even though the historical exhaustive body below has not yet been fully regenerated for the new directories.

Historical sweep file-body baseline: 413 tracked files
Current tracked baseline in the standing audit: 808 tracked files after the 2026-04-16 committed-state review
Detected function-like implementations in this historical sweep: 3161

## [x] .agent/workflows/pre-commit.md
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] .gitignore
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] .ncurc.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] .npmrc
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] .vscode/settings.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] .vscode/tailwind.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] AGENTS.md
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] ANALYTICS_SYSTEM_AUDIT_2026-03-18.md
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] apphosting.yaml
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] dataconnect/.dataconnect/schema/main/input.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/.dataconnect/schema/main/mutation.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/.dataconnect/schema/main/query.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/.dataconnect/schema/main/relation.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/.dataconnect/schema/prelude.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/analytics_export/connector.yaml
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/analytics_export/mutations.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/analytics_export/queries.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/dataconnect.yaml
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/example/connector.yaml
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/example/mutations.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/example/queries.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/schema/machine_learning.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] dataconnect/schema/schema.gql
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] eslint.config.mjs
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] EVERY_FILE_FUNCTION_CHECKLIST.md
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] firebase.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] firestore.indexes.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] firestore.rules
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] FULL_CODEBASE_POST_AUDIT_2026-03-18.md
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/.gitignore
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/eslint.config.js
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/package-lock.json
- Confidence: 96%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 96%

## [x] functions/package.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/src/analytics-core.ts
- Confidence: 98%
- Functions detected: 18
- Functions:
  - [x] pad (function, line 89)
    - Confidence: 98%
  - [x] toTimeKeys (function, line 93)
    - Confidence: 98%
  - [x] encodeKeyFragment (function, line 102)
    - Confidence: 98%
  - [x] readString (function, line 110)
    - Confidence: 98%
  - [x] readNumber (function, line 114)
    - Confidence: 98%
  - [x] readBoolean (function, line 118)
    - Confidence: 98%
  - [x] quantizePixelPoint (function, line 122)
    - Confidence: 98%
  - [x] sum (function, line 128)
    - Confidence: 98%
  - [x] values.reduce callback (arrow, line 129)
    - Confidence: 98%
  - [x] average (function, line 132)
    - Confidence: 98%
  - [x] buildIncrementUpdate (function, line 140)
    - Confidence: 98%
  - [x] topEntries (function, line 144)
    - Confidence: 98%
  - [x] Array.from(map.entries())     .map callback (arrow, line 146)
    - Confidence: 98%
  - [x] Array.from(map.entries())     .map(([key, count]) => ({key, count}))     .sort callback (arrow, line 147)
    - Confidence: 98%
  - [x] summarizeEventFacts (function, line 151)
    - Confidence: 98%
  - [x] events.forEach callback (arrow, line 168)
    - Confidence: 98%
  - [x] Array.from(dropCounts.entries())       .map callback (arrow, line 231)
    - Confidence: 98%
  - [x] Array.from(dropCounts.entries())       .map(([key, count]) => ({         key,         count,         label: dropLabels.get(key) || key,       }))       .sort callback (arrow, line 236)
    - Confidence: 98%

## [x] functions/src/analytics-event-facts.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] buildSessionFactId (function, line 19)
    - Confidence: 98%
  - [x] onDocumentCreated callback (arrow, line 27)
    - Confidence: 98%

## [x] functions/src/analytics-export-dataconnect.ts
- Confidence: 98%
- Functions detected: 12
- Functions:
  - [x] toUuid (function, line 16)
    - Confidence: 98%
  - [x] buildStableAnalyticsExportId (function, line 30)
    - Confidence: 98%
  - [x] getAnalyticsExportDataConnect (function, line 34)
    - Confidence: 98%
  - [x] readTimestampMillis (function, line 38)
    - Confidence: 98%
  - [x] readInt (function, line 64)
    - Confidence: 98%
  - [x] readFloat (function, line 68)
    - Confidence: 98%
  - [x] readStringValue (function, line 72)
    - Confidence: 98%
  - [x] readNullableInt (function, line 76)
    - Confidence: 98%
  - [x] readNullableStringValue (function, line 80)
    - Confidence: 98%
  - [x] recordAnalyticsExportFailure (function, line 84)
    - Confidence: 98%
  - [x] upsertAnalyticsExportStatus (function, line 105)
    - Confidence: 98%
  - [x] markAnalyticsExportStatusError (function, line 128)
    - Confidence: 98%

## [x] functions/src/analytics-export-sync.ts
- Confidence: 98%
- Functions detected: 20
- Functions:
  - [x] fallbackSourceUpdatedAtMs (function, line 30)
    - Confidence: 98%
  - [x] getDocumentParam (function, line 41)
    - Confidence: 98%
  - [x] createExportSyncTrigger (function, line 45)
    - Confidence: 98%
  - [x] onDocumentWritten callback (arrow, line 49)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 135)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 161)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 191)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 233)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 274)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 306)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 336)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 367)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 388)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 410)
    - Confidence: 98%
  - [x] createExportSyncTrigger callback (arrow, line 428)
    - Confidence: 98%
  - [x] onDocumentWritten callback (arrow, line 453)
    - Confidence: 98%
  - [x] rows.map callback (arrow, line 465)
    - Confidence: 98%
  - [x] alerts.map callback (arrow, line 505)
    - Confidence: 98%
  - [x] existingRows         .filter callback (arrow, line 522)
    - Confidence: 98%
  - [x] existingRows         .filter((row) => !nextTypeIds.has(row.id))         .map callback (arrow, line 523)
    - Confidence: 98%

## [x] functions/src/analytics-guest-batches.ts
- Confidence: 98%
- Functions detected: 9
- Functions:
  - [x] buildTargetLabel (function, line 19)
    - Confidence: 98%
  - [x] onDocumentCreated callback (arrow, line 32)
    - Confidence: 98%
  - [x] events.forEach callback (arrow, line 69)
    - Confidence: 98%
  - [x] pageMap.forEach callback (arrow, line 146)
    - Confidence: 98%
  - [x] typeMap.forEach callback (arrow, line 160)
    - Confidence: 98%
  - [x] pageRollups.forEach callback (arrow, line 172)
    - Confidence: 98%
  - [x] targetRollups.forEach callback (arrow, line 189)
    - Confidence: 98%
  - [x] heatMap.forEach callback (arrow, line 203)
    - Confidence: 98%
  - [x] Array.from(pageMap.entries()).map callback (arrow, line 232)
    - Confidence: 98%

## [x] functions/src/analytics-realtime.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] incrementRealtimeNode (function, line 3)
    - Confidence: 98%
  - [x] rtdb.ref(path).transaction callback (arrow, line 4)
    - Confidence: 98%
  - [x] Object.entries(patch).forEach callback (arrow, line 6)
    - Confidence: 98%

## [x] functions/src/analytics-runtime.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] buildRuntimePayload (function, line 10)
    - Confidence: 98%
  - [x] markAnalyticsRuntimeChanged (function, line 18)
    - Confidence: 98%
  - [x] touchAnalyticsRuntime (function, line 29)
    - Confidence: 98%

## [x] functions/src/analytics-schedules.ts
- Confidence: 98%
- Functions detected: 21
- Functions:
  - [x] buildWindowDocId (function, line 18)
    - Confidence: 98%
  - [x] writeWindowSummary (function, line 22)
    - Confidence: 98%
  - [x] queryEventsSince (function, line 30)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 35)
    - Confidence: 98%
  - [x] writeCurrentAlerts (function, line 38)
    - Confidence: 98%
  - [x] roundCurrency (function, line 47)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 53)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 59)
    - Confidence: 98%
  - [x] activeUsers.slice(0, 50).map callback (arrow, line 63)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 76)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 85)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 94)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 100)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 128)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 134)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 161)
    - Confidence: 98%
  - [x] dailySnapshot.docs.map callback (arrow, line 167)
    - Confidence: 98%
  - [x] bundleSnapshot.docs.map callback (arrow, line 187)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 222)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 228)
    - Confidence: 98%
  - [x] onSchedule callback (arrow, line 266)
    - Confidence: 98%

## [x] functions/src/analytics-security-events.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] onDocumentCreated callback (arrow, line 35)
    - Confidence: 98%

## [x] functions/src/analytics-semantics.ts
- Confidence: 98%
- Functions detected: 15
- Functions:
  - [x] humanizeAnalyticsKey (function, line 38)
    - Confidence: 98%
  - [x] value     .replace(/[._-]+/g, " ")     .replace callback (arrow, line 45)
    - Confidence: 98%
  - [x] getLegacyPagePathForEvent (function, line 58)
    - Confidence: 98%
  - [x] normalizePagePath (function, line 66)
    - Confidence: 98%
  - [x] buildFallbackSemanticContext (function, line 79)
    - Confidence: 98%
  - [x] resolveAnalyticsSemanticContext (function, line 199)
    - Confidence: 98%
  - [x] asNumber (function, line 229)
    - Confidence: 98%
  - [x] asString (function, line 234)
    - Confidence: 98%
  - [x] createDocKey (function, line 238)
    - Confidence: 98%
  - [x] buildGuestSemanticDelta (function, line 243)
    - Confidence: 98%
  - [x] buildTelemetrySemanticDelta (function, line 284)
    - Confidence: 98%
  - [x] writeRollup (function, line 350)
    - Confidence: 98%
  - [x] recordSemanticRollupFromEventFact (function, line 410)
    - Confidence: 98%
  - [x] recordSemanticRollupFromGuestBatch (function, line 453)
    - Confidence: 98%
  - [x] events.map callback (arrow, line 459)
    - Confidence: 98%

## [x] functions/src/analytics-task-events.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] onDocumentCreated callback (arrow, line 25)
    - Confidence: 98%

## [x] functions/src/analytics-transactions.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] onDocumentCreated callback (arrow, line 41)
    - Confidence: 98%

## [x] functions/src/dataconnect-admin-generated/esm/index.esm.js
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] createAiInteraction (function, line 9)
    - Confidence: 98%
  - [x] listAiInteractions (function, line 15)
    - Confidence: 98%

## [x] functions/src/dataconnect-admin-generated/esm/package.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/src/dataconnect-admin-generated/index.cjs.js
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] createAiInteraction (function, line 10)
    - Confidence: 98%
  - [x] listAiInteractions (function, line 17)
    - Confidence: 98%

## [x] functions/src/dataconnect-admin-generated/index.d.ts
- Confidence: 98%
- Functions detected: 4
- Functions:
  - [x] createAiInteraction (function, line 128)
    - Confidence: 98%
  - [x] createAiInteraction (function, line 130)
    - Confidence: 98%
  - [x] listAiInteractions (function, line 133)
    - Confidence: 98%
  - [x] listAiInteractions (function, line 135)
    - Confidence: 98%

## [x] functions/src/dataconnect-admin-generated/package.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/src/firebase-admin.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] getOrCreateAdminApp (function, line 9)
    - Confidence: 98%
  - [x] getApps().find callback (arrow, line 10)
    - Confidence: 98%

## [x] functions/src/firebase-runtime.ts
- Confidence: 98%
- Functions detected: 4
- Functions:
  - [x] resolveProjectId (function, line 3)
    - Confidence: 98%
  - [x] resolveDatabaseUrl (function, line 10)
    - Confidence: 98%
  - [x] resolveStorageBucket (function, line 16)
    - Confidence: 98%
  - [x] buildFunctionsFirebaseRuntimeSnapshot (function, line 22)
    - Confidence: 98%

## [x] functions/src/gumdrop-economics.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] roundCurrency (function, line 29)
    - Confidence: 98%
  - [x] deriveGumdropEconomics (function, line 39)
    - Confidence: 98%

## [x] functions/src/index.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/tsconfig.dev.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] functions/tsconfig.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] knip.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] makeAdmin.js
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] makeAdmin (function, line 25)
    - Confidence: 98%

## [x] middleware.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] middleware (function, line 9)
    - Confidence: 98%

## [x] next.config.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] package-lock.json
- Confidence: 96%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 96%

## [x] package.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] playwright.config.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] postcss.config.mjs
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/candy-3d-glass.png
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/candy-main.svg
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/file.svg
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/firebase-messaging-sw.js
- Confidence: 98%
- Functions detected: 19
- Functions:
  - [x] self.addEventListener callback (arrow, line 32)
    - Confidence: 98%
  - [x] <anonymous arrow> (arrow, line 33)
    - Confidence: 98%
  - [x] PRECACHE_URLS.map callback (arrow, line 35)
    - Confidence: 98%
  - [x] results.forEach callback (arrow, line 37)
    - Confidence: 98%
  - [x] self.addEventListener callback (arrow, line 47)
    - Confidence: 98%
  - [x] <anonymous arrow> (arrow, line 48)
    - Confidence: 98%
  - [x] cacheNames                 .filter callback (arrow, line 52)
    - Confidence: 98%
  - [x] cacheNames                 .filter((cacheName) => cacheName !== APP_SHELL_CACHE && cacheName !== APP_RUNTIME_CACHE)                 .map callback (arrow, line 53)
    - Confidence: 98%
  - [x] cacheRuntimeResponse (function, line 60)
    - Confidence: 98%
  - [x] handleNavigationRequest (function, line 70)
    - Confidence: 98%
  - [x] handleStaticRequest (function, line 84)
    - Confidence: 98%
  - [x] fetch(request)         .then callback (arrow, line 87)
    - Confidence: 98%
  - [x] fetch(request)         .then((response) => cacheRuntimeResponse(request, response))         .catch callback (arrow, line 88)
    - Confidence: 98%
  - [x] self.addEventListener callback (arrow, line 98)
    - Confidence: 98%
  - [x] messaging.onBackgroundMessage callback (arrow, line 126)
    - Confidence: 98%
  - [x] self.addEventListener callback (arrow, line 145)
    - Confidence: 98%
  - [x] <anonymous arrow> (arrow, line 149)
    - Confidence: 98%
  - [x] allClients.find callback (arrow, line 152)
    - Confidence: 98%
  - [x] allClients.find callback (arrow, line 159)
    - Confidence: 98%

## [x] public/globe.svg
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/icon-192x192.png
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/icon-512x512.png
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/manifest.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/next.svg
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/vercel.svg
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] public/window.svg
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] qa-screenshots/desktop-admin-create-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-admin-create-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-admin-drops-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-admin-drops-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-admin-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-admin-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-dashboard-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-dashboard-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-drops-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-drops-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-experiences-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-experiences-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-experiences.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-home-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-home-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/desktop-home.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-admin-create-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-admin-create-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-admin-drops-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-admin-drops-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-admin-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-admin-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-dashboard-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-dashboard-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-drops-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-drops-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-experiences-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-experiences-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-experiences.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-home-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-home-viewport.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/mobile-home.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/tablet-dashboard-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/tablet-drops-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/tablet-experiences.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/tablet-home-full.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] qa-screenshots/tablet-home.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] REPO_STATE_SCORECARD_2026-03-18.md
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] REPO_STATE_SCORECARD_2026-03-19.md
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] scripts/audit-telemetry.ts
- Confidence: 99%
- Functions detected: 15
- Functions:
  - [x] walkFiles (function, line 22)
    - Confidence: 99%
  - [x] collectStringLiteralValues (function, line 39)
    - Confidence: 99%
  - [x] buildConstValueMap (function, line 73)
    - Confidence: 99%
  - [x] visit (function, line 76)
    - Confidence: 99%
  - [x] isIdentifierNamed (function, line 91)
    - Confidence: 99%
  - [x] extractEventNamesFromCall (function, line 95)
    - Confidence: 99%
  - [x] firstArg.properties.find callback (arrow, line 136)
    - Confidence: 99%
  - [x] collectMatches (function, line 155)
    - Confidence: 99%
  - [x] visit (function, line 161)
    - Confidence: 99%
  - [x] result.eventNames.forEach callback (arrow, line 166)
    - Confidence: 99%
  - [x] files.flatMap callback (arrow, line 185)
    - Confidence: 99%
  - [x] matches.forEach callback (arrow, line 189)
    - Confidence: 99%
  - [x] unknownMatches.forEach callback (arrow, line 200)
    - Confidence: 99%
  - [x] TELEMETRY_EVENT_OPTIONS   .map callback (arrow, line 207)
    - Confidence: 99%
  - [x] TELEMETRY_EVENT_OPTIONS   .map((event) => event.eventName)   .filter callback (arrow, line 208)
    - Confidence: 99%

## [x] scripts/backfill-analytics-parity.ts
- Confidence: 99%
- Functions detected: 33
- Functions:
  - [x] roundCurrency (function, line 92)
    - Confidence: 99%
  - [x] toTimestampNumber (function, line 96)
    - Confidence: 99%
  - [x] buildEmptyCommerceAggregate (function, line 113)
    - Confidence: 99%
  - [x] buildEmptyUserAggregate (function, line 137)
    - Confidence: 99%
  - [x] buildEmptyDailyRollupAggregate (function, line 167)
    - Confidence: 99%
  - [x] buildEmptyTaskAggregate (function, line 176)
    - Confidence: 99%
  - [x] commitEntries (function, line 189)
    - Confidence: 99%
  - [x] main (function, line 197)
    - Confidence: 99%
  - [x] transactionsSnapshot.docs.forEach callback (arrow, line 215)
    - Confidence: 99%
  - [x] applyCommerce (arrow, line 237)
    - Confidence: 99%
  - [x] applyUserCommerce (arrow, line 259)
    - Confidence: 99%
  - [x] sessionFactsSnapshot.docs.forEach callback (arrow, line 316)
    - Confidence: 99%
  - [x] eventFactsSnapshot.docs.forEach callback (arrow, line 348)
    - Confidence: 99%
  - [x] taskEventsSnapshot.docs.forEach callback (arrow, line 361)
    - Confidence: 99%
  - [x] commerceDaily.forEach callback (arrow, line 392)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 393)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 402)
    - Confidence: 99%
  - [x] bundleDaily.forEach callback (arrow, line 409)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 410)
    - Confidence: 99%
  - [x] bundleRollup.forEach callback (arrow, line 419)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 420)
    - Confidence: 99%
  - [x] userDaily.forEach callback (arrow, line 428)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 431)
    - Confidence: 99%
  - [x] userRollup.forEach callback (arrow, line 443)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 444)
    - Confidence: 99%
  - [x] dailyRollups.forEach callback (arrow, line 461)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 462)
    - Confidence: 99%
  - [x] taskDaily.forEach callback (arrow, line 474)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 475)
    - Confidence: 99%
  - [x] taskRollup.forEach callback (arrow, line 489)
    - Confidence: 99%
  - [x] writes.push callback (arrow, line 490)
    - Confidence: 99%
  - [x] main()   .then callback (arrow, line 510)
    - Confidence: 99%
  - [x] main()   .then(() => process.exit(0))   .catch callback (arrow, line 511)
    - Confidence: 99%

## [x] scripts/check-analytics-semantics.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] SAMPLES.forEach callback (arrow, line 41)
    - Confidence: 99%
  - [x] fieldsToCompare.forEach callback (arrow, line 55)
    - Confidence: 99%
  - [x] mismatches.forEach callback (arrow, line 64)
    - Confidence: 99%

## [x] scripts/check-cycles.ts
- Confidence: 99%
- Functions detected: 6
- Functions:
  - [x] normalizeSkippedWarnings (function, line 57)
    - Confidence: 99%
  - [x] skipped.filter callback (arrow, line 67)
    - Confidence: 99%
  - [x] main (function, line 70)
    - Confidence: 99%
  - [x] skipped.filter callback (arrow, line 87)
    - Confidence: 99%
  - [x] unexpectedSkipped.forEach callback (arrow, line 95)
    - Confidence: 99%
  - [x] circular.forEach callback (arrow, line 101)
    - Confidence: 99%

## [x] scripts/check-firebase-runtime.ts
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] main (function, line 6)
    - Confidence: 99%
  - [x] warnings.filter callback (arrow, line 14)
    - Confidence: 99%
  - [x] warnings.filter callback (arrow, line 15)
    - Confidence: 99%
  - [x] missingWarnings.forEach callback (arrow, line 35)
    - Confidence: 99%
  - [x] fatalWarnings.forEach callback (arrow, line 45)
    - Confidence: 99%

## [x] scripts/promote-admin.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] main (function, line 13)
    - Confidence: 99%

## [x] scripts/remove-hovers.mjs
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] walkDir (function, line 4)
    - Confidence: 99%
  - [x] newContent.replace callback (arrow, line 19)
    - Confidence: 99%
  - [x] newContent.replace callback (arrow, line 23)
    - Confidence: 99%

## [x] scripts/replace-colors.js
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] walk (function, line 6)
    - Confidence: 99%
  - [x] list.forEach callback (function expression, line 9)
    - Confidence: 99%
  - [x] files.forEach callback (arrow, line 26)
    - Confidence: 99%

## [x] scripts/replace-icons.mjs
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] walkDir (function, line 4)
    - Confidence: 99%
  - [x] match[1].split(',').map callback (arrow, line 24)
    - Confidence: 99%

## [x] src/app/(legal)/privacy/page.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] Section (function, line 17)
    - Confidence: 99%
  - [x] PrivacyPage (function, line 32)
    - Confidence: 99%

## [x] src/app/(legal)/terms/page.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] TermsPage (function, line 14)
    - Confidence: 99%

## [x] src/app/admin/analytics/page.tsx
- Confidence: 99%
- Functions detected: 197
- Functions:
  - [x] RANGE_OPTIONS.filter callback (arrow, line 553)
    - Confidence: 99%
  - [x] buildSectionRangeState (function, line 644)
    - Confidence: 99%
  - [x] ALL_HISTORICAL_SECTION_IDS.map callback (arrow, line 646)
    - Confidence: 99%
  - [x] buildHistoricalOverrideKey (function, line 650)
    - Confidence: 99%
  - [x] filterOptionLabel (function, line 654)
    - Confidence: 99%
  - [x] RANGE_OPTIONS.find callback (arrow, line 655)
    - Confidence: 99%
  - [x] AnalyticsTooltip (function, line 658)
    - Confidence: 99%
  - [x] payload.map callback (arrow, line 665)
    - Confidence: 99%
  - [x] CompactPreviewList (function, line 681)
    - Confidence: 99%
  - [x] items.map callback (arrow, line 690)
    - Confidence: 99%
  - [x] SectionCard (function, line 700)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 740)
    - Confidence: 99%
  - [x] setIsExpanded callback (arrow, line 740)
    - Confidence: 99%
  - [x] rangeOptions.map callback (arrow, line 752)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 756)
    - Confidence: 99%
  - [x] MetricCard (function, line 779)
    - Confidence: 99%
  - [x] formatCompactNumber (function, line 792)
    - Confidence: 99%
  - [x] formatMoney (function, line 799)
    - Confidence: 99%
  - [x] formatPercent (function, line 807)
    - Confidence: 99%
  - [x] formatDuration (function, line 811)
    - Confidence: 99%
  - [x] formatDataSourceLabel (function, line 822)
    - Confidence: 99%
  - [x] formatRelativeTime (function, line 828)
    - Confidence: 99%
  - [x] formatDateTime (function, line 840)
    - Confidence: 99%
  - [x] getValidationClasses (function, line 845)
    - Confidence: 99%
  - [x] getModuleCoverageClasses (function, line 857)
    - Confidence: 99%
  - [x] getMetricStatusClasses (function, line 869)
    - Confidence: 99%
  - [x] getOpsHealthClasses (function, line 881)
    - Confidence: 99%
  - [x] getSeverityClasses (function, line 893)
    - Confidence: 99%
  - [x] describeEvent (function, line 905)
    - Confidence: 99%
  - [x] getDeviceIcon (function, line 913)
    - Confidence: 99%
  - [x] isRecentViolation (function, line 917)
    - Confidence: 99%
  - [x] AdminAnalyticsPage (function, line 923)
    - Confidence: 99%
  - [x] useState callback (arrow, line 929)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 936)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 937)
    - Confidence: 99%
  - [x] returned function (arrow, line 941)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 973)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 977)
    - Confidence: 99%
  - [x] setHistoricalOverrides callback (arrow, line 992)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1002)
    - Confidence: 99%
  - [x] setHistoricalOverrides callback (arrow, line 1013)
    - Confidence: 99%
  - [x] setHistoricalOverrides callback (arrow, line 1023)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 1042)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 1046)
    - Confidence: 99%
  - [x] visibleSectionIds.forEach callback (arrow, line 1050)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 1068)
    - Confidence: 99%
  - [x] activeOverrideTargets.forEach callback (arrow, line 1069)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 1074)
    - Confidence: 99%
  - [x] refreshVisibleOverrides (arrow, line 1075)
    - Confidence: 99%
  - [x] activeOverrideTargets.forEach callback (arrow, line 1076)
    - Confidence: 99%
  - [x] returned function (arrow, line 1084)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 1090)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 1095)
    - Confidence: 99%
  - [x] setSectionRanges callback (arrow, line 1096)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 1102)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 1111)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 1115)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 1124)
    - Confidence: 99%
  - [x] scheduleRealtimeRefresh (arrow, line 1131)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 1136)
    - Confidence: 99%
  - [x] subscribeToAnalyticsRuntime (function, line 1142)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 1155)
    - Confidence: 99%
  - [x] scheduleRealtimeRefresh callback (arrow, line 1161)
    - Confidence: 99%
  - [x] scheduleRealtimeRefresh callback (arrow, line 1164)
    - Confidence: 99%
  - [x] activeOverrideTargets.forEach callback (arrow, line 1166)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 1171)
    - Confidence: 99%
  - [x] returned function (arrow, line 1188)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 1205)
    - Confidence: 99%
  - [x] (liveResponse?.data ?? []).map callback (arrow, line 1206)
    - Confidence: 99%
  - [x] devices.reduce callback (arrow, line 1328)
    - Confidence: 99%
  - [x] devices.find callback (arrow, line 1329)
    - Confidence: 99%
  - [x] eventBreakdown.slice(0, 8).map callback (arrow, line 1332)
    - Confidence: 99%
  - [x] stationSnapshotDevices.reduce callback (arrow, line 1343)
    - Confidence: 99%
  - [x] stationSnapshotDevices.find callback (arrow, line 1344)
    - Confidence: 99%
  - [x] stationSnapshotSecurity.reduce callback (arrow, line 1346)
    - Confidence: 99%
  - [x] eventMixBreakdown.slice(0, 8).map callback (arrow, line 1369)
    - Confidence: 99%
  - [x] opsHealthView.materializers.filter callback (arrow, line 1380)
    - Confidence: 99%
  - [x] opsHealthView.materializers.filter callback (arrow, line 1381)
    - Confidence: 99%
  - [x] moduleCoverageView.filter callback (arrow, line 1388)
    - Confidence: 99%
  - [x] moduleCoverageView.filter callback (arrow, line 1389)
    - Confidence: 99%
  - [x] moduleCoverageView.filter callback (arrow, line 1390)
    - Confidence: 99%
  - [x] categorySemantics.map callback (arrow, line 1394)
    - Confidence: 99%
  - [x] creatorMetricsData.categories.map callback (arrow, line 1403)
    - Confidence: 99%
  - [x] category.metrics.filter callback (arrow, line 1406)
    - Confidence: 99%
  - [x] deviceMixItems.reduce callback (arrow, line 1428)
    - Confidence: 99%
  - [x] viewerDropInsightsView.slice(0, 8).map callback (arrow, line 1459)
    - Confidence: 99%
  - [x] securityPostureItems.reduce callback (arrow, line 1475)
    - Confidence: 99%
  - [x] applyViewerFilter (arrow, line 1497)
    - Confidence: 99%
  - [x] clearViewerFilter (arrow, line 1501)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1538)
    - Confidence: 99%
  - [x] TAB_OPTIONS.map callback (arrow, line 1572)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1579)
    - Confidence: 99%
  - [x] GLOBAL_RANGE_OPTIONS.map callback (arrow, line 1602)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1606)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1640)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1696)
    - Confidence: 99%
  - [x] [                   { label: "Auth modal opens", count: journeyFunnelMetrics.authModalOpens, ratio: 1, icon: Users },                   { label: "Drop previews", count: journeyFunnelMetrics.previewOpens, ratio: journeyFunnelMetrics.authModalOpens > 0 ? journeyFunnelMetrics.previewOpens / journeyFunnelMetrics.authModalOpens : 0, icon: Eye },                   { label: "Viewer opens", count: journeyFunnelMetrics.viewerOpens, ratio: journeyFunnelMetrics.previewOpens > 0 ? journeyFunnelMetrics.viewerOpens / journeyFunnelMetrics.previewOpens : 0, icon: PlayCircle },                   { label: "Unlocks", count: journeyFunnelMetrics.unlocks, ratio: journeyFunnelMetrics.previewOpens > 0 ? journeyFunnelMetrics.unlocks / journeyFunnelMetrics.previewOpens : 0, icon: Sparkles },                   { label: "Checkout starts", count: journeyFunnelMetrics.checkoutStarts, ratio: journeyFunnelMetrics.unlocks > 0 ? journeyFunnelMetrics.checkoutStarts / journeyFunnelMetrics.unlocks : 0, icon: Wallet },                   { label: "Purchases", count: journeyFunnelMetrics.purchases, ratio: journeyFunnelMetrics.checkoutStarts > 0 ? journeyFunnelMetrics.purchases / journeyFunnelMetrics.checkoutStarts : 0, icon: ShoppingBag },                 ].map callback (arrow, line 1720)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1753)
    - Confidence: 99%
  - [x] authOutcomeBreakdown.slice(0, 4).map callback (arrow, line 1760)
    - Confidence: 99%
  - [x] authOutcomeBreakdown.map callback (arrow, line 1773)
    - Confidence: 99%
  - [x] authOutcomeBreakdown.map callback (arrow, line 1780)
    - Confidence: 99%
  - [x] authOutcomeBreakdown.map callback (arrow, line 1791)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1816)
    - Confidence: 99%
  - [x] onboardingStepStatsView.map callback (arrow, line 1859)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1887)
    - Confidence: 99%
  - [x] topEventsView.slice(0, 4).map callback (arrow, line 1894)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1917)
    - Confidence: 99%
  - [x] liveInteractionEvents.slice(0, 4).map callback (arrow, line 1924)
    - Confidence: 99%
  - [x] liveInteractionEvents.slice(0, 8).map callback (arrow, line 1934)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1959)
    - Confidence: 99%
  - [x] [                         { label: "GA property", ready: opsHealthView.runtime.gaPropertyConfigured },                         { label: "Navigation session", ready: opsHealthView.runtime.navigationSessionSigningReady },                         { label: "Realtime DB", ready: opsHealthView.runtime.databaseUrlConfigured },                         { label: "VAPID", ready: opsHealthView.runtime.vapidConfigured },                       ].map callback (arrow, line 1994)
    - Confidence: 99%
  - [x] opsHealthView.runtime.warnings.map callback (arrow, line 2013)
    - Confidence: 99%
  - [x] opsHealthView.pipeline.routes.map callback (arrow, line 2041)
    - Confidence: 99%
  - [x] opsHealthView.materializers.map callback (arrow, line 2059)
    - Confidence: 99%
  - [x] opsHealthView.diagnostics.recent.map callback (arrow, line 2089)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2120)
    - Confidence: 99%
  - [x] moduleCoverageView.map callback (arrow, line 2144)
    - Confidence: 99%
  - [x] module.sources.map callback (arrow, line 2172)
    - Confidence: 99%
  - [x] unhealthyModulesView.map callback (arrow, line 2187)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2201)
    - Confidence: 99%
  - [x] semanticCategoryCardsView.map callback (arrow, line 2208)
    - Confidence: 99%
  - [x] semanticCategoryCardsView.map callback (arrow, line 2216)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2263)
    - Confidence: 99%
  - [x] socialMetricCategoryCardsView.map callback (arrow, line 2287)
    - Confidence: 99%
  - [x] category.metrics.map callback (arrow, line 2302)
    - Confidence: 99%
  - [x] metric.sources.map callback (arrow, line 2333)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2346)
    - Confidence: 99%
  - [x] semanticsEngineView.sources.map callback (arrow, line 2365)
    - Confidence: 99%
  - [x] semanticsEngineView.strategies.map callback (arrow, line 2382)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2396)
    - Confidence: 99%
  - [x] validationsView.map callback (arrow, line 2403)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2423)
    - Confidence: 99%
  - [x] audienceSnapshotData.devices.find callback (arrow, line 2433)
    - Confidence: 99%
  - [x] audienceSnapshotData.devices.reduce callback (arrow, line 2433)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2470)
    - Confidence: 99%
  - [x] returnCadenceSegments.map callback (arrow, line 2477)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2496)
    - Confidence: 99%
  - [x] navigationDestinations.slice(0, 4).map callback (arrow, line 2503)
    - Confidence: 99%
  - [x] navigationDestinations.slice(0, 6).map callback (arrow, line 2513)
    - Confidence: 99%
  - [x] navigationDestinations.slice(0, 6).map callback (arrow, line 2520)
    - Confidence: 99%
  - [x] navigationDestinations.slice(0, 6).map callback (arrow, line 2531)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2558)
    - Confidence: 99%
  - [x] deviceMixItems.slice(0, 4).map callback (arrow, line 2565)
    - Confidence: 99%
  - [x] deviceMixItems.map callback (arrow, line 2571)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2607)
    - Confidence: 99%
  - [x] topPathsItems.slice(0, 4).map callback (arrow, line 2614)
    - Confidence: 99%
  - [x] topPathsItems.slice(0, 8).map callback (arrow, line 2621)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2647)
    - Confidence: 99%
  - [x] regionsItems.slice(0, 4).map callback (arrow, line 2654)
    - Confidence: 99%
  - [x] regionsItems.slice(0, 10).map callback (arrow, line 2661)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2689)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2732)
    - Confidence: 99%
  - [x] packagePerformanceItems.slice(0, 4).map callback (arrow, line 2739)
    - Confidence: 99%
  - [x] packagePerformanceItems.slice(0, 5).map callback (arrow, line 2757)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2776)
    - Confidence: 99%
  - [x] contentConversionItems.slice(0, 4).map callback (arrow, line 2783)
    - Confidence: 99%
  - [x] contentConversionItems.slice(0, 5).map callback (arrow, line 2802)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2819)
    - Confidence: 99%
  - [x] topDropConversionItems.slice(0, 4).map callback (arrow, line 2826)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2840)
    - Confidence: 99%
  - [x] topDropConversionItems.slice(0, 6).map callback (arrow, line 2853)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2878)
    - Confidence: 99%
  - [x] recentCommerceFeedItems.slice(0, 4).map callback (arrow, line 2885)
    - Confidence: 99%
  - [x] recentCommerceFeedItems.slice(0, 10).map callback (arrow, line 2892)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2933)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2961)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2962)
    - Confidence: 99%
  - [x] viewerUsersView.map callback (arrow, line 2991)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 2995)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3036)
    - Confidence: 99%
  - [x] viewerDropInsightsView.slice(0, 5).map callback (arrow, line 3058)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3086)
    - Confidence: 99%
  - [x] viewerJourneyItems.slice(0, 5).map callback (arrow, line 3093)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3112)
    - Confidence: 99%
  - [x] watchDepthItems.slice(0, 2).map callback (arrow, line 3120)
    - Confidence: 99%
  - [x] contentTagDemandItems.slice(0, 2).map callback (arrow, line 3121)
    - Confidence: 99%
  - [x] watchDepthItems.map callback (arrow, line 3130)
    - Confidence: 99%
  - [x] contentTagDemandItems.map callback (arrow, line 3148)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3168)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3196)
    - Confidence: 99%
  - [x] taskPipelineView.slice(0, 6).map callback (arrow, line 3203)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3228)
    - Confidence: 99%
  - [x] taskDurationBucketsView.map callback (arrow, line 3235)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3256)
    - Confidence: 99%
  - [x] taskLeaderboardView.slice(0, 4).map callback (arrow, line 3263)
    - Confidence: 99%
  - [x] taskLeaderboardView.map callback (arrow, line 3270)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3298)
    - Confidence: 99%
  - [x] notificationFunnelView.slice(0, 5).map callback (arrow, line 3305)
    - Confidence: 99%
  - [x] notificationFunnelView.filter callback (arrow, line 3314)
    - Confidence: 99%
  - [x] notificationFunnelView.filter((item) => item.count > 0).map callback (arrow, line 3314)
    - Confidence: 99%
  - [x] notificationFunnelView.filter callback (arrow, line 3321)
    - Confidence: 99%
  - [x] notificationFunnelView.filter((item) => item.count > 0).map callback (arrow, line 3321)
    - Confidence: 99%
  - [x] notificationActionsView.map callback (arrow, line 3331)
    - Confidence: 99%
  - [x] reminderReasonsView.map callback (arrow, line 3346)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 3360)
    - Confidence: 99%
  - [x] flaggedAccountsItems.slice(0, 4).map callback (arrow, line 3367)
    - Confidence: 99%
  - [x] flaggedAccountsItems.map callback (arrow, line 3374)
    - Confidence: 99%

## [x] src/app/admin/content/page.tsx
- Confidence: 99%
- Functions detected: 17
- Functions:
  - [x] ContentManagerPage (function, line 22)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 28)
    - Confidence: 99%
  - [x] fetchFiles (arrow, line 32)
    - Confidence: 99%
  - [x] res.items.map callback (arrow, line 39)
    - Confidence: 99%
  - [x] handleUpload (arrow, line 57)
    - Confidence: 99%
  - [x] setRefreshTrigger callback (arrow, line 65)
    - Confidence: 99%
  - [x] handleDelete (arrow, line 74)
    - Confidence: 99%
  - [x] files.filter callback (arrow, line 79)
    - Confidence: 99%
  - [x] copyToClipboard (arrow, line 86)
    - Confidence: 99%
  - [x] getFileIcon (arrow, line 91)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 106)
    - Confidence: 99%
  - [x] setRefreshTrigger callback (arrow, line 106)
    - Confidence: 99%
  - [x] files.map callback (arrow, line 149)
    - Confidence: 99%
  - [x] ['jpg', 'jpeg', 'png', 'webp', 'gif'].some callback (arrow, line 153)
    - Confidence: 99%
  - [x] ['mp4', 'webm', 'ogg', 'mov'].some callback (arrow, line 155)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 169)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 176)
    - Confidence: 99%

## [x] src/app/admin/debug/page.tsx
- Confidence: 99%
- Functions detected: 64
- Functions:
  - [x] formatTimestamp (function, line 138)
    - Confidence: 99%
  - [x] formatRelativeTime (function, line 139)
    - Confidence: 99%
  - [x] getOpsHealthClasses (function, line 148)
    - Confidence: 99%
  - [x] getSeverityClasses (function, line 153)
    - Confidence: 99%
  - [x] PreviewGrid (function, line 159)
    - Confidence: 99%
  - [x] items.map callback (arrow, line 162)
    - Confidence: 99%
  - [x] SectionCard (function, line 172)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 185)
    - Confidence: 99%
  - [x] setExpanded callback (arrow, line 185)
    - Confidence: 99%
  - [x] MetricTile (function, line 202)
    - Confidence: 99%
  - [x] TrackingBadge (function, line 206)
    - Confidence: 99%
  - [x] FilterChips (function, line 210)
    - Confidence: 99%
  - [x] options.map callback (arrow, line 221)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 225)
    - Confidence: 99%
  - [x] DebugConsole (function, line 240)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 253)
    - Confidence: 99%
  - [x] (data?.taskParity ?? []).filter callback (arrow, line 253)
    - Confidence: 99%
  - [x] opsHealth.materializers.filter callback (arrow, line 254)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 256)
    - Confidence: 99%
  - [x] (data?.coverage ?? []).filter callback (arrow, line 256)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 260)
    - Confidence: 99%
  - [x] (data?.eventStats ?? []).filter callback (arrow, line 260)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 264)
    - Confidence: 99%
  - [x] opsHealth.diagnostics.recent.filter callback (arrow, line 264)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 268)
    - Confidence: 99%
  - [x] (data?.bugReports ?? []).filter callback (arrow, line 268)
    - Confidence: 99%
  - [x] handleSimulateBalance (function, line 275)
    - Confidence: 99%
  - [x] TABS.map callback (arrow, line 303)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 305)
    - Confidence: 99%
  - [x] [                     { label: "GA property", ready: opsHealth.runtime.gaPropertyConfigured },                     { label: "Navigation session", ready: opsHealth.runtime.navigationSessionSigningReady },                     { label: "Realtime DB", ready: opsHealth.runtime.databaseUrlConfigured },                     { label: "VAPID", ready: opsHealth.runtime.vapidConfigured },                   ].map callback (arrow, line 328)
    - Confidence: 99%
  - [x] opsHealth.runtime.warnings.map callback (arrow, line 330)
    - Confidence: 99%
  - [x] opsHealth.diagnostics.recent.slice(0, 5).map callback (arrow, line 335)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 366)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 368)
    - Confidence: 99%
  - [x] filteredCoverage.map callback (arrow, line 391)
    - Confidence: 99%
  - [x] highRiskParityItems.slice(0, 4).map callback (arrow, line 394)
    - Confidence: 99%
  - [x] highRiskParityItems.map callback (arrow, line 395)
    - Confidence: 99%
  - [x] (data?.assignmentIssues ?? []).slice(0, 4).map callback (arrow, line 397)
    - Confidence: 99%
  - [x] (data?.assignmentIssues ?? []).map callback (arrow, line 398)
    - Confidence: 99%
  - [x] item.issues.map callback (arrow, line 398)
    - Confidence: 99%
  - [x] (data?.taskRollups ?? []).slice(0, 4).map callback (arrow, line 402)
    - Confidence: 99%
  - [x] (data?.taskRollups ?? []).slice(0, 8).map callback (arrow, line 403)
    - Confidence: 99%
  - [x] (data?.dailyTaskSeries ?? []).slice(-4).reverse().map callback (arrow, line 405)
    - Confidence: 99%
  - [x] (data?.dailyTaskSeries ?? []).slice(-6).reverse().map callback (arrow, line 406)
    - Confidence: 99%
  - [x] (data?.receiptSummary ?? []).slice(0, 4).map callback (arrow, line 414)
    - Confidence: 99%
  - [x] (data?.recentReceipts ?? []).slice(0, 12).map callback (arrow, line 415)
    - Confidence: 99%
  - [x] (data?.eventStats ?? []).slice(0, 4).map callback (arrow, line 417)
    - Confidence: 99%
  - [x] filteredEventStats.slice(0, 12).map callback (arrow, line 430)
    - Confidence: 99%
  - [x] (data?.orphanedEventStats ?? []).slice(0, 4).map callback (arrow, line 433)
    - Confidence: 99%
  - [x] (data?.orphanedEventStats ?? []).slice(0, 8).map callback (arrow, line 434)
    - Confidence: 99%
  - [x] (data?.recentTaskEvents ?? []).slice(0, 8).map callback (arrow, line 434)
    - Confidence: 99%
  - [x] (filteredBugReports.slice(0, 4)).map callback (arrow, line 441)
    - Confidence: 99%
  - [x] filteredBugReports.slice(0, 12).map callback (arrow, line 465)
    - Confidence: 99%
  - [x] (data?.rollouts ?? []).slice(0, 4).map callback (arrow, line 490)
    - Confidence: 99%
  - [x] (data?.rollouts ?? []).map callback (arrow, line 492)
    - Confidence: 99%
  - [x] rollout.variants.map callback (arrow, line 508)
    - Confidence: 99%
  - [x] filteredBugReports.slice(0, 4).map callback (arrow, line 518)
    - Confidence: 99%
  - [x] filteredBugReports.slice(0, 8).map callback (arrow, line 520)
    - Confidence: 99%
  - [x] opsHealth.materializers.slice(0, 4).map callback (arrow, line 538)
    - Confidence: 99%
  - [x] opsHealth.materializers.map callback (arrow, line 539)
    - Confidence: 99%
  - [x] opsHealth.diagnostics.channels.slice(0, 4).map callback (arrow, line 542)
    - Confidence: 99%
  - [x] opsHealth.diagnostics.channels.map callback (arrow, line 543)
    - Confidence: 99%
  - [x] opsHealth.diagnostics.recent.slice(0, 4).map callback (arrow, line 545)
    - Confidence: 99%
  - [x] filteredDiagnostics.map callback (arrow, line 558)
    - Confidence: 99%

## [x] src/app/admin/drops/page.tsx
- Confidence: 99%
- Functions detected: 40
- Functions:
  - [x] AdminDropsPage (function, line 27)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 40)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 42)
    - Confidence: 99%
  - [x] snapshot.forEach callback (arrow, line 45)
    - Confidence: 99%
  - [x] returned function (arrow, line 63)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 66)
    - Confidence: 99%
  - [x] fetchQueueMembership (arrow, line 69)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 86)
    - Confidence: 99%
  - [x] returned function (arrow, line 90)
    - Confidence: 99%
  - [x] handleDelete (arrow, line 96)
    - Confidence: 99%
  - [x] toggleSelection (arrow, line 113)
    - Confidence: 99%
  - [x] setSelectedDropIds callback (arrow, line 114)
    - Confidence: 99%
  - [x] toggleAll (arrow, line 122)
    - Confidence: 99%
  - [x] drops.map callback (arrow, line 126)
    - Confidence: 99%
  - [x] handleBulkDelete (arrow, line 130)
    - Confidence: 99%
  - [x] limit.map callback (arrow, line 135)
    - Confidence: 99%
  - [x] toggleAutoQueue (arrow, line 145)
    - Confidence: 99%
  - [x] setQueueIds callback (arrow, line 154)
    - Confidence: 99%
  - [x] openNotificationDraft (arrow, line 169)
    - Confidence: 99%
  - [x] handleSendDropNotification (arrow, line 183)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 255)
    - Confidence: 99%
  - [x] drops.map callback (arrow, line 303)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 318)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 319)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 323)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 371)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 378)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 385)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 397)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 409)
    - Confidence: 99%
  - [x] drops.map callback (arrow, line 425)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 466)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 472)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 478)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 487)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 522)
    - Confidence: 99%
  - [x] setNotificationDraft callback (arrow, line 522)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 532)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 551)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 557)
    - Confidence: 99%

## [x] src/app/admin/layout.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] AdminLayout (function, line 21)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 27)
    - Confidence: 99%
  - [x] NAV_ITEMS.map callback (arrow, line 60)
    - Confidence: 99%
  - [x] NAV_ITEMS.map callback (arrow, line 80)
    - Confidence: 99%

## [x] src/app/admin/page.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] AdminDashboardPage (function, line 12)
    - Confidence: 99%

## [x] src/app/admin/queue/page.tsx
- Confidence: 99%
- Functions detected: 19
- Functions:
  - [x] formatProjectedSlot (function, line 28)
    - Confidence: 99%
  - [x] ManageQueuePage (function, line 41)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 47)
    - Confidence: 99%
  - [x] fetchQueueData (function, line 48)
    - Confidence: 99%
  - [x] dropsSnap.forEach callback (arrow, line 59)
    - Confidence: 99%
  - [x] handleSave (arrow, line 87)
    - Confidence: 99%
  - [x] moveDrop (arrow, line 105)
    - Confidence: 99%
  - [x] removeDrop (arrow, line 116)
    - Confidence: 99%
  - [x] config.queue.filter callback (arrow, line 118)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 123)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 178)
    - Confidence: 99%
  - [x] config.timesPerDay.map callback (arrow, line 194)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 200)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 221)
    - Confidence: 99%
  - [x] config.queue.map callback (arrow, line 249)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 257)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 315)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 322)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 330)
    - Confidence: 99%

## [x] src/app/admin/roster/page.tsx
- Confidence: 99%
- Functions detected: 25
- Functions:
  - [x] initialsFor (function, line 30)
    - Confidence: 99%
  - [x] parts.slice(0, 2).map callback (arrow, line 33)
    - Confidence: 99%
  - [x] AdminRosterPage (function, line 37)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 47)
    - Confidence: 99%
  - [x] fetchRoster (arrow, line 54)
    - Confidence: 99%
  - [x] (result.users || []).map callback (arrow, line 66)
    - Confidence: 99%
  - [x] returned function (arrow, line 92)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 97)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 103)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 111)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 115)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 118)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 118)
    - Confidence: 99%
  - [x] handleRoleUpdate (arrow, line 122)
    - Confidence: 99%
  - [x] setUsers callback (arrow, line 132)
    - Confidence: 99%
  - [x] current.map callback (arrow, line 132)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 172)
    - Confidence: 99%
  - [x] creatorUsers.filter callback (arrow, line 188)
    - Confidence: 99%
  - [x] creatorUsers.filter callback (arrow, line 193)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 198)
    - Confidence: 99%
  - [x] [                     {                         icon: Sparkles,                         title: "Creator onboarding pipeline",                         copy: "Work in progress. This panel will map invite status, onboarding milestones, verification, and readiness for first-drop setup.",                     },                     {                         icon: HeartHandshake,                         title: "Social + follow graph",                         copy: "Work in progress. This panel will track fan follows, creator affinity, social prompts, and follow-driven retention loops.",                     },                     {                         icon: Wand2,                         title: "Creator experiences + drops",                         copy: "Work in progress. This panel will coordinate creator-specific experiences, drop calendars, and roster programming.",                     },                 ].map callback (arrow, line 220)
    - Confidence: 99%
  - [x] visibleUsers.map callback (arrow, line 256)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 298)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 350)
    - Confidence: 99%
  - [x] setVisibleCount callback (arrow, line 350)
    - Confidence: 99%

## [x] src/app/admin/user/[userId]/page.tsx
- Confidence: 99%
- Functions detected: 41
- Functions:
  - [x] getValidationClasses (function, line 122)
    - Confidence: 99%
  - [x] getCoverageClasses (function, line 134)
    - Confidence: 99%
  - [x] AdminUserAnalyticsPage (function, line 146)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 166)
    - Confidence: 99%
  - [x] fetchUserData (function, line 169)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 203)
    - Confidence: 99%
  - [x] transactions             .filter callback (arrow, line 205)
    - Confidence: 99%
  - [x] transactions             .filter((transaction) => transaction.status === "completed" && (transaction.type === "purchase_currency" || String(transaction.type) === "purchase"))             .map callback (arrow, line 206)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 215)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 216)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 217)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 218)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 219)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 220)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 221)
    - Confidence: 99%
  - [x] transactions.filter callback (arrow, line 225)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 228)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 240)
    - Confidence: 99%
  - [x] securityEvents                 .filter callback (arrow, line 243)
    - Confidence: 99%
  - [x] securityEvents                 .filter((event) => event.reason)                 .map callback (arrow, line 244)
    - Confidence: 99%
  - [x] Array.from(new Map(             securityEvents                 .filter((event) => event.reason)                 .map((event) => [event.reason, event.label] as const),         ).entries())             .sort callback (arrow, line 246)
    - Confidence: 99%
  - [x] Array.from(new Map(             securityEvents                 .filter((event) => event.reason)                 .map((event) => [event.reason, event.label] as const),         ).entries())             .sort((left, right) => left[1].localeCompare(right[1]))             .map callback (arrow, line 247)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 250)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 251)
    - Confidence: 99%
  - [x] securityEvents.filter callback (arrow, line 252)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 283)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 296)
    - Confidence: 99%
  - [x] transactions.map callback (arrow, line 455)
    - Confidence: 99%
  - [x] [                         { label: "Purchases", insight: parity?.purchase },                         { label: "Unlocks", insight: parity?.unlock },                     ].map callback (arrow, line 540)
    - Confidence: 99%
  - [x] (entry.insight?.sources ?? []).map callback (arrow, line 554)
    - Confidence: 99%
  - [x] (parity?.coverage ?? []).map callback (arrow, line 566)
    - Confidence: 99%
  - [x] module.sources.map callback (arrow, line 578)
    - Confidence: 99%
  - [x] (parity?.validations ?? []).map callback (arrow, line 589)
    - Confidence: 99%
  - [x] analytics!.topViewedDrops.map callback (arrow, line 612)
    - Confidence: 99%
  - [x] [                             { key: "all" as const, label: "All time" },                             { key: "30d" as const, label: "Last 30 days" },                         ].map callback (arrow, line 669)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 673)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 690)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 703)
    - Confidence: 99%
  - [x] securityReasonOptions.map callback (arrow, line 707)
    - Confidence: 99%
  - [x] securitySummary.reasons.map callback (arrow, line 715)
    - Confidence: 99%
  - [x] filteredSecurityEvents.map callback (arrow, line 726)
    - Confidence: 99%

## [x] src/app/admin/users/page.tsx
- Confidence: 99%
- Functions detected: 60
- Functions:
  - [x] UserManagementPage (function, line 90)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 112)
    - Confidence: 99%
  - [x] fetchUsers (arrow, line 116)
    - Confidence: 99%
  - [x] fetchFeedback (arrow, line 137)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 154)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 160)
    - Confidence: 99%
  - [x] getUserAnalytics (arrow, line 167)
    - Confidence: 99%
  - [x] formatMoney (arrow, line 168)
    - Confidence: 99%
  - [x] formatLastSeen (arrow, line 170)
    - Confidence: 99%
  - [x] formatLastPurchase (arrow, line 172)
    - Confidence: 99%
  - [x] [...filteredUsers]         .sort callback (arrow, line 179)
    - Confidence: 99%
  - [x] handleUpdateStatus (arrow, line 182)
    - Confidence: 99%
  - [x] users.map callback (arrow, line 206)
    - Confidence: 99%
  - [x] handleManageContent (arrow, line 223)
    - Confidence: 99%
  - [x] (contentUser.unlockedContent || []).filter callback (arrow, line 245)
    - Confidence: 99%
  - [x] users.map callback (arrow, line 247)
    - Confidence: 99%
  - [x] setDropReferences callback (arrow, line 250)
    - Confidence: 99%
  - [x] handleRoleUpdate (arrow, line 265)
    - Confidence: 99%
  - [x] users.map callback (arrow, line 274)
    - Confidence: 99%
  - [x] handleVerification (arrow, line 282)
    - Confidence: 99%
  - [x] users.map callback (arrow, line 291)
    - Confidence: 99%
  - [x] getStatusColor (arrow, line 298)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 319)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 328)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 337)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 402)
    - Confidence: 99%
  - [x] topTrackedUsers.map callback (arrow, line 414)
    - Confidence: 99%
  - [x] filteredUsers.map callback (arrow, line 463)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 499)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 500)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 534)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 548)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 551)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 563)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 564)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 567)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 569)
    - Confidence: 99%
  - [x] filteredUsers.map callback (arrow, line 587)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 705)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 718)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 722)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 726)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 730)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 746)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 755)
    - Confidence: 99%
  - [x] feedback.map callback (arrow, line 783)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 819)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 858)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 863)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 877)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 878)
    - Confidence: 99%
  - [x] users.map callback (arrow, line 879)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 886)
    - Confidence: 99%
  - [x] contentUser.unlockedContent.map callback (arrow, line 897)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 903)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 912)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 913)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 917)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 970)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 972)
    - Confidence: 99%

## [x] src/app/api/admin/analytics/historical/route.ts
- Confidence: 99%
- Functions detected: 44
- Functions:
  - [x] scopeHistoricalResponse (function, line 45)
    - Confidence: 99%
  - [x] GET (function, line 159)
    - Confidence: 99%
  - [x] dailyRollupsSnapshot.docs.filter callback (arrow, line 242)
    - Confidence: 99%
  - [x] (dropsSnapshot?.docs || [])                     .map callback (arrow, line 246)
    - Confidence: 99%
  - [x] (dropsSnapshot?.docs || [])                     .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {                         const data = doc.data() as Record<string, unknown>;                         return {                             dropId: doc.id,                             dropTitle: resolveDropTitle(dropReferences, doc.id),                             views: getDropViewCount(data),                             unlocks: toNumber(data.totalUnlocks),                         };                     })                     .filter callback (arrow, line 255)
    - Confidence: 99%
  - [x] (dropsSnapshot?.docs || [])                     .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {                         const data = doc.data() as Record<string, unknown>;                         return {                             dropId: doc.id,                             dropTitle: resolveDropTitle(dropReferences, doc.id),                             views: getDropViewCount(data),                             unlocks: toNumber(data.totalUnlocks),                         };                     })                     .filter((drop: { views: number; unlocks: number }) => drop.views > 0 || drop.unlocks > 0)                     .sort callback (arrow, line 256)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 258)
    - Confidence: 99%
  - [x] dropDailySnapshot.docs.forEach callback (arrow, line 260)
    - Confidence: 99%
  - [x] Array.from(dropMap.entries())                         .map callback (arrow, line 274)
    - Confidence: 99%
  - [x] Array.from(dropMap.entries())                         .map(([id, stats]) => ({                             dropId: id,                             dropTitle: resolveDropTitle(dropReferences, id),                             views: stats.views,                             unlocks: stats.unlocks,                         }))                         .sort callback (arrow, line 280)
    - Confidence: 99%
  - [x] transactionsInRangeSnapshot.docs.flatMap callback (arrow, line 284)
    - Confidence: 99%
  - [x] rawTransactions.forEach callback (arrow, line 300)
    - Confidence: 99%
  - [x] telemetryLogsByEvent.viewer_opened?.forEach callback (arrow, line 305)
    - Confidence: 99%
  - [x] securityEventsSnapshot.docs.forEach callback (arrow, line 310)
    - Confidence: 99%
  - [x] usersSnapshot.docs.forEach callback (arrow, line 324)
    - Confidence: 99%
  - [x] Object.values(telemetryLogsByEvent).flat().sort callback (arrow, line 334)
    - Confidence: 99%
  - [x] Object.entries(telemetryLogsByEvent).map callback (arrow, line 336)
    - Confidence: 99%
  - [x] analyticsEventStatsSnapshot.docs.reduce callback (arrow, line 339)
    - Confidence: 99%
  - [x] analyticsEventFactsSnapshot.docs.reduce callback (arrow, line 349)
    - Confidence: 99%
  - [x] Array.from(buildMergedCountMap(                 gaEventCounts,                 telemetryEventCounts,                 canonicalEventCounts,             ).entries())                 .map callback (arrow, line 369)
    - Confidence: 99%
  - [x] Array.from(buildMergedCountMap(                 gaEventCounts,                 telemetryEventCounts,                 canonicalEventCounts,             ).entries())                 .map(([eventName, count]) => ({ eventName, count }))                 .sort callback (arrow, line 370)
    - Confidence: 99%
  - [x] filteredDailyRollups.reduce callback (arrow, line 371)
    - Confidence: 99%
  - [x] taskEventsSnapshot.docs.flatMap callback (arrow, line 382)
    - Confidence: 99%
  - [x] normalizedTransactionsInRange.reduce callback (arrow, line 430)
    - Confidence: 99%
  - [x] analyticsEventFactsSnapshot.docs.map callback (arrow, line 469)
    - Confidence: 99%
  - [x] guestBatchesSnapshot.docs.map callback (arrow, line 470)
    - Confidence: 99%
  - [x] sessionFactsSnapshot.docs.map callback (arrow, line 471)
    - Confidence: 99%
  - [x] buildSemanticCategorySummaries({                 eventFacts: analyticsEventFactsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),                 guestBatches: guestBatchesSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),                 sessionFacts: sessionFactsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),             }).map callback (arrow, line 472)
    - Confidence: 99%
  - [x] analyticsEventFactsSnapshot.docs                 .map callback (arrow, line 482)
    - Confidence: 99%
  - [x] analyticsEventFactsSnapshot.docs                 .map((doc) => {                     const data = doc.data() as Record<string, unknown>;                     const params = safeParams(data.params);                     return {                         eventName: toStringValue(data.eventName),                         timestamp: toNumber(data.timestamp),                         registrationMethod: toStringValue(params.registration_method || params.auth_provider || ""),                     };                 })                 .filter callback (arrow, line 491)
    - Confidence: 99%
  - [x] analyticsEventStatsSnapshot.docs.find callback (arrow, line 495)
    - Confidence: 99%
  - [x] registrationFacts.filter callback (arrow, line 498)
    - Confidence: 99%
  - [x] analyticsEventFactsSnapshot.docs.map callback (arrow, line 540)
    - Confidence: 99%
  - [x] guestBatchesSnapshot.docs.map callback (arrow, line 541)
    - Confidence: 99%
  - [x] sessionFactsSnapshot.docs.map callback (arrow, line 542)
    - Confidence: 99%
  - [x] onboardingStepFacts.filter callback (arrow, line 547)
    - Confidence: 99%
  - [x] onboardingStepFacts.filter callback (arrow, line 548)
    - Confidence: 99%
  - [x] normalizedTransactionsInRange.filter callback (arrow, line 608)
    - Confidence: 99%
  - [x] normalizedTransactionsInRange.filter callback (arrow, line 609)
    - Confidence: 99%
  - [x] guestBatchesSnapshot.docs.reduce callback (arrow, line 610)
    - Confidence: 99%
  - [x] pipelineHealthSnapshot.docs.reduce callback (arrow, line 614)
    - Confidence: 99%
  - [x] Array.from(pageRollupMap.values()).reduce callback (arrow, line 618)
    - Confidence: 99%
  - [x] dropDailySnapshot.docs.reduce callback (arrow, line 619)
    - Confidence: 99%
  - [x] filteredSessionFacts.reduce callback (arrow, line 623)
    - Confidence: 99%

## [x] src/app/api/admin/analytics/realtime/route.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] GET (function, line 17)
    - Confidence: 99%
  - [x] Array.from callback (arrow, line 52)
    - Confidence: 99%
  - [x] rows.forEach callback (arrow, line 58)
    - Confidence: 99%
  - [x] liveData.sort callback (arrow, line 68)
    - Confidence: 99%

## [x] src/app/api/admin/analytics/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] GET (function, line 6)
    - Confidence: 99%

## [x] src/app/api/admin/balance/route.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] z.number().int().gte(-1_000_000).lte(1_000_000).refine callback (arrow, line 12)
    - Confidence: 99%
  - [x] POST (function, line 18)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 37)
    - Confidence: 99%

## [x] src/app/api/admin/debug/route.ts
- Confidence: 99%
- Functions detected: 48
- Functions:
  - [x] toNumber (function, line 15)
    - Confidence: 99%
  - [x] toStringValue (function, line 20)
    - Confidence: 99%
  - [x] toTimestampNumber (function, line 24)
    - Confidence: 99%
  - [x] inferTrackingSource (function, line 41)
    - Confidence: 99%
  - [x] normalizeTaskIds (function, line 53)
    - Confidence: 99%
  - [x] rawTasks         .map callback (arrow, line 59)
    - Confidence: 99%
  - [x] rawTasks         .map((task) => (task && typeof task === "object" ? task as DailyTaskAssignment : null))         .filter callback (arrow, line 60)
    - Confidence: 99%
  - [x] rawTasks         .map((task) => (task && typeof task === "object" ? task as DailyTaskAssignment : null))         .filter((task): task is DailyTaskAssignment => Boolean(task))         .map callback (arrow, line 61)
    - Confidence: 99%
  - [x] rawTasks         .map((task) => (task && typeof task === "object" ? task as DailyTaskAssignment : null))         .filter((task): task is DailyTaskAssignment => Boolean(task))         .map((task) => ({             id: toStringValue(task.id),             title: toStringValue(task.title),             progress: toNumber(task.progress),             maxProgress: toNumber(task.maxProgress) || 1,             claimed: task.claimed === true,             claimedAt: toNumber(task.claimedAt),             assignedAt: toNumber(task.assignedAt),         }))         .filter callback (arrow, line 70)
    - Confidence: 99%
  - [x] hasInvalidRefreshMetadata (function, line 73)
    - Confidence: 99%
  - [x] GET (function, line 88)
    - Confidence: 99%
  - [x] BUILT_IN_DAILY_TASKS.map callback (arrow, line 158)
    - Confidence: 99%
  - [x] coverage.filter callback (arrow, line 170)
    - Confidence: 99%
  - [x] coverage.filter callback (arrow, line 171)
    - Confidence: 99%
  - [x] coverage.filter callback (arrow, line 172)
    - Confidence: 99%
  - [x] usersSnapshot.docs.flatMap callback (arrow, line 174)
    - Confidence: 99%
  - [x] tasks.map callback (arrow, line 180)
    - Confidence: 99%
  - [x] ids.filter callback (arrow, line 181)
    - Confidence: 99%
  - [x] tasks.some callback (arrow, line 189)
    - Confidence: 99%
  - [x] tasks.some callback (arrow, line 192)
    - Confidence: 99%
  - [x] tasks.some callback (arrow, line 195)
    - Confidence: 99%
  - [x] taskEventsSnapshot.docs.map callback (arrow, line 215)
    - Confidence: 99%
  - [x] receiptsSnapshot.docs.map callback (arrow, line 234)
    - Confidence: 99%
  - [x] transactionsSnapshot.docs.map callback (arrow, line 246)
    - Confidence: 99%
  - [x] transactionEntries             .filter callback (arrow, line 252)
    - Confidence: 99%
  - [x] recentTaskEvents.filter callback (arrow, line 253)
    - Confidence: 99%
  - [x] recentReceipts.filter callback (arrow, line 254)
    - Confidence: 99%
  - [x] completedEvents7d.forEach callback (arrow, line 265)
    - Confidence: 99%
  - [x] rewardTransactions7d.forEach callback (arrow, line 279)
    - Confidence: 99%
  - [x] BUILT_IN_DAILY_TASKS.find callback (arrow, line 282)
    - Confidence: 99%
  - [x] receiptEvents7d.forEach callback (arrow, line 296)
    - Confidence: 99%
  - [x] BUILT_IN_DAILY_TASKS.find callback (arrow, line 301)
    - Confidence: 99%
  - [x] Array.from(rewardParityByTask.values())             .sort callback (arrow, line 316)
    - Confidence: 99%
  - [x] eventStatsSnapshot.docs.map callback (arrow, line 318)
    - Confidence: 99%
  - [x] BUILT_IN_DAILY_TASKS.filter callback (arrow, line 320)
    - Confidence: 99%
  - [x] taskMatches.map callback (arrow, line 327)
    - Confidence: 99%
  - [x] eventStatsSnapshot.docs.map((doc) => {             const data = doc.data() as Record<string, unknown>;             const taskMatches = BUILT_IN_DAILY_TASKS.filter((task) => task.eventName === doc.id);             return {                 eventName: doc.id,                 label: TELEMETRY_EVENT_LABELS[doc.id] || doc.id,                 totalCount: toNumber(data.totalCount),                 lastSeenAt: toNumber(data.lastSeenAt),                 mappedTaskCount: taskMatches.length,                 mappedTaskTitles: taskMatches.map((task) => task.title),                 trackingSource: inferTrackingSource(doc.id),             };         }).sort callback (arrow, line 330)
    - Confidence: 99%
  - [x] eventStats             .filter callback (arrow, line 333)
    - Confidence: 99%
  - [x] receiptEvents7d.reduce callback (arrow, line 336)
    - Confidence: 99%
  - [x] Array.from(receiptEvents7d.reduce((map, entry) => {             const current = map.get(entry.eventName) || {                 eventName: entry.eventName,                 count: 0,                 lastSeenAt: 0,             };             current.count += 1;             current.lastSeenAt = Math.max(current.lastSeenAt, entry.timestamp);             map.set(entry.eventName, current);             return map;         }, new Map<string, { eventName: string; count: number; lastSeenAt: number }>()).values())             .sort callback (arrow, line 347)
    - Confidence: 99%
  - [x] taskRollupSnapshot.docs.map callback (arrow, line 349)
    - Confidence: 99%
  - [x] taskRollupSnapshot.docs.map((doc) => {             const data = doc.data() as Record<string, unknown>;             return {                 taskId: doc.id,                 title: toStringValue(data.title) || doc.id,                 eventCount: toNumber(data.eventCount),                 rewardTotal: toNumber(data.rewardTotal),                 completed: toNumber((data.types as Record<string, unknown> | undefined)?.completed),                 started: toNumber((data.types as Record<string, unknown> | undefined)?.started),                 failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed),                 reminders: toNumber((data.types as Record<string, unknown> | undefined)?.reminder_sent),                 lastEventAt: toNumber(data.lastEventAt),             };         }).sort callback (arrow, line 362)
    - Confidence: 99%
  - [x] taskDailySnapshot.docs.map callback (arrow, line 364)
    - Confidence: 99%
  - [x] taskDailySnapshot.docs.map((doc) => {             const data = doc.data() as Record<string, unknown>;             return {                 dayKey: doc.id,                 eventCount: toNumber(data.eventCount),                 rewardTotal: toNumber(data.rewardTotal),                 completed: toNumber((data.types as Record<string, unknown> | undefined)?.completed),                 failed: toNumber((data.types as Record<string, unknown> | undefined)?.failed),             };         }).sort callback (arrow, line 373)
    - Confidence: 99%
  - [x] feedbackSnapshot.docs             .map callback (arrow, line 376)
    - Confidence: 99%
  - [x] feedbackSnapshot.docs             .map((doc) => {                 const data = doc.data() as Record<string, unknown>;                 return {                     id: doc.id,                     userId: toStringValue(data.userId),                     email: toStringValue(data.email) || null,                     summary: toStringValue(data.summary) || toStringValue(data.message),                     message: toStringValue(data.message),                     category: toStringValue(data.category) || "general",                     status: toStringValue(data.status) || "new",                     issueType: toStringValue(data.issueType) || "other",                     severity: toStringValue(data.severity) || "medium",                     contextId: toStringValue(data.contextId),                     currentPath: toStringValue(data.currentPath),                     componentName: toStringValue(data.componentName),                     diagnosticsCount: toNumber(data.diagnosticsCount),                     breadcrumbsCount: toNumber(data.breadcrumbsCount),                     rolloutCount: toNumber(data.rolloutCount),                     timestamp: toTimestampNumber(data.timestamp),                     autoContext: (data.autoContext as Record<string, unknown> | undefined) ?? null,                     component: (data.component as Record<string, unknown> | undefined) ?? null,                 };             })             .filter callback (arrow, line 399)
    - Confidence: 99%
  - [x] getConfiguredRollouts().map callback (arrow, line 402)
    - Confidence: 99%
  - [x] bugReports.filter callback (arrow, line 428)
    - Confidence: 99%

## [x] src/app/api/admin/drops/route.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] sanitizeDropData (function, line 22)
    - Confidence: 99%
  - [x] POST (function, line 33)
    - Confidence: 99%
  - [x] PUT (function, line 93)
    - Confidence: 99%
  - [x] DELETE (function, line 164)
    - Confidence: 99%

## [x] src/app/api/admin/feedback/route.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] toTimestampNumber (function, line 8)
    - Confidence: 99%
  - [x] GET (function, line 25)
    - Confidence: 99%
  - [x] snapshot.docs.map callback (arrow, line 34)
    - Confidence: 99%

## [x] src/app/api/admin/overview/route.ts
- Confidence: 99%
- Functions detected: 21
- Functions:
  - [x] toTimestampNumber (function, line 19)
    - Confidence: 99%
  - [x] serializeRecentTransaction (function, line 36)
    - Confidence: 99%
  - [x] formatChartDayLabel (function, line 44)
    - Confidence: 99%
  - [x] buildThirtyDayChart (function, line 53)
    - Confidence: 99%
  - [x] GET (function, line 70)
    - Confidence: 99%
  - [x] usersSnapshot.docs.forEach callback (arrow, line 95)
    - Confidence: 99%
  - [x] dropsSnapshot.docs.flatMap callback (arrow, line 108)
    - Confidence: 99%
  - [x] recentTransactionsSnapshot.docs.flatMap callback (arrow, line 116)
    - Confidence: 99%
  - [x] purchaseTransactionsSnapshot.docs.flatMap callback (arrow, line 123)
    - Confidence: 99%
  - [x] purchaseTransactionsSnapshot.docs.flatMap((doc) => {             try {                 return [normalizeTransactionRecord(doc.data(), doc.id)];             } catch {                 return [];             }         }).filter callback (arrow, line 129)
    - Confidence: 99%
  - [x] unlockTransactionsSnapshot.docs.flatMap callback (arrow, line 130)
    - Confidence: 99%
  - [x] unlockTransactionsSnapshot.docs.flatMap((doc) => {             try {                 return [normalizeTransactionRecord(doc.data(), doc.id)];             } catch {                 return [];             }         }).filter callback (arrow, line 136)
    - Confidence: 99%
  - [x] recentTransactionsSource             .slice(0, 20)             .map callback (arrow, line 140)
    - Confidence: 99%
  - [x] adminActivitySnapshot.docs             .flatMap callback (arrow, line 143)
    - Confidence: 99%
  - [x] adminActivitySnapshot.docs             .flatMap((doc) => {                 try {                     return [normalizeTransactionRecord(doc.data(), doc.id)];                 } catch {                     return [];                 }             })             .map callback (arrow, line 150)
    - Confidence: 99%
  - [x] [...drops]             .sort callback (arrow, line 153)
    - Confidence: 99%
  - [x] chartSeed.map callback (arrow, line 157)
    - Confidence: 99%
  - [x] [...purchaseTransactions, ...unlockTransactions].forEach callback (arrow, line 159)
    - Confidence: 99%
  - [x] drops.filter callback (arrow, line 181)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 183)
    - Confidence: 99%
  - [x] drops.reduce callback (arrow, line 184)
    - Confidence: 99%

## [x] src/app/api/admin/queue/route.ts
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] GET (function, line 7)
    - Confidence: 99%
  - [x] PUT (function, line 20)
    - Confidence: 99%

## [x] src/app/api/admin/queue/toggle/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 7)
    - Confidence: 99%

## [x] src/app/api/admin/tasks/route.ts
- Confidence: 99%
- Functions detected: 11
- Functions:
  - [x] z.object({   paramEquals: z.object({     key: z.string().trim().min(1).max(60),     value: scalarValueSchema,   }).optional(),   minNumberParam: z.object({     key: z.string().trim().min(1).max(60),     value: z.number().finite(),   }).optional(),   includesAnyParam: z.object({     key: z.string().trim().min(1).max(60),     values: z.array(z.string().trim().min(1).max(60)).min(1).max(12),   }).optional(), }).refine callback (arrow, line 31)
    - Confidence: 99%
  - [x] DAILY_TASK_ACTION_OPTIONS.map callback (arrow, line 44)
    - Confidence: 99%
  - [x] DAILY_TASK_ICON_OPTIONS.map callback (arrow, line 46)
    - Confidence: 99%
  - [x] GET (function, line 59)
    - Confidence: 99%
  - [x] taskSnapshot.docs.map callback (arrow, line 74)
    - Confidence: 99%
  - [x] taskEventsSnapshot.docs.map callback (arrow, line 75)
    - Confidence: 99%
  - [x] eventStatsSnapshot.docs.map callback (arrow, line 76)
    - Confidence: 99%
  - [x] taskRollupSnapshot.docs.map callback (arrow, line 77)
    - Confidence: 99%
  - [x] POST (function, line 95)
    - Confidence: 99%
  - [x] TELEMETRY_EVENT_OPTIONS.some callback (arrow, line 104)
    - Confidence: 99%
  - [x] PUT (function, line 141)
    - Confidence: 99%

## [x] src/app/api/admin/user/[userId]/route.ts
- Confidence: 99%
- Functions detected: 63
- Functions:
  - [x] toTimestampNumber (function, line 15)
    - Confidence: 99%
  - [x] readNumber (function, line 32)
    - Confidence: 99%
  - [x] readString (function, line 36)
    - Confidence: 99%
  - [x] roundToSingleDecimal (function, line 40)
    - Confidence: 99%
  - [x] GET (function, line 44)
    - Confidence: 99%
  - [x] transactionsSnap.docs.flatMap callback (arrow, line 106)
    - Confidence: 99%
  - [x] transactions             .filter callback (arrow, line 123)
    - Confidence: 99%
  - [x] transactions             .filter((transaction) => transaction.status === "completed" && transaction.type === "purchase_currency")             .map callback (arrow, line 124)
    - Confidence: 99%
  - [x] transactions             .filter callback (arrow, line 136)
    - Confidence: 99%
  - [x] sessionFactsSnap.docs.map callback (arrow, line 141)
    - Confidence: 99%
  - [x] userDailySnapshot.docs.map callback (arrow, line 157)
    - Confidence: 99%
  - [x] analyticsFactsSnap.docs             .map callback (arrow, line 160)
    - Confidence: 99%
  - [x] analyticsFactsSnap.docs             .map((doc) => {                 const data = doc.data() as Record<string, unknown>;                 return {                     id: doc.id,                     eventName: readString(data.eventName),                     timestamp: toTimestampNumber(data.timestamp),                     dropId: readString(data.dropId),                     dropTitle: readString(data.dropTitle),                     sessionWatchSeconds: readNumber(data.sessionWatchSeconds),                     watchSeconds: readNumber(data.watchSeconds),                     loadMs: readNumber(data.loadMs),                 };             })             .sort callback (arrow, line 173)
    - Confidence: 99%
  - [x] analyticsFacts.map callback (arrow, line 176)
    - Confidence: 99%
  - [x] transactions.map callback (arrow, line 177)
    - Confidence: 99%
  - [x] securityEventsSnap.docs.map callback (arrow, line 179)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 186)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 187)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 188)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 189)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 190)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 191)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 192)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 193)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 194)
    - Confidence: 99%
  - [x] analyticsFacts.reduce callback (arrow, line 197)
    - Confidence: 99%
  - [x] analyticsFacts.reduce callback (arrow, line 198)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 205)
    - Confidence: 99%
  - [x] analyticsFacts.filter((event) => event.loadMs > 0).map callback (arrow, line 205)
    - Confidence: 99%
  - [x] loadSamples.reduce callback (arrow, line 207)
    - Confidence: 99%
  - [x] sessionFacts.reduce callback (arrow, line 209)
    - Confidence: 99%
  - [x] sessionFacts.reduce callback (arrow, line 210)
    - Confidence: 99%
  - [x] sessionFacts.reduce callback (arrow, line 211)
    - Confidence: 99%
  - [x] sessionFacts.reduce callback (arrow, line 212)
    - Confidence: 99%
  - [x] sessionFacts.reduce callback (arrow, line 213)
    - Confidence: 99%
  - [x] sessionFacts.reduce callback (arrow, line 214)
    - Confidence: 99%
  - [x] userDaily.reduce callback (arrow, line 215)
    - Confidence: 99%
  - [x] userDaily.reduce callback (arrow, line 216)
    - Confidence: 99%
  - [x] userDaily.reduce callback (arrow, line 217)
    - Confidence: 99%
  - [x] userDaily.reduce callback (arrow, line 218)
    - Confidence: 99%
  - [x] analyticsFacts.forEach callback (arrow, line 223)
    - Confidence: 99%
  - [x] sessionFacts.forEach callback (arrow, line 252)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 272)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 273)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 274)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 275)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 276)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 277)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 278)
    - Confidence: 99%
  - [x] purchaseTransactions.reduce callback (arrow, line 279)
    - Confidence: 99%
  - [x] transactions             .filter callback (arrow, line 281)
    - Confidence: 99%
  - [x] transactions             .filter((transaction) => transaction.status === "completed" && transaction.type === "unlock_content")             .reduce callback (arrow, line 282)
    - Confidence: 99%
  - [x] moduleCoverage.every callback (arrow, line 325)
    - Confidence: 99%
  - [x] moduleCoverage.some callback (arrow, line 327)
    - Confidence: 99%
  - [x] moduleCoverage.filter callback (arrow, line 330)
    - Confidence: 99%
  - [x] analyticsFacts.filter callback (arrow, line 345)
    - Confidence: 99%
  - [x] Array.from(viewedDrops.values())                 .sort callback (arrow, line 370)
    - Confidence: 99%
  - [x] securityEventsSnap.docs             .map callback (arrow, line 396)
    - Confidence: 99%
  - [x] securityEventsSnap.docs             .map((doc) => {                 const data = doc.data() as Record<string, unknown>;                 const descriptor = describeSecurityEvent(readString(data.reason));                 return {                     id: doc.id,                     reason: descriptor.reason,                     label: readString(data.label) || descriptor.label,                     message: readString(data.message) || descriptor.message,                     locationLabel: readString(data.locationLabel) || descriptor.locationLabel,                     severity: readString(data.severity) || descriptor.severity,                     dropId: readString(data.dropId) || null,                     dropTitle: readString(data.dropId) ? resolveDropTitle(dropReferences, readString(data.dropId)) : null,                     pagePath: readString(data.pagePath) || null,                     sessionId: readString(data.sessionId) || null,                     contentKind: readString(data.contentKind) || null,                     assetKey: readString(data.assetKey) || null,                     assetIndex: readNumber(data.assetIndex, -1),                     timestamp: toTimestampNumber(data.timestamp) || toTimestampNumber(data.createdAt),                 };             })             .sort callback (arrow, line 416)
    - Confidence: 99%
  - [x] securityEvents.reduce callback (arrow, line 442)
    - Confidence: 99%
  - [x] Object.entries({             ...legacyReasonCounts,             ...eventReasonCounts,         })             .map callback (arrow, line 450)
    - Confidence: 99%
  - [x] Object.entries({             ...legacyReasonCounts,             ...eventReasonCounts,         })             .map(([reason, count]) => {                 const descriptor = describeSecurityEvent(reason);                 return {                     reason: descriptor.reason,                     label: descriptor.label,                     count: Math.max(readNumber(count), eventReasonCounts[reason] || 0),                 };             })             .sort callback (arrow, line 458)
    - Confidence: 99%
  - [x] securityEvents.filter callback (arrow, line 461)
    - Confidence: 99%

## [x] src/app/api/admin/users/route.ts
- Confidence: 99%
- Functions detected: 48
- Functions:
  - [x] toTimestampNumber (function, line 12)
    - Confidence: 99%
  - [x] toStringArray (function, line 29)
    - Confidence: 99%
  - [x] value.filter callback (arrow, line 30)
    - Confidence: 99%
  - [x] roundCurrency (function, line 53)
    - Confidence: 99%
  - [x] readMetric (function, line 57)
    - Confidence: 99%
  - [x] buildEmptyCommerceMetrics (function, line 68)
    - Confidence: 99%
  - [x] buildCommerceMetricsFromRollup (function, line 90)
    - Confidence: 99%
  - [x] chunkValues (function, line 128)
    - Confidence: 99%
  - [x] serializeUserDoc (function, line 138)
    - Confidence: 99%
  - [x] dailyTasksState.tasks.map callback (arrow, line 150)
    - Confidence: 99%
  - [x] Object.entries(securityFlags.reasonCounts as Record<string, unknown>)             .filter callback (arrow, line 208)
    - Confidence: 99%
  - [x] Object.entries(securityFlags.reasonCounts as Record<string, unknown>)             .filter(([, value]) => typeof value === "number" && Number.isFinite(value))             .map callback (arrow, line 209)
    - Confidence: 99%
  - [x] GET (function, line 228)
    - Confidence: 99%
  - [x] usersSnapshot.docs.map callback (arrow, line 243)
    - Confidence: 99%
  - [x] userDailySnapshot.docs.forEach callback (arrow, line 246)
    - Confidence: 99%
  - [x] analyticsSnapshot.docs.map callback (arrow, line 278)
    - Confidence: 99%
  - [x] users       .map callback (arrow, line 349)
    - Confidence: 99%
  - [x] users       .map((user) => user.uid)       .filter callback (arrow, line 350)
    - Confidence: 99%
  - [x] chunkValues(fallbackUserIds, 30).map callback (arrow, line 361)
    - Confidence: 99%
  - [x] eventSnapshots.forEach callback (arrow, line 376)
    - Confidence: 99%
  - [x] snapshot.docs.forEach callback (arrow, line 377)
    - Confidence: 99%
  - [x] fallbackStats.forEach callback (arrow, line 416)
    - Confidence: 99%
  - [x] users.find callback (arrow, line 419)
    - Confidence: 99%
  - [x] users.forEach callback (arrow, line 447)
    - Confidence: 99%
  - [x] users.flatMap callback (arrow, line 487)
    - Confidence: 99%
  - [x] Object.values(analyticsByUser).reduce callback (arrow, line 499)
    - Confidence: 99%
  - [x] Object.values(analyticsByUser).reduce callback (arrow, line 503)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 508)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 509)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 510)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 511)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 512)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 513)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 514)
    - Confidence: 99%
  - [x] users.filter callback (arrow, line 515)
    - Confidence: 99%
  - [x] Object.values(analyticsByUser).filter callback (arrow, line 516)
    - Confidence: 99%
  - [x] Object.values(analyticsByUser).reduce callback (arrow, line 517)
    - Confidence: 99%
  - [x] Object.values(analyticsByUser).reduce callback (arrow, line 518)
    - Confidence: 99%
  - [x] Object.values(analyticsByUser).reduce callback (arrow, line 522)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 532)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 535)
    - Confidence: 99%
  - [x] Object.values(analyticsByUser).filter callback (arrow, line 540)
    - Confidence: 99%
  - [x] PUT (function, line 555)
    - Confidence: 99%
  - [x] POST (function, line 589)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 617)
    - Confidence: 99%
  - [x] userData.unlockedContent.filter callback (arrow, line 633)
    - Confidence: 99%
  - [x] trackServerEvent("unlock_drop_success", {         drop_id: normalizedDropId,         drop_title: result.dropTitle,         unlock_cost: 0,         grant_source: "admin",         transaction_id: `admin-grant:${userId}:${normalizedDropId}:${result.grantedAt ?? "unknown"}`,       }, userId).catch callback (arrow, line 687)
    - Confidence: 99%
  - [x] buildEmptyDailyAggregate (function, line 723)
    - Confidence: 99%

## [x] src/app/api/analytics/ingest/route.ts
- Confidence: 99%
- Functions detected: 11
- Functions:
  - [x] getOrCreateSessionKey (function, line 60)
    - Confidence: 99%
  - [x] sanitizeTargetLabel (function, line 72)
    - Confidence: 99%
  - [x] POST (function, line 83)
    - Confidence: 99%
  - [x] events.map callback (arrow, line 117)
    - Confidence: 99%
  - [x] sanitizedEvents.map callback (arrow, line 131)
    - Confidence: 99%
  - [x] sanitizedEvents.map callback (arrow, line 132)
    - Confidence: 99%
  - [x] sanitizedEvents.reduce callback (arrow, line 133)
    - Confidence: 99%
  - [x] sanitizedEvents.some callback (arrow, line 134)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 135)
    - Confidence: 99%
  - [x] (existingSessionData?.pagePaths as unknown[]).filter callback (arrow, line 149)
    - Confidence: 99%
  - [x] (existingSessionData?.interactionTypes as unknown[]).filter callback (arrow, line 152)
    - Confidence: 99%

## [x] src/app/api/auth/navigation-session/route.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] POST (function, line 10)
    - Confidence: 99%
  - [x] DELETE (function, line 49)
    - Confidence: 99%
  - [x] [NAV_AUTH_COOKIE, NAV_ROLE_COOKIE, NAV_UID_COOKIE].forEach callback (arrow, line 61)
    - Confidence: 99%

## [x] src/app/api/checkin/route.ts
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] POST (function, line 14)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 34)
    - Confidence: 99%

## [x] src/app/api/creators/[username]/route.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] GET (function, line 10)
    - Confidence: 99%
  - [x] dropsSnapshot.docs.flatMap callback (arrow, line 64)
    - Confidence: 99%
  - [x] dropsSnapshot.docs.flatMap((doc) => {             try {                 const normalized = applyDropStatus(normalizeDropRecord(doc.data(), doc.id), nowMs);                 return normalized.status === "active" ? [normalized] : [];             } catch {                 return [];             }         }).sort callback (arrow, line 71)
    - Confidence: 99%

## [x] src/app/api/cron/notify-active-drops/route.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] GET (function, line 10)
    - Confidence: 99%
  - [x] ownersSnap.forEach callback (arrow, line 76)
    - Confidence: 99%
  - [x] activationNotifications.map callback (arrow, line 114)
    - Confidence: 99%

## [x] src/app/api/cron/process-queue/route.ts
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] chunkArray (function, line 9)
    - Confidence: 99%
  - [x] GET (function, line 20)
    - Confidence: 99%
  - [x] chunkArray(config.queue, 10).map callback (arrow, line 39)
    - Confidence: 99%
  - [x] queuedDropSnapshots.forEach callback (arrow, line 43)
    - Confidence: 99%
  - [x] snapshot.forEach callback (arrow, line 44)
    - Confidence: 99%

## [x] src/app/api/drops/[dropId]/click/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 9)
    - Confidence: 99%

## [x] src/app/api/drops/content/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] GET (function, line 21)
    - Confidence: 99%

## [x] src/app/api/drops/impression/route.ts
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] buildDayKey (function, line 18)
    - Confidence: 99%
  - [x] buildAnonymousFingerprint (function, line 22)
    - Confidence: 99%
  - [x] buildImpressionReceiptId (function, line 30)
    - Confidence: 99%
  - [x] POST (function, line 36)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 62)
    - Confidence: 99%

## [x] src/app/api/drops/route.ts
- Confidence: 99%
- Functions detected: 8
- Functions:
  - [x] compareDropFeedOrder (function, line 12)
    - Confidence: 99%
  - [x] buildCursor (function, line 20)
    - Confidence: 99%
  - [x] parseCursor (function, line 24)
    - Confidence: 99%
  - [x] GET (function, line 43)
    - Confidence: 99%
  - [x] allDrops             .filter callback (arrow, line 57)
    - Confidence: 99%
  - [x] visibleDrops.findIndex callback (arrow, line 63)
    - Confidence: 99%
  - [x] visibleDrops.findIndex callback (arrow, line 68)
    - Confidence: 99%
  - [x] drops.map callback (arrow, line 83)
    - Confidence: 99%

## [x] src/app/api/drops/track/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 14)
    - Confidence: 99%

## [x] src/app/api/drops/unlock/route.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] POST (function, line 19)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 38)
    - Confidence: 99%
  - [x] unlockedContentRaw.filter callback (arrow, line 68)
    - Confidence: 99%
  - [x] dropData.tags.filter callback (arrow, line 114)
    - Confidence: 99%

## [x] src/app/api/notifications/route.ts
- Confidence: 99%
- Functions detected: 7
- Functions:
  - [x] buildNotificationsEtag (function, line 19)
    - Confidence: 99%
  - [x] notifications.map callback (arrow, line 27)
    - Confidence: 99%
  - [x] buildDispatchFingerprint (function, line 31)
    - Confidence: 99%
  - [x] GET (function, line 54)
    - Confidence: 99%
  - [x] POST (function, line 93)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 117)
    - Confidence: 99%
  - [x] PUT (function, line 169)
    - Confidence: 99%

## [x] src/app/api/paypal/capture/route.ts
- Confidence: 99%
- Functions detected: 8
- Functions:
  - [x] getPayPalCredentials (function, line 22)
    - Confidence: 99%
  - [x] getPayPalAccessToken (function, line 28)
    - Confidence: 99%
  - [x] capturePayPalOrder (function, line 47)
    - Confidence: 99%
  - [x] logFailedTransaction (function, line 61)
    - Confidence: 99%
  - [x] POST (function, line 78)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 139)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 147)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 175)
    - Confidence: 99%

## [x] src/app/api/paypal/create/route.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] getPayPalCredentials (function, line 14)
    - Confidence: 99%
  - [x] getPayPalAccessToken (function, line 20)
    - Confidence: 99%
  - [x] POST (function, line 39)
    - Confidence: 99%

## [x] src/app/api/privacy/consent/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 12)
    - Confidence: 99%

## [x] src/app/api/security/log-attempt/route.ts
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] POST (function, line 10)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 41)
    - Confidence: 99%

## [x] src/app/api/settings/landing/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] GET (function, line 9)
    - Confidence: 99%

## [x] src/app/api/settings/landing/upload/route.ts
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] isImageFormat (function, line 8)
    - Confidence: 99%
  - [x] extractStorageObjectPath (function, line 12)
    - Confidence: 99%
  - [x] POST (function, line 31)
    - Confidence: 99%
  - [x] fileRef.delete({ ignoreNotFound: true }).catch callback (arrow, line 96)
    - Confidence: 99%
  - [x] bucket.file(previousObjectPath).delete({ ignoreNotFound: true }).catch callback (arrow, line 106)
    - Confidence: 99%

## [x] src/app/api/tasks/claim/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 4)
    - Confidence: 99%

## [x] src/app/api/tasks/feedback/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 65)
    - Confidence: 99%

## [x] src/app/api/tasks/reminders/sync/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 8)
    - Confidence: 99%

## [x] src/app/api/tasks/rotate/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 8)
    - Confidence: 99%

## [x] src/app/api/tasks/track-share/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 8)
    - Confidence: 99%

## [x] src/app/api/telemetry/track/route.ts
- Confidence: 99%
- Functions detected: 22
- Functions:
  - [x] BUILT_IN_DAILY_TASKS.map callback (arrow, line 17)
    - Confidence: 99%
  - [x] getStringParam (function, line 38)
    - Confidence: 99%
  - [x] getNumberParam (function, line 43)
    - Confidence: 99%
  - [x] getBooleanParam (function, line 48)
    - Confidence: 99%
  - [x] sanitizeTelemetryValue (function, line 53)
    - Confidence: 99%
  - [x] sanitizeEventParams (function, line 69)
    - Confidence: 99%
  - [x] entries         .map callback (arrow, line 76)
    - Confidence: 99%
  - [x] entries         .map(([key, entryValue]) => [key.slice(0, 60), sanitizeTelemetryValue(entryValue)] as const)         .filter callback (arrow, line 77)
    - Confidence: 99%
  - [x] isAlreadyExistsError (function, line 82)
    - Confidence: 99%
  - [x] normalizeIncomingTelemetryEvents (function, line 91)
    - Confidence: 99%
  - [x] POST (function, line 116)
    - Confidence: 99%
  - [x] incomingEvents.map callback (arrow, line 146)
    - Confidence: 99%
  - [x] resolvedEvents.filter callback (arrow, line 184)
    - Confidence: 99%
  - [x] resolvedEvents                     .filter callback (arrow, line 199)
    - Confidence: 99%
  - [x] resolvedEvents                     .filter((event) => event.canAdvanceTaskProgress)                     .map callback (arrow, line 200)
    - Confidence: 99%
  - [x] resolvedEvents                 .map callback (arrow, line 223)
    - Confidence: 99%
  - [x] resolvedEvents                 .map((event) => getStringParam(event.eventParamsWithMetadata, "drop_id"))                 .filter callback (arrow, line 224)
    - Confidence: 99%
  - [x] resolvedEvents.map callback (arrow, line 227)
    - Confidence: 99%
  - [x] telemetryFacts.map callback (arrow, line 303)
    - Confidence: 99%
  - [x] telemetryFacts.flatMap callback (arrow, line 316)
    - Confidence: 99%
  - [x] telemetryFacts                 .filter callback (arrow, line 339)
    - Confidence: 99%
  - [x] telemetryFacts                 .filter((event) => event.canAdvanceTaskProgress)                 .map callback (arrow, line 340)
    - Confidence: 99%

## [x] src/app/api/user/activity/route.ts
- Confidence: 99%
- Functions detected: 16
- Functions:
  - [x] toTimestampNumber (function, line 28)
    - Confidence: 99%
  - [x] toTaskEvent (function, line 49)
    - Confidence: 99%
  - [x] renderTransactionLabel (function, line 70)
    - Confidence: 99%
  - [x] renderTaskEventLabel (function, line 93)
    - Confidence: 99%
  - [x] fetchTransactions (function, line 105)
    - Confidence: 99%
  - [x] [...fallbackSnapshot.docs].sort callback (arrow, line 134)
    - Confidence: 99%
  - [x] fetchTaskEvents (function, line 146)
    - Confidence: 99%
  - [x] [...fallbackSnapshot.docs].sort callback (arrow, line 175)
    - Confidence: 99%
  - [x] buildActivityItems (function, line 187)
    - Confidence: 99%
  - [x] transactionsSnapshot.docs.flatMap callback (arrow, line 191)
    - Confidence: 99%
  - [x] taskEventsSnapshot.docs.flatMap callback (arrow, line 206)
    - Confidence: 99%
  - [x] [...transactionItems, ...taskItems].sort callback (arrow, line 221)
    - Confidence: 99%
  - [x] GET (function, line 224)
    - Confidence: 99%
  - [x] activities.flatMap callback (arrow, line 244)
    - Confidence: 99%
  - [x] activities.flatMap callback (arrow, line 245)
    - Confidence: 99%
  - [x] activities.map callback (arrow, line 249)
    - Confidence: 99%

## [x] src/app/api/user/check-username/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] GET (function, line 8)
    - Confidence: 99%

## [x] src/app/api/user/complete-onboarding/route.ts
- Confidence: 99%
- Functions detected: 9
- Functions:
  - [x] toNumber (function, line 21)
    - Confidence: 99%
  - [x] toStringValue (function, line 25)
    - Confidence: 99%
  - [x] sanitizeOnboardingStepMetrics (function, line 29)
    - Confidence: 99%
  - [x] value         .slice(0, 12)         .map callback (arrow, line 36)
    - Confidence: 99%
  - [x] value         .slice(0, 12)         .map((entry) => {             if (!entry || typeof entry !== "object" || Array.isArray(entry)) {                 return null;             }              const candidate = entry as Record<string, unknown>;             const stepId = toStringValue(candidate.stepId).slice(0, 60);             const stepTitle = toStringValue(candidate.stepTitle).slice(0, 120);             const stepPath = toStringValue(candidate.stepPath).slice(0, 120) || "/dashboard";             const completionReason = toStringValue(candidate.completionReason).slice(0, 80) || "completed";             const stepIndex = Math.max(1, toNumber(candidate.stepIndex));             const startedAtMs = Math.max(0, toNumber(candidate.startedAtMs));             const completedAtMs = Math.max(startedAtMs, toNumber(candidate.completedAtMs));             const durationMs = Math.max(0, toNumber(candidate.durationMs) || (completedAtMs - startedAtMs));              if (!stepId || !stepTitle) {                 return null;             }              return {                 stepId,                 stepIndex,                 stepTitle,                 stepPath,                 startedAtMs,                 completedAtMs,                 durationMs,                 completionReason,             } satisfies OnboardingStepMetricInput;         })         .filter callback (arrow, line 66)
    - Confidence: 99%
  - [x] buildAnalyticsEventFact (function, line 69)
    - Confidence: 99%
  - [x] POST (function, line 117)
    - Confidence: 99%
  - [x] req.json().catch callback (arrow, line 130)
    - Confidence: 99%
  - [x] adminDb.runTransaction callback (arrow, line 147)
    - Confidence: 99%

## [x] src/app/api/user/data/route.ts
- Confidence: 99%
- Functions detected: 6
- Functions:
  - [x] serializeForExport (function, line 8)
    - Confidence: 99%
  - [x] value.map callback (arrow, line 14)
    - Confidence: 99%
  - [x] Object.entries(value as Record<string, unknown>).map callback (arrow, line 31)
    - Confidence: 99%
  - [x] exportQueryDocs (function, line 38)
    - Confidence: 99%
  - [x] snapshot.docs.map callback (arrow, line 40)
    - Confidence: 99%
  - [x] GET (function, line 46)
    - Confidence: 99%

## [x] src/app/api/user/delete/route.ts
- Confidence: 99%
- Functions detected: 6
- Functions:
  - [x] getFirebaseErrorCode (function, line 22)
    - Confidence: 99%
  - [x] deleteDocumentTree (function, line 31)
    - Confidence: 99%
  - [x] deleteQueryMatches (function, line 49)
    - Confidence: 99%
  - [x] snapshot.docs.forEach callback (arrow, line 54)
    - Confidence: 99%
  - [x] DELETE (function, line 58)
    - Confidence: 99%
  - [x] bulkWriter.onWriteError callback (arrow, line 78)
    - Confidence: 99%

## [x] src/app/api/user/follow/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 14)
    - Confidence: 99%

## [x] src/app/api/user/profile/route.ts
- Confidence: 99%
- Functions detected: 7
- Functions:
  - [x] normalizeNotificationSettings (function, line 24)
    - Confidence: 99%
  - [x] normalizePrivacySettings (function, line 49)
    - Confidence: 99%
  - [x] normalizeAccountSettings (function, line 86)
    - Confidence: 99%
  - [x] normalizeBrowserPushToken (function, line 104)
    - Confidence: 99%
  - [x] PUT (function, line 121)
    - Confidence: 99%
  - [x] existingUserData.fcmTokens.filter callback (arrow, line 199)
    - Confidence: 99%
  - [x] POST (function, line 248)
    - Confidence: 99%

## [x] src/app/api/user/register/route.ts
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] normalizeRegistrationMethod (function, line 12)
    - Confidence: 99%
  - [x] POST (function, line 16)
    - Confidence: 99%

## [x] src/app/api/user/revoke-sessions/route.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] POST (function, line 7)
    - Confidence: 99%

## [x] src/app/banned/page.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] BannedPage (function, line 10)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 14)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 50)
    - Confidence: 99%

## [x] src/app/creators/[username]/CreatorProfileClient.tsx
- Confidence: 99%
- Functions detected: 7
- Functions:
  - [x] CreatorProfileClient (function, line 15)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 27)
    - Confidence: 99%
  - [x] fetchData (function, line 30)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 59)
    - Confidence: 99%
  - [x] handleFollow (arrow, line 65)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 191)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 201)
    - Confidence: 99%

## [x] src/app/creators/[username]/page.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] getCreatorMetadataRecord (function, line 17)
    - Confidence: 99%
  - [x] generateMetadata (function, line 55)
    - Confidence: 99%
  - [x] CreatorProfilePage (function, line 97)
    - Confidence: 99%

## [x] src/app/dashboard/DashboardClient.tsx
- Confidence: 99%
- Functions detected: 11
- Functions:
  - [x] dynamic callback (arrow, line 17)
    - Confidence: 99%
  - [x] import("@/components/Dashboard/RecentActivityFeed").then callback (arrow, line 17)
    - Confidence: 99%
  - [x] loading (arrow, line 19)
    - Confidence: 99%
  - [x] DashboardClient (function, line 38)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 42)
    - Confidence: 99%
  - [x] drops.filter callback (arrow, line 42)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 44)
    - Confidence: 99%
  - [x] drops.forEach callback (arrow, line 47)
    - Confidence: 99%
  - [x] liveActiveDrops.forEach callback (arrow, line 51)
    - Confidence: 99%
  - [x] Array.from(mergedDrops.values()).sort callback (arrow, line 55)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 58)
    - Confidence: 99%

## [x] src/app/dashboard/layout.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] dynamic callback (arrow, line 9)
    - Confidence: 99%
  - [x] import("@/components/Dashboard/NotificationPromptBanner").then callback (arrow, line 9)
    - Confidence: 99%
  - [x] DashboardLayout (function, line 12)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 20)
    - Confidence: 99%

## [x] src/app/dashboard/library/LibraryClient.tsx
- Confidence: 99%
- Functions detected: 10
- Functions:
  - [x] getRatio (function, line 16)
    - Confidence: 99%
  - [x] getItemSpanClass (function, line 24)
    - Confidence: 99%
  - [x] LibraryClient (function, line 35)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 37)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 44)
    - Confidence: 99%
  - [x] [1, 2, 3, 4].map callback (arrow, line 60)
    - Confidence: 99%
  - [x] drops.filter callback (arrow, line 77)
    - Confidence: 99%
  - [x] drops.filter callback (arrow, line 94)
    - Confidence: 99%
  - [x] drops.filter((d) => unlockedIds.has(d.id)).map callback (arrow, line 94)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 99)
    - Confidence: 99%

## [x] src/app/dashboard/library/page.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] LibraryPage (function, line 6)
    - Confidence: 99%

## [x] src/app/dashboard/page.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] DashboardPage (function, line 6)
    - Confidence: 99%

## [x] src/app/dashboard/profile/page.tsx
- Confidence: 99%
- Functions detected: 44
- Functions:
  - [x] normalizeTimezone (function, line 52)
    - Confidence: 99%
  - [x] sanitizeUsername (function, line 61)
    - Confidence: 99%
  - [x] buildFormState (function, line 65)
    - Confidence: 99%
  - [x] SectionCard (function, line 95)
    - Confidence: 99%
  - [x] ToggleRow (function, line 104)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 136)
    - Confidence: 99%
  - [x] StaticSettingRow (function, line 148)
    - Confidence: 99%
  - [x] ProfilePage (function, line 176)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 180)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 218)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 220)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 224)
    - Confidence: 99%
  - [x] updateForm (arrow, line 235)
    - Confidence: 99%
  - [x] setFormState callback (arrow, line 237)
    - Confidence: 99%
  - [x] savePrivacyPreferences (arrow, line 240)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 275)
    - Confidence: 99%
  - [x] loadNotificationSupport (function, line 278)
    - Confidence: 99%
  - [x] returned function (arrow, line 306)
    - Confidence: 99%
  - [x] handleBrowserPushToggle (arrow, line 311)
    - Confidence: 99%
  - [x] handleWithdrawOptionalTracking (arrow, line 348)
    - Confidence: 99%
  - [x] setFormState callback (arrow, line 362)
    - Confidence: 99%
  - [x] handleSave (arrow, line 377)
    - Confidence: 99%
  - [x] handleChangeAvatar (arrow, line 440)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 460)
    - Confidence: 99%
  - [x] mutate callback (arrow, line 471)
    - Confidence: 99%
  - [x] handleSignOutAllSessions (arrow, line 480)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 483)
    - Confidence: 99%
  - [x] handleRequestDeletion (arrow, line 497)
    - Confidence: 99%
  - [x] handleDownloadData (arrow, line 521)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 596)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 611)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 634)
    - Confidence: 99%
  - [x] TIMEZONE_OPTIONS.map callback (arrow, line 637)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 652)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 661)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 668)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 675)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 691)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 704)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 717)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 729)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 740)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 763)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 795)
    - Confidence: 99%

## [x] src/app/dashboard/viewer/page.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] ViewerPage (function, line 8)
    - Confidence: 99%

## [x] src/app/dashboard/viewer/ViewerClient.tsx
- Confidence: 99%
- Functions detected: 102
- Functions:
  - [x] normalizeMimeType (function, line 52)
    - Confidence: 99%
  - [x] resolveContentKind (function, line 68)
    - Confidence: 99%
  - [x] resolveContent (function, line 76)
    - Confidence: 99%
  - [x] createVideoThumbnail (function, line 115)
    - Confidence: 99%
  - [x] Promise callback (arrow, line 116)
    - Confidence: 99%
  - [x] finish (arrow, line 120)
    - Confidence: 99%
  - [x] drawFrame (arrow, line 133)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 160)
    - Confidence: 99%
  - [x] video.addEventListener callback (arrow, line 166)
    - Confidence: 99%
  - [x] video.addEventListener callback (arrow, line 168)
    - Confidence: 99%
  - [x] revokeObjectUrl (function, line 188)
    - Confidence: 99%
  - [x] fetchSecureContent (function, line 194)
    - Confidence: 99%
  - [x] fetchAssetRecord (function, line 201)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 204)
    - Confidence: 99%
  - [x] clearCachedAssets (function, line 225)
    - Confidence: 99%
  - [x] cache.forEach callback (arrow, line 226)
    - Confidence: 99%
  - [x] getThumbnailFallback (function, line 230)
    - Confidence: 99%
  - [x] buildThumbnailItemsWithUpdate (function, line 239)
    - Confidence: 99%
  - [x] Array.from callback (arrow, line 246)
    - Confidence: 99%
  - [x] buildThumbnailFetchOrder (function, line 251)
    - Confidence: 99%
  - [x] sumNumbers (function, line 276)
    - Confidence: 99%
  - [x] buildThumbnailFromRecord (function, line 285)
    - Confidence: 99%
  - [x] formatUnwrappedLabel (function, line 300)
    - Confidence: 99%
  - [x] sanitizeDropTags (function, line 312)
    - Confidence: 99%
  - [x] tags.filter callback (arrow, line 318)
    - Confidence: 99%
  - [x] ViewerClient (function, line 322)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 353)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 357)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 370)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 375)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 385)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 389)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 403)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 415)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 453)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 476)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 501)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 521)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 537)
    - Confidence: 99%
  - [x] returned function (arrow, line 541)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 549)
    - Confidence: 99%
  - [x] handlePageExit (arrow, line 554)
    - Confidence: 99%
  - [x] returned function (arrow, line 561)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 567)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 572)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 591)
    - Confidence: 99%
  - [x] returned function (arrow, line 605)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 610)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 614)
    - Confidence: 99%
  - [x] setActiveIndex callback (arrow, line 620)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 623)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 649)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 671)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 694)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 703)
    - Confidence: 99%
  - [x] returned function (arrow, line 709)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 714)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 722)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 744)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 751)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 759)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 777)
    - Confidence: 99%
  - [x] getSecuritySessionId (arrow, line 780)
    - Confidence: 99%
  - [x] logViolation (arrow, line 788)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 807)
    - Confidence: 99%
  - [x] handleKeyDown (arrow, line 812)
    - Confidence: 99%
  - [x] returned function (arrow, line 840)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 846)
    - Confidence: 99%
  - [x] buildThumbnailFromRecord(cachedRecord, currentDrop.imageUrl).then callback (arrow, line 869)
    - Confidence: 99%
  - [x] setThumbnailItems callback (arrow, line 871)
    - Confidence: 99%
  - [x] fetchContent (function, line 884)
    - Confidence: 99%
  - [x] buildThumbnailFromRecord(assetRecord, currentDrop.imageUrl).then callback (arrow, line 900)
    - Confidence: 99%
  - [x] setThumbnailItems callback (arrow, line 906)
    - Confidence: 99%
  - [x] returned function (arrow, line 929)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 935)
    - Confidence: 99%
  - [x] Array.from callback (arrow, line 948)
    - Confidence: 99%
  - [x] returned function (arrow, line 952)
    - Confidence: 99%
  - [x] buildThumbnails (function, line 957)
    - Confidence: 99%
  - [x] buildThumbnailFetchOrder(assetCount, activeIndex).filter callback (arrow, line 958)
    - Confidence: 99%
  - [x] setThumbnailItems callback (arrow, line 983)
    - Confidence: 99%
  - [x] setThumbnailItems callback (arrow, line 1003)
    - Confidence: 99%
  - [x] returned function (arrow, line 1011)
    - Confidence: 99%
  - [x] controllers.forEach callback (arrow, line 1013)
    - Confidence: 99%
  - [x] preventContextMenu (arrow, line 1019)
    - Confidence: 99%
  - [x] (allDrops || [])         .filter callback (arrow, line 1075)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1129)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1144)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1150)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1153)
    - Confidence: 99%
  - [x] videoFallbackTypes.filter callback (arrow, line 1158)
    - Confidence: 99%
  - [x] videoFallbackTypes.filter((type) => type !== resolvedContent.mimeType).map callback (arrow, line 1158)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1181)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1184)
    - Confidence: 99%
  - [x] audioFallbackTypes.filter callback (arrow, line 1189)
    - Confidence: 99%
  - [x] audioFallbackTypes.filter((type) => type !== resolvedContent.mimeType).map callback (arrow, line 1189)
    - Confidence: 99%
  - [x] Array.from({ length: assetCount }).map callback (arrow, line 1250)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1259)
    - Confidence: 99%
  - [x] previewTags.map callback (arrow, line 1310)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1347)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1364)
    - Confidence: 99%
  - [x] retentionDrops.map callback (arrow, line 1378)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 1382)
    - Confidence: 99%

## [x] src/app/drops/[id]/opengraph-image.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] renderUnavailableImage (function, line 12)
    - Confidence: 99%
  - [x] Image (function, line 34)
    - Confidence: 99%

## [x] src/app/drops/DropsClient.tsx
- Confidence: 99%
- Functions detected: 33
- Functions:
  - [x] dynamic callback (arrow, line 15)
    - Confidence: 99%
  - [x] import("@/components/FeaturedCarousel").then callback (arrow, line 15)
    - Confidence: 99%
  - [x] loading (arrow, line 17)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 20)
    - Confidence: 99%
  - [x] import("@/components/DropPreviewModal").then callback (arrow, line 20)
    - Confidence: 99%
  - [x] toPositiveInteger (function, line 39)
    - Confidence: 99%
  - [x] buildAccountOverviewViewModel (function, line 48)
    - Confidence: 99%
  - [x] DropsClient (function, line 92)
    - Confidence: 99%
  - [x] useState callback (arrow, line 98)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 107)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 111)
    - Confidence: 99%
  - [x] IntersectionObserver callback (arrow, line 113)
    - Confidence: 99%
  - [x] returned function (arrow, line 125)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 134)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 138)
    - Confidence: 99%
  - [x] handlePopState (arrow, line 139)
    - Confidence: 99%
  - [x] returned function (arrow, line 147)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 150)
    - Confidence: 99%
  - [x] liveDrops.filter callback (arrow, line 154)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 157)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 165)
    - Confidence: 99%
  - [x] result.filter callback (arrow, line 172)
    - Confidence: 99%
  - [x] [...result].sort callback (arrow, line 180)
    - Confidence: 99%
  - [x] [...result].sort callback (arrow, line 182)
    - Confidence: 99%
  - [x] [...result].sort callback (arrow, line 188)
    - Confidence: 99%
  - [x] result.filter callback (arrow, line 190)
    - Confidence: 99%
  - [x] syncDropQuery (arrow, line 197)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 214)
    - Confidence: 99%
  - [x] liveDrops.find callback (arrow, line 220)
    - Confidence: 99%
  - [x] handleSelectDrop (arrow, line 223)
    - Confidence: 99%
  - [x] handleClosePreview (arrow, line 228)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 248)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 255)
    - Confidence: 99%

## [x] src/app/drops/loading.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] DropsLoading (function, line 3)
    - Confidence: 99%
  - [x] [1, 2, 3, 4, 5].map callback (arrow, line 16)
    - Confidence: 99%
  - [x] [1, 2, 3, 4, 5, 6].map callback (arrow, line 32)
    - Confidence: 99%

## [x] src/app/drops/page.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] DropsPage (function, line 16)
    - Confidence: 99%
  - [x] (await getDrops()).filter callback (arrow, line 17)
    - Confidence: 99%

## [x] src/app/error.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] Error (function, line 10)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 17)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 41)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 44)
    - Confidence: 99%

## [x] src/app/experiences/ExperiencesClient.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] ExperiencesClient (function, line 15)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 19)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 83)
    - Confidence: 99%

## [x] src/app/experiences/page.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] ExperiencesPage (function, line 13)
    - Confidence: 99%

## [x] src/app/faq/faq-data.ts
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/app/faq/FAQClient.tsx
- Confidence: 99%
- Functions detected: 23
- Functions:
  - [x] normalizeQuery (function, line 29)
    - Confidence: 99%
  - [x] buildSearchableSections (function, line 33)
    - Confidence: 99%
  - [x] sections.map callback (arrow, line 34)
    - Confidence: 99%
  - [x] section.questions.map callback (arrow, line 36)
    - Confidence: 99%
  - [x] FAQClient (function, line 45)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 52)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 54)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 58)
    - Confidence: 99%
  - [x] searchableSections           .map callback (arrow, line 63)
    - Confidence: 99%
  - [x] section.questions.filter callback (arrow, line 66)
    - Confidence: 99%
  - [x] searchableSections           .map((section) => ({             category: section.category,             questions: section.questions.filter(               (item) =>                 item.qNormalized.includes(normalizedQuery) ||                 item.aNormalized.includes(normalizedQuery)             ),           }))           .filter callback (arrow, line 71)
    - Confidence: 99%
  - [x] searchedSections.filter callback (arrow, line 77)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 81)
    - Confidence: 99%
  - [x] filteredSections.reduce callback (arrow, line 81)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 85)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 105)
    - Confidence: 99%
  - [x] sections.map callback (arrow, line 105)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 137)
    - Confidence: 99%
  - [x] categoryFilters.map callback (arrow, line 145)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 152)
    - Confidence: 99%
  - [x] filteredSections.map callback (arrow, line 183)
    - Confidence: 99%
  - [x] section.questions.map callback (arrow, line 191)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 208)
    - Confidence: 99%

## [x] src/app/faq/HowItWorksStory.tsx
- Confidence: 99%
- Functions detected: 15
- Functions:
  - [x] HowItWorksStory (function, line 32)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 39)
    - Confidence: 99%
  - [x] steps.find callback (arrow, line 39)
    - Confidence: 99%
  - [x] handlePrimaryAction (arrow, line 47)
    - Confidence: 99%
  - [x] handleSecondaryAction (arrow, line 61)
    - Confidence: 99%
  - [x] steps.map callback (arrow, line 73)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 81)
    - Confidence: 99%
  - [x] activeStep.callouts.map callback (arrow, line 134)
    - Confidence: 99%
  - [x] StoryVisual (function, line 175)
    - Confidence: 99%
  - [x] ["Email address", "Password", "Day 1 ready"].map callback (arrow, line 195)
    - Confidence: 99%
  - [x] ["Save your library", "Track daily rewards", "Unwrap live KandyDrops"].map callback (arrow, line 208)
    - Confidence: 99%
  - [x] ["250", "1000"].map callback (arrow, line 236)
    - Confidence: 99%
  - [x] ["10", "20", "30", "40"].map callback (arrow, line 257)
    - Confidence: 99%
  - [x] [0, 1, 2, 3].map callback (arrow, line 352)
    - Confidence: 99%
  - [x] ["10", "20", "30", "40", "50", "60", "70"].map callback (arrow, line 393)
    - Confidence: 99%

## [x] src/app/faq/page.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] FAQPage (function, line 14)
    - Confidence: 99%

## [x] src/app/favicon.ico
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/app/globals.css
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/app/layout.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] RootLayout (function, line 81)
    - Confidence: 99%

## [x] src/app/loading.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] Loading (function, line 3)
    - Confidence: 99%

## [x] src/app/not-found.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] NotFound (function, line 4)
    - Confidence: 99%

## [x] src/app/offline/page.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] OfflinePage (function, line 6)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 28)
    - Confidence: 99%

## [x] src/app/page.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] Home (function, line 13)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 19)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 25)
    - Confidence: 99%

## [x] src/app/robots.ts
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] robots (function, line 4)
    - Confidence: 99%

## [x] src/app/sitemap.ts
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] getLatestPublicDropTimestamp (function, line 10)
    - Confidence: 99%
  - [x] sitemap (function, line 34)
    - Confidence: 99%

## [x] src/components/Admin/AdminActivityLogPanel.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] AdminActivityLogPanel (function, line 7)
    - Confidence: 99%
  - [x] logs.map callback (arrow, line 30)
    - Confidence: 99%

## [x] src/components/Admin/AdminAnalyticsCharts.tsx
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] AdminAnalyticsCharts (function, line 16)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 20)
    - Confidence: 99%
  - [x] (data?.chartData || []).map callback (arrow, line 20)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 55)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 59)
    - Confidence: 99%

## [x] src/components/Admin/AdminPageHeader.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] AdminPageHeader (function, line 17)
    - Confidence: 99%

## [x] src/components/Admin/AdminStatsBar.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] AdminStatsBar (function, line 18)
    - Confidence: 99%

## [x] src/components/Admin/AdminTasksManager.tsx
- Confidence: 99%
- Functions detected: 46
- Functions:
  - [x] formatRelativeTime (function, line 39)
    - Confidence: 99%
  - [x] normalizeString (function, line 50)
    - Confidence: 99%
  - [x] normalizeNumber (function, line 54)
    - Confidence: 99%
  - [x] TaskCard (function, line 58)
    - Confidence: 99%
  - [x] AdminTasksManager (function, line 85)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 113)
    - Confidence: 99%
  - [x] users.find callback (arrow, line 113)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 118)
    - Confidence: 99%
  - [x] (data?.taskRollups ?? []).map callback (arrow, line 119)
    - Confidence: 99%
  - [x] (data?.taskRollups ?? []).map((rollup) => {         const assigned = normalizeNumber(rollup.types && (rollup.types as Record<string, unknown>).assigned);         const completed = normalizeNumber(rollup.types && (rollup.types as Record<string, unknown>).completed);         const failed = normalizeNumber(rollup.types && (rollup.types as Record<string, unknown>).failed);         const durationSampleCount = normalizeNumber(rollup.durationSampleCount);         const avgCompletionMins = durationSampleCount > 0           ? Math.round(normalizeNumber(rollup.durationMsTotal) / durationSampleCount / 60000)           : 0;         return {           id: rollup.id,           title: normalizeString(rollup.title, "Untitled task"),           assigned,           completed,           failed,           rewardTotal: normalizeNumber(rollup.rewardTotal),           avgCompletionMins,           completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,           lastEventAt: normalizeNumber(rollup.lastEventAt),         };       }).sort callback (arrow, line 138)
    - Confidence: 99%
  - [x] buildCriteriaPayload (arrow, line 142)
    - Confidence: 99%
  - [x] trimmedValue       .split(",")       .map callback (arrow, line 185)
    - Confidence: 99%
  - [x] handleCreateTask (arrow, line 200)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 226)
    - Confidence: 99%
  - [x] toggleTaskState (arrow, line 257)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 266)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 288)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 294)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 300)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 306)
    - Confidence: 99%
  - [x] (data?.eventOptions ?? []).map callback (arrow, line 309)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 317)
    - Confidence: 99%
  - [x] (data?.actionOptions ?? []).map callback (arrow, line 320)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 328)
    - Confidence: 99%
  - [x] (data?.iconOptions ?? []).map callback (arrow, line 331)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 339)
    - Confidence: 99%
  - [x] ["visit", "notifications", "unwrap", "watch", "wallet", "purchase", "feedback", "share"].map callback (arrow, line 342)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 353)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 361)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 369)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 374)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 380)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 390)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 396)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 402)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 425)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 435)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 450)
    - Confidence: 99%
  - [x] users.map callback (arrow, line 455)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 491)
    - Confidence: 99%
  - [x] setOneTime callback (arrow, line 491)
    - Confidence: 99%
  - [x] data?.customTasks.map callback (arrow, line 527)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 563)
    - Confidence: 99%
  - [x] taskPerformance.slice(0, 8).map callback (arrow, line 590)
    - Confidence: 99%
  - [x] data?.eventStats.slice(0, 12).map callback (arrow, line 624)
    - Confidence: 99%
  - [x] data?.recentTaskEvents.map callback (arrow, line 658)
    - Confidence: 99%

## [x] src/components/Admin/AssetUploader.tsx
- Confidence: 99%
- Functions detected: 46
- Functions:
  - [x] ratioToNumber (function, line 52)
    - Confidence: 99%
  - [x] classifyFile (function, line 58)
    - Confidence: 99%
  - [x] isCanvasImageType (function, line 64)
    - Confidence: 99%
  - [x] createInitialAssets (function, line 68)
    - Confidence: 99%
  - [x] initialAssets.map callback (arrow, line 70)
    - Confidence: 99%
  - [x] buildCroppedBlobPixels (function, line 96)
    - Confidence: 99%
  - [x] Promise callback (arrow, line 97)
    - Confidence: 99%
  - [x] image.onload (arrow, line 99)
    - Confidence: 99%
  - [x] canvas.toBlob callback (arrow, line 122)
    - Confidence: 99%
  - [x] image.onerror (arrow, line 131)
    - Confidence: 99%
  - [x] AssetUploader (function, line 136)
    - Confidence: 99%
  - [x] useState callback (arrow, line 150)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 156)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 159)
    - Confidence: 99%
  - [x] setAssets callback (arrow, line 160)
    - Confidence: 99%
  - [x] returned function (arrow, line 163)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 166)
    - Confidence: 99%
  - [x] assets       .filter callback (arrow, line 168)
    - Confidence: 99%
  - [x] assets       .filter((asset) => typeof asset.uploadUrl === "string" && asset.uploadUrl.length > 0)       .map callback (arrow, line 169)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 179)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 182)
    - Confidence: 99%
  - [x] setAssets callback (arrow, line 185)
    - Confidence: 99%
  - [x] current.map callback (arrow, line 185)
    - Confidence: 99%
  - [x] Promise callback (arrow, line 206)
    - Confidence: 99%
  - [x] uploadTask.on callback (arrow, line 207)
    - Confidence: 99%
  - [x] setAssets callback (arrow, line 215)
    - Confidence: 99%
  - [x] current.map callback (arrow, line 215)
    - Confidence: 99%
  - [x] setAssets callback (arrow, line 229)
    - Confidence: 99%
  - [x] current.map callback (arrow, line 229)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 233)
    - Confidence: 99%
  - [x] Array.from(selectedFiles).map callback (arrow, line 236)
    - Confidence: 99%
  - [x] incoming.forEach callback (arrow, line 251)
    - Confidence: 99%
  - [x] removeAsset (arrow, line 258)
    - Confidence: 99%
  - [x] setAssets callback (arrow, line 259)
    - Confidence: 99%
  - [x] current.filter callback (arrow, line 259)
    - Confidence: 99%
  - [x] persistCropAndUpload (arrow, line 262)
    - Confidence: 99%
  - [x] renderThumbnail (arrow, line 268)
    - Confidence: 99%
  - [x] RATIO_OPTIONS.map callback (arrow, line 294)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 298)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 315)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 328)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 340)
    - Confidence: 99%
  - [x] setAssets callback (arrow, line 341)
    - Confidence: 99%
  - [x] curr.map callback (arrow, line 341)
    - Confidence: 99%
  - [x] assets.map callback (arrow, line 362)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 369)
    - Confidence: 99%

## [x] src/components/Admin/BalanceAdjustmentModal.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] BalanceAdjustmentModal (function, line 19)
    - Confidence: 99%
  - [x] handleConfirm (arrow, line 27)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 94)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 104)
    - Confidence: 99%

## [x] src/components/Admin/CreateDropModal.tsx
- Confidence: 99%
- Functions detected: 22
- Functions:
  - [x] inferAssetTypeFromUrl (function, line 51)
    - Confidence: 99%
  - [x] summarizeMediaCounts (function, line 73)
    - Confidence: 99%
  - [x] assets.reduce callback (arrow, line 75)
    - Confidence: 99%
  - [x] FilesAndAssetsSection (function expression, line 104)
    - Confidence: 99%
  - [x] CreateDropModal (function, line 179)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 216)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 221)
    - Confidence: 99%
  - [x] fetchDrop (function, line 248)
    - Confidence: 99%
  - [x] existingContentUrls.map callback (arrow, line 282)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 302)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 307)
    - Confidence: 99%
  - [x] assets.map callback (arrow, line 309)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 325)
    - Confidence: 99%
  - [x] setUploadsOpen callback (arrow, line 326)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 329)
    - Confidence: 99%
  - [x] currentTags.filter callback (arrow, line 331)
    - Confidence: 99%
  - [x] onSubmit (arrow, line 336)
    - Confidence: 99%
  - [x] onError (arrow, line 402)
    - Confidence: 99%
  - [x] Object.values(errors)             .map callback (arrow, line 404)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 417)
    - Confidence: 99%
  - [x] AVAILABLE_TAGS.map callback (arrow, line 478)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 482)
    - Confidence: 99%

## [x] src/components/Admin/RecentTransactionsPanel.tsx
- Confidence: 99%
- Functions detected: 23
- Functions:
  - [x] resolveUserLabel (function, line 14)
    - Confidence: 99%
  - [x] RecentTransactionsPanel (function, line 30)
    - Confidence: 99%
  - [x] transactionsSource.map callback (arrow, line 38)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 43)
    - Confidence: 99%
  - [x] data.recentTransactions                 .filter callback (arrow, line 50)
    - Confidence: 99%
  - [x] data.recentTransactions                 .filter((tx) => typeof tx.username === "string" && tx.username.trim().length > 0)                 .map callback (arrow, line 51)
    - Confidence: 99%
  - [x] setUsernameMap callback (arrow, line 58)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 65)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 66)
    - Confidence: 99%
  - [x] returned function (arrow, line 70)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 73)
    - Confidence: 99%
  - [x] hydrateUsernames (arrow, line 76)
    - Confidence: 99%
  - [x] [...new Set(userIds)].filter callback (arrow, line 77)
    - Confidence: 99%
  - [x] uniqueUserIds.map callback (arrow, line 82)
    - Confidence: 99%
  - [x] setUsernameMap callback (arrow, line 99)
    - Confidence: 99%
  - [x] resolvedEntries.forEach callback (arrow, line 101)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 115)
    - Confidence: 99%
  - [x] snapshot.docs.flatMap callback (arrow, line 116)
    - Confidence: 99%
  - [x] snapshot.docs.flatMap((txDoc) => {                 try {                     return [normalizeTransactionRecord(txDoc.data(), txDoc.id)];                 } catch {                     return [];                 }             }).map callback (arrow, line 122)
    - Confidence: 99%
  - [x] normalizedTransactions.map callback (arrow, line 128)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 129)
    - Confidence: 99%
  - [x] returned function (arrow, line 133)
    - Confidence: 99%
  - [x] transactions.map callback (arrow, line 148)
    - Confidence: 99%

## [x] src/components/Admin/TopDropsPanel.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] TopDropsPanel (function, line 10)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 14)
    - Confidence: 99%
  - [x] topDrops.map callback (arrow, line 27)
    - Confidence: 99%

## [x] src/components/Admin/TransactionHistoryModal.tsx
- Confidence: 99%
- Functions detected: 6
- Functions:
  - [x] TransactionHistoryModal (function, line 16)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 20)
    - Confidence: 99%
  - [x] fetchHistory (arrow, line 23)
    - Confidence: 99%
  - [x] formatTxTime (arrow, line 45)
    - Confidence: 99%
  - [x] transactions.map callback (arrow, line 79)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 110)
    - Confidence: 99%

## [x] src/components/Analytics/DeepTracker.tsx
- Confidence: 99%
- Functions detected: 23
- Functions:
  - [x] quantizeCoordinate (function, line 47)
    - Confidence: 99%
  - [x] isSensitiveTarget (function, line 51)
    - Confidence: 99%
  - [x] getSafeTargetLabel (function, line 57)
    - Confidence: 99%
  - [x] getClientSessionId (function, line 72)
    - Confidence: 99%
  - [x] readTelemetryContext (function, line 85)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 88)
    - Confidence: 99%
  - [x] DeepTracker (function, line 105)
    - Confidence: 99%
  - [x] useState callback (arrow, line 107)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 117)
    - Confidence: 99%
  - [x] subscribeToPrivacySettings callback (arrow, line 118)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 123)
    - Confidence: 99%
  - [x] flushQueue (arrow, line 151)
    - Confidence: 99%
  - [x] pushEvent (arrow, line 197)
    - Confidence: 99%
  - [x] emitPageSummary (arrow, line 212)
    - Confidence: 99%
  - [x] handleClick (arrow, line 280)
    - Confidence: 99%
  - [x] handleScroll (arrow, line 316)
    - Confidence: 99%
  - [x] throttledScroll (arrow, line 339)
    - Confidence: 99%
  - [x] handleMouseOver (arrow, line 347)
    - Confidence: 99%
  - [x] handleMouseOut (arrow, line 371)
    - Confidence: 99%
  - [x] handleVisibilityChange (arrow, line 405)
    - Confidence: 99%
  - [x] handlePageHide (arrow, line 428)
    - Confidence: 99%
  - [x] returned function (arrow, line 441)
    - Confidence: 99%

## [x] src/components/Auth/AuthModal.tsx
- Confidence: 99%
- Functions detected: 22
- Functions:
  - [x] AuthModal (function, line 36)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 49)
    - Confidence: 99%
  - [x] returned function (arrow, line 60)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 66)
    - Confidence: 99%
  - [x] z.string().refine callback (arrow, line 79)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 99)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 122)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 130)
    - Confidence: 99%
  - [x] returned function (arrow, line 153)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 156)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 172)
    - Confidence: 99%
  - [x] returned function (arrow, line 194)
    - Confidence: 99%
  - [x] switchMode (arrow, line 197)
    - Confidence: 99%
  - [x] handleGoogleSignIn (arrow, line 210)
    - Confidence: 99%
  - [x] onSubmit (arrow, line 229)
    - Confidence: 99%
  - [x] handlePasswordReset (arrow, line 283)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 398)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 437)
    - Confidence: 99%
  - [x] onChange (arrow, line 454)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 527)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 565)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 575)
    - Confidence: 99%

## [x] src/components/Auth/GuestComponentBlur.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] GuestComponentBlur (function, line 16)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 51)
    - Confidence: 99%

## [x] src/components/Auth/GuidedOnboarding.tsx
- Confidence: 99%
- Functions detected: 28
- Functions:
  - [x] normalizeTimestamp (function, line 115)
    - Confidence: 99%
  - [x] hasClaimedToday (function, line 124)
    - Confidence: 99%
  - [x] GuidedOnboarding (function, line 134)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 152)
    - Confidence: 99%
  - [x] returned function (arrow, line 162)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 168)
    - Confidence: 99%
  - [x] hydrateLegacyCompletion (arrow, line 184)
    - Confidence: 99%
  - [x] setDoc(doc(db, "users", user.uid), { onboardingCompleted: true }, { merge: true }).catch callback (arrow, line 198)
    - Confidence: 99%
  - [x] returned function (arrow, line 239)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 244)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 280)
    - Confidence: 99%
  - [x] goToNextStep (arrow, line 287)
    - Confidence: 99%
  - [x] setCurrentStep callback (arrow, line 288)
    - Confidence: 99%
  - [x] buildStepMetric (arrow, line 294)
    - Confidence: 99%
  - [x] commitStepMetric (arrow, line 314)
    - Confidence: 99%
  - [x] completeCurrentStep (arrow, line 334)
    - Confidence: 99%
  - [x] completeStepAndAdvance (arrow, line 339)
    - Confidence: 99%
  - [x] handleCheckInAndContinue (arrow, line 344)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 357)
    - Confidence: 99%
  - [x] handleEnableNotifications (arrow, line 375)
    - Confidence: 99%
  - [x] completeOnboarding (arrow, line 406)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 433)
    - Confidence: 99%
  - [x] FLAVOR_OPTIONS.map callback (arrow, line 512)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 520)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 541)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 590)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 612)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 648)
    - Confidence: 99%

## [x] src/components/ClientDiagnosticsBridge.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] ClientDiagnosticsBridge (function, line 12)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 16)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 21)
    - Confidence: 99%

## [x] src/components/CookieBanner.tsx
- Confidence: 99%
- Functions detected: 12
- Functions:
  - [x] CookieBanner (function, line 8)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 24)
    - Confidence: 99%
  - [x] syncViewport (arrow, line 25)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 30)
    - Confidence: 99%
  - [x] returned function (arrow, line 35)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 46)
    - Confidence: 99%
  - [x] returned function (arrow, line 54)
    - Confidence: 99%
  - [x] handleConsent (arrow, line 61)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 102)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 110)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 137)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 145)
    - Confidence: 99%

## [x] src/components/CoreLayoutWrapper.tsx
- Confidence: 99%
- Functions detected: 33
- Functions:
  - [x] dynamic callback (arrow, line 16)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 17)
    - Confidence: 99%
  - [x] import("@/components/Navbar").then callback (arrow, line 17)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 18)
    - Confidence: 99%
  - [x] import("@/components/GlobalPurchaseModal").then callback (arrow, line 18)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 19)
    - Confidence: 99%
  - [x] import("@/components/GlobalAuthModal").then callback (arrow, line 19)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 20)
    - Confidence: 99%
  - [x] import("@/components/Auth/GuidedOnboarding").then callback (arrow, line 20)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 21)
    - Confidence: 99%
  - [x] import("@/components/Debug/DebugBreakpoints").then callback (arrow, line 21)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 22)
    - Confidence: 99%
  - [x] import("@/components/InsufficientBalanceModal").then callback (arrow, line 22)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 23)
    - Confidence: 99%
  - [x] import("@/components/Navigation/ScrollToTop").then callback (arrow, line 23)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 24)
    - Confidence: 99%
  - [x] import("@/components/Navigation/AutoScrollToTop").then callback (arrow, line 24)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 25)
    - Confidence: 99%
  - [x] import("@/components/Analytics/DeepTracker").then callback (arrow, line 25)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 26)
    - Confidence: 99%
  - [x] import("@/components/PwaRuntimeBridge").then callback (arrow, line 26)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 28)
    - Confidence: 99%
  - [x] import("@/components/Notifications/NotificationRuntimeBridge").then callback (arrow, line 28)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 32)
    - Confidence: 99%
  - [x] import("@/components/Dashboard/TaskGuidanceBanner").then callback (arrow, line 32)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 36)
    - Confidence: 99%
  - [x] import("@/components/ClientDiagnosticsBridge").then callback (arrow, line 36)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 40)
    - Confidence: 99%
  - [x] import("@/components/Feedback/GlobalBugReportTrigger").then callback (arrow, line 40)
    - Confidence: 99%
  - [x] CoreLayoutWrapper (function, line 44)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 68)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 86)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 106)
    - Confidence: 99%

## [x] src/components/Dashboard/CollectionList.tsx
- Confidence: 99%
- Functions detected: 14
- Functions:
  - [x] getRatio (function, line 15)
    - Confidence: 99%
  - [x] getItemSpanClass (function, line 23)
    - Confidence: 99%
  - [x] CollectionList (function, line 36)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 40)
    - Confidence: 99%
  - [x] drops.map callback (arrow, line 44)
    - Confidence: 99%
  - [x] resolvedDrops.filter callback (arrow, line 48)
    - Confidence: 99%
  - [x] visible.filter callback (arrow, line 49)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 55)
    - Confidence: 99%
  - [x] visibleDrops.filter callback (arrow, line 56)
    - Confidence: 99%
  - [x] visibleDrops.filter callback (arrow, line 57)
    - Confidence: 99%
  - [x] (["all", "owned", "locked"] as const).map callback (arrow, line 80)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 83)
    - Confidence: 99%
  - [x] filteredDrops.map callback (arrow, line 97)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 104)
    - Confidence: 99%

## [x] src/components/Dashboard/DailyCheckIn.tsx
- Confidence: 99%
- Functions detected: 18
- Functions:
  - [x] formatCountdown (function, line 17)
    - Confidence: 99%
  - [x] [hours, minutes, seconds].map callback (arrow, line 23)
    - Confidence: 99%
  - [x] emitGuidedCheckIn (function, line 26)
    - Confidence: 99%
  - [x] DailyCheckIn (function, line 36)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 44)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 46)
    - Confidence: 99%
  - [x] returned function (arrow, line 50)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 60)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 62)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 68)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 73)
    - Confidence: 99%
  - [x] handleClaim (arrow, line 86)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 97)
    - Confidence: 99%
  - [x] setUserProfile callback (arrow, line 125)
    - Confidence: 99%
  - [x] import("canvas-confetti").then callback (arrow, line 144)
    - Confidence: 99%
  - [x] frame (function expression, line 149)
    - Confidence: 99%
  - [x] import("canvas-confetti").then((confettiModule) => {                 const launchConfetti = confettiModule.default;                 const end = Date.now() + 1000;                 const colors = ["#ec4899", "#facc15"];                  (function frame() {                     launchConfetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });                     launchConfetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });                     if (Date.now() < end) {                         requestAnimationFrame(frame);                     }                 }());             }).catch callback (arrow, line 156)
    - Confidence: 99%
  - [x] DAILY_CHECK_IN_REWARD_LADDER.map callback (arrow, line 209)
    - Confidence: 99%

## [x] src/components/Dashboard/DailyTasksModule.tsx
- Confidence: 99%
- Functions detected: 52
- Functions:
  - [x] formatCountdown (function, line 75)
    - Confidence: 99%
  - [x] [hours, minutes, seconds].map callback (arrow, line 81)
    - Confidence: 99%
  - [x] DailyTasksModule (function, line 84)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 101)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 105)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 113)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 114)
    - Confidence: 99%
  - [x] returned function (arrow, line 118)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 121)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 126)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 128)
    - Confidence: 99%
  - [x] activeTasks.filter callback (arrow, line 128)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 131)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 137)
    - Confidence: 99%
  - [x] setExpandedTaskIds callback (arrow, line 138)
    - Confidence: 99%
  - [x] current.filter callback (arrow, line 139)
    - Confidence: 99%
  - [x] activeTasks.some callback (arrow, line 139)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 143)
    - Confidence: 99%
  - [x] setUserProfile callback (arrow, line 157)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 167)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 189)
    - Confidence: 99%
  - [x] rotateTasksOnMount (function, line 204)
    - Confidence: 99%
  - [x] returned function (arrow, line 216)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 221)
    - Confidence: 99%
  - [x] rotateTasksAfterDeadline (function, line 227)
    - Confidence: 99%
  - [x] returned function (arrow, line 242)
    - Confidence: 99%
  - [x] toggleTaskExpanded (arrow, line 247)
    - Confidence: 99%
  - [x] setExpandedTaskIds callback (arrow, line 248)
    - Confidence: 99%
  - [x] current.filter callback (arrow, line 250)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 255)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 268)
    - Confidence: 99%
  - [x] runPendingAction (arrow, line 275)
    - Confidence: 99%
  - [x] onOpenFeedback (arrow, line 294)
    - Confidence: 99%
  - [x] handleRuntimeAction (arrow, line 306)
    - Confidence: 99%
  - [x] returned function (arrow, line 314)
    - Confidence: 99%
  - [x] handleTaskAction (arrow, line 320)
    - Confidence: 99%
  - [x] onOpenFeedback (arrow, line 335)
    - Confidence: 99%
  - [x] submitFeedback (arrow, line 381)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 399)
    - Confidence: 99%
  - [x] FEEDBACK_CATEGORY_OPTIONS.map callback (arrow, line 440)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 444)
    - Confidence: 99%
  - [x] [1, 2, 3, 4, 5].map callback (arrow, line 461)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 465)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 483)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 493)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 551)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 564)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 596)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 609)
    - Confidence: 99%
  - [x] activeTasks.map callback (arrow, line 630)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 656)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 741)
    - Confidence: 99%

## [x] src/components/Dashboard/LiveDropsForYouCarousel.tsx
- Confidence: 99%
- Functions detected: 8
- Functions:
  - [x] LiveDropsForYouCarousel (function, line 14)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 19)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 20)
    - Confidence: 99%
  - [x] returned function (arrow, line 24)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 28)
    - Confidence: 99%
  - [x] drops         .filter callback (arrow, line 30)
    - Confidence: 99%
  - [x] activeDrops.map callback (arrow, line 68)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 72)
    - Confidence: 99%

## [x] src/components/Dashboard/NotificationPromptBanner.tsx
- Confidence: 99%
- Functions detected: 11
- Functions:
  - [x] getDismissKey (function, line 12)
    - Confidence: 99%
  - [x] NotificationPromptBanner (function, line 16)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 23)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 34)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 43)
    - Confidence: 99%
  - [x] evaluateBanner (function, line 51)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 68)
    - Confidence: 99%
  - [x] returned function (arrow, line 80)
    - Confidence: 99%
  - [x] handleEnable (arrow, line 85)
    - Confidence: 99%
  - [x] handleDismiss (arrow, line 125)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 165)
    - Confidence: 99%

## [x] src/components/Dashboard/OwnedDropGalleryCard.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] OwnedDropGalleryCard (function, line 16)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 20)
    - Confidence: 99%

## [x] src/components/Dashboard/RecentActivityFeed.tsx
- Confidence: 99%
- Functions detected: 29
- Functions:
  - [x] renderTransactionLabel (function, line 57)
    - Confidence: 99%
  - [x] renderTaskEventLabel (function, line 80)
    - Confidence: 99%
  - [x] RecentActivityFeed (function, line 92)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 108)
    - Confidence: 99%
  - [x] fetchActivity (function, line 124)
    - Confidence: 99%
  - [x] subscribeToUserRuntime (arrow, line 191)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 204)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 218)
    - Confidence: 99%
  - [x] refreshRecentActivity (arrow, line 233)
    - Confidence: 99%
  - [x] handleVisibilityChange (arrow, line 239)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 247)
    - Confidence: 99%
  - [x] returned function (arrow, line 256)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 268)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 274)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 311)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 318)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 322)
    - Confidence: 99%
  - [x] historyActivities.filter callback (arrow, line 328)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 342)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 348)
    - Confidence: 99%
  - [x] renderActivityItem (function, line 353)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 421)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 449)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 462)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 487)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 517)
    - Confidence: 99%
  - [x] setCurrentPage callback (arrow, line 517)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 529)
    - Confidence: 99%
  - [x] setCurrentPage callback (arrow, line 529)
    - Confidence: 99%

## [x] src/components/Dashboard/TaskGuidanceBanner.tsx
- Confidence: 99%
- Functions detected: 20
- Functions:
  - [x] readStoredGuidance (function, line 30)
    - Confidence: 99%
  - [x] writeStoredGuidance (function, line 65)
    - Confidence: 99%
  - [x] TaskGuidanceBanner (function, line 78)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 87)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 91)
    - Confidence: 99%
  - [x] handleGuidanceEvent (function, line 92)
    - Confidence: 99%
  - [x] returned function (arrow, line 112)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 115)
    - Confidence: 99%
  - [x] userProfile?.dailyTasksState?.tasks?.find callback (arrow, line 132)
    - Confidence: 99%
  - [x] import("canvas-confetti").then callback (arrow, line 159)
    - Confidence: 99%
  - [x] frame (function expression, line 164)
    - Confidence: 99%
  - [x] import("canvas-confetti").then((confettiModule) => {       const launchConfetti = confettiModule.default;       const end = Date.now() + 900;       const colors = ["#ec4899", "#facc15", "#ffffff"];        (function frame() {         launchConfetti({           particleCount: 2,           angle: 70,           spread: 45,           origin: { x: 0.25, y: 0.15 },           colors,         });         launchConfetti({           particleCount: 2,           angle: 110,           spread: 45,           origin: { x: 0.75, y: 0.15 },           colors,         });         if (Date.now() < end) {           requestAnimationFrame(frame);         }       }());     }).catch callback (arrow, line 183)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 185)
    - Confidence: 99%
  - [x] returned function (arrow, line 189)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 192)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 205)
    - Confidence: 99%
  - [x] dismissBanner (arrow, line 213)
    - Confidence: 99%
  - [x] handleAction (arrow, line 232)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 324)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 327)
    - Confidence: 99%

## [x] src/components/Debug/DebugBreakpoints.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] DebugBreakpoints (function, line 5)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 8)
    - Confidence: 99%
  - [x] handleResize (function, line 11)
    - Confidence: 99%
  - [x] returned function (arrow, line 20)
    - Confidence: 99%

## [x] src/components/DropCard.tsx
- Confidence: 99%
- Functions detected: 29
- Functions:
  - [x] DropCardBadge (arrow, line 47)
    - Confidence: 99%
  - [x] FileCountChip (arrow, line 68)
    - Confidence: 99%
  - [x] DropCardTimer (function, line 92)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 97)
    - Confidence: 99%
  - [x] updateTimer (arrow, line 98)
    - Confidence: 99%
  - [x] pad (arrow, line 126)
    - Confidence: 99%
  - [x] returned function (arrow, line 132)
    - Confidence: 99%
  - [x] DropCardBase (function, line 148)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 168)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 171)
    - Confidence: 99%
  - [x] returned function (arrow, line 173)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 176)
    - Confidence: 99%
  - [x] flushImpression (arrow, line 189)
    - Confidence: 99%
  - [x] IntersectionObserver callback (arrow, line 223)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 235)
    - Confidence: 99%
  - [x] returned function (arrow, line 248)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 260)
    - Confidence: 99%
  - [x] (drop.tags || []).filter callback (arrow, line 261)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 264)
    - Confidence: 99%
  - [x] triggerHaptic (arrow, line 278)
    - Confidence: 99%
  - [x] handlePreviewOpen (arrow, line 284)
    - Confidence: 99%
  - [x] fetch(`/api/drops/${drop.id}/click`, { method: "POST" }).catch callback (arrow, line 291)
    - Confidence: 99%
  - [x] handleUnlock (arrow, line 295)
    - Confidence: 99%
  - [x] setUserProfile callback (arrow, line 346)
    - Confidence: 99%
  - [x] onTaste (arrow, line 369)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 440)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 451)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 490)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 504)
    - Confidence: 99%

## [x] src/components/DropGrid.tsx
- Confidence: 99%
- Functions detected: 11
- Functions:
  - [x] DropGrid (function, line 23)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 35)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 37)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 39)
    - Confidence: 99%
  - [x] returned function (arrow, line 40)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 45)
    - Confidence: 99%
  - [x] drops.map callback (arrow, line 46)
    - Confidence: 99%
  - [x] getGridSpanClass (arrow, line 53)
    - Confidence: 99%
  - [x] Array.from({ length: 8 }).map callback (arrow, line 68)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 105)
    - Confidence: 99%
  - [x] dropEntries.map callback (arrow, line 126)
    - Confidence: 99%

## [x] src/components/DropPreviewModal.tsx
- Confidence: 99%
- Functions detected: 22
- Functions:
  - [x] getTimerLabel (function, line 33)
    - Confidence: 99%
  - [x] DropPreviewModal (function, line 50)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 58)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 61)
    - Confidence: 99%
  - [x] returned function (arrow, line 63)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 66)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 67)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 68)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 69)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 72)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 78)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 90)
    - Confidence: 99%
  - [x] triggerHaptic (arrow, line 100)
    - Confidence: 99%
  - [x] handleUnwrap (arrow, line 106)
    - Confidence: 99%
  - [x] setUserProfile callback (arrow, line 176)
    - Confidence: 99%
  - [x] onTaste (arrow, line 200)
    - Confidence: 99%
  - [x] handleShare (arrow, line 213)
    - Confidence: 99%
  - [x] navigator.clipboard.writeText(url)       .then callback (arrow, line 217)
    - Confidence: 99%
  - [x] navigator.clipboard.writeText(url)       .then(() => {         toast.success("Link copied to clipboard!");         trackEvent("drop_share_copied", {           drop_id: drop.id,           drop_category: drop.type,           share_url: url,         });       })       .catch callback (arrow, line 225)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 229)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 275)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 299)
    - Confidence: 99%

## [x] src/components/ErrorBoundary.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] getDerivedStateFromError (method, line 25)
    - Confidence: 99%
  - [x] componentDidCatch (method, line 29)
    - Confidence: 99%
  - [x] render (method, line 38)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 61)
    - Confidence: 99%

## [x] src/components/FeaturedCarousel.tsx
- Confidence: 99%
- Functions detected: 27
- Functions:
  - [x] FeaturedCarousel (function, line 23)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 29)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 31)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 36)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 43)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 46)
    - Confidence: 99%
  - [x] returned function (arrow, line 50)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 57)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 64)
    - Confidence: 99%
  - [x] featuredDrops.map callback (arrow, line 94)
    - Confidence: 99%
  - [x] urls.forEach callback (arrow, line 105)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 119)
    - Confidence: 99%
  - [x] featuredDrops.map callback (arrow, line 191)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 194)
    - Confidence: 99%
  - [x] TimerWithProgress (function, line 208)
    - Confidence: 99%
  - [x] LifetimeProgressBar (function, line 227)
    - Confidence: 99%
  - [x] ActivityTicker (function, line 241)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 245)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 250)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 253)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 256)
    - Confidence: 99%
  - [x] returned function (arrow, line 260)
    - Confidence: 99%
  - [x] useDropTiming (function, line 272)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 277)
    - Confidence: 99%
  - [x] updateTiming (arrow, line 278)
    - Confidence: 99%
  - [x] pad (arrow, line 311)
    - Confidence: 99%
  - [x] returned function (arrow, line 318)
    - Confidence: 99%

## [x] src/components/Feedback/GlobalBugReportTrigger.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] GlobalBugReportTrigger (function, line 10)
    - Confidence: 99%
  - [x] HIDDEN_PATH_PREFIXES.some callback (arrow, line 14)
    - Confidence: 99%

## [x] src/components/Feedback/ReportBugButton.tsx
- Confidence: 99%
- Functions detected: 23
- Functions:
  - [x] ReportBugButton (function, line 34)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 54)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 59)
    - Confidence: 99%
  - [x] assignments.map callback (arrow, line 59)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 69)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 75)
    - Confidence: 99%
  - [x] returned function (arrow, line 88)
    - Confidence: 99%
  - [x] openComposer (arrow, line 95)
    - Confidence: 99%
  - [x] closeComposer (arrow, line 110)
    - Confidence: 99%
  - [x] submitBugReport (arrow, line 122)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 149)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 207)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 215)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 235)
    - Confidence: 99%
  - [x] BUG_REPORT_ISSUE_OPTIONS.map callback (arrow, line 260)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 264)
    - Confidence: 99%
  - [x] ([                       { value: "low", label: "Low" },                       { value: "medium", label: "Medium" },                       { value: "high", label: "High" },                     ] as const).map callback (arrow, line 290)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 294)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 314)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 324)
    - Confidence: 99%
  - [x] setShowAutoContext callback (arrow, line 324)
    - Confidence: 99%
  - [x] snapshotPreview.rolloutAssignments.map callback (arrow, line 365)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 384)
    - Confidence: 99%

## [x] src/components/GlobalAuthModal.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] dynamic callback (arrow, line 8)
    - Confidence: 99%
  - [x] import("@/components/Auth/AuthModal").then callback (arrow, line 8)
    - Confidence: 99%
  - [x] GlobalAuthModal (function, line 12)
    - Confidence: 99%

## [x] src/components/GlobalPurchaseModal.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] dynamic callback (arrow, line 7)
    - Confidence: 99%
  - [x] import("@/components/PurchaseModal").then callback (arrow, line 7)
    - Confidence: 99%
  - [x] loading (arrow, line 10)
    - Confidence: 99%
  - [x] GlobalPurchaseModal (function, line 14)
    - Confidence: 99%

## [x] src/components/Hero.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] Hero (function, line 17)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 58)
    - Confidence: 99%
  - [x] ActivityTicker (function, line 90)
    - Confidence: 99%

## [x] src/components/HomeDropTicker.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] HomeDropTicker (function, line 11)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 12)
    - Confidence: 99%
  - [x] renderTrack (arrow, line 15)
    - Confidence: 99%
  - [x] [...tickerDrops, ...tickerDrops].map callback (arrow, line 17)
    - Confidence: 99%

## [x] src/components/InsufficientBalanceModal.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] InsufficientBalanceModal (function, line 12)
    - Confidence: 99%
  - [x] handleGetMore (arrow, line 30)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 85)
    - Confidence: 99%

## [x] src/components/KandyDropsAccountOverview.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] KandyDropsAccountOverview (function, line 20)
    - Confidence: 99%

## [x] src/components/Landing/HomeActiveDropsCarousel.tsx
- Confidence: 99%
- Functions detected: 10
- Functions:
  - [x] HomeActiveDropsCarousel (function, line 20)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 24)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 29)
    - Confidence: 99%
  - [x] syncSelected (arrow, line 34)
    - Confidence: 99%
  - [x] returned function (arrow, line 42)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 48)
    - Confidence: 99%
  - [x] activeDrops.map callback (arrow, line 67)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 77)
    - Confidence: 99%
  - [x] activeDrops.map callback (arrow, line 135)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 139)
    - Confidence: 99%

## [x] src/components/Landing/HowItWorks.tsx
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] HowItWorks (function, line 16)
    - Confidence: 99%
  - [x] handleLandingCta (arrow, line 21)
    - Confidence: 99%
  - [x] features.map callback (arrow, line 61)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 78)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 98)
    - Confidence: 99%

## [x] src/components/Legal/LegalBackLink.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] LegalBackLink (function, line 17)
    - Confidence: 99%

## [x] src/components/Navbar.tsx
- Confidence: 99%
- Functions detected: 14
- Functions:
  - [x] dynamic callback (arrow, line 14)
    - Confidence: 99%
  - [x] import("@/components/Navigation/ProfileDropdown").then callback (arrow, line 14)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 17)
    - Confidence: 99%
  - [x] import("@/components/Navigation/ProfileSidebar").then callback (arrow, line 17)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 20)
    - Confidence: 99%
  - [x] import("@/components/Navigation/AdminDropdown").then callback (arrow, line 20)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 23)
    - Confidence: 99%
  - [x] import("@/components/Navigation/NotificationBell").then callback (arrow, line 23)
    - Confidence: 99%
  - [x] dynamic callback (arrow, line 26)
    - Confidence: 99%
  - [x] import("@/components/Navigation/AnimateBalance").then callback (arrow, line 26)
    - Confidence: 99%
  - [x] Navbar (function, line 29)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 58)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 82)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 115)
    - Confidence: 99%

## [x] src/components/Navigation/AdminDropdown.tsx
- Confidence: 99%
- Functions detected: 8
- Functions:
  - [x] AdminDropdown (function, line 10)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 19)
    - Confidence: 99%
  - [x] handleClickOutside (function, line 20)
    - Confidence: 99%
  - [x] returned function (arrow, line 26)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 43)
    - Confidence: 99%
  - [x] navItems.map callback (arrow, line 70)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 74)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 85)
    - Confidence: 99%

## [x] src/components/Navigation/AnimateBalance.tsx
- Confidence: 99%
- Functions detected: 7
- Functions:
  - [x] AnimateBalance (function, line 11)
    - Confidence: 99%
  - [x] useTransform callback (arrow, line 24)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 26)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 38)
    - Confidence: 99%
  - [x] returned function (arrow, line 39)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 44)
    - Confidence: 99%
  - [x] returned function (arrow, line 45)
    - Confidence: 99%

## [x] src/components/Navigation/AutoScrollToTop.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] AutoScrollToTop (function, line 6)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 9)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 15)
    - Confidence: 99%
  - [x] returned function (arrow, line 19)
    - Confidence: 99%

## [x] src/components/Navigation/MobileBottomBar.tsx
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] triggerHaptic (function, line 18)
    - Confidence: 99%
  - [x] MobileBottomBar (function, line 24)
    - Confidence: 99%
  - [x] NAV_ITEMS.map callback (arrow, line 42)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 59)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 76)
    - Confidence: 99%

## [x] src/components/Navigation/NotificationBell.tsx
- Confidence: 99%
- Functions detected: 22
- Functions:
  - [x] getTypePill (function, line 40)
    - Confidence: 99%
  - [x] NotificationThumbnail (function, line 69)
    - Confidence: 99%
  - [x] NotificationItem (function, line 98)
    - Confidence: 99%
  - [x] openDrop (arrow, line 113)
    - Confidence: 99%
  - [x] handleMarkAsRead (arrow, line 134)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 166)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 193)
    - Confidence: 99%
  - [x] setIsExpanded callback (arrow, line 193)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 203)
    - Confidence: 99%
  - [x] NotificationBell (function, line 224)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 231)
    - Confidence: 99%
  - [x] handleClickOutside (function, line 232)
    - Confidence: 99%
  - [x] returned function (arrow, line 239)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 242)
    - Confidence: 99%
  - [x] handleOpenRequest (function, line 243)
    - Confidence: 99%
  - [x] returned function (arrow, line 252)
    - Confidence: 99%
  - [x] toggleDropdown (arrow, line 255)
    - Confidence: 99%
  - [x] setIsOpen callback (arrow, line 256)
    - Confidence: 99%
  - [x] handleMarkAllAsRead (arrow, line 268)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 318)
    - Confidence: 99%
  - [x] notifications.map callback (arrow, line 343)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 348)
    - Confidence: 99%

## [x] src/components/Navigation/ProfileDropdown.tsx
- Confidence: 99%
- Functions detected: 11
- Functions:
  - [x] ProfileDropdown (function, line 10)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 19)
    - Confidence: 99%
  - [x] handleClickOutside (function, line 20)
    - Confidence: 99%
  - [x] returned function (arrow, line 26)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 34)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 72)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 78)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 79)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 80)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 85)
    - Confidence: 99%
  - [x] DropdownItem (function, line 101)
    - Confidence: 99%

## [x] src/components/Navigation/ProfileSidebar.tsx
- Confidence: 99%
- Functions detected: 7
- Functions:
  - [x] ProfileSidebar (function, line 23)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 30)
    - Confidence: 99%
  - [x] returned function (arrow, line 32)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 78)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 106)
    - Confidence: 99%
  - [x] SidebarItem (function, line 130)
    - Confidence: 99%
  - [x] handleClick (arrow, line 131)
    - Confidence: 99%

## [x] src/components/Navigation/ScrollToTop.tsx
- Confidence: 99%
- Functions detected: 5
- Functions:
  - [x] ScrollToTop (function, line 8)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 11)
    - Confidence: 99%
  - [x] toggleVisibility (arrow, line 12)
    - Confidence: 99%
  - [x] returned function (arrow, line 21)
    - Confidence: 99%
  - [x] scrollToTop (arrow, line 24)
    - Confidence: 99%

## [x] src/components/Notifications/NotificationRuntimeBridge.tsx
- Confidence: 99%
- Functions detected: 16
- Functions:
  - [x] NotificationRuntimeBridge (function, line 16)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 21)
    - Confidence: 99%
  - [x] onNotificationMessage callback (arrow, line 26)
    - Confidence: 99%
  - [x] returned function (arrow, line 37)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 42)
    - Confidence: 99%
  - [x] tasks.filter callback (arrow, line 48)
    - Confidence: 99%
  - [x] syncReminder (arrow, line 63)
    - Confidence: 99%
  - [x] authFetch("/api/tasks/reminders/sync", { method: "POST" })                 .then callback (arrow, line 70)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 75)
    - Confidence: 99%
  - [x] authFetch("/api/tasks/reminders/sync", { method: "POST" })                 .then(async (response) => {                     if (!response.ok) {                         throw new Error("Reminder sync failed");                     }                      const payload = await response.json().catch(() => ({}));                     return payload?.sent === true;                 })                 .catch callback (arrow, line 78)
    - Confidence: 99%
  - [x] triggerReminder (arrow, line 85)
    - Confidence: 99%
  - [x] syncIfVisible (arrow, line 117)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 126)
    - Confidence: 99%
  - [x] returned function (arrow, line 131)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 138)
    - Confidence: 99%
  - [x] returned function (arrow, line 142)
    - Confidence: 99%

## [x] src/components/PayPalProvider.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] PayPalProvider (function, line 21)
    - Confidence: 99%

## [x] src/components/PromoCard.tsx
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] PromoCard (function, line 12)
    - Confidence: 99%
  - [x] handleClick (arrow, line 13)
    - Confidence: 99%
  - [x] request.catch callback (arrow, line 28)
    - Confidence: 99%

## [x] src/components/PurchaseModal.tsx
- Confidence: 99%
- Functions detected: 32
- Functions:
  - [x] FIXED_GUMDROP_PACKAGES.map callback (arrow, line 30)
    - Confidence: 99%
  - [x] PurchaseModal (function, line 40)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 59)
    - Confidence: 99%
  - [x] returned function (arrow, line 61)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 66)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 74)
    - Confidence: 99%
  - [x] requestAnimationFrame callback (arrow, line 80)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 85)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 87)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 92)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 115)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 135)
    - Confidence: 99%
  - [x] setCustomDrops callback (arrow, line 136)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 143)
    - Confidence: 99%
  - [x] PACKAGES.find callback (arrow, line 145)
    - Confidence: 99%
  - [x] PACKAGES.find callback (arrow, line 159)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 162)
    - Confidence: 99%
  - [x] handleApprove (arrow, line 174)
    - Confidence: 99%
  - [x] import("canvas-confetti")         .then callback (arrow, line 197)
    - Confidence: 99%
  - [x] import("canvas-confetti")         .then((mod) => mod.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } }))         .catch callback (arrow, line 198)
    - Confidence: 99%
  - [x] setUserProfile callback (arrow, line 202)
    - Confidence: 99%
  - [x] PACKAGES.map callback (arrow, line 286)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 292)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 326)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 329)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 355)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 374)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 408)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 433)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 436)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 468)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 474)
    - Confidence: 99%

## [x] src/components/PwaRuntimeBridge.tsx
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] PwaRuntimeBridge (function, line 7)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 8)
    - Confidence: 99%

## [x] src/components/StickyFilterBar.tsx
- Confidence: 99%
- Functions detected: 14
- Functions:
  - [x] StickyFilterBar (function, line 17)
    - Confidence: 99%
  - [x] triggerHaptic (arrow, line 28)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 35)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 40)
    - Confidence: 99%
  - [x] setTimeout callback (arrow, line 41)
    - Confidence: 99%
  - [x] returned function (arrow, line 47)
    - Confidence: 99%
  - [x] handleSearchChange (arrow, line 50)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 54)
    - Confidence: 99%
  - [x] handleScroll (arrow, line 57)
    - Confidence: 99%
  - [x] requestAnimationFrame callback (arrow, line 60)
    - Confidence: 99%
  - [x] returned function (arrow, line 71)
    - Confidence: 99%
  - [x] categories.map callback (arrow, line 111)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 118)
    - Confidence: 99%
  - [x] GridIcon (function, line 154)
    - Confidence: 99%

## [x] src/components/Toasts/UnwrapSuccessToast.tsx
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] showUnwrapSuccessToast (function, line 12)
    - Confidence: 99%
  - [x] toast.custom callback (arrow, line 13)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 35)
    - Confidence: 99%
  - [x] <anonymous arrow> (arrow, line 46)
    - Confidence: 99%

## [x] src/components/ui/Button.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] React.forwardRef callback (arrow, line 14)
    - Confidence: 99%

## [x] src/components/ui/Icon.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] CandyIcon (function, line 9)
    - Confidence: 99%

## [x] src/context/AuthContext.tsx
- Confidence: 99%
- Functions detected: 29
- Functions:
  - [x] ensureAuthPersistence (function, line 53)
    - Confidence: 99%
  - [x] setPersistence(auth, browserLocalPersistence).catch callback (arrow, line 55)
    - Confidence: 99%
  - [x] AuthProvider (function, line 66)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 76)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 80)
    - Confidence: 99%
  - [x] ensureAuthPersistence().catch callback (arrow, line 81)
    - Confidence: 99%
  - [x] onAuthStateChanged callback (arrow, line 83)
    - Confidence: 99%
  - [x] returned function (arrow, line 101)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 104)
    - Confidence: 99%
  - [x] fetch("/api/auth/navigation-session", {                 method: "DELETE",                 keepalive: true,             }).catch callback (arrow, line 111)
    - Confidence: 99%
  - [x] setupProfileListener (arrow, line 121)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 127)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 175)
    - Confidence: 99%
  - [x] returned function (arrow, line 182)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 188)
    - Confidence: 99%
  - [x] authFetch("/api/auth/navigation-session", {                 method: "POST",             }).catch callback (arrow, line 205)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 211)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 217)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 236)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 251)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 283)
    - Confidence: 99%
  - [x] fetch("/api/auth/navigation-session", {             method: "DELETE",             keepalive: true,         }).catch callback (arrow, line 294)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 300)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 311)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 320)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 327)
    - Confidence: 99%
  - [x] useAuthIdentity (arrow, line 346)
    - Confidence: 99%
  - [x] useUserProfile (arrow, line 352)
    - Confidence: 99%
  - [x] useAuth (arrow, line 358)
    - Confidence: 99%

## [x] src/context/RolloutContext.tsx
- Confidence: 99%
- Functions detected: 17
- Functions:
  - [x] readExposureKeys (function, line 22)
    - Confidence: 99%
  - [x] writeExposureKeys (function, line 40)
    - Confidence: 99%
  - [x] RolloutProvider (function, line 52)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 57)
    - Confidence: 99%
  - [x] window.requestAnimationFrame callback (arrow, line 58)
    - Confidence: 99%
  - [x] returned function (arrow, line 65)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 69)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 78)
    - Confidence: 99%
  - [x] assignments.forEach callback (arrow, line 86)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 118)
    - Confidence: 99%
  - [x] getVariant (arrow, line 120)
    - Confidence: 99%
  - [x] assignments.find callback (arrow, line 121)
    - Confidence: 99%
  - [x] isEnabled (arrow, line 123)
    - Confidence: 99%
  - [x] assignments.find callback (arrow, line 124)
    - Confidence: 99%
  - [x] useRollouts (function, line 136)
    - Confidence: 99%
  - [x] useRolloutVariant (function, line 144)
    - Confidence: 99%
  - [x] useRolloutEnabled (function, line 148)
    - Confidence: 99%

## [x] src/context/SWRProvider.tsx
- Confidence: 99%
- Functions detected: 1
- Functions:
  - [x] SWRProvider (function, line 10)
    - Confidence: 99%

## [x] src/context/UIContext.tsx
- Confidence: 99%
- Functions detected: 11
- Functions:
  - [x] UIProvider (function, line 27)
    - Confidence: 99%
  - [x] openPurchaseModal (arrow, line 36)
    - Confidence: 99%
  - [x] closePurchaseModal (arrow, line 44)
    - Confidence: 99%
  - [x] openAuthModal (arrow, line 48)
    - Confidence: 99%
  - [x] closeAuthModal (arrow, line 52)
    - Confidence: 99%
  - [x] openInsufficientBalanceModal (arrow, line 54)
    - Confidence: 99%
  - [x] closeInsufficientBalanceModal (arrow, line 58)
    - Confidence: 99%
  - [x] openProfileSidebar (arrow, line 59)
    - Confidence: 99%
  - [x] closeProfileSidebar (arrow, line 60)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 62)
    - Confidence: 99%
  - [x] useUI (function, line 87)
    - Confidence: 99%

## [x] src/dataconnect-admin-generated/esm/index.esm.js
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] createAiInteraction (function, line 9)
    - Confidence: 99%
  - [x] listAiInteractions (function, line 15)
    - Confidence: 99%

## [x] src/dataconnect-admin-generated/esm/package.json
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-admin-generated/index.cjs.js
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] createAiInteraction (function, line 10)
    - Confidence: 99%
  - [x] listAiInteractions (function, line 17)
    - Confidence: 99%

## [x] src/dataconnect-admin-generated/index.d.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] createAiInteraction (function, line 128)
    - Confidence: 99%
  - [x] createAiInteraction (function, line 130)
    - Confidence: 99%
  - [x] listAiInteractions (function, line 133)
    - Confidence: 99%
  - [x] listAiInteractions (function, line 135)
    - Confidence: 99%

## [x] src/dataconnect-admin-generated/package.json
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/.guides/config.json
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/.guides/setup.md
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/.guides/usage.md
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/esm/index.esm.js
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] createAiInteractionRef (arrow, line 9)
    - Confidence: 99%
  - [x] createAiInteraction (function, line 16)
    - Confidence: 99%
  - [x] listAiInteractionsRef (arrow, line 20)
    - Confidence: 99%
  - [x] listAiInteractions (function, line 27)
    - Confidence: 99%

## [x] src/dataconnect-generated/esm/package.json
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/index.cjs.js
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] createAiInteractionRef (arrow, line 10)
    - Confidence: 99%
  - [x] createAiInteraction (function expression, line 18)
    - Confidence: 99%
  - [x] listAiInteractionsRef (arrow, line 22)
    - Confidence: 99%
  - [x] listAiInteractions (function expression, line 30)
    - Confidence: 99%

## [x] src/dataconnect-generated/index.d.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] createAiInteraction (function, line 138)
    - Confidence: 99%
  - [x] createAiInteraction (function, line 139)
    - Confidence: 99%
  - [x] listAiInteractions (function, line 150)
    - Confidence: 99%
  - [x] listAiInteractions (function, line 151)
    - Confidence: 99%

## [x] src/dataconnect-generated/package.json
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/react/esm/index.esm.js
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] useCreateAiInteraction (function, line 5)
    - Confidence: 99%
  - [x] refFactory (function, line 7)
    - Confidence: 99%
  - [x] useListAiInteractions (function, line 14)
    - Confidence: 99%

## [x] src/dataconnect-generated/react/esm/package.json
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/react/index.cjs.js
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] useCreateAiInteraction (function expression, line 5)
    - Confidence: 99%
  - [x] refFactory (function, line 7)
    - Confidence: 99%
  - [x] useListAiInteractions (function expression, line 14)
    - Confidence: 99%

## [x] src/dataconnect-generated/react/index.d.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] useCreateAiInteraction (function, line 8)
    - Confidence: 99%
  - [x] useCreateAiInteraction (function, line 9)
    - Confidence: 99%
  - [x] useListAiInteractions (function, line 11)
    - Confidence: 99%
  - [x] useListAiInteractions (function, line 12)
    - Confidence: 99%

## [x] src/dataconnect-generated/react/package.json
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/react/README.md
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/dataconnect-generated/README.md
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/hooks/client-runtime.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] buildOnboardingCompletionStorageKey (function, line 14)
    - Confidence: 99%
  - [x] readSessionStorageValue (function, line 18)
    - Confidence: 99%
  - [x] writeSessionStorageValue (function, line 26)
    - Confidence: 99%
  - [x] dispatchClientRuntimeEvent (function, line 34)
    - Confidence: 99%

## [x] src/hooks/useAdminOverview.ts
- Confidence: 99%
- Functions detected: 4
- Functions:
  - [x] useAdminOverview (function, line 28)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 35)
    - Confidence: 99%
  - [x] handleSync (arrow, line 40)
    - Confidence: 99%
  - [x] returned function (arrow, line 45)
    - Confidence: 99%

## [x] src/hooks/useAuthSWR.ts
- Confidence: 99%
- Functions detected: 3
- Functions:
  - [x] authFetcher (function, line 11)
    - Confidence: 99%
  - [x] response.json().catch callback (arrow, line 14)
    - Confidence: 99%
  - [x] useAuthSWR (function, line 31)
    - Confidence: 99%

## [x] src/hooks/useDeferredClientReady.ts
- Confidence: 99%
- Functions detected: 6
- Functions:
  - [x] useDeferredClientReady (function, line 11)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 18)
    - Confidence: 99%
  - [x] markReady (arrow, line 27)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 33)
    - Confidence: 99%
  - [x] window.requestIdleCallback callback (arrow, line 45)
    - Confidence: 99%
  - [x] returned function (arrow, line 54)
    - Confidence: 99%

## [x] src/hooks/useDrops.ts
- Confidence: 99%
- Functions detected: 25
- Functions:
  - [x] fetcher (arrow, line 23)
    - Confidence: 99%
  - [x] buildDropCursor (function, line 56)
    - Confidence: 99%
  - [x] useDrops (function, line 60)
    - Confidence: 99%
  - [x] getKey (arrow, line 66)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 72)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 88)
    - Confidence: 99%
  - [x] data.flatMap callback (arrow, line 89)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 92)
    - Confidence: 99%
  - [x] syncDrops (arrow, line 93)
    - Confidence: 99%
  - [x] handleVisibilityChange (arrow, line 98)
    - Confidence: 99%
  - [x] returned function (arrow, line 107)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 113)
    - Confidence: 99%
  - [x] subscribeToDropRuntime (function, line 118)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 130)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 139)
    - Confidence: 99%
  - [x] returned function (arrow, line 158)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 166)
    - Confidence: 99%
  - [x] swrDrops       .map callback (arrow, line 168)
    - Confidence: 99%
  - [x] swrDrops       .map((drop) => applyDropStatus(drop, sweepNowMs))       .map callback (arrow, line 169)
    - Confidence: 99%
  - [x] swrDrops       .map((drop) => applyDropStatus(drop, sweepNowMs))       .map((drop) => (drop.status === "active" && drop.validUntil && drop.validUntil > sweepNowMs ? drop.validUntil : null))       .filter callback (arrow, line 170)
    - Confidence: 99%
  - [x] window.setTimeout callback (arrow, line 178)
    - Confidence: 99%
  - [x] returned function (arrow, line 183)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 188)
    - Confidence: 99%
  - [x] swrDrops       .map callback (arrow, line 190)
    - Confidence: 99%
  - [x] swrDrops       .map((drop) => applyDropStatus(drop, sweepNowMs))       .filter callback (arrow, line 191)
    - Confidence: 99%

## [x] src/hooks/useNotifications.ts
- Confidence: 99%
- Functions detected: 25
- Functions:
  - [x] useNotifications (function, line 16)
    - Confidence: 99%
  - [x] useEffect callback (arrow, line 23)
    - Confidence: 99%
  - [x] fetchNotifications (arrow, line 38)
    - Confidence: 99%
  - [x] (result.notifications || []).map callback (arrow, line 66)
    - Confidence: 99%
  - [x] toDate (arrow, line 69)
    - Confidence: 99%
  - [x] refreshOnDemand (arrow, line 88)
    - Confidence: 99%
  - [x] subscribeToRuntimeSignals (arrow, line 92)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 105)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 113)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 123)
    - Confidence: 99%
  - [x] onSnapshot callback (arrow, line 134)
    - Confidence: 99%
  - [x] window.setInterval callback (arrow, line 151)
    - Confidence: 99%
  - [x] refreshOnVisible (arrow, line 154)
    - Confidence: 99%
  - [x] returned function (arrow, line 164)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 180)
    - Confidence: 99%
  - [x] useMemo callback (arrow, line 187)
    - Confidence: 99%
  - [x] markAsRead (arrow, line 191)
    - Confidence: 99%
  - [x] setNotificationsState callback (arrow, line 200)
    - Confidence: 99%
  - [x] prev.filter callback (arrow, line 200)
    - Confidence: 99%
  - [x] markAllAsRead (arrow, line 208)
    - Confidence: 99%
  - [x] notifications.map callback (arrow, line 213)
    - Confidence: 99%
  - [x] unreadIds.map callback (arrow, line 223)
    - Confidence: 99%
  - [x] unreadIds.filter callback (arrow, line 224)
    - Confidence: 99%
  - [x] setNotificationsState callback (arrow, line 231)
    - Confidence: 99%
  - [x] prev.filter callback (arrow, line 231)
    - Confidence: 99%

## [x] src/hooks/useTaskGuidanceActions.ts
- Confidence: 99%
- Functions detected: 2
- Functions:
  - [x] useTaskGuidanceActions (function, line 18)
    - Confidence: 99%
  - [x] useCallback callback (arrow, line 22)
    - Confidence: 99%

## [x] src/lib/activity-sync.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] dispatchActivitySync (function, line 3)
    - Confidence: 98%

## [x] src/lib/admin-ops-health.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/analytics-client-engine.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] prepareAnalyticsEvent (function, line 16)
    - Confidence: 98%
  - [x] Object.entries(eventParams ?? {}).forEach callback (arrow, line 24)
    - Confidence: 98%

## [x] src/lib/analytics-identifiers.ts
- Confidence: 98%
- Functions detected: 10
- Functions:
  - [x] normalizeSessionFragment (function, line 8)
    - Confidence: 98%
  - [x] buildRandomFragment (function, line 12)
    - Confidence: 98%
  - [x] buildIdentifier (function, line 20)
    - Confidence: 98%
  - [x] normalizeStorageFragment (function, line 27)
    - Confidence: 98%
  - [x] createAnalyticsEventId (function, line 31)
    - Confidence: 98%
  - [x] createAnalyticsBatchId (function, line 35)
    - Confidence: 98%
  - [x] createAnalyticsStorageKey (function, line 39)
    - Confidence: 98%
  - [x] isValidAnalyticsEventId (function, line 45)
    - Confidence: 98%
  - [x] isValidAnalyticsBatchId (function, line 49)
    - Confidence: 98%
  - [x] normalizeAnalyticsClientTimestamp (function, line 53)
    - Confidence: 98%

## [x] src/lib/analytics-metric-catalog.ts
- Confidence: 98%
- Functions detected: 8
- Functions:
  - [x] defineMetric (function, line 16)
    - Confidence: 98%
  - [x] metricSources (function, line 20)
    - Confidence: 98%
  - [x] metricFormula (function, line 24)
    - Confidence: 98%
  - [x] metricReference (function, line 28)
    - Confidence: 98%
  - [x] percentMetric (function, line 32)
    - Confidence: 98%
  - [x] ratioMetric (function, line 57)
    - Confidence: 98%
  - [x] ANALYTICS_SOCIAL_METRIC_DEFINITIONS.map callback (arrow, line 416)
    - Confidence: 98%
  - [x] formatAnalyticsMetricValue (function, line 419)
    - Confidence: 98%

## [x] src/lib/analytics-runtime.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/analytics-semantics.ts
- Confidence: 98%
- Functions detected: 8
- Functions:
  - [x] humanizeAnalyticsKey (function, line 172)
    - Confidence: 98%
  - [x] value     .replaceAll(/[._-]+/g, " ")     .replace callback (arrow, line 179)
    - Confidence: 98%
  - [x] getLegacyPagePathForEvent (function, line 183)
    - Confidence: 98%
  - [x] normalizePagePath (function, line 191)
    - Confidence: 98%
  - [x] buildScopeDescriptor (function, line 204)
    - Confidence: 98%
  - [x] resolveAnalyticsSemanticContext (function, line 324)
    - Confidence: 98%
  - [x] buildAnalyticsSemanticParams (function, line 356)
    - Confidence: 98%
  - [x] resolveRawInteractionLabel (function, line 380)
    - Confidence: 98%

## [x] src/lib/analytics-time.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] buildAnalyticsTimeKeys (function, line 1)
    - Confidence: 98%

## [x] src/lib/authFetch.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] authFetch (function, line 11)
    - Confidence: 98%

## [x] src/lib/browser-notification-enrollment.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] buildNotificationSettings (function, line 12)
    - Confidence: 98%
  - [x] enableBrowserNotifications (function, line 21)
    - Confidence: 98%
  - [x] response.json().catch callback (arrow, line 53)
    - Confidence: 98%

## [x] src/lib/browser-utils.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] isIOS (arrow, line 6)
    - Confidence: 98%
  - [x] isStandalone (arrow, line 18)
    - Confidence: 98%
  - [x] isIOSNonStandalone (arrow, line 32)
    - Confidence: 98%

## [x] src/lib/bug-reporting.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] resolveBugReportComponentMeta (function, line 93)
    - Confidence: 98%
  - [x] buildBugReportSummary (function, line 123)
    - Confidence: 98%

## [x] src/lib/client-diagnostics.ts
- Confidence: 98%
- Functions detected: 24
- Functions:
  - [x] canUseStorage (function, line 93)
    - Confidence: 98%
  - [x] safeStringify (function, line 97)
    - Confidence: 98%
  - [x] readEntries (function, line 109)
    - Confidence: 98%
  - [x] writeEntries (function, line 127)
    - Confidence: 98%
  - [x] readClientDiagnostics (function, line 139)
    - Confidence: 98%
  - [x] readClientBreadcrumbs (function, line 143)
    - Confidence: 98%
  - [x] readClientErrors (function, line 147)
    - Confidence: 98%
  - [x] recordClientDiagnostic (function, line 151)
    - Confidence: 98%
  - [x] recordClientBreadcrumb (function, line 179)
    - Confidence: 98%
  - [x] recordClientError (function, line 206)
    - Confidence: 98%
  - [x] clearClientDiagnostics (function, line 242)
    - Confidence: 98%
  - [x] getClientDebugSnapshot (function, line 252)
    - Confidence: 98%
  - [x] installGlobalErrorListeners (function, line 289)
    - Confidence: 98%
  - [x] window.addEventListener callback (arrow, line 294)
    - Confidence: 98%
  - [x] window.addEventListener callback (arrow, line 307)
    - Confidence: 98%
  - [x] extractInteractionLabel (function, line 312)
    - Confidence: 98%
  - [x] installInteractionBreadcrumbs (function, line 331)
    - Confidence: 98%
  - [x] document.addEventListener callback (arrow, line 336)
    - Confidence: 98%
  - [x] installClientDiagnosticsBridge (function, line 354)
    - Confidence: 98%
  - [x] getDiagnostics (arrow, line 364)
    - Confidence: 98%
  - [x] getBreadcrumbs (arrow, line 365)
    - Confidence: 98%
  - [x] getErrors (arrow, line 366)
    - Confidence: 98%
  - [x] clearDiagnostics (arrow, line 367)
    - Confidence: 98%
  - [x] getSnapshot (arrow, line 368)
    - Confidence: 98%

## [x] src/lib/client-session.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] generateId (function, line 6)
    - Confidence: 98%
  - [x] readStorageValue (function, line 14)
    - Confidence: 98%
  - [x] writeStorageValue (function, line 27)
    - Confidence: 98%
  - [x] getClientSessionId (function, line 40)
    - Confidence: 98%
  - [x] getClientSubjectId (function, line 55)
    - Confidence: 98%

## [x] src/lib/daily-checkin.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] normalizeTimestamp (function, line 5)
    - Confidence: 98%
  - [x] clampStoredStreak (function, line 14)
    - Confidence: 98%
  - [x] getWrappedDailyStreak (function, line 22)
    - Confidence: 98%
  - [x] getDailyCheckInReward (function, line 27)
    - Confidence: 98%
  - [x] getDailyCheckInProgress (function, line 43)
    - Confidence: 98%

## [x] src/lib/drop-engagement.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] toNonNegativeInteger (function, line 1)
    - Confidence: 98%
  - [x] getDropViewCount (function, line 10)
    - Confidence: 98%

## [x] src/lib/drop-normalizers.ts
- Confidence: 98%
- Functions detected: 6
- Functions:
  - [x] isTimestampLike (function, line 6)
    - Confidence: 98%
  - [x] toMillis (function, line 110)
    - Confidence: 98%
  - [x] classifyLegacyUrl (function, line 131)
    - Confidence: 98%
  - [x] normalizeDropRecord (function, line 147)
    - Confidence: 98%
  - [x] parsed.contentUrls.filter callback (arrow, line 151)
    - Confidence: 98%
  - [x] urls.forEach callback (arrow, line 162)
    - Confidence: 98%

## [x] src/lib/drop-presentation.ts
- Confidence: 98%
- Functions detected: 8
- Functions:
  - [x] parseDimensions (function, line 11)
    - Confidence: 98%
  - [x] getSupportedDropAspectRatio (function, line 27)
    - Confidence: 98%
  - [x] (Object.entries(SUPPORTED_RATIOS) as Array<[SupportedAspectRatio, number]>).forEach callback (arrow, line 43)
    - Confidence: 98%
  - [x] getAspectRatioCssValue (function, line 54)
    - Confidence: 98%
  - [x] classifyUrlKind (function, line 58)
    - Confidence: 98%
  - [x] getDropAssetCount (function, line 74)
    - Confidence: 98%
  - [x] getDropMediaSummary (function, line 88)
    - Confidence: 98%
  - [x] urlsToCheck.forEach callback (arrow, line 108)
    - Confidence: 98%

## [x] src/lib/drop-queue-schedule.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] normalizeQueueTimes (function, line 5)
    - Confidence: 98%
  - [x] timesPerDay         .filter callback (arrow, line 7)
    - Confidence: 98%
  - [x] timesPerDay         .filter((value) => VALID_QUEUE_TIME.test(value))         .sort callback (arrow, line 8)
    - Confidence: 98%
  - [x] getNextQueueSlotAfter (function, line 11)
    - Confidence: 98%
  - [x] buildProjectedQueueSchedule (function, line 31)
    - Confidence: 98%

## [x] src/lib/drop-runtime.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/drop-status.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] resolveDropStatusFromTiming (function, line 5)
    - Confidence: 98%
  - [x] applyDropStatus (function, line 17)
    - Confidence: 98%
  - [x] isDropActiveNow (function, line 29)
    - Confidence: 98%

## [x] src/lib/firebase-data.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/firebase-messaging.ts
- Confidence: 98%
- Functions detected: 13
- Functions:
  - [x] buildServiceWorkerUrl (function, line 26)
    - Confidence: 98%
  - [x] getAppServiceWorkerUrl (function, line 30)
    - Confidence: 98%
  - [x] registerAppServiceWorker (function, line 34)
    - Confidence: 98%
  - [x] getBrowserNotificationState (function, line 50)
    - Confidence: 98%
  - [x] isSupported().catch callback (arrow, line 55)
    - Confidence: 98%
  - [x] requestBrowserNotificationAccess (function, line 69)
    - Confidence: 98%
  - [x] showBrowserNotification (function, line 137)
    - Confidence: 98%
  - [x] notification.onclick (arrow, line 162)
    - Confidence: 98%
  - [x] onNotificationMessage (arrow, line 171)
    - Confidence: 98%
  - [x] unsubscribe (arrow, line 173)
    - Confidence: 98%
  - [x] isSupported().then callback (arrow, line 175)
    - Confidence: 98%
  - [x] isSupported().then((supported) => {         if (!supported || cancelled) {             return;         }          const messaging = getMessaging(app);         unsubscribe = onMessage(messaging, callback);     }).catch callback (arrow, line 182)
    - Confidence: 98%
  - [x] returned function (arrow, line 189)
    - Confidence: 98%

## [x] src/lib/firebase-runtime.ts
- Confidence: 98%
- Functions detected: 11
- Functions:
  - [x] normalizePublicEnv (function, line 3)
    - Confidence: 98%
  - [x] isLocalHost (function, line 8)
    - Confidence: 98%
  - [x] isFirebaseDefaultAuthHost (function, line 12)
    - Confidence: 98%
  - [x] resolvePreferredAuthDomain (function, line 20)
    - Confidence: 98%
  - [x] configuredSiteHosts.find callback (arrow, line 29)
    - Confidence: 98%
  - [x] buildDefaultDatabaseUrl (function, line 40)
    - Confidence: 98%
  - [x] buildFirebaseClientRuntimeSnapshot (function, line 85)
    - Confidence: 98%
  - [x] getFirebaseRuntimeWarnings (function, line 100)
    - Confidence: 98%
  - [x] getConfiguredSiteHosts().filter callback (arrow, line 103)
    - Confidence: 98%

## [x] src/lib/firebase.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] shouldEnableAppCheck (function, line 19)
    - Confidence: 98%
  - [x] getFirebaseRuntimeWarnings().forEach callback (arrow, line 44)
    - Confidence: 98%

## [x] src/lib/firebase/admin-actions.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] adjustUserBalance (function, line 12)
    - Confidence: 98%

## [x] src/lib/gumdrop-economics.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] roundCurrency (function, line 29)
    - Confidence: 98%
  - [x] getBundlePresentation (function, line 39)
    - Confidence: 98%
  - [x] deriveGumdropEconomics (function, line 60)
    - Confidence: 98%

## [x] src/lib/gumdrops-packages.ts
- Confidence: 98%
- Functions detected: 4
- Functions:
  - [x] isBundleGumdropAmount (function, line 15)
    - Confidence: 98%
  - [x] resolveExpectedGumdropPrice (function, line 22)
    - Confidence: 98%
  - [x] FIXED_GUMDROP_PACKAGES.find callback (arrow, line 31)
    - Confidence: 98%
  - [x] resolvePreferredGumdropAmount (function, line 35)
    - Confidence: 98%

## [x] src/lib/http-cache.ts
- Confidence: 98%
- Functions detected: 4
- Functions:
  - [x] buildWeakEtag (function, line 7)
    - Confidence: 98%
  - [x] requestMatchesEtag (function, line 11)
    - Confidence: 98%
  - [x] requestEtag     .split(",")     .map callback (arrow, line 19)
    - Confidence: 98%
  - [x] buildNotModifiedResponse (function, line 23)
    - Confidence: 98%

## [x] src/lib/landing-assets.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] isAllowedLandingAssetKey (function, line 12)
    - Confidence: 98%

## [x] src/lib/legal-documents.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/marketing-copy.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/media-hosts.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] normalizeBucketHost (function, line 17)
    - Confidence: 98%
  - [x] getAllowedRemoteMediaHosts (function, line 42)
    - Confidence: 98%
  - [x] getAllowedRemoteImagePatterns (function, line 52)
    - Confidence: 98%
  - [x] getAllowedRemoteMediaHosts().map callback (arrow, line 53)
    - Confidence: 98%
  - [x] isAllowedRemoteMediaUrl (function, line 59)
    - Confidence: 98%

## [x] src/lib/monitoring.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] captureException (function, line 3)
    - Confidence: 98%

## [x] src/lib/navigation-persistence.ts
- Confidence: 98%
- Functions detected: 12
- Functions:
  - [x] isPersistableAppPath (function, line 8)
    - Confidence: 98%
  - [x] isAdminPath (function, line 12)
    - Confidence: 98%
  - [x] getDefaultAppPathForRole (function, line 16)
    - Confidence: 98%
  - [x] resolvePreferredAuthenticatedPath (function, line 20)
    - Confidence: 98%
  - [x] writeCookie (function, line 36)
    - Confidence: 98%
  - [x] clearCookie (function, line 44)
    - Confidence: 98%
  - [x] readLastVisitedPath (function, line 52)
    - Confidence: 98%
  - [x] readPreferredAuthenticatedPath (function, line 65)
    - Confidence: 98%
  - [x] writeLastVisitedPath (function, line 69)
    - Confidence: 98%
  - [x] clearLastVisitedPath (function, line 83)
    - Confidence: 98%
  - [x] clearLegacyNavigationAuthCookies (function, line 97)
    - Confidence: 98%
  - [x] setNavigationAuthCookies (function, line 107)
    - Confidence: 98%

## [x] src/lib/navigation-session.ts
- Confidence: 98%
- Functions detected: 11
- Functions:
  - [x] getNavigationSessionSecret (function, line 10)
    - Confidence: 98%
  - [x] bytesToBase64Url (function, line 19)
    - Confidence: 98%
  - [x] bytes.forEach callback (arrow, line 25)
    - Confidence: 98%
  - [x] base64UrlToBytes (function, line 32)
    - Confidence: 98%
  - [x] Uint8Array.from callback (arrow, line 40)
    - Confidence: 98%
  - [x] encodeBase64Url (function, line 43)
    - Confidence: 98%
  - [x] decodeBase64Url (function, line 47)
    - Confidence: 98%
  - [x] getNavigationSessionKey (function, line 55)
    - Confidence: 98%
  - [x] signNavigationSessionPayload (function, line 70)
    - Confidence: 98%
  - [x] createNavigationSessionCookieValue (function, line 80)
    - Confidence: 98%
  - [x] verifyNavigationSessionCookieValue (function, line 95)
    - Confidence: 98%

## [x] src/lib/notification-contracts.ts
- Confidence: 98%
- Functions detected: 9
- Functions:
  - [x] normalizeNotificationDoc (function, line 48)
    - Confidence: 98%
  - [x] data.readBy.filter callback (arrow, line 58)
    - Confidence: 98%
  - [x] targetObj.userIds.filter callback (arrow, line 62)
    - Confidence: 98%
  - [x] targetObj.excludedUserIds.filter callback (arrow, line 65)
    - Confidence: 98%
  - [x] normalizeDropContext (function, line 89)
    - Confidence: 98%
  - [x] normalizeNotificationCreatePayload (function, line 115)
    - Confidence: 98%
  - [x] normalizeTarget (function, line 162)
    - Confidence: 98%
  - [x] source.userIds.filter callback (arrow, line 169)
    - Confidence: 98%
  - [x] source.excludedUserIds.filter callback (arrow, line 172)
    - Confidence: 98%

## [x] src/lib/notification-runtime.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/notifications.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] sendNotification (function, line 14)
    - Confidence: 98%
  - [x] markNotificationAsRead (function, line 33)
    - Confidence: 98%

## [x] src/lib/privacy-consent.ts
- Confidence: 98%
- Functions detected: 15
- Functions:
  - [x] canUseDom (function, line 29)
    - Confidence: 98%
  - [x] getBrowserGlobalPrivacyControl (function, line 33)
    - Confidence: 98%
  - [x] normalizePrivacySettingsSnapshot (function, line 42)
    - Confidence: 98%
  - [x] readPrivacySettingsSnapshot (function, line 55)
    - Confidence: 98%
  - [x] emitPrivacySettingsChanged (function, line 72)
    - Confidence: 98%
  - [x] subscribeToPrivacySettings (function, line 80)
    - Confidence: 98%
  - [x] returned function (arrow, line 82)
    - Confidence: 98%
  - [x] handler (arrow, line 85)
    - Confidence: 98%
  - [x] returned function (arrow, line 88)
    - Confidence: 98%
  - [x] applyAnalyticsConsentToGtag (function, line 94)
    - Confidence: 98%
  - [x] persistPrivacySettingsSnapshot (function, line 112)
    - Confidence: 98%
  - [x] saveGuestAnalyticsConsent (function, line 153)
    - Confidence: 98%
  - [x] response.json().catch callback (arrow, line 170)
    - Confidence: 98%
  - [x] canUseAnonymousAnalytics (function, line 181)
    - Confidence: 98%
  - [x] canUseIdentifiedAnalytics (function, line 193)
    - Confidence: 98%

## [x] src/lib/privacy-policy.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/rollouts.ts
- Confidence: 98%
- Functions detected: 13
- Functions:
  - [x] clampPercent (function, line 103)
    - Confidence: 98%
  - [x] hashToUnitInterval (function, line 111)
    - Confidence: 98%
  - [x] parseRolloutOverrides (function, line 121)
    - Confidence: 98%
  - [x] mergeRolloutDefinitions (function, line 135)
    - Confidence: 98%
  - [x] DEFAULT_ROLLOUTS.map callback (arrow, line 138)
    - Confidence: 98%
  - [x] override.variants.map callback (arrow, line 149)
    - Confidence: 98%
  - [x] getIdentityKey (function, line 159)
    - Confidence: 98%
  - [x] isAudienceEligible (function, line 175)
    - Confidence: 98%
  - [x] selectVariant (function, line 192)
    - Confidence: 98%
  - [x] definition.variants.reduce callback (arrow, line 193)
    - Confidence: 98%
  - [x] getConfiguredRollouts (function, line 211)
    - Confidence: 98%
  - [x] resolveRolloutAssignments (function, line 215)
    - Confidence: 98%
  - [x] getConfiguredRollouts().map callback (arrow, line 218)
    - Confidence: 98%

## [x] src/lib/security-events.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] describeSecurityEvent (function, line 32)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-data.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] getAdminAnalyticsPropertyId (function, line 9)
    - Confidence: 98%
  - [x] createAdminAnalyticsDataClient (function, line 13)
    - Confidence: 98%
  - [x] fetchAdminHistoricalAnalyticsSources (function, line 30)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-activity.ts
- Confidence: 98%
- Functions detected: 11
- Functions:
  - [x] buildHistoricalActivityFeeds (function, line 51)
    - Confidence: 98%
  - [x] rawTransactions.map callback (arrow, line 70)
    - Confidence: 98%
  - [x] securityEventDocs.forEach callback (arrow, line 78)
    - Confidence: 98%
  - [x] Array.from(securityByUser.values())     .sort callback (arrow, line 112)
    - Confidence: 98%
  - [x] guestBatchDocs.flatMap callback (arrow, line 118)
    - Confidence: 98%
  - [x] events.map callback (arrow, line 121)
    - Confidence: 98%
  - [x] telemetryLogs.map callback (arrow, line 136)
    - Confidence: 98%
  - [x] rawTransactions.map callback (arrow, line 154)
    - Confidence: 98%
  - [x] normalizedTaskEvents.map callback (arrow, line 166)
    - Confidence: 98%
  - [x] [...authActivity, ...guestActivity, ...transactionActivity, ...taskActivity]     .filter callback (arrow, line 177)
    - Confidence: 98%
  - [x] [...authActivity, ...guestActivity, ...transactionActivity, ...taskActivity]     .filter((event) => event.timestamp >= startMs)     .sort callback (arrow, line 178)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-content.ts
- Confidence: 98%
- Functions detected: 18
- Functions:
  - [x] buildHistoricalContentAnalytics (function, line 35)
    - Confidence: 98%
  - [x] applyPackageEvent (arrow, line 53)
    - Confidence: 98%
  - [x] records.forEach callback (arrow, line 54)
    - Confidence: 98%
  - [x] Array.from(packagePerformanceMap.values())     .map callback (arrow, line 82)
    - Confidence: 98%
  - [x] Array.from(packagePerformanceMap.values())     .map((entry) => ({       ...entry,       conversionRate: entry.starts > 0 ? entry.purchases / entry.starts : 0,       abandonmentRate: entry.starts > 0 ? Math.max(0, entry.starts - entry.purchases) / entry.starts : 0,     }))     .sort callback (arrow, line 87)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.drop_preview_opened || []).forEach callback (arrow, line 90)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.unlock_drop_success || []).forEach callback (arrow, line 96)
    - Confidence: 98%
  - [x] Array.from(categoryMixMap.values())     .map callback (arrow, line 104)
    - Confidence: 98%
  - [x] Array.from(categoryMixMap.values())     .map((entry) => ({       ...entry,       unlockRate: entry.previews > 0 ? entry.unlocks / entry.previews : 0,     }))     .sort callback (arrow, line 108)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_watch_checkpoint || []).map callback (arrow, line 111)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_asset_consumed || []).map callback (arrow, line 112)
    - Confidence: 98%
  - [x] [     ...(input.telemetryLogsByEvent.viewer_watch_checkpoint || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),     ...(input.telemetryLogsByEvent.viewer_asset_consumed || []).map((record) => getTelemetryParamNumber(record, "watch_seconds")),   ].filter callback (arrow, line 113)
    - Confidence: 98%
  - [x] watchDepthValues.map callback (arrow, line 115)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.unlock_drop_success || []).forEach callback (arrow, line 135)
    - Confidence: 98%
  - [x] rawTags       .split("|")       .map callback (arrow, line 139)
    - Confidence: 98%
  - [x] rawTags       .split("|")       .map((value) => value.trim())       .filter(Boolean)       .forEach callback (arrow, line 141)
    - Confidence: 98%
  - [x] Array.from(tagDemandMap.entries())     .map callback (arrow, line 146)
    - Confidence: 98%
  - [x] Array.from(tagDemandMap.entries())     .map(([tag, count]) => ({ tag, count }))     .sort callback (arrow, line 147)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-engagement.ts
- Confidence: 98%
- Functions detected: 17
- Functions:
  - [x] averageDuration (function, line 25)
    - Confidence: 98%
  - [x] records     .map callback (arrow, line 27)
    - Confidence: 98%
  - [x] records     .map((record) => getTelemetryParamNumber(record, "duration_ms"))     .filter callback (arrow, line 28)
    - Confidence: 98%
  - [x] durations.reduce callback (arrow, line 34)
    - Confidence: 98%
  - [x] buildHistoricalEngagementAnalytics (function, line 37)
    - Confidence: 98%
  - [x] [     {       method: "Email sign in",       attempts: input.eventsData.auth_sign_in_attempted || 0,       successes: input.eventsData.auth_sign_in_success || 0,       failures: input.eventsData.auth_sign_in_failed || 0,       avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_sign_in_success || []),     },     {       method: "Email sign up",       attempts: input.eventsData.auth_sign_up_attempted || 0,       successes: normalizedEmailSignUpCount,       failures: input.eventsData.auth_sign_up_failed || 0,       avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_sign_up_success || []),     },     {       method: "Google sign in",       attempts: input.eventsData.auth_google_sign_in_attempted || 0,       successes: input.eventsData.auth_google_sign_in_success || 0,       failures: input.eventsData.auth_google_sign_in_failed || 0,       avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_google_sign_in_success || []),     },     {       method: "Registered users",       attempts: normalizedSignupCount,       successes: normalizedSignupCount,       failures: 0,       avgDurationMs: 0,     },   ].map callback (arrow, line 81)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.guided_onboarding_completed || []).map callback (arrow, line 89)
    - Confidence: 98%
  - [x] [     ...(input.onboardingDurationMsSamples.length > 0       ? input.onboardingDurationMsSamples       : (input.telemetryLogsByEvent.guided_onboarding_completed || []).map((record) => {         const directMs = getTelemetryParamNumber(record, "duration_ms");         if (directMs > 0) {           return directMs;         }          return getTelemetryParamNumber(record, "durationSeconds") * 1000;       })),   ].filter callback (arrow, line 97)
    - Confidence: 98%
  - [x] input.telemetryLogs.forEach callback (arrow, line 108)
    - Confidence: 98%
  - [x] Array.from(activeDaysByUser.values()).map callback (arrow, line 119)
    - Confidence: 98%
  - [x] activeDayCounts.filter callback (arrow, line 121)
    - Confidence: 98%
  - [x] activeDayCounts.filter callback (arrow, line 122)
    - Confidence: 98%
  - [x] activeDayCounts.filter callback (arrow, line 123)
    - Confidence: 98%
  - [x] activeDayCounts.filter callback (arrow, line 124)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.navigation_click || []).forEach callback (arrow, line 128)
    - Confidence: 98%
  - [x] Array.from(destinationMap.entries())       .map callback (arrow, line 138)
    - Confidence: 98%
  - [x] Array.from(destinationMap.entries())       .map(([destination, count]) => ({ destination, count }))       .sort callback (arrow, line 139)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-onboarding.ts
- Confidence: 98%
- Functions detected: 26
- Functions:
  - [x] toPositiveMs (function, line 52)
    - Confidence: 98%
  - [x] buildFallbackBucketKey (function, line 57)
    - Confidence: 98%
  - [x] dedupeOnboardingStarts (function, line 61)
    - Confidence: 98%
  - [x] [...records]     .sort callback (arrow, line 65)
    - Confidence: 98%
  - [x] [...records]     .sort((left, right) => {       const leftHasFlowStart = left.flowStartedAtMs > 0 ? 1 : 0;       const rightHasFlowStart = right.flowStartedAtMs > 0 ? 1 : 0;       if (leftHasFlowStart !== rightHasFlowStart) {         return rightHasFlowStart - leftHasFlowStart;       }       return left.timestamp - right.timestamp;     })     .filter callback (arrow, line 73)
    - Confidence: 98%
  - [x] dedupeOnboardingCompletions (function, line 90)
    - Confidence: 98%
  - [x] [...records]     .sort callback (arrow, line 94)
    - Confidence: 98%
  - [x] [...records]     .sort((left, right) => {       const leftCanonical = left.source === "complete_onboarding_route" ? 1 : 0;       const rightCanonical = right.source === "complete_onboarding_route" ? 1 : 0;       if (leftCanonical !== rightCanonical) {         return rightCanonical - leftCanonical;       }       return left.timestamp - right.timestamp;     })     .filter callback (arrow, line 102)
    - Confidence: 98%
  - [x] dedupeOnboardingStepFacts (function, line 119)
    - Confidence: 98%
  - [x] [...records]     .sort callback (arrow, line 123)
    - Confidence: 98%
  - [x] [...records]     .sort((left, right) => {       const leftCanonical = left.source === "complete_onboarding_route" ? 1 : 0;       const rightCanonical = right.source === "complete_onboarding_route" ? 1 : 0;       if (leftCanonical !== rightCanonical) {         return rightCanonical - leftCanonical;       }       return left.timestamp - right.timestamp;     })     .filter callback (arrow, line 131)
    - Confidence: 98%
  - [x] buildHistoricalOnboardingOverview (function, line 153)
    - Confidence: 98%
  - [x] input.analyticsEventFacts     .map callback (arrow, line 162)
    - Confidence: 98%
  - [x] input.analyticsEventFacts     .map((doc) => {       const data = doc.data() as Record<string, unknown>;       const params = safeParams(data.params);       const eventName = toStringValue(data.eventName);       const timestamp = toNumber(data.timestamp);       return {         eventName,         timestamp,         userId: toStringValue(data.userId),         flowStartedAtMs: Math.max(           toPositiveMs(params.overall_started_at_ms),           toPositiveMs(params.started_at_ms),         ),       };     })     .filter callback (arrow, line 177)
    - Confidence: 98%
  - [x] input.analyticsEventFacts     .map callback (arrow, line 183)
    - Confidence: 98%
  - [x] input.analyticsEventFacts     .map((doc) => {       const data = doc.data() as Record<string, unknown>;       const params = safeParams(data.params);       const timestamp = toNumber(data.timestamp);       const durationMs = Math.max(toNumber(data.durationMs), toNumber(params.duration_ms));       const flowStartedAtMs = Math.max(         toPositiveMs(params.started_at_ms),         toPositiveMs(params.overall_started_at_ms),         durationMs > 0 ? Math.max(0, timestamp - durationMs) : 0,       );        return {         eventName: toStringValue(data.eventName),         timestamp,         userId: toStringValue(data.userId),         flowStartedAtMs,         durationMs,         source: toStringValue(params.source),       };     })     .filter callback (arrow, line 203)
    - Confidence: 98%
  - [x] input.analyticsEventFacts     .map callback (arrow, line 206)
    - Confidence: 98%
  - [x] input.analyticsEventFacts     .map((doc) => {       const data = doc.data() as Record<string, unknown>;       const params = safeParams(data.params);       const timestamp = toNumber(data.timestamp);       return {         eventName: toStringValue(data.eventName),         timestamp,         userId: toStringValue(data.userId),         stepKey: toStringValue(params.step_key),         stepTitle: toStringValue(params.step_title),         stepIndex: toNumber(params.step_index),         durationMs: Math.max(toNumber(data.durationMs), toNumber(params.duration_ms)),         flowStartedAtMs: Math.max(           toPositiveMs(params.overall_started_at_ms),           toPositiveMs(params.started_at_ms),         ),         startedAtMs: toPositiveMs(params.started_at_ms),         source: toStringValue(params.source),       };     })     .filter callback (arrow, line 226)
    - Confidence: 98%
  - [x] dedupeOnboardingStepFacts(input.analyticsEventFacts     .map((doc) => {       const data = doc.data() as Record<string, unknown>;       const params = safeParams(data.params);       const timestamp = toNumber(data.timestamp);       return {         eventName: toStringValue(data.eventName),         timestamp,         userId: toStringValue(data.userId),         stepKey: toStringValue(params.step_key),         stepTitle: toStringValue(params.step_title),         stepIndex: toNumber(params.step_index),         durationMs: Math.max(toNumber(data.durationMs), toNumber(params.duration_ms)),         flowStartedAtMs: Math.max(           toPositiveMs(params.overall_started_at_ms),           toPositiveMs(params.started_at_ms),         ),         startedAtMs: toPositiveMs(params.started_at_ms),         source: toStringValue(params.source),       };     })     .filter((fact) =>       fact.timestamp >= input.startMs       && (fact.eventName === "guided_onboarding_step_started" || fact.eventName === "guided_onboarding_step_completed")       && fact.stepKey.length > 0,     ))     .map callback (arrow, line 231)
    - Confidence: 98%
  - [x] input.onboardingRows.forEach callback (arrow, line 233)
    - Confidence: 98%
  - [x] normalizedOnboardingFacts.reduce callback (arrow, line 249)
    - Confidence: 98%
  - [x] onboardingStepFacts.forEach callback (arrow, line 261)
    - Confidence: 98%
  - [x] Array.from(onboardingStepStatsMap.values())     .sort callback (arrow, line 283)
    - Confidence: 98%
  - [x] Array.from(onboardingStepStatsMap.values())     .sort((left, right) => left.stepIndex - right.stepIndex)     .map callback (arrow, line 284)
    - Confidence: 98%
  - [x] normalizedOnboardingFacts.map callback (arrow, line 321)
    - Confidence: 98%
  - [x] normalizedOnboardingFacts.map((fact) => fact.durationMs).filter callback (arrow, line 321)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-tasks.ts
- Confidence: 98%
- Functions detected: 15
- Functions:
  - [x] buildHistoricalTaskAnalytics (function, line 32)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents.filter callback (arrow, line 44)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents.filter callback (arrow, line 47)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents.filter callback (arrow, line 48)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents.filter callback (arrow, line 50)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents.filter callback (arrow, line 51)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents.forEach callback (arrow, line 65)
    - Confidence: 98%
  - [x] Array.from(taskPerformanceMap.values())     .map callback (arrow, line 98)
    - Confidence: 98%
  - [x] entry.durations.reduce callback (arrow, line 107)
    - Confidence: 98%
  - [x] Array.from(taskPerformanceMap.values())     .map((entry) => ({       taskId: entry.taskId,       title: entry.title,       assigned: entry.assigned,       started: entry.started,       completed: entry.completed,       failed: entry.failed,       rewardTotal: entry.rewardTotal,       avgDurationMs: entry.durations.length > 0         ? Math.round(entry.durations.reduce((sum, value) => sum + value, 0) / entry.durations.length)         : 0,       completionRate: entry.assigned > 0 ? entry.completed / entry.assigned : 0,     }))     .sort callback (arrow, line 111)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents       .filter callback (arrow, line 116)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents       .filter((event) => event.type === "completed" && (event.durationMs || 0) > 0)       .map callback (arrow, line 117)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents     .filter callback (arrow, line 129)
    - Confidence: 98%
  - [x] input.normalizedTaskEvents     .filter((event) => event.type === "reminder_sent")     .forEach callback (arrow, line 130)
    - Confidence: 98%
  - [x] Array.from(reminderReasonMap.entries()).map callback (arrow, line 140)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-traffic.ts
- Confidence: 98%
- Functions detected: 21
- Functions:
  - [x] buildHistoricalTrafficOverview (function, line 13)
    - Confidence: 98%
  - [x] dailyRollups     .filter callback (arrow, line 40)
    - Confidence: 98%
  - [x] dailyRollups     .filter((doc) => doc.id >= startDayKey)     .forEach callback (arrow, line 41)
    - Confidence: 98%
  - [x] pageRollups.forEach callback (arrow, line 52)
    - Confidence: 98%
  - [x] analyticsEventFacts.forEach callback (arrow, line 75)
    - Confidence: 98%
  - [x] responseRows.forEach callback (arrow, line 96)
    - Confidence: 98%
  - [x] Array.from(chartDayKeys)     .sort callback (arrow, line 117)
    - Confidence: 98%
  - [x] Array.from(chartDayKeys)     .sort((left, right) => left.localeCompare(right))     .map callback (arrow, line 118)
    - Confidence: 98%
  - [x] chartData.reduce callback (arrow, line 135)
    - Confidence: 98%
  - [x] chartData.reduce callback (arrow, line 136)
    - Confidence: 98%
  - [x] chartData.reduce callback (arrow, line 137)
    - Confidence: 98%
  - [x] chartData.reduce callback (arrow, line 138)
    - Confidence: 98%
  - [x] chartData.reduce callback (arrow, line 139)
    - Confidence: 98%
  - [x] chartData.reduce callback (arrow, line 140)
    - Confidence: 98%
  - [x] eventRows.reduce callback (arrow, line 143)
    - Confidence: 98%
  - [x] geoRows.map callback (arrow, line 150)
    - Confidence: 98%
  - [x] deviceRows.map callback (arrow, line 156)
    - Confidence: 98%
  - [x] pageRows.forEach callback (arrow, line 164)
    - Confidence: 98%
  - [x] authenticatedPageViewsByPath.forEach callback (arrow, line 173)
    - Confidence: 98%
  - [x] Array.from(allPagePaths)     .map callback (arrow, line 185)
    - Confidence: 98%
  - [x] Array.from(allPagePaths)     .map((path) => {       const ga = gaPagesMap.get(path);       const firstParty = pageRollupMap.get(path) || { views: 0, clicks: 0, dwellMsTotal: 0, dwellSamples: 0 };       return {         path,         views: Math.max(ga?.views ?? 0, firstParty.views),         avgTime: ga?.avgTime || (firstParty.dwellSamples > 0 ? firstParty.dwellMsTotal / 1000 / firstParty.dwellSamples : 0),         engagementRate: Math.max(ga?.engagementRate ?? 0, firstParty.views > 0 ? firstParty.clicks / firstParty.views : 0),       };     })     .sort callback (arrow, line 195)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-validation.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] buildHistoricalValidationSummary (function, line 26)
    - Confidence: 98%
  - [x] TELEMETRY_MODULE_INDEXES.map callback (arrow, line 59)
    - Confidence: 98%
  - [x] moduleCoverage.filter callback (arrow, line 102)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-historical-viewer.ts
- Confidence: 98%
- Functions detected: 47
- Functions:
  - [x] buildHistoricalViewerOverview (function, line 38)
    - Confidence: 98%
  - [x] input.sessionFacts     .map callback (arrow, line 45)
    - Confidence: 98%
  - [x] input.sessionFacts     .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as SessionFactRecord)     .filter callback (arrow, line 46)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_opened || []).filter callback (arrow, line 57)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_session_started || []).filter callback (arrow, line 58)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_session_completed || []).filter callback (arrow, line 59)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_asset_started || []).filter callback (arrow, line 60)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_asset_completed || []).filter callback (arrow, line 61)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_asset_changed || []).filter callback (arrow, line 62)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_source_downloaded || []).filter callback (arrow, line 63)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_related_drop_clicked || []).filter callback (arrow, line 64)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_content_loaded || []).filter callback (arrow, line 65)
    - Confidence: 98%
  - [x] viewerSessionStartedLogs.forEach callback (arrow, line 69)
    - Confidence: 98%
  - [x] viewerOpenLogs.forEach callback (arrow, line 78)
    - Confidence: 98%
  - [x] viewerSessionCompletedLogs.forEach callback (arrow, line 84)
    - Confidence: 98%
  - [x] viewerSessionCompletedLogs     .map callback (arrow, line 92)
    - Confidence: 98%
  - [x] viewerSessionCompletedLogs     .map((record) => {       const seconds = getTelemetryParamNumber(record, "duration_seconds");       if (seconds > 0) {         return seconds;       }        const durationMs = getTelemetryParamNumber(record, "duration_ms");       return durationMs > 0 ? Math.round(durationMs / 1000) : 0;     })     .filter callback (arrow, line 101)
    - Confidence: 98%
  - [x] viewerSessionCompletedLogs     .map callback (arrow, line 103)
    - Confidence: 98%
  - [x] viewerSessionCompletedLogs     .map((record) => getTelemetryParamNumber(record, "session_watch_seconds"))     .filter callback (arrow, line 104)
    - Confidence: 98%
  - [x] viewerContentLoadedLogs     .map callback (arrow, line 106)
    - Confidence: 98%
  - [x] viewerContentLoadedLogs     .map((record) => getTelemetryParamNumber(record, "load_ms"))     .filter callback (arrow, line 107)
    - Confidence: 98%
  - [x] Array.from(viewerSessionCountsByUser.values()).reduce callback (arrow, line 109)
    - Confidence: 98%
  - [x] filteredSessionFacts.reduce callback (arrow, line 128)
    - Confidence: 98%
  - [x] Array.from(sessionFactOverview.sessionCounts.values()).reduce callback (arrow, line 162)
    - Confidence: 98%
  - [x] ensureViewerDropInsight (arrow, line 182)
    - Confidence: 98%
  - [x] registerViewerRecord (arrow, line 218)
    - Confidence: 98%
  - [x] viewerOpenLogs.forEach callback (arrow, line 220)
    - Confidence: 98%
  - [x] viewerSessionStartedLogs.forEach callback (arrow, line 228)
    - Confidence: 98%
  - [x] viewerSessionCompletedLogs.forEach callback (arrow, line 237)
    - Confidence: 98%
  - [x] viewerAssetStartedLogs.forEach callback (arrow, line 251)
    - Confidence: 98%
  - [x] viewerAssetCompletedLogs.forEach callback (arrow, line 254)
    - Confidence: 98%
  - [x] viewerAssetChangedLogs.forEach callback (arrow, line 257)
    - Confidence: 98%
  - [x] viewerDownloadLogs.forEach callback (arrow, line 260)
    - Confidence: 98%
  - [x] viewerRelatedLogs.forEach callback (arrow, line 263)
    - Confidence: 98%
  - [x] viewerContentLoadedLogs.forEach callback (arrow, line 266)
    - Confidence: 98%
  - [x] Array.from(viewerDropInsightMap.values())     .map callback (arrow, line 274)
    - Confidence: 98%
  - [x] Array.from(entry.sessionCountsByUser.values()).reduce callback (arrow, line 281)
    - Confidence: 98%
  - [x] Array.from(viewerDropInsightMap.values())     .map((entry) => ({       dropId: entry.dropId,       dropTitle: resolveDropTitle(input.dropReferences, entry.dropId, entry.dropTitle),       viewCount: entry.viewCount,       sessionCount: entry.sessionCount,       uniqueViewerCount: entry.uniqueViewerKeys.size,       repeatSessionCount: Array.from(entry.sessionCountsByUser.values()).reduce(         (total, value) => total + Math.max(0, value - 1),         0,       ),       totalWatchSeconds: entry.totalWatchSeconds,       avgSessionSeconds: average(entry.sessionDurations),       avgWatchSeconds: average(entry.watchDurations),       assetStarts: entry.assetStarts,       assetCompletions: entry.assetCompletions,       assetSwitches: entry.assetSwitches,       downloads: entry.downloads,       relatedClicks: entry.relatedClicks,       avgLoadMs: average(entry.loadSamples),     }))     .sort callback (arrow, line 294)
    - Confidence: 98%
  - [x] filteredSessionFacts.reduce callback (arrow, line 301)
    - Confidence: 98%
  - [x] Array.from(viewerDropFactsMap.values())     .map callback (arrow, line 334)
    - Confidence: 98%
  - [x] Array.from(entry.sessionCounts.values()).reduce callback (arrow, line 341)
    - Confidence: 98%
  - [x] Array.from(viewerDropFactsMap.values())     .map((entry) => ({       dropId: entry.dropId,       dropTitle: entry.dropTitle,       viewCount: entry.viewCount,       sessionCount: entry.sessionCount,       uniqueViewerCount: entry.uniqueViewerKeys.size,       repeatSessionCount: Array.from(entry.sessionCounts.values()).reduce(         (total, value) => total + Math.max(0, value - 1),         0,       ),       totalWatchSeconds: entry.totalWatchSeconds,       avgSessionSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,       avgWatchSeconds: entry.sessionCount > 0 ? Math.round(entry.totalWatchSeconds / entry.sessionCount) : 0,       assetStarts: 0,       assetCompletions: 0,       assetSwitches: 0,       downloads: 0,       relatedClicks: 0,       avgLoadMs: entry.loadSampleCount > 0 ? Math.round(entry.loadMsTotal / entry.loadSampleCount) : 0,     }))     .sort callback (arrow, line 354)
    - Confidence: 98%
  - [x] ensureViewerUser (arrow, line 362)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_opened || []).forEach callback (arrow, line 387)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_session_started || []).forEach callback (arrow, line 393)
    - Confidence: 98%
  - [x] (input.telemetryLogsByEvent.viewer_session_completed || []).forEach callback (arrow, line 399)
    - Confidence: 98%
  - [x] Array.from(viewerUserMap.values())     .sort callback (arrow, line 407)
    - Confidence: 98%

## [x] src/lib/server/admin-analytics-shared.ts
- Confidence: 98%
- Functions detected: 38
- Functions:
  - [x] getCstDayStartMs (function, line 151)
    - Confidence: 98%
  - [x] getRangeWindow (function, line 157)
    - Confidence: 98%
  - [x] timestampToDayKey (function, line 196)
    - Confidence: 98%
  - [x] rawDateToDayKey (function, line 200)
    - Confidence: 98%
  - [x] dayKeyToRawDate (function, line 208)
    - Confidence: 98%
  - [x] dayKeyToLabel (function, line 212)
    - Confidence: 98%
  - [x] toNumber (function, line 216)
    - Confidence: 98%
  - [x] toStringValue (function, line 221)
    - Confidence: 98%
  - [x] safeParams (function, line 225)
    - Confidence: 98%
  - [x] getTelemetryParamString (function, line 233)
    - Confidence: 98%
  - [x] getTelemetryParamNumber (function, line 237)
    - Confidence: 98%
  - [x] fetchTelemetryLogs (function, line 241)
    - Confidence: 98%
  - [x] eventNames.map callback (arrow, line 250)
    - Confidence: 98%
  - [x] Object.values(rawValue as Record<string, unknown>).flatMap callback (arrow, line 260)
    - Confidence: 98%
  - [x] records           .filter callback (arrow, line 278)
    - Confidence: 98%
  - [x] records           .filter((record) => record.timestamp >= startMs)           .sort callback (arrow, line 279)
    - Confidence: 98%
  - [x] eventNames.forEach callback (arrow, line 288)
    - Confidence: 98%
  - [x] eventNames.forEach callback (arrow, line 293)
    - Confidence: 98%
  - [x] buildDurationBuckets (function, line 302)
    - Confidence: 98%
  - [x] bucketEdges.map callback (arrow, line 303)
    - Confidence: 98%
  - [x] values.filter callback (arrow, line 305)
    - Confidence: 98%
  - [x] formatTaskReason (function, line 309)
    - Confidence: 98%
  - [x] normalizeViewerIdentity (function, line 317)
    - Confidence: 98%
  - [x] matchesViewerFilter (function, line 321)
    - Confidence: 98%
  - [x] getTelemetryDropId (function, line 336)
    - Confidence: 98%
  - [x] getTelemetryDropTitle (function, line 340)
    - Confidence: 98%
  - [x] average (function, line 344)
    - Confidence: 98%
  - [x] sum (function, line 352)
    - Confidence: 98%
  - [x] values.reduce callback (arrow, line 353)
    - Confidence: 98%
  - [x] buildMergedCountMap (function, line 356)
    - Confidence: 98%
  - [x] sources.forEach callback (arrow, line 359)
    - Confidence: 98%
  - [x] Object.entries(source).forEach callback (arrow, line 360)
    - Confidence: 98%
  - [x] sumEventCounts (function, line 369)
    - Confidence: 98%
  - [x] Object.entries(counts).reduce callback (arrow, line 374)
    - Confidence: 98%
  - [x] sumSnapshotField (function, line 383)
    - Confidence: 98%
  - [x] snapshot.docs.reduce callback (arrow, line 387)
    - Confidence: 98%
  - [x] safeRunReport (function, line 390)
    - Confidence: 98%
  - [x] safeRunRealtimeReport (function, line 403)
    - Confidence: 98%

## [x] src/lib/server/admin-ops-health.ts
- Confidence: 98%
- Functions detected: 30
- Functions:
  - [x] toTimestampNumber (function, line 19)
    - Confidence: 98%
  - [x] getDocData (function, line 40)
    - Confidence: 98%
  - [x] readLatestTimestamp (function, line 46)
    - Confidence: 98%
  - [x] docs.reduce callback (arrow, line 50)
    - Confidence: 98%
  - [x] keys.reduce callback (arrow, line 52)
    - Confidence: 98%
  - [x] getMaterializerStatus (function, line 57)
    - Confidence: 98%
  - [x] buildMaterializer (function, line 75)
    - Confidence: 98%
  - [x] buildChannelLabel (function, line 95)
    - Confidence: 98%
  - [x] buildDiagnosticPreview (function, line 104)
    - Confidence: 98%
  - [x] entries     .map callback (arrow, line 111)
    - Confidence: 98%
  - [x] buildRouteLabel (function, line 115)
    - Confidence: 98%
  - [x] routeKey     .replaceAll("_", " ")     .replace callback (arrow, line 118)
    - Confidence: 98%
  - [x] getNavigationSessionSigningReady (function, line 121)
    - Confidence: 98%
  - [x] buildAdminOpsHealth (function, line 130)
    - Confidence: 98%
  - [x] input.diagnosticsDocs.map callback (arrow, line 144)
    - Confidence: 98%
  - [x] input.diagnosticsDocs.map((doc) => {     const data = getDocData(doc);     return {       id: doc.id,       channel: toStringValue(data.channel) || "runtime",       severity: (toStringValue(data.severity) || "warn") as AdminOpsHealthDiagnosticItem["severity"],       message: toStringValue(data.message) || "Unknown diagnostic",       timestamp: toNumber(data.createdAtMs) || toTimestampNumber(data.createdAt),       detailPreview: buildDiagnosticPreview((data.detail as Record<string, unknown> | undefined) ?? {}),     };   }).sort callback (arrow, line 154)
    - Confidence: 98%
  - [x] diagnostics.reduce callback (arrow, line 156)
    - Confidence: 98%
  - [x] input.pipelineDocs.map callback (arrow, line 183)
    - Confidence: 98%
  - [x] pipelineDocs.reduce callback (arrow, line 195)
    - Confidence: 98%
  - [x] Object.entries(entry.routeCounts).forEach callback (arrow, line 196)
    - Confidence: 98%
  - [x] Array.from(routeCountMap.entries())     .map callback (arrow, line 203)
    - Confidence: 98%
  - [x] Array.from(routeCountMap.entries())     .map(([routeKey, count]) => ({       routeKey,       label: buildRouteLabel(routeKey),       count,     }))     .sort callback (arrow, line 208)
    - Confidence: 98%
  - [x] pipelineDocs.reduce callback (arrow, line 211)
    - Confidence: 98%
  - [x] pipelineDocs.sort callback (arrow, line 212)
    - Confidence: 98%
  - [x] materializers.filter callback (arrow, line 284)
    - Confidence: 98%
  - [x] materializers.filter callback (arrow, line 285)
    - Confidence: 98%
  - [x] diagnostics.filter callback (arrow, line 286)
    - Confidence: 98%
  - [x] diagnostics.filter callback (arrow, line 287)
    - Confidence: 98%
  - [x] diagnostics.filter callback (arrow, line 319)
    - Confidence: 98%
  - [x] Array.from(diagnosticsByChannel.values()).sort callback (arrow, line 321)
    - Confidence: 98%

## [x] src/lib/server/analytics-event-utils.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] resolveTrackedTelemetryEvent (function, line 11)
    - Confidence: 98%

## [x] src/lib/server/analytics-metrics.ts
- Confidence: 98%
- Functions detected: 56
- Functions:
  - [x] toNumber (function, line 67)
    - Confidence: 98%
  - [x] toStringValue (function, line 72)
    - Confidence: 98%
  - [x] normalizePagePath (function, line 76)
    - Confidence: 98%
  - [x] resolvePagePathFromFact (function, line 89)
    - Confidence: 98%
  - [x] resolveSessionIdFromFact (function, line 98)
    - Confidence: 98%
  - [x] resolveActorIdFromFact (function, line 110)
    - Confidence: 98%
  - [x] resolveSessionIdFromGuestBatch (function, line 130)
    - Confidence: 98%
  - [x] resolveActorIdFromGuestBatch (function, line 137)
    - Confidence: 98%
  - [x] getOrCreateSession (function, line 151)
    - Confidence: 98%
  - [x] applyPageSurface (function, line 189)
    - Confidence: 98%
  - [x] isPageViewEvent (function, line 238)
    - Confidence: 98%
  - [x] isClickLikeEvent (function, line 251)
    - Confidence: 98%
  - [x] buildSessionSummaries (function, line 265)
    - Confidence: 98%
  - [x] (input.eventFacts ?? []).forEach callback (arrow, line 268)
    - Confidence: 98%
  - [x] (input.guestBatches ?? []).forEach callback (arrow, line 310)
    - Confidence: 98%
  - [x] (batch.events ?? []).forEach callback (arrow, line 315)
    - Confidence: 98%
  - [x] buildViewerAccumulator (function, line 359)
    - Confidence: 98%
  - [x] (input.sessionFacts ?? []).forEach callback (arrow, line 367)
    - Confidence: 98%
  - [x] countMatchingSessions (function, line 391)
    - Confidence: 98%
  - [x] countMatchingActors (function, line 398)
    - Confidence: 98%
  - [x] sessions.forEach callback (arrow, line 403)
    - Confidence: 98%
  - [x] Array.from(actorSessions.values()).filter callback (arrow, line 413)
    - Confidence: 98%
  - [x] percent (function, line 417)
    - Confidence: 98%
  - [x] ratio (function, line 425)
    - Confidence: 98%
  - [x] createResult (function, line 433)
    - Confidence: 98%
  - [x] buildAnalyticsMetricReport (function, line 449)
    - Confidence: 98%
  - [x] Array.from(sessions.values()).reduce callback (arrow, line 455)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 456)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 457)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 458)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 459)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 460)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 461)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 464)
    - Confidence: 98%
  - [x] Array.from(sessions.values()).reduce callback (arrow, line 467)
    - Confidence: 98%
  - [x] countMatchingActors callback (arrow, line 470)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 474)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 476)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 477)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 478)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 479)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 482)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 485)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 488)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 492)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 496)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 500)
    - Confidence: 98%
  - [x] countMatchingActors callback (arrow, line 502)
    - Confidence: 98%
  - [x] countMatchingSessions callback (arrow, line 504)
    - Confidence: 98%
  - [x] Array.from(viewer.actorSessionCounts.values()).filter callback (arrow, line 512)
    - Confidence: 98%
  - [x] ANALYTICS_SOCIAL_METRIC_DEFINITIONS.map callback (arrow, line 730)
    - Confidence: 98%
  - [x] (["global", "user", "admin", "drop"] as AnalyticsMetricCategory[])     .map callback (arrow, line 732)
    - Confidence: 98%
  - [x] metrics.filter callback (arrow, line 735)
    - Confidence: 98%
  - [x] metrics.filter callback (arrow, line 744)
    - Confidence: 98%
  - [x] metrics.filter callback (arrow, line 745)
    - Confidence: 98%
  - [x] metrics.filter callback (arrow, line 746)
    - Confidence: 98%

## [x] src/lib/server/analytics-parity.ts
- Confidence: 98%
- Functions detected: 12
- Functions:
  - [x] clamp (function, line 29)
    - Confidence: 98%
  - [x] buildParityInsight (function, line 33)
    - Confidence: 98%
  - [x] sources     .map callback (arrow, line 41)
    - Confidence: 98%
  - [x] sources     .map((source) => Math.max(0, Math.round(source.count)))     .filter callback (arrow, line 42)
    - Confidence: 98%
  - [x] [...normalizedCounts].sort callback (arrow, line 54)
    - Confidence: 98%
  - [x] normalizedCounts.filter callback (arrow, line 60)
    - Confidence: 98%
  - [x] buildModuleCoverageReport (function, line 85)
    - Confidence: 98%
  - [x] input.sources.map callback (arrow, line 91)
    - Confidence: 98%
  - [x] normalizedSources.reduce callback (arrow, line 95)
    - Confidence: 98%
  - [x] normalizedSources.filter callback (arrow, line 96)
    - Confidence: 98%
  - [x] sumCountBuckets (function, line 122)
    - Confidence: 98%
  - [x] items.reduce callback (arrow, line 123)
    - Confidence: 98%

## [x] src/lib/server/analytics-pipeline-health.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] normalizeRouteKey (function, line 10)
    - Confidence: 98%
  - [x] recordAnalyticsPipelineFailure (function, line 14)
    - Confidence: 98%

## [x] src/lib/server/analytics-runtime.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] buildRuntimePayload (function, line 10)
    - Confidence: 98%
  - [x] markAnalyticsRuntimeChanged (function, line 18)
    - Confidence: 98%
  - [x] touchAnalyticsRuntime (function, line 33)
    - Confidence: 98%

## [x] src/lib/server/analytics-semantics.ts
- Confidence: 98%
- Functions detected: 17
- Functions:
  - [x] createEmptySummary (function, line 75)
    - Confidence: 98%
  - [x] asNumber (function, line 96)
    - Confidence: 98%
  - [x] asString (function, line 101)
    - Confidence: 98%
  - [x] createDocKey (function, line 105)
    - Confidence: 98%
  - [x] buildGuestSemanticDelta (function, line 110)
    - Confidence: 98%
  - [x] buildTelemetrySemanticDelta (function, line 151)
    - Confidence: 98%
  - [x] applyDelta (function, line 235)
    - Confidence: 98%
  - [x] buildSemanticCategorySummaries (function, line 266)
    - Confidence: 98%
  - [x] (input.eventFacts ?? []).some callback (arrow, line 273)
    - Confidence: 98%
  - [x] (input.eventFacts ?? []).some callback (arrow, line 274)
    - Confidence: 98%
  - [x] (input.eventFacts ?? []).some callback (arrow, line 275)
    - Confidence: 98%
  - [x] (input.eventFacts ?? []).forEach callback (arrow, line 277)
    - Confidence: 98%
  - [x] (input.guestBatches ?? []).forEach callback (arrow, line 310)
    - Confidence: 98%
  - [x] events.forEach callback (arrow, line 312)
    - Confidence: 98%
  - [x] (input.sessionFacts ?? []).forEach callback (arrow, line 342)
    - Confidence: 98%
  - [x] (["global", "user", "admin", "drop"] as AnalyticsSemanticCategory[]).map callback (arrow, line 358)
    - Confidence: 98%
  - [x] summarizeSecurityReason (function, line 363)
    - Confidence: 98%

## [x] src/lib/server/analytics.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] sanitizeServerParams (function, line 9)
    - Confidence: 98%
  - [x] Object.entries(params).forEach callback (arrow, line 12)
    - Confidence: 98%
  - [x] readStringParam (function, line 28)
    - Confidence: 98%
  - [x] readNumberParam (function, line 39)
    - Confidence: 98%
  - [x] trackServerEvent (function, line 50)
    - Confidence: 98%

## [x] src/lib/server/auth.ts
- Confidence: 98%
- Functions detected: 6
- Functions:
  - [x] sanitizeApiErrorLogValue (function, line 11)
    - Confidence: 98%
  - [x] buildApiErrorLogEntry (function, line 19)
    - Confidence: 98%
  - [x] verifyAuth (function, line 32)
    - Confidence: 98%
  - [x] verifyAdmin (function, line 56)
    - Confidence: 98%
  - [x] handleApiError (function, line 76)
    - Confidence: 98%
  - [x] constructor (constructor, line 108)
    - Confidence: 98%

## [x] src/lib/server/daily-tasks.ts
- Confidence: 98%
- Functions detected: 79
- Functions:
  - [x] readQuerySnapshot (function, line 72)
    - Confidence: 98%
  - [x] normalizeStringArray (function, line 83)
    - Confidence: 98%
  - [x] value.filter callback (arrow, line 88)
    - Confidence: 98%
  - [x] normalizeHistory (function, line 91)
    - Confidence: 98%
  - [x] Object.entries(value as Record<string, unknown>)       .filter callback (arrow, line 98)
    - Confidence: 98%
  - [x] Object.entries(value as Record<string, unknown>)       .filter(([, rawValue]) => Number.isFinite(rawValue))       .map callback (arrow, line 99)
    - Confidence: 98%
  - [x] stripUndefinedDeep (function, line 103)
    - Confidence: 98%
  - [x] value.map callback (arrow, line 105)
    - Confidence: 98%
  - [x] Object.entries(value as Record<string, unknown>)         .filter callback (arrow, line 111)
    - Confidence: 98%
  - [x] Object.entries(value as Record<string, unknown>)         .filter(([, entryValue]) => typeof entryValue !== "undefined")         .map callback (arrow, line 112)
    - Confidence: 98%
  - [x] normalizeTaskAssignment (function, line 119)
    - Confidence: 98%
  - [x] hydrateAssignment (function, line 158)
    - Confidence: 98%
  - [x] upgradeAssignment (function, line 168)
    - Confidence: 98%
  - [x] getCooldownMs (function, line 198)
    - Confidence: 98%
  - [x] shuffle (function, line 203)
    - Confidence: 98%
  - [x] pickTasksForCycle (function, line 214)
    - Confidence: 98%
  - [x] definitions.filter callback (arrow, line 222)
    - Confidence: 98%
  - [x] basePool.filter callback (arrow, line 286)
    - Confidence: 98%
  - [x] pool.filter callback (arrow, line 292)
    - Confidence: 98%
  - [x] pool.filter callback (arrow, line 293)
    - Confidence: 98%
  - [x] pushIfPossible (arrow, line 297)
    - Confidence: 98%
  - [x] selected.some callback (arrow, line 301)
    - Confidence: 98%
  - [x] shuffle(pool).forEach callback (arrow, line 316)
    - Confidence: 98%
  - [x] selected.some callback (arrow, line 317)
    - Confidence: 98%
  - [x] shuffle(basePool).forEach callback (arrow, line 324)
    - Confidence: 98%
  - [x] selected.some callback (arrow, line 325)
    - Confidence: 98%
  - [x] taskMatchesEvent (function, line 334)
    - Confidence: 98%
  - [x] rawValue.split("|").map callback (arrow, line 364)
    - Confidence: 98%
  - [x] criteria.includesAnyParam.values.some callback (arrow, line 365)
    - Confidence: 98%
  - [x] fetchCustomTaskDefinitions (function, line 391)
    - Confidence: 98%
  - [x] snapshot.docs.forEach callback (arrow, line 398)
    - Confidence: 98%
  - [x] createDefinitionMap (function, line 437)
    - Confidence: 98%
  - [x] definitions.map callback (arrow, line 438)
    - Confidence: 98%
  - [x] getUserDisplayName (function, line 441)
    - Confidence: 98%
  - [x] normalizeTaskState (function, line 453)
    - Confidence: 98%
  - [x] currentState.tasks       .map callback (arrow, line 461)
    - Confidence: 98%
  - [x] currentState.tasks       .map((task) => upgradeAssignment(task, definitionMap, nowMs))       .filter callback (arrow, line 462)
    - Confidence: 98%
  - [x] shouldRotateIncompleteCycle (function, line 478)
    - Confidence: 98%
  - [x] state.tasks.every callback (arrow, line 482)
    - Confidence: 98%
  - [x] shouldRotateCompletedCycle (function, line 498)
    - Confidence: 98%
  - [x] state.tasks.every callback (arrow, line 499)
    - Confidence: 98%
  - [x] buildRotatedState (function, line 507)
    - Confidence: 98%
  - [x] selectedDefinitions.map callback (arrow, line 525)
    - Confidence: 98%
  - [x] resolveTaskDefinitionsForUser (function, line 544)
    - Confidence: 98%
  - [x] resolveTaskEligibilityContext (function, line 549)
    - Confidence: 98%
  - [x] userData.unlockedContent.filter callback (arrow, line 556)
    - Confidence: 98%
  - [x] <anonymous arrow> (arrow, line 561)
    - Confidence: 98%
  - [x] snapshot.docs.some callback (arrow, line 570)
    - Confidence: 98%
  - [x] <anonymous arrow> (arrow, line 581)
    - Confidence: 98%
  - [x] snapshot.docs.some callback (arrow, line 591)
    - Confidence: 98%
  - [x] <anonymous arrow> (arrow, line 604)
    - Confidence: 98%
  - [x] unlockedContentIds.map callback (arrow, line 609)
    - Confidence: 98%
  - [x] dropRefs.map callback (arrow, line 610)
    - Confidence: 98%
  - [x] snapshots         .filter callback (arrow, line 615)
    - Confidence: 98%
  - [x] snapshots         .filter((snapshot) => snapshot.exists)         .map callback (arrow, line 616)
    - Confidence: 98%
  - [x] unlockedDropDocs.some callback (arrow, line 624)
    - Confidence: 98%
  - [x] drop.contentUrls.filter callback (arrow, line 627)
    - Confidence: 98%
  - [x] unlockedDropDocs.some callback (arrow, line 637)
    - Confidence: 98%
  - [x] buildFreshTaskStateForUser (function, line 654)
    - Confidence: 98%
  - [x] normalizedState.tasks.filter callback (arrow, line 677)
    - Confidence: 98%
  - [x] incrementEventStat (function, line 700)
    - Confidence: 98%
  - [x] writeTaskLifecycleEvent (function, line 714)
    - Confidence: 98%
  - [x] buildTaskReceiptDocId (function, line 737)
    - Confidence: 98%
  - [x] buildDefaultReceiptKey (function, line 741)
    - Confidence: 98%
  - [x] queueUserNotification (function, line 759)
    - Confidence: 98%
  - [x] applyRotationSideEffects (function, line 786)
    - Confidence: 98%
  - [x] result.assignedTasks.forEach callback (arrow, line 798)
    - Confidence: 98%
  - [x] result.failedTasks.forEach callback (arrow, line 820)
    - Confidence: 98%
  - [x] rotateUserTasks (function, line 855)
    - Confidence: 98%
  - [x] adminDb.runTransaction callback (arrow, line 860)
    - Confidence: 98%
  - [x] recordTelemetryEventStat (function, line 900)
    - Confidence: 98%
  - [x] recordCanonicalTaskEvent (function, line 910)
    - Confidence: 98%
  - [x] recordDailyTaskProgressFromEvent (function, line 925)
    - Confidence: 98%
  - [x] adminDb.runTransaction callback (arrow, line 944)
    - Confidence: 98%
  - [x] updatedTasks.forEach callback (arrow, line 988)
    - Confidence: 98%
  - [x] updatedTasks.forEach callback (arrow, line 1099)
    - Confidence: 98%
  - [x] syncUserTaskReminder (function, line 1150)
    - Confidence: 98%
  - [x] adminDb.runTransaction callback (arrow, line 1156)
    - Confidence: 98%
  - [x] result.state.tasks.filter callback (arrow, line 1167)
    - Confidence: 98%

## [x] src/lib/server/drop-queue.ts
- Confidence: 98%
- Functions detected: 11
- Functions:
  - [x] normalizeTimesPerDay (function, line 20)
    - Confidence: 98%
  - [x] timesPerDay.filter callback (arrow, line 22)
    - Confidence: 98%
  - [x] [...rawTimes].sort callback (arrow, line 24)
    - Confidence: 98%
  - [x] Array.from callback (arrow, line 27)
    - Confidence: 98%
  - [x] normalizeQueueConfig (function, line 40)
    - Confidence: 98%
  - [x] raw.queue.filter callback (arrow, line 44)
    - Confidence: 98%
  - [x] getLegacyQueuedDropIds (function, line 55)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 61)
    - Confidence: 98%
  - [x] getResolvedQueueConfig (function, line 64)
    - Confidence: 98%
  - [x] saveResolvedQueueConfig (function, line 81)
    - Confidence: 98%
  - [x] setDropQueueMembership (function, line 91)
    - Confidence: 98%

## [x] src/lib/server/drop-references.ts
- Confidence: 98%
- Functions detected: 9
- Functions:
  - [x] normalizeDropReference (function, line 10)
    - Confidence: 98%
  - [x] getDropReferenceMap (function, line 19)
    - Confidence: 98%
  - [x] dropIds.map callback (arrow, line 20)
    - Confidence: 98%
  - [x] uniqueIds.map callback (arrow, line 26)
    - Confidence: 98%
  - [x] snapshots       .filter callback (arrow, line 38)
    - Confidence: 98%
  - [x] snapshots       .filter((entry): entry is DropReference => !!entry)       .map callback (arrow, line 39)
    - Confidence: 98%
  - [x] getAllDropReferenceMap (function, line 43)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 46)
    - Confidence: 98%
  - [x] resolveDropTitle (function, line 50)
    - Confidence: 98%

## [x] src/lib/server/drop-runtime.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] buildRuntimePayload (function, line 10)
    - Confidence: 98%
  - [x] markDropsRuntimeChanged (function, line 18)
    - Confidence: 98%
  - [x] touchDropsRuntime (function, line 29)
    - Confidence: 98%

## [x] src/lib/server/drops.ts
- Confidence: 98%
- Functions detected: 7
- Functions:
  - [x] resolveDropStatus (function, line 12)
    - Confidence: 98%
  - [x] sanitizeDropForClient (function, line 20)
    - Confidence: 98%
  - [x] drop.contentUrls.map callback (arrow, line 22)
    - Confidence: 98%
  - [x] cache callback (arrow, line 28)
    - Confidence: 98%
  - [x] snapshot.docs.map callback (arrow, line 36)
    - Confidence: 98%
  - [x] cache callback (arrow, line 50)
    - Confidence: 98%
  - [x] getDropRaw (function, line 71)
    - Confidence: 98%

## [x] src/lib/server/fcm-utils.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] broadcastFCM (function, line 14)
    - Confidence: 98%

## [x] src/lib/server/firebase-admin.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/server/notification-inbox.ts
- Confidence: 98%
- Functions detected: 8
- Functions:
  - [x] toTimestampNumber (function, line 30)
    - Confidence: 98%
  - [x] isNotificationVisibleToUser (function, line 47)
    - Confidence: 98%
  - [x] isUnreadNotificationForUser (function, line 67)
    - Confidence: 98%
  - [x] normalizeInboxEntry (function, line 79)
    - Confidence: 98%
  - [x] fetchUnreadNotificationsForUser (function, line 96)
    - Confidence: 98%
  - [x] snapshot.docs.forEach callback (arrow, line 127)
    - Confidence: 98%
  - [x] results     .sort callback (arrow, line 140)
    - Confidence: 98%
  - [x] hasUnreadNotificationsForUser (function, line 144)
    - Confidence: 98%

## [x] src/lib/server/notification-runtime.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] buildRuntimePayload (function, line 10)
    - Confidence: 98%
  - [x] markNotificationsRuntimeChanged (function, line 18)
    - Confidence: 98%
  - [x] touchNotificationsRuntime (function, line 29)
    - Confidence: 98%

## [x] src/lib/server/privacy-consent.ts
- Confidence: 98%
- Functions detected: 4
- Functions:
  - [x] requestHasGlobalPrivacyControl (function, line 6)
    - Confidence: 98%
  - [x] requestAllowsAnonymousAnalytics (function, line 10)
    - Confidence: 98%
  - [x] profileAllowsAnonymousAnalytics (function, line 18)
    - Confidence: 98%
  - [x] profileAllowsIdentifiedAnalytics (function, line 30)
    - Confidence: 98%

## [x] src/lib/server/push-notifications.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] reserveDropActivationNotification (function, line 10)
    - Confidence: 98%
  - [x] adminDb.runTransaction callback (arrow, line 18)
    - Confidence: 98%
  - [x] queueDropNotificationDoc (function, line 42)
    - Confidence: 98%
  - [x] sendGlobalDropNotification (function, line 70)
    - Confidence: 98%
  - [x] sendTargetedDropNotification (function, line 104)
    - Confidence: 98%

## [x] src/lib/server/rate-limit.ts
- Confidence: 98%
- Functions detected: 11
- Functions:
  - [x] maybeCleanupLocal (function, line 35)
    - Confidence: 98%
  - [x] maybeCleanupRemote (function, line 47)
    - Confidence: 98%
  - [x] <anonymous arrow> (arrow, line 58)
    - Confidence: 98%
  - [x] snapshot.docs.forEach callback (arrow, line 71)
    - Confidence: 98%
  - [x] constructor (constructor, line 89)
    - Confidence: 98%
  - [x] resolveCallerIdentifier (function, line 102)
    - Confidence: 98%
  - [x] buildDocumentId (function, line 111)
    - Confidence: 98%
  - [x] checkRateLimitLocally (function, line 117)
    - Confidence: 98%
  - [x] checkRateLimit (function, line 148)
    - Confidence: 98%
  - [x] adminDb.runTransaction callback (arrow, line 168)
    - Confidence: 98%
  - [x] buildRateLimitResponse (function, line 195)
    - Confidence: 98%

## [x] src/lib/server/request-guard.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] guardApiRequest (function, line 24)
    - Confidence: 98%

## [x] src/lib/server/request-origin.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] getHost (function, line 5)
    - Confidence: 98%
  - [x] hasTrustedSiteOrigin (function, line 17)
    - Confidence: 98%

## [x] src/lib/server/server-diagnostics.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] sanitizeDetail (function, line 23)
    - Confidence: 98%
  - [x] Object.entries(detail)     .slice(0, 20)     .forEach callback (arrow, line 31)
    - Confidence: 98%
  - [x] recordServerDiagnostic (function, line 53)
    - Confidence: 98%

## [x] src/lib/server/user-runtime.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] buildRuntimePatch (function, line 17)
    - Confidence: 98%
  - [x] Object.entries(options)     .filter callback (arrow, line 25)
    - Confidence: 98%
  - [x] Object.entries(options)     .filter(([, enabled]) => enabled === true)     .map callback (arrow, line 26)
    - Confidence: 98%
  - [x] keys.forEach callback (arrow, line 28)
    - Confidence: 98%
  - [x] touchUserRuntime (function, line 36)
    - Confidence: 98%

## [x] src/lib/server/username-suggestions.ts
- Confidence: 98%
- Functions detected: 5
- Functions:
  - [x] buildFallbackUsername (function, line 4)
    - Confidence: 98%
  - [x] isUsernameAvailable (function, line 8)
    - Confidence: 98%
  - [x] generateUniqueUsernameSuggestion (function, line 30)
    - Confidence: 98%
  - [x] [         normalizeUsername(input.preferredUsername),         ...buildUsernameBaseCandidates({ displayName: input.displayName, email: input.email }),         normalizeUsername(buildFallbackUsername(input.uid)),     ].filter callback (arrow, line 41)
    - Confidence: 98%
  - [x] checkUsernameAvailability (function, line 65)
    - Confidence: 98%

## [x] src/lib/site-origin.ts
- Confidence: 98%
- Functions detected: 10
- Functions:
  - [x] normalizeOrigin (function, line 6)
    - Confidence: 98%
  - [x] tryGetHost (function, line 10)
    - Confidence: 98%
  - [x] resolveSiteOrigin (function, line 22)
    - Confidence: 98%
  - [x] parseOriginList (function, line 35)
    - Confidence: 98%
  - [x] value         .split(",")         .map callback (arrow, line 42)
    - Confidence: 98%
  - [x] getConfiguredSiteOrigins (function, line 47)
    - Confidence: 98%
  - [x] [             process.env.NEXT_PUBLIC_APP_URL,             process.env.APP_URL,         ]             .map callback (arrow, line 54)
    - Confidence: 98%
  - [x] [             process.env.NEXT_PUBLIC_APP_URL,             process.env.APP_URL,         ]             .map((origin) => origin?.trim())             .filter callback (arrow, line 55)
    - Confidence: 98%
  - [x] getConfiguredSiteHosts (function, line 65)
    - Confidence: 98%
  - [x] configuredOrigins.forEach callback (arrow, line 69)
    - Confidence: 98%

## [x] src/lib/task-guidance.ts
- Confidence: 98%
- Functions detected: 16
- Functions:
  - [x] readLocalStorageValue (function, line 35)
    - Confidence: 98%
  - [x] writeLocalStorageValue (function, line 48)
    - Confidence: 98%
  - [x] isTaskGuidanceActionType (function, line 61)
    - Confidence: 98%
  - [x] getTaskDestinationPath (function, line 68)
    - Confidence: 98%
  - [x] focusTaskDestinationAnchor (function, line 73)
    - Confidence: 98%
  - [x] isSamePageTaskViewEvent (function, line 93)
    - Confidence: 98%
  - [x] readTaskGuidancePendingAction (function, line 100)
    - Confidence: 98%
  - [x] writeTaskGuidancePendingAction (function, line 123)
    - Confidence: 98%
  - [x] formatTaskCountLabel (function, line 127)
    - Confidence: 98%
  - [x] createTaskGuidancePendingAction (function, line 131)
    - Confidence: 98%
  - [x] findCurrentTaskGuidanceTask (function, line 145)
    - Confidence: 98%
  - [x] tasks.find callback (arrow, line 153)
    - Confidence: 98%
  - [x] getTaskInstruction (function, line 159)
    - Confidence: 98%
  - [x] getTaskActionLabel (function, line 267)
    - Confidence: 98%
  - [x] getTaskDestinationHref (function, line 371)
    - Confidence: 98%
  - [x] createTaskGuidanceState (function, line 394)
    - Confidence: 98%

## [x] src/lib/tasks/task-catalog.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] createTask (function, line 118)
    - Confidence: 98%
  - [x] BUILT_IN_DAILY_TASKS.map callback (arrow, line 787)
    - Confidence: 98%

## [x] src/lib/telemetry-catalog.ts
- Confidence: 98%
- Functions detected: 9
- Functions:
  - [x] TELEMETRY_EVENT_OPTIONS.map callback (arrow, line 392)
    - Confidence: 98%
  - [x] TELEMETRY_EVENT_OPTIONS.map callback (arrow, line 396)
    - Confidence: 98%
  - [x] TELEMETRY_EVENT_OPTIONS.flatMap callback (arrow, line 400)
    - Confidence: 98%
  - [x] (event.aliases ?? []).map callback (arrow, line 400)
    - Confidence: 98%
  - [x] TELEMETRY_EVENT_OPTIONS.flatMap callback (arrow, line 404)
    - Confidence: 98%
  - [x] (event.aliases ?? []).map callback (arrow, line 406)
    - Confidence: 98%
  - [x] normalizeTelemetryEventName (function, line 437)
    - Confidence: 98%
  - [x] getTelemetryEventOption (function, line 441)
    - Confidence: 98%
  - [x] buildTelemetryEventMetadata (function, line 449)
    - Confidence: 98%

## [x] src/lib/telemetry.ts
- Confidence: 98%
- Functions detected: 29
- Functions:
  - [x] BUILT_IN_DAILY_TASKS.map callback (arrow, line 19)
    - Confidence: 98%
  - [x] sanitizeEventParams (function, line 37)
    - Confidence: 98%
  - [x] Object.entries(eventParams).forEach callback (arrow, line 44)
    - Confidence: 98%
  - [x] readJsonStorage (function, line 60)
    - Confidence: 98%
  - [x] writeJsonStorage (function, line 73)
    - Confidence: 98%
  - [x] ensureTelemetryQueueLoaded (function, line 85)
    - Confidence: 98%
  - [x] persistedQueue.filter callback (arrow, line 102)
    - Confidence: 98%
  - [x] persistTelemetryQueue (function, line 110)
    - Confidence: 98%
  - [x] clearPersistedTelemetryQueue (function, line 121)
    - Confidence: 98%
  - [x] getSessionId (function, line 133)
    - Confidence: 98%
  - [x] getEnrichedEventParams (function, line 137)
    - Confidence: 98%
  - [x] readFlowMap (function, line 165)
    - Confidence: 98%
  - [x] writeFlowMap (function, line 169)
    - Confidence: 98%
  - [x] startTimedFlow (function, line 173)
    - Confidence: 98%
  - [x] clearTimedFlow (function, line 186)
    - Confidence: 98%
  - [x] consumeTimedFlow (function, line 200)
    - Confidence: 98%
  - [x] clearTelemetryFlushTimeout (function, line 224)
    - Confidence: 98%
  - [x] flushQueuedTelemetry (function, line 233)
    - Confidence: 98%
  - [x] authFetch("/api/telemetry/track", {         method: "POST",         keepalive: reason !== "scheduled",         body: JSON.stringify({ events: batch }),     }).then callback (arrow, line 269)
    - Confidence: 98%
  - [x] response.json().catch callback (arrow, line 271)
    - Confidence: 98%
  - [x] authFetch("/api/telemetry/track", {         method: "POST",         keepalive: reason !== "scheduled",         body: JSON.stringify({ events: batch }),     }).then(async (response) => {         if (!response.ok) {             const result = await response.json().catch(() => ({}));             throw new Error(typeof result?.error === "string" ? result.error : "Telemetry batch failed");         }     }).catch callback (arrow, line 274)
    - Confidence: 98%
  - [x] authFetch("/api/telemetry/track", {         method: "POST",         keepalive: reason !== "scheduled",         body: JSON.stringify({ events: batch }),     }).then(async (response) => {         if (!response.ok) {             const result = await response.json().catch(() => ({}));             throw new Error(typeof result?.error === "string" ? result.error : "Telemetry batch failed");         }     }).catch((error) => {         telemetryQueue = [...batch, ...telemetryQueue].slice(-50);         persistTelemetryQueue();         recordClientDiagnostic("telemetry", "Identified telemetry batch failed", {             reason,             batchSize: batch.length,             message: error instanceof Error ? error.message : String(error),         });         console.error("[Telemetry] Failed to flush queued telemetry:", error);     }).finally callback (arrow, line 283)
    - Confidence: 98%
  - [x] window.setTimeout callback (arrow, line 290)
    - Confidence: 98%
  - [x] ensureTelemetryLifecycleFlush (function, line 296)
    - Confidence: 98%
  - [x] flushOnPageHide (arrow, line 302)
    - Confidence: 98%
  - [x] flushOnVisibilityHidden (arrow, line 305)
    - Confidence: 98%
  - [x] enqueueIdentifiedTelemetryEvent (function, line 315)
    - Confidence: 98%
  - [x] window.setTimeout callback (arrow, line 345)
    - Confidence: 98%
  - [x] trackEvent (function, line 350)
    - Confidence: 98%

## [x] src/lib/timezone.ts
- Confidence: 98%
- Functions detected: 18
- Functions:
  - [x] pad (function, line 44)
    - Confidence: 98%
  - [x] buildComparableUtc (function, line 48)
    - Confidence: 98%
  - [x] extractCentralDateParts (function, line 52)
    - Confidence: 98%
  - [x] lookup (arrow, line 54)
    - Confidence: 98%
  - [x] parts.find callback (arrow, line 55)
    - Confidence: 98%
  - [x] parseCentralOffsetMs (function, line 70)
    - Confidence: 98%
  - [x] parts.find callback (arrow, line 72)
    - Confidence: 98%
  - [x] resolveCentralLocalToUtc (function, line 84)
    - Confidence: 98%
  - [x] shiftCentralDate (function, line 100)
    - Confidence: 98%
  - [x] getCSTDateParts (function, line 109)
    - Confidence: 98%
  - [x] getCSTDateKey (function, line 113)
    - Confidence: 98%
  - [x] shiftCSTDateKey (function, line 118)
    - Confidence: 98%
  - [x] toCSTString (function, line 128)
    - Confidence: 98%
  - [x] fromCSTInput (function, line 137)
    - Confidence: 98%
  - [x] getCSTDayBoundaries (function, line 175)
    - Confidence: 98%
  - [x] isSameCSTDay (function, line 199)
    - Confidence: 98%
  - [x] isPreviousCSTDay (function, line 208)
    - Confidence: 98%
  - [x] getDefaultCSTDates (function, line 238)
    - Confidence: 98%

## [x] src/lib/transaction-normalizers.ts
- Confidence: 98%
- Functions detected: 4
- Functions:
  - [x] normalizeTimestamp (function, line 50)
    - Confidence: 98%
  - [x] normalizeType (function, line 77)
    - Confidence: 98%
  - [x] normalizeTransactionRecord (function, line 97)
    - Confidence: 98%
  - [x] getTransactionRevenueCents (function, line 137)
    - Confidence: 98%

## [x] src/lib/user-profile-validation.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] parseAdultDateOfBirth (function, line 1)
    - Confidence: 98%

## [x] src/lib/user-runtime.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/lib/user-utils.ts
- Confidence: 98%
- Functions detected: 16
- Functions:
  - [x] normalizeUsername (function, line 9)
    - Confidence: 98%
  - [x] buildUsernameBaseCandidates (function, line 23)
    - Confidence: 98%
  - [x] pushCandidate (arrow, line 26)
    - Confidence: 98%
  - [x] displayName             .split(/[\s._]+/)             .map callback (arrow, line 38)
    - Confidence: 98%
  - [x] displayName             .split(/[\s._]+/)             .map((part) => normalizeUsername(part))             .filter callback (arrow, line 39)
    - Confidence: 98%
  - [x] normalizeUserProfile (function, line 67)
    - Confidence: 98%
  - [x] toStringArray (arrow, line 74)
    - Confidence: 98%
  - [x] value.filter callback (arrow, line 75)
    - Confidence: 98%
  - [x] toStringNumberRecord (arrow, line 77)
    - Confidence: 98%
  - [x] entries             .filter callback (arrow, line 84)
    - Confidence: 98%
  - [x] entries             .filter(([key, entry]) => typeof key === "string" && Number.isFinite(entry))             .map callback (arrow, line 85)
    - Confidence: 98%
  - [x] source.dailyTasksState.tasks.reduce callback (arrow, line 150)
    - Confidence: 98%
  - [x] Object.entries(source.dailyTasksState.completedTaskHistory as Record<string, unknown>)                         .filter callback (arrow, line 206)
    - Confidence: 98%
  - [x] Object.entries(source.dailyTasksState.completedTaskHistory as Record<string, unknown>)                         .filter(([, rawValue]) => Number.isFinite(rawValue))                         .map callback (arrow, line 207)
    - Confidence: 98%
  - [x] Object.entries(source.securityFlags.reasonCounts as Record<string, unknown>)                         .filter callback (arrow, line 220)
    - Confidence: 98%
  - [x] Object.entries(source.securityFlags.reasonCounts as Record<string, unknown>)                         .filter(([, rawValue]) => Number.isFinite(rawValue))                         .map callback (arrow, line 221)
    - Confidence: 98%

## [x] src/lib/utils.ts
- Confidence: 98%
- Functions detected: 1
- Functions:
  - [x] cn (function, line 4)
    - Confidence: 98%

## [x] src/types/analytics.ts
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/types/db.ts
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] src/types/gtag.d.ts
- Confidence: 99%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 99%

## [x] STANDARDIZATION_AUDIT_CHECKLIST.md
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] tests/auth.spec.ts
- Confidence: 97%
- Functions detected: 2
- Functions:
  - [x] test.describe callback (arrow, line 3)
    - Confidence: 97%
  - [x] test callback (arrow, line 4)
    - Confidence: 97%

## [x] tests/contracts/analytics-export-contract.spec.ts
- Confidence: 97%
- Functions detected: 8
- Functions:
  - [x] describe callback (arrow, line 51)
    - Confidence: 97%
  - [x] it callback (arrow, line 69)
    - Confidence: 97%
  - [x] it callback (arrow, line 73)
    - Confidence: 97%
  - [x] REQUIRED_EXPORT_MUTATIONS.forEach callback (arrow, line 74)
    - Confidence: 97%
  - [x] it callback (arrow, line 79)
    - Confidence: 97%
  - [x] REQUIRED_EXPORT_QUERIES.forEach callback (arrow, line 80)
    - Confidence: 97%
  - [x] it callback (arrow, line 85)
    - Confidence: 97%
  - [x] [       "onAnalyticsAlertsExportMirror",       "onAnalyticsBundleDailyExportSync",       "onAnalyticsCommerceDailyExportSync",       "onAnalyticsCommerceRollupExportSync",       "onAnalyticsDropDailyExportSync",       "onAnalyticsPageDailyExportSync",       "onAnalyticsSecurityDailyExportSync",       "onAnalyticsTaskDailyExportSync",       "onAnalyticsTaskRollupExportSync",       "onAnalyticsUserDailyExportSync",       "onAnalyticsUserRollupExportSync",       "onAnalyticsUserSecurityRollupExportSync",     ].forEach callback (arrow, line 99)
    - Confidence: 97%

## [x] tests/contracts/telemetry-contracts.spec.ts
- Confidence: 97%
- Functions detected: 13
- Functions:
  - [x] describe callback (arrow, line 15)
    - Confidence: 97%
  - [x] it callback (arrow, line 16)
    - Confidence: 97%
  - [x] it callback (arrow, line 22)
    - Confidence: 97%
  - [x] aliases.forEach callback (arrow, line 28)
    - Confidence: 97%
  - [x] it callback (arrow, line 33)
    - Confidence: 97%
  - [x] TELEMETRY_MODULE_INDEXES.forEach callback (arrow, line 36)
    - Confidence: 97%
  - [x] moduleIndex.eventNames.forEach callback (arrow, line 37)
    - Confidence: 97%
  - [x] it callback (arrow, line 43)
    - Confidence: 97%
  - [x] TELEMETRY_EVENT_NAMES.forEach callback (arrow, line 44)
    - Confidence: 97%
  - [x] Object.keys(TELEMETRY_EVENT_ALIAS_MAP).forEach callback (arrow, line 48)
    - Confidence: 97%
  - [x] describe callback (arrow, line 54)
    - Confidence: 97%
  - [x] it callback (arrow, line 55)
    - Confidence: 97%
  - [x] it callback (arrow, line 75)
    - Confidence: 97%

## [x] tests/drops.spec.ts
- Confidence: 97%
- Functions detected: 2
- Functions:
  - [x] test.describe callback (arrow, line 3)
    - Confidence: 97%
  - [x] test callback (arrow, line 4)
    - Confidence: 97%

## [x] tests/launch-qa.spec.ts
- Confidence: 97%
- Functions detected: 48
- Functions:
  - [x] waitForGuestShell (function, line 6)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 11)
    - Confidence: 97%
  - [x] test callback (arrow, line 12)
    - Confidence: 97%
  - [x] test callback (arrow, line 19)
    - Confidence: 97%
  - [x] test callback (arrow, line 33)
    - Confidence: 97%
  - [x] test callback (arrow, line 39)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 48)
    - Confidence: 97%
  - [x] test callback (arrow, line 49)
    - Confidence: 97%
  - [x] test callback (arrow, line 57)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 64)
    - Confidence: 97%
  - [x] test callback (arrow, line 65)
    - Confidence: 97%
  - [x] test callback (arrow, line 71)
    - Confidence: 97%
  - [x] test callback (arrow, line 78)
    - Confidence: 97%
  - [x] page.getByText(/sign in/i).first().isVisible().catch callback (arrow, line 82)
    - Confidence: 97%
  - [x] page.locator("nav button").last().isVisible().catch callback (arrow, line 83)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 89)
    - Confidence: 97%
  - [x] test callback (arrow, line 90)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 99)
    - Confidence: 97%
  - [x] test callback (arrow, line 100)
    - Confidence: 97%
  - [x] signIn.isVisible().catch callback (arrow, line 105)
    - Confidence: 97%
  - [x] page.locator("[role=\"dialog\"], .fixed").first().isVisible().catch callback (arrow, line 112)
    - Confidence: 97%
  - [x] page.locator("input[type=\"email\"]").first().isVisible().catch callback (arrow, line 113)
    - Confidence: 97%
  - [x] page.getByText(/google/i).first().isVisible().catch callback (arrow, line 114)
    - Confidence: 97%
  - [x] test callback (arrow, line 119)
    - Confidence: 97%
  - [x] signIn.isVisible().catch callback (arrow, line 124)
    - Confidence: 97%
  - [x] closeButton.isVisible().catch callback (arrow, line 132)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 142)
    - Confidence: 97%
  - [x] test callback (arrow, line 143)
    - Confidence: 97%
  - [x] newButton.isVisible().catch callback (arrow, line 149)
    - Confidence: 97%
  - [x] test callback (arrow, line 158)
    - Confidence: 97%
  - [x] searchInput.isVisible().catch callback (arrow, line 164)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 174)
    - Confidence: 97%
  - [x] test callback (arrow, line 192)
    - Confidence: 97%
  - [x] test callback (arrow, line 201)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 207)
    - Confidence: 97%
  - [x] test callback (arrow, line 210)
    - Confidence: 97%
  - [x] test callback (arrow, line 217)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 225)
    - Confidence: 97%
  - [x] test callback (arrow, line 228)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 240)
    - Confidence: 97%
  - [x] test callback (arrow, line 241)
    - Confidence: 97%
  - [x] page.evaluate callback (arrow, line 245)
    - Confidence: 97%
  - [x] test callback (arrow, line 249)
    - Confidence: 97%
  - [x] image.evaluate callback (arrow, line 263)
    - Confidence: 97%
  - [x] test.describe callback (arrow, line 271)
    - Confidence: 97%
  - [x] test callback (arrow, line 272)
    - Confidence: 97%
  - [x] test callback (arrow, line 280)
    - Confidence: 97%
  - [x] page.evaluate callback (arrow, line 284)
    - Confidence: 97%

## [x] tests/qa-audit.spec.ts
- Confidence: 97%
- Functions detected: 6
- Functions:
  - [x] captureWithViewport (function, line 18)
    - Confidence: 97%
  - [x] page.waitForFunction callback (arrow, line 41)
    - Confidence: 97%
  - [x] page.waitForFunction(() => {                 const backgroundColor = getComputedStyle(document.body).backgroundColor;                 return backgroundColor !== "rgba(0, 0, 0, 0)"                     && backgroundColor !== "rgb(255, 255, 255)"                     && backgroundColor !== "";             }, { timeout: 15_000 }).catch callback (arrow, line 46)
    - Confidence: 97%
  - [x] test callback (arrow, line 68)
    - Confidence: 97%
  - [x] test callback (arrow, line 72)
    - Confidence: 97%
  - [x] test callback (arrow, line 76)
    - Confidence: 97%

## [x] tests/visual.spec.ts
- Confidence: 97%
- Functions detected: 4
- Functions:
  - [x] test.describe callback (arrow, line 3)
    - Confidence: 97%
  - [x] test callback (arrow, line 5)
    - Confidence: 97%
  - [x] test callback (arrow, line 17)
    - Confidence: 97%
  - [x] test callback (arrow, line 28)
    - Confidence: 97%

## [x] tests/visual.spec.ts-snapshots/admin-login-chromium-win32.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] tests/visual.spec.ts-snapshots/drops-grid-chromium-win32.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] tests/visual.spec.ts-snapshots/home-hero-chromium-win32.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] tests/visual.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png
- Confidence: 97%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 97%

## [x] tsconfig.json
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] vitest.config.ts
- Confidence: 98%
- Functions detected: 0
- Functions:
  - [x] None detected
    - Confidence: 98%

## [x] src/app/api/admin/ui-chart-health/route.ts
- Confidence: 98%
- Functions detected: 3
- Functions:
  - [x] isAdminUiChartHealthItem (function, line 11)
    - Confidence: 98%
  - [x] GET (function, line 29)
    - Confidence: 98%
  - [x] PUT (function, line 47)
    - Confidence: 98%

## [x] src/hooks/useAdminUiChartHealthReporter.ts
- Confidence: 98%
- Functions detected: 2
- Functions:
  - [x] normalizeItems (function, line 9)
    - Confidence: 98%
  - [x] useAdminUiChartHealthReporter (function, line 17)
    - Confidence: 98%

## [x] src/lib/admin-ui-chart-health.ts
- Confidence: 97%
- Functions detected: 3
- Functions:
  - [x] getAdminUiChartHealthTone (function, line 60)
    - Confidence: 97%
  - [x] buildAdminUiChartHealthItem (function, line 72)
    - Confidence: 97%
  - [x] summarizeAdminUiChartHealth (function, line 159)
    - Confidence: 97%

## [x] src/lib/server/admin-ui-chart-health.ts
- Confidence: 97%
- Functions detected: 4
- Functions:
  - [x] arraysMatch (function, line 14)
    - Confidence: 97%
  - [x] toNumber (function, line 18)
    - Confidence: 97%
  - [x] saveAdminUiChartHealth (function, line 22)
    - Confidence: 97%
  - [x] listAdminUiChartHealth (function, line 76)
    - Confidence: 97%

## [x] tests/unit/admin-panel-system-logs.spec.ts
- Confidence: 97%
- Functions detected: 3
- Functions:
  - [x] describe callback (arrow, line 5)
    - Confidence: 97%
  - [x] it callback (arrow, line 6)
    - Confidence: 97%
  - [x] it callback (arrow, line 68)
    - Confidence: 97%

## [x] tests/unit/admin-ui-chart-health-route.spec.ts
- Confidence: 97%
- Functions detected: 6
- Functions:
  - [x] mockState.reset (function, line 9)
    - Confidence: 97%
  - [x] describe callback (arrow, line 31)
    - Confidence: 97%
  - [x] beforeEach callback (arrow, line 32)
    - Confidence: 97%
  - [x] it callback (arrow, line 58)
    - Confidence: 97%
  - [x] it callback (arrow, line 72)
    - Confidence: 97%
  - [x] it callback (arrow, line 107)
    - Confidence: 97%

## [x] tests/unit/admin-ui-chart-health.spec.ts
- Confidence: 97%
- Functions detected: 3
- Functions:
  - [x] describe callback (arrow, line 5)
    - Confidence: 97%
  - [x] it callback (arrow, line 6)
    - Confidence: 97%
  - [x] it callback (arrow, line 36)
    - Confidence: 97%

## Newly Detected Files (Pending Full Audit Analysis)

### `.storybook/main.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `.storybook/preview.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `cypress.config.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/eslint.config.js`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-core.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-event-facts.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-guest-batches.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-security-events.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-semantics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-task-events.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/analytics-transactions.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/firebase-admin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/firebase-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/gumdrop-economics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/index.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-contract.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-diagnostics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-engine.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-identity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-parity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-readiness.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-routing.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/orchestration-utils.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/queue-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `functions/src/runtime-warning-store.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `makeAdmin.js`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `middleware.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `next.config.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `playwright.config.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `public/firebase-messaging-sw.js`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/build-agent-indexes.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/build-task-context.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/build-ui-runtime-audit.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/build-ui-surface-coverage.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/check-agent-context.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/check-ui-surface-coverage.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/classify-repo-files.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/extract-canonical-helpers.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/extract-governance.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/extract-runtime-observability.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/extract-workflow.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/run-evals.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/shared.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/summarize-dependency-graph.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/sync-sql.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/agent/validate-agent-indexes.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/audit-telemetry.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/backfill-analytics-parity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/bench-process-queue-drops.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-analytics-semantics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-cycles.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-firebase-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-generated-artifacts.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-queue-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-runtime-continuity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-scheduler-freshness.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/check-warnings.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/export-dependency-graph.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/promote-admin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/refresh-paypal-mcp-token.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/replace-colors.js`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/repo-inventory.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/review-admin-panel-logs.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/run-database-rules-tests.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/run-firestore-rules-tests.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/run-storage-rules-tests.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/runtime-admin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `scripts/trace-adjacent-surfaces.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `shared/runtime/drop-queue-lifecycle.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `shared/runtime/drop-queue-schedule.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `shared/runtime/drop-status.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `shared/runtime/queue-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `shared/runtime/runtime-warning-contract.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `shared/runtime/timezone.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/%5F%5F/auth/[...path]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/%5F%5F/firebase/[...path]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/(legal)/privacy/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/(legal)/terms/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/HomeClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/ai/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/analytics/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/content/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/debug/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/drops/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/economy/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/error.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/layout.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/loading.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/moderation/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/queue/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/roster/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/support/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/user/[userId]/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/admin/users/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-covers/feedback/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-covers/generate/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-covers/prompt-policy/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-covers/references/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-covers/review-gallery/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-covers/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-covers/template/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-descriptions/feedback/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-descriptions/generate/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-descriptions/prompt-policy/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ai/drop-descriptions/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/analytics/historical/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/analytics/preferences/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/analytics/realtime/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/analytics/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/balance/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/content/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/creator-options/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/debug/assistant/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/debug/preferences/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/debug/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/drops/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/feedback/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/moderation/security-alerts/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/moderation/threads/[threadId]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/moderation/threads/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/orchestration/repairs/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/overview/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/queue/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/queue/toggle/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/roster/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/support/threads/[threadId]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/support/threads/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/tasks/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `src/app/api/admin/ui-chart-health/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/ui/preferences/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/user/[userId]/creator-onboarding/id-document/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/user/[userId]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/users/[userId]/username/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/admin/users/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/analytics/ingest/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/auth/manual-sign-in-lookup/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/auth/navigation-session/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/chat/attachments/cancel/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/chat/attachments/complete/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/chat/attachments/prepare/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/chat/threads/[threadId]/messages/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/chat/threads/[threadId]/read/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/chat/threads/[threadId]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/chat/threads/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/checkin/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/bookings/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/broadcasts/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/discovery/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/drops/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/messages/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/onboarding/application/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/onboarding/contract-signature/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/onboarding/id-submission/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/onboarding/intro/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/payouts/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/relationships/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/requests/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/settings/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creator/subscriptions/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/creators/[username]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/cron/notify-active-drops/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/cron/process-creator-subscriptions/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/cron/process-queue/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/[dropId]/click/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/content/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/duplicate-filenames/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/impression/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/track/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/drops/unlock/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/notifications/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/paypal/capture/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/paypal/create/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/privacy/consent/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/security/log-attempt/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/settings/landing/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/settings/landing/upload/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/support/threads/[threadId]/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/support/threads/guest/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/support/threads/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/tasks/feedback/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/tasks/reminders/sync/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/tasks/rotate/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `src/app/api/telemetry/track/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/activity/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/check-username/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/complete-onboarding/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/data/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/delete/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/follow/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/onboarding-progress/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/profile/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/register/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/user/revoke-sessions/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/api/viewer/watch-session/route.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/banned/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/creators/[username]/CreatorProfileClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/creators/[username]/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/creators/apply/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/creators/waitlist/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/DashboardClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/chat/layout.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/chat/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/layout.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/library/LibraryClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/library/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/profile/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/support/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/ViewerClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/dashboard/viewer/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/drops/DropsClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/drops/[id]/opengraph-image.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/drops/loading.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/drops/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/error.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/experiences/ExperiencesClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/experiences/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/faq/FAQClient.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/faq/HowItWorksStory.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/faq/faq-data.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/faq/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/layout.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/loading.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/not-found.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/offline/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/robots.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/app/sitemap.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminActivityLogPanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminAiDescriptionOperations.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminAnalyticsCharts.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminDashboardModule.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminDropsAtGlancePanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminModerationConsole.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminPageHeader.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminStatsBar.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminSupportQueue.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AdminTasksManager.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AiDropDescriptionGeneratorPanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/AssetUploader.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/BalanceAdjustmentModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/CreateDropModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/RecentTransactionsPanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `src/components/Admin/TopDropsPanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Admin/TransactionHistoryModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Analytics/CSPostHogProvider.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Analytics/DeepTracker.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Analytics/PageViewEvent.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Auth/AuthModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Auth/GuestComponentBlur.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Auth/GuidedOnboarding.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Chat/ChatExperience.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Chat/ChatRouteShell.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/ClientDiagnosticsBridge.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/CookieBanner.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/CoreLayoutWrapper.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/CreatorDiscoveryRail.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Creators/CreatorExperiencesPanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Creators/CreatorProfileHeader.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Creators/CreatorUpdatesFeed.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/CollectionList.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/CreatorWorkspacePanel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/DailyCheckIn.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/DailyTasksModule.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/LiveDropsForYouCarousel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/NotificationPromptBanner.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/OwnedDropGalleryCard.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/RecentActivityFeed.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Dashboard/TaskGuidanceBanner.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Debug/DebugBreakpoints.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/DropCard.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/DropGrid.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/DropPreviewModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/ErrorBoundary.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/FeaturedCarousel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Feedback/GlobalBugReportTrigger.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Feedback/ReportBugButton.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/GlobalAuthModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/GlobalPurchaseModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Hero.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/HomeDropTicker.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/InsufficientBalanceModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/KandyDropsAccountOverview.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Landing/HomeActiveDropsCarousel.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Landing/HowItWorks.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Legal/LegalBackLink.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navbar.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/AdminDropdown.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/AnimateBalance.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/AutoScrollToTop.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/MobileBottomBar.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/NotificationBell.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/ProfileDropdown.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/ProfileSidebar.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Navigation/ScrollToTop.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Notifications/NotificationRuntimeBridge.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/PayPalProvider.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/PromoCard.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/PurchaseModal.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/PwaRuntimeBridge.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/StickyFilterBar.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Support/SupportInbox.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/Toasts/UnwrapSuccessToast.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/UIDebug.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/ui/Button.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/ui/Icon.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/ui/TitleMarquee.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/components/ui/UiContinuityNotice.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/context/AuthContext.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/context/RolloutContext.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/context/SWRProvider.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/context/UIContext.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/client-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAdminDropsFeed.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAdminOverview.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAdminPollingSWR.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `src/hooks/useAdminUiChartHealthReporter.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useAuthSWR.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useChatUnreadStatus.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useCompactViewport.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useDeferredClientReady.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useDrops.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useNetworkConditions.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useNotifications.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useNow.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useTaskGuidanceActions.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/hooks/useViewerWatchSession.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/activity-sync.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-ai-models.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-analytics-preferences.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-auth-outcome-chart.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-debug-preferences.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-debug-route-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-drop-form-sections.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-drop-form.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-drop-formatting.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-drop-lifecycle.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-drop-queue.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-moderation.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-notification-funnel.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-onboarding-velocity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-ops-health.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-overview.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-panel-system-logs.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/admin-task-pipeline.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `src/lib/admin-ui-chart-health.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/ai-debug-assistant.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/ai-drop-covers.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/ai-drop-descriptions.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/analytics-client-engine.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/analytics-identifiers.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/analytics-metric-catalog.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/analytics-semantics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/analytics-time.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/auth-errors.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/authFetch.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/browser-notification-enrollment.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/browser-utils.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/bug-reporting.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/chat-attachments.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/chat-realtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/chat-send-feedback.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/chat-send-realtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/chat-soft-seal.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/chat.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/client-diagnostics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/client-error-reporting.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/client-random.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/client-session.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/creator-admin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/creator-application.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/creator-contract.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/creator-experiences.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/creator-message-compatibility.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/creator-onboarding.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/creator-public-pages.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/daily-checkin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-dashboard.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-engagement.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-normalizers.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-presentation.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-queue-lifecycle.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-queue-schedule.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-read-models.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/drop-status.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/firebase-data.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/firebase-messaging.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/firebase-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/firebase.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/firebase/admin-actions.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/firestore-client-errors.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/gumdrop-economics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/gumdrop-ledger.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/gumdrops-packages.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/http-cache.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/landing-assets.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/manual-email-auth.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/marketing-copy.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/media-hosts.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/navigation-persistence.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/navigation-session.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/notification-contracts.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/notifications.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/orchestration/contract.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/platform-config.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/privacy-consent.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/release-tracking.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/rollouts.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/route-runtime-health.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/security-events.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/self-healing.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-context.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-data.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-activity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-content.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-engagement.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-onboarding.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-tasks.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-traffic.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-users.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-validation.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-historical-viewer.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-preferences.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-analytics-shared.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-cli-logging.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-debug-preferences.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-debug-settings.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-moderation.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-ops-health.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-orchestration.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-overview-users.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-panel-system-logs.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `src/lib/server/admin-ui-chart-health.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/admin-ui-preferences.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/ai-debug-assistant.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/ai-drop-covers.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/ai-drop-descriptions.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-event-utils.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-governance.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-metrics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-parity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-pipeline-health.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics-semantics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/analytics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/auth.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/chat.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/creator-discovery.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/creator-experiences.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/creator-onboarding-alerts.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/creator-onboarding-diagnostics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/creator-onboarding.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/daily-tasks.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/diagnostic-read-fallbacks.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/drop-mutations.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/drop-queue.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/drop-references.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/drop-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/drops.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/fcm-utils.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/firebase-admin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/firestore-sanitize.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/gumdrop-ledger.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/notification-inbox.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/notification-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/onboarding-analytics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/paypal.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/privacy-consent.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/process-queue-drops.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/push-notifications.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/queue-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/rate-limit.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/request-client-ip.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/request-guard.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/request-origin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/route-diagnostics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/route-runtime-health.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/runtime-warning-store.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/server-diagnostics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/storage-assets.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/support-threads.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/user-runtime.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/server/username-suggestions.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/site-origin.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/support-readiness.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/task-guidance.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/tasks/task-catalog.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/tasks/task-observability.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/telemetry-catalog.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/telemetry-safety.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/telemetry.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/timezone.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/transaction-normalizers.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/ui-continuity.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/user-profile-validation.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/user-utils.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/utils.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/viewer-asset-prefetch.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/lib/viewer-watch-session.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/stories/Button.stories.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/stories/Button.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/stories/Header.stories.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/stories/Header.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/stories/Page.stories.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/stories/Page.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/types/admin-analytics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/types/analytics.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/types/db.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `src/types/gtag.d.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/auth.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/contracts/task-economy-contract.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/contracts/telemetry-contracts.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/drops.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/firebase/database.rules.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/firebase/firestore.rules.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/firebase/storage.rules.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/guest-dismissal.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/launch-qa.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/performance-bench.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/puppeteer/sample.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/qa-audit.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/security-ip-spoofing.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/support/firebase-admin-firestore.mock.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/support/firebase-admin.mock.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/support/google-cloud-vertexai.mock.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/accessibility.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/helpers.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/known-accessibility-baseline.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/runtime.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/ui-surface-targets.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/ui-audits/visual-regression.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-drop-cover-catalog.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-drop-covers-feedback-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-drop-covers-ops-routes.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-drop-covers-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-drop-covers-template-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-drop-descriptions-routes.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ai-models.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-data.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-historical-users.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-analytics-realtime-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-auth-outcome-chart.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-balance-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-cli-logging.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-content-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-creator-id-document-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-debug-assistant-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-debug-preferences-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-debug-route-runtime.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-drop-form-sections.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-drop-form.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-moderation-routes.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-notification-funnel.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-onboarding-velocity.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-ops-health.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-overview-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-overview-users.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-overview.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-panel-system-logs.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-roster-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-support-threads-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-task-pipeline.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `tests/unit/admin-ui-chart-health-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### Historical checklist entry (no longer tracked): `tests/unit/admin-ui-chart-health.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-user-username-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/admin-users-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/ai-debug-assistant.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/ai-drop-covers.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/ai-drop-descriptions.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/analytics-identifiers.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/analytics-ingest-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/analytics-metric-catalog.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/auth-errors.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/auth-handle-api-error.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-attachments-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-send-feedback.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-send-realtime.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-soft-seal.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-thread-messages-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-thread-read-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-thread-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/chat-threads-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/client-diagnostics.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/client-random.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/client-session.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/complete-onboarding-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-bookings-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-contract-signature-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-discovery-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-experiences-panel.spec.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-experiences.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-id-submission-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-messages-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-onboarding-alerts.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-onboarding-application-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-onboarding-diagnostics.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-onboarding-intro-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-onboarding-server.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-onboarding.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-public-pages.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-relationships-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-settings-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-subscriptions-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-waitlist-page.spec.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/creator-workspace-panel.spec.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/dashboard-viewer-page.spec.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/drop-queue-lifecycle.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/drop-references.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/drop-status.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/drops-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/duplicate-filenames-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/fcm-utils.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/firebase-client-config.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/firestore-client-errors.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/firestore-sanitize.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/guest-dismissal.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/gumdrop-economics.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/gumdrop-ledger.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/gumdrops-packages.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/lib/drop-engagement.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/lib/drop-normalizers.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/lib/gumdrop-economics.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/lib/telemetry.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/manual-email-auth.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/manual-sign-in-lookup-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/media-hosts.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/navigation-session.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/notification-bell-layout.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/notification-contracts.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/notifications-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/notify-active-drops-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/paypal-capture-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/performance-bench.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/playwright-config.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/privacy-consent.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/process-creator-subscriptions-bench.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/process-queue-drops.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/process-queue-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/promo-card.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/queue-bench.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/rate-limit.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/rollouts.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/route-runtime-health.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/security-log-attempt-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/server-ai-drop-covers.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/server-chat-send.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/server-chat.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/server-drops.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/support-readiness.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/support-threads-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/task-guidance.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/task-observability.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/telemetry-flows.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/telemetry.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/ui-continuity.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/use-chat-unread-status.spec.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/useViewerWatchSession-bench-manual.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/useViewerWatchSession-bench.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/user-activity-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/user-profile-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/user-register-route.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/username-suggestions-bench.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/username-suggestions.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/utils/renderHook.tsx`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/viewer-asset-prefetch-bench.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/unit/viewer-asset-prefetch.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `tests/visual.spec.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `vitest.config.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `vitest.contracts.config.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `vitest.rules.config.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### `vitest.shims.d.ts`

- [x] File exists and is tracked.
- [ ] Pending detailed function-level audit.

### 2026-04-21 follow-up

- `src/lib/server/admin-analytics-historical-traffic.ts`
  - [x] Historical traffic builder now emits exact vs estimated guest/public traffic instead of treating consent-limited guest batches as whole-site truth.
- `src/app/api/admin/analytics/historical/route.ts`
  - [x] Historical admin route now returns `guestTraffic` metadata and raises an explicit issue when public traffic is estimated from GA minus identified first-party traffic.
- `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - [x] Guest/public admin state now derives display values and unknown-quality labels from `guestTraffic` truth metadata.
- `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx`
  - [x] Guest/public cards now show estimated volume truthfully and avoid fake zero bounce/engagement states when guest quality telemetry is unavailable.
- `src/types/admin-analytics.ts`
  - [x] Historical analytics response contract now includes guest/public truth metadata for admin consumers.
