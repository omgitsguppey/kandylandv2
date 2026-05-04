# Analytics Truth Layer v2 File Inventory

Status: Phase 1 blast-radius inventory
Last updated: 2026-04-30

This inventory is a repo-wide map of files found by path scans, content scans, existing agent indexes, adjacency tracing, and verified Admin Analytics/Admin Debug entrypoints. It is grouped by concern. Later phases should use this as the starting blast-radius map before changing behavior.

Legend:

- Lane: audience, commerce, live, journey, auth, onboarding, tasks, notifications, events, debug, identity, runtime, config, tests, scripts.
- Source: current likely source or desired canonical source.
- Risk: high means shared runtime/business truth, medium means module-specific truth, low means docs/tests/index.
- Refactor later: yes means likely touched in later behavior phases; audit means inspect before touching; no means Phase 1 documentation/index only.

## Admin Analytics UI Modules

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/app/admin/analytics/page.tsx` | Admin Analytics shell, overview cards, tab routing, task/notification modules mount. | Admin display using `useAdminAnalyticsState`, historical/realtime routes, session snapshot. | high | yes |
| `src/app/admin/analytics/AnalyticsHelpers.tsx` | Formatters, range controls, tab definitions, event descriptions. | UI helper over analytics state. | medium | yes |
| `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` | Main client state orchestrator for historical, realtime, section ranges, models, local hot snapshot storage. | Mixed hot cache, realtime route, historical cache, local session storage. | high | yes |
| `src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts` | Client realtime hook for admin analytics. | Firestore/realtime upgrade path with listener metadata implications. | high | yes |
| `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx` | Live Pulse, Journey Funnel, Auth Outcomes, Onboarding Performance, Guest Quality, Event Mix, Live Stream. | Module models from `src/lib/admin-analytics-*` and onboarding helper. | high | yes |
| `src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx` | Audience Snapshot, return cadence, navigation, device, top paths, regions. | Historical traffic/GA/first-party data. | high | yes |
| `src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx` | Commerce Snapshot, package performance, content conversion, viewer drilldown. | Commerce/funnel/watch/purchase historical data. | high | yes |
| `src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx` | Shared analytics section/card/tooltip primitives. | UI truth display and badge containment. | medium | audit |
| `src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx` | Consolidated Onboarding Performance UI. | Onboarding step stats and duration model. | medium | yes |
| `src/components/Admin/Analytics/AdminDailyTaskPipelineModule.tsx` | Daily Task Pipeline plus completion speed and leaderboard. | Task state/log/telemetry model. | high | yes |
| `src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx` | Daily Task Pipeline and Notification Funnel mount. | Task and notification models. | high | yes |
| `src/components/Admin/AdminAnalyticsCharts.tsx` | Older/shared admin analytics chart component. | Chart range telemetry. | medium | audit |
| `src/components/Admin/AdminModuleVerificationCard.tsx` | Shared module verification card. | Admin truth labels and validation display. | medium | audit |
| `src/components/Admin/AdminStatusBadge.tsx` | Canonical admin truth badge. | Source-state rendering. | medium | audit |

## Admin Debug Validation Modules

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/app/admin/debug/page.tsx` | Admin Debug shell and tab orchestration. | Debug validation, route health, AI, realtime diagnostics. | high | yes |
| `src/app/admin/debug/components/DebugAdvancedDataValidation.tsx` | Data Validation surface moved into Debug. | Historical data validation route. | high | yes |
| `src/app/admin/debug/components/DebugAdvancedTelemetry.tsx` | Telemetry debug view. | Event/telemetry source details. | medium | yes |
| `src/app/admin/debug/components/DebugAdvancedTruth.tsx` | Admin truth state debug view. | Truth labels and module source states. | medium | yes |
| `src/app/admin/debug/components/DebugAdvancedBehavior.tsx` | Behavior diagnostics. | Behavior/event lanes and actor details. | medium | audit |
| `src/app/admin/debug/components/DebugAdvancedDrift.tsx` | Drift diagnostics. | Source parity/drift. | medium | yes |
| `src/app/admin/debug/components/DebugNowDiagnostics.tsx` | Current route/runtime diagnostics. | Route runtime and materializer state. | medium | yes |
| `src/app/admin/debug/components/DebugMonitoringRoutes.tsx` | Route monitoring rows. | Route runtime health. | medium | audit |
| `src/app/admin/debug/components/DebugPrimitives.tsx` | Shared Debug UI primitives. | Debug source-state display. | medium | audit |
| `src/app/admin/debug/components/DebugTabAdvanced.tsx` | Advanced debug tab composition. | Validation, telemetry, truth, drift. | medium | yes |
| `src/app/admin/debug/components/DebugTabMonitoring.tsx` | Monitoring debug tab. | Runtime health. | medium | audit |
| `src/app/admin/debug/components/DebugTabInfrastructure.tsx` | Infrastructure debug tab. | Config/runtime/source health. | medium | audit |
| `src/app/admin/debug/hooks/useAdminDebugRealtime.ts` | Debug realtime hook. | Realtime upgrade path and cache metadata. | high | yes |
| `src/lib/admin-debug-route-runtime.ts` | Runtime route debug shaping. | Route runtime source health. | high | audit |
| `src/lib/admin-debug-summary-cards.ts` | Debug summary card model. | Debug source-state summaries. | medium | audit |
| `src/lib/admin-debug-preferences.ts` | Debug preferences. | Admin local/debug state. | low | no |

## Admin Analytics API Routes

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/app/api/admin/analytics/route.ts` | Redirector for legacy analytics query type. | Historical/realtime route dispatch. | medium | audit |
| `src/app/api/admin/analytics/historical/route.ts` | Main historical analytics aggregator and stale-while-revalidate cache reader. | GA4, Firestore rollups, telemetry facts, commerce, tasks, validation, cache. | high | yes |
| `src/app/api/admin/analytics/realtime/route.ts` | Main realtime analytics route with hot cache and cold rebuild fallback. | `analytics_aggregate_stats/realtime_summary`, first-party live data, GA realtime fallback. | high | yes |
| `src/app/api/admin/analytics/preferences/route.ts` | Admin analytics section range preferences. | User/admin preference state. | medium | audit |
| `src/app/api/admin/debug/route.ts` | Admin Debug payload route. | Runtime, validation, export, admin ops, source states. | high | yes |
| `src/app/api/admin/debug/preferences/route.ts` | Debug preference route. | Admin Debug UI state. | low | no |
| `src/app/api/admin/debug/assistant/route.ts` | Debug assistant route. | AI/admin diagnostics, never canonical analytics truth. | medium | audit |
| `src/app/api/admin/overview/route.ts` | Admin Overview data route. | Overview/admin source states and analytics-adjacent summaries. | high | audit |
| `src/app/api/admin/users/realtime/route.ts` | Realtime users route. | User/identity live state. | high | audit |
| `src/app/api/admin/users/route.ts` | Admin users route. | User metrics and identity. | high | audit |
| `src/app/api/admin/user/[userId]/route.ts` | Per-user admin drilldown. | User event facts, sessions, commerce, support. | high | yes |
| `src/app/api/admin/tasks/route.ts` | Admin task manager route. | Task state/catalog. | medium | audit |
| `src/app/api/admin/queue/route.ts` | Admin queue route. | Drop queue/runtime status. | medium | audit |
| `src/app/api/admin/queue/toggle/route.ts` | Queue control route. | Drop queue state; analytics notification trigger implications. | high | audit |

## Product/API Telemetry and Behavior Routes

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/app/api/analytics/ingest/route.ts` | Anonymous/public telemetry ingest. | Guest batches and event facts. | high | yes |
| `src/app/api/analytics/ingest-identified/route.ts` | Identified telemetry ingest and active-user mirror. | Authenticated event facts and `analytics_active_users`. | high | yes |
| `src/app/api/drops/track/route.ts` | Drop telemetry route. | Drop interaction facts. | high | audit |
| `src/app/api/drops/[dropId]/click/route.ts` | Drop click tracking. | Drop click/event lane. | medium | audit |
| `src/app/api/drops/impression/route.ts` | Drop impression tracking. | Public/guest/auth impression lane. | medium | audit |
| `src/app/api/drops/unlock/route.ts` | Unlock operation route. | Unlock facts, GumDrops ledger, commerce parity. | high | yes |
| `src/app/api/drops/route.ts` | Drops feed route. | Drop availability, route diagnostics, queue impacts. | high | audit |
| `src/app/api/checkin/route.ts` | Daily check-in route. | Task/reward/check-in event lane. | medium | audit |
| `src/app/api/tasks/feedback/route.ts` | Task feedback/telemetry route. | Task guidance/task events. | medium | audit |
| `src/app/api/tasks/reminders/sync/route.ts` | Reminder sync route. | Task reminder and notification signals. | high | yes |
| `src/app/api/tasks/rotate/route.ts` | Task rotation route. | User task state. | high | audit |
| `src/app/api/notifications/route.ts` | Notification inbox/read/clear route. | Notification persistence, read state, funnel. | high | yes |
| `src/app/api/cron/notify-active-drops/route.ts` | Active drop notification cron. | Notification send/dedupe and drop live alerts. | high | yes |
| `src/app/api/cron/process-queue/route.ts` | Drop queue processing cron. | Queue lifecycle and return-live notification trigger. | high | audit |
| `src/app/api/paypal/create/route.ts` | PayPal checkout create route. | Checkout start/commerce funnel. | high | audit |
| `src/app/api/paypal/capture/route.ts` | PayPal capture route. | Completed payment product truth. | high | yes |
| `src/app/api/wallet/packages/route.ts` | Wallet package route. | GumDrops packages and purchase intent. | medium | audit |
| `src/app/api/user/register/route.ts` | Registration route. | Auth/account creation and onboarding comparison. | high | audit |
| `src/app/api/user/complete-onboarding/route.ts` | Complete onboarding route. | Onboarding completion facts. | high | yes |
| `src/app/api/user/onboarding-progress/route.ts` | Onboarding progress route. | Onboarding step facts. | high | yes |
| `src/app/api/user/activity/route.ts` | User activity route. | User behavior/activity. | high | audit |
| `src/app/api/viewer/watch-session/route.ts` | Watch session capture. | Viewer/watch behavior and capture health. | high | yes |
| `src/app/api/privacy/consent/route.ts` | Consent route. | Guest telemetry consent and quality availability. | high | audit |
| `src/app/api/auth/navigation-session/route.ts` | Navigation session route. | Identity/session link. | high | audit |

## Server Analytics Utilities

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/lib/server/admin-analytics-data.ts` | GA4 Data API client and historical source fetcher. | GA4 daily/intraday/realtime provider data. | high | yes |
| `src/lib/server/admin-analytics-shared.ts` | Shared historical/realtime helper functions and range utilities. | Range, event maps, snapshot field readers. | high | yes |
| `src/lib/server/admin-analytics-context.ts` | Analytics context and surface mix builders. | Surface/route context. | medium | yes |
| `src/lib/server/admin-analytics-historical-traffic.ts` | Historical traffic/audience builder. | GA4, page rollups, sessions, guest estimates. | high | yes |
| `src/lib/server/admin-analytics-historical-engagement.ts` | Engagement/semantic quality builder. | Semantic summaries, engagement, bounce. | high | yes |
| `src/lib/server/admin-analytics-historical-onboarding.ts` | Onboarding overview builder. | Onboarding starts/completions/durations. | high | yes |
| `src/lib/server/admin-analytics-historical-tasks.ts` | Task historical builder. | Task pipeline, duration buckets, leaderboard. | high | yes |
| `src/lib/server/admin-analytics-historical-validation.ts` | Data Validation/parity builder. | Debug validation checks. | high | yes |
| `src/lib/server/admin-analytics-historical-users.ts` | User map for historical analytics. | User identity and user metrics. | high | audit |
| `src/lib/server/admin-analytics-historical-viewer.ts` | Viewer/watch historical overview. | Watch sessions, viewer journey. | high | yes |
| `src/lib/server/admin-analytics-historical-content.ts` | Content historical analytics. | Drop/content views/unlocks. | high | audit |
| `src/lib/server/admin-analytics-historical-activity.ts` | Historical activity feed builder. | Raw events and commerce feed. | high | yes |
| `src/lib/server/admin-analytics-capture-health.ts` | Watch capture health summary. | Watch session capture truth. | high | audit |
| `src/lib/server/admin-source-verification.ts` | Server-side module verification builder. | Source validation and truth states. | high | yes |
| `src/lib/server/analytics.ts` | Server analytics event writer. | First-party identified event facts and active users. | high | yes |
| `src/lib/server/analytics-event-utils.ts` | Event normalization utilities. | Event fact shaping. | high | audit |
| `src/lib/server/analytics-governance.ts` | Canonical/operational analytics collection names. | Source governance. | high | yes |
| `src/lib/server/analytics-metrics.ts` | Analytics metric report builder. | Metric catalog/reporting. | medium | audit |
| `src/lib/server/analytics-parity.ts` | Analytics parity helpers. | Source parity. | high | yes |
| `src/lib/server/analytics-pipeline-health.ts` | Pipeline health checks. | Pipeline failure truth. | high | yes |
| `src/lib/server/analytics-runtime.ts` | Analytics runtime helpers. | Runtime source state. | medium | audit |
| `src/lib/server/analytics-runtime-warning.ts` | Analytics runtime warning writer. | Warning/debug truth. | medium | audit |
| `src/lib/server/analytics-semantics.ts` | Server semantic mapping. | Event semantics and component surfaces. | high | yes |
| `src/lib/server/analytics-truth-recovery.ts` | Analytics legacy recovery helpers. | Legacy data recovery. | high | yes |
| `src/lib/server/ephemeral-route-cache.ts` | Route cache and stale-while-revalidate helper. | Verified backend cache. | high | yes |
| `src/lib/server/diagnostic-read-fallbacks.ts` | Safe query diagnostics/fallbacks. | Fallback and route diagnostics. | high | yes |
| `src/lib/server/route-diagnostics.ts` | Route diagnostic writer. | Runtime/route truth. | high | audit |
| `src/lib/server/route-runtime-health.ts` | Route runtime health writer/reader. | Runtime health. | high | audit |
| `src/lib/server/admin-ops-health.ts` | Admin operational health builder. | Materializers/export/cache health. | high | yes |
| `src/lib/server/admin-panel-system-logs.ts` | Admin system logs. | Admin panel diagnostics. | medium | audit |

## Client Telemetry Emitters and Catalogs

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/lib/telemetry.ts` | Client telemetry emitter. | First-party event ledger. | high | yes |
| `src/lib/telemetry-catalog.ts` | Event catalog and display labels. | Event definitions/module indexes. | high | yes |
| `src/lib/telemetry-safety.ts` | Telemetry safety checks. | Client telemetry guardrails. | medium | audit |
| `src/lib/analytics-client-engine.ts` | Client analytics engine. | First-party client event handling. | high | yes |
| `src/lib/analytics-identifiers.ts` | Analytics identity helpers. | Guest/session/user identifiers. | high | yes |
| `src/lib/analytics-metric-catalog.ts` | Metric catalog. | Metric definitions. | medium | audit |
| `src/lib/analytics-semantics.ts` | Client semantic mapping. | Semantic/page/component source mapping. | high | yes |
| `src/lib/analytics-time.ts` | Analytics time helpers. | Range/window calculations. | medium | audit |
| `src/components/Analytics/PageViewEvent.tsx` | Page-view emitter component. | Page view facts. | high | audit |
| `src/components/Analytics/DeepTracker.tsx` | Guest/deep telemetry collector. | Guest/public telemetry. | high | yes |
| `src/components/Analytics/CSPostHogProvider.tsx` | Analytics provider wrapper. | Provider sidecar, not canonical. | medium | audit |
| `src/components/HomepageRuntimeDiagnostics.tsx` | Runtime diagnostics collector. | UI/runtime diagnostics. | medium | audit |
| `src/components/ClientDiagnosticsBridge.tsx` | Client diagnostics bridge. | Client/runtime diagnostics. | medium | audit |
| `src/instrumentation.ts` | Server instrumentation. | Runtime diagnostics. | medium | audit |
| `src/instrumentation-client.ts` | Client instrumentation. | Client diagnostics/telemetry. | medium | audit |

## Task Pipeline Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/lib/admin-task-pipeline.ts` | Admin task pipeline/speed/leaderboard normalizer. | Task state, lifecycle logs, telemetry, reward catalog. | high | yes |
| `src/lib/admin-task-leaderboard.ts` | Legacy/adjacent task leaderboard helper. | Task leaderboard rows. | medium | audit |
| `src/lib/task-guidance.ts` | Task guidance mapping. | Guidance/reminder task signals. | medium | audit |
| `src/lib/tasks/task-catalog.ts` | Canonical task catalog/reward definitions. | Task definitions and rewards. | high | yes |
| `src/lib/tasks/task-observability.ts` | Task observability helpers. | Task telemetry/debug. | high | yes |
| `src/lib/tasks/task-timestamps.ts` | Task timestamp normalization. | Task timing truth. | high | audit |
| `src/lib/server/daily-tasks.ts` | Server daily task state. | User task state. | high | yes |
| `src/lib/server/queue-runtime.ts` | Queue runtime helper. | Queue/drop task/system lane. | high | audit |
| `src/lib/server/process-queue-drops.ts` | Queue processing. | Drop queue lifecycle and notification triggers. | high | audit |
| `src/components/Dashboard/DailyTasksModule.tsx` | User daily tasks UI. | Task state and task actions. | high | audit |
| `src/components/Dashboard/TaskGuidanceBanner.tsx` | Task guidance UI. | Guidance views/taps and task signals. | medium | audit |
| `src/hooks/useTaskGuidanceActions.ts` | Task guidance action hook. | Guidance task telemetry. | medium | audit |
| `functions/src/analytics-task-events.ts` | Functions task analytics materializer. | Task lifecycle event facts. | high | yes |
| `functions/src/queue-runtime.ts` | Functions queue runtime. | Queue/task/drop lifecycle. | high | audit |

## Notification Pipeline Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/lib/admin-notification-funnel.ts` | Notification Funnel model. | Notification telemetry/actions/reminder reasons. | high | yes |
| `src/lib/notification-contracts.ts` | Notification idempotency/dedupe contracts. | Notification creation/display/read truth. | high | yes |
| `src/lib/notification-identity.ts` | Notification identity helpers. | Recipient and idempotency keys. | high | yes |
| `src/lib/notifications.ts` | Client notification helpers. | Notification state and UI. | high | audit |
| `src/lib/firebase-messaging.ts` | FCM client setup. | Foreground messaging and support flags. | high | yes |
| `src/lib/browser-notification-enrollment.ts` | Browser notification permission/enrollment. | Prompt/enablement source. | high | yes |
| `src/lib/server/fcm-utils.ts` | Server FCM helpers. | Push send truth. | high | yes |
| `src/lib/server/push-notifications.ts` | Push notification send/create helpers. | Backend notification creation/dedupe. | high | yes |
| `src/lib/server/notification-inbox.ts` | Notification inbox persistence. | Read/clear/open state. | high | yes |
| `src/lib/server/notification-runtime.ts` | Notification runtime helpers. | Pipeline health and dedupe. | high | yes |
| `src/hooks/useNotifications.ts` | Notification client state hook. | Local/server unread state. | high | yes |
| `src/components/Navigation/NotificationBell.tsx` | User notification bell. | Read/open/dropdown state. | high | audit |
| `src/components/Notifications/NotificationRuntimeBridge.tsx` | Notification runtime client bridge. | Foreground/background/client telemetry. | high | yes |
| `src/components/Dashboard/NotificationPromptBanner.tsx` | Prompt UI. | Prompt/enable telemetry. | medium | audit |
| `public/firebase-messaging-sw.js` | PWA service worker notification handling. | Background display/click/dedupe. | high | yes |
| `public/manifest.json` | PWA manifest. | PWA notification support. | medium | audit |

## Purchase, Unlock, Wallet, and Commerce Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/lib/admin-analytics-commerce-snapshot.ts` | Commerce Snapshot normalizer. | Revenue, purchases, GD spend, promo/bonus, source flags. | high | yes |
| `src/lib/admin-user-commerce.ts` | User commerce admin helper. | Per-user commerce facts. | high | audit |
| `src/lib/gumdrop-ledger.ts` | Client/shared GumDrops ledger classification. | GumDrops economy truth. | high | audit |
| `src/lib/server/gumdrop-ledger.ts` | Server GumDrops ledger operations. | GumDrops product truth. | high | audit |
| `src/lib/gumdrop-economics.ts` | GumDrops economics formulas. | Promo/yield/adjusted profit math. | high | yes |
| `src/lib/gumdrops-packages.ts` | GumDrops package definitions. | Package commerce data. | medium | audit |
| `src/lib/transaction-normalizers.ts` | Transaction normalization. | Purchase/completion facts. | high | yes |
| `src/lib/server/paypal.ts` | PayPal server helper. | Payment provider truth. | high | audit |
| `src/components/GlobalPurchaseModal.tsx` | Global purchase UI. | Checkout start/commerce funnel. | high | audit |
| `src/components/PurchaseModal.tsx` | Purchase modal. | Checkout/funnel telemetry. | high | audit |
| `src/components/PayPalProvider.tsx` | PayPal provider. | Payment UI setup. | medium | audit |
| `src/components/InsufficientBalanceModal.tsx` | GumDrops refill prompt. | Wallet/refill funnel. | medium | audit |
| `functions/src/analytics-transactions.ts` | Functions transaction analytics. | Commerce event facts/rollups. | high | yes |
| `functions/src/gumdrop-economics.ts` | Functions economics helpers. | GumDrops economics parity. | high | audit |

## Onboarding Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/lib/admin-onboarding-velocity.ts` | Onboarding velocity/performance normalizer. | Starts, completions, duration buckets, discrepancies. | high | yes |
| `src/lib/server/onboarding-analytics.ts` | Server onboarding analytics helper. | Onboarding step facts. | high | yes |
| `src/lib/server/admin-analytics-historical-onboarding.ts` | Historical onboarding builder. | Step stats, durations. | high | yes |
| `src/components/Auth/GuidedOnboarding.tsx` | Guided onboarding UI. | User onboarding step events. | high | audit |
| `src/components/Auth/OnboardingHelpers.ts` | Onboarding helper logic. | Step definitions/duration logic. | medium | audit |
| `src/app/api/user/complete-onboarding/route.ts` | Complete onboarding API. | Completion fact. | high | yes |
| `src/app/api/user/onboarding-progress/route.ts` | Onboarding progress API. | Step start/complete facts. | high | yes |
| `src/app/api/creator/onboarding/application/route.ts` | Creator onboarding application. | Creator onboarding lane. | medium | audit |
| `src/lib/creator-onboarding.ts` | Creator onboarding helper. | Creator lane, not fan onboarding. | medium | audit |
| `src/lib/server/creator-onboarding.ts` | Server creator onboarding helper. | Creator onboarding records. | medium | audit |
| `src/lib/server/creator-onboarding-alerts.ts` | Creator onboarding alerts. | Creator/admin alerts. | medium | audit |
| `src/lib/server/creator-onboarding-diagnostics.ts` | Creator onboarding diagnostics. | Debug/creator lane. | medium | audit |

## Identity, Session, and Auth Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/context/AuthContext.tsx` | Auth context and user identity. | Authenticated user/admin/creator identity. | high | audit |
| `src/hooks/useAuthSWR.ts` | Auth state SWR hook. | Authenticated identity hydration. | high | audit |
| `src/lib/server/auth.ts` | Server auth and API guard helpers. | Auth/admin identity. | high | audit |
| `src/lib/auth-errors.ts` | Auth error normalization. | Auth outcome/failure labels. | medium | audit |
| `src/lib/manual-email-auth.ts` | Manual email auth helper. | Auth method/source. | medium | audit |
| `src/app/api/auth/manual-sign-in-lookup/route.ts` | Manual sign-in lookup. | Auth outcome support. | medium | audit |
| `src/app/api/auth/navigation-session/route.ts` | Navigation session route. | Session identity and nav state. | high | audit |
| `src/lib/navigation-session.ts` | Navigation session helper. | Session identity. | high | audit |
| `src/lib/client-session.ts` | Client session helper. | Guest/session ids. | high | yes |
| `src/lib/server/user-runtime.ts` | User runtime helper. | User state and runtime source. | high | audit |
| `src/lib/user-utils.ts` | User normalization helpers. | User profile/task timestamps. | high | audit |
| `src/lib/user-profile-validation.ts` | Profile validation. | User identity/profile truth. | medium | audit |
| `src/app/api/user/profile/route.ts` | User profile route. | User identity/profile state. | high | audit |
| `src/app/api/user/register/route.ts` | User register route. | Account creation/auth comparison. | high | audit |
| `src/app/api/user/revoke-sessions/route.ts` | Revoke sessions route. | Session/security state. | medium | audit |
| `src/app/api/user/data/route.ts` | User data route. | User data/export/delete lane. | medium | audit |

## Firebase, GA4, BigQuery, and Functions Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `functions/src/index.ts` | Functions exports and schedules. | Materializers, exports, scheduled truth. | high | yes |
| `functions/src/analytics-realtime-summary.ts` | Realtime summary materializer. | Hot cache snapshot for live admin display. | high | yes |
| `functions/src/analytics-bigquery-export.ts` | BigQuery raw event exporter and heartbeat. | Warehouse export validation. | high | yes |
| `src/lib/server/cloud-cost-contract.ts` | Cloud Run, Cloud SQL/Data Connect, and BigQuery guardrail contract. | Provider cost/data-pipeline guardrails. | high | audit |
| `scripts/agent/score-cloudrun-sql-bigquery-guardrails.ts` | Deterministic Cloud Run/SQL/BigQuery score generator. | Source-only cloud cost report. | high | audit |
| `scripts/agent/validate-cloudrun-sql-bigquery-guardrails.ts` | Cloud cost guardrail validator. | No-provider-job validation. | high | audit |
| `functions/src/analytics-event-facts.ts` | Event fact processing. | First-party ledger. | high | yes |
| `functions/src/analytics-guest-batches.ts` | Guest batch processing. | Guest/public first-party facts. | high | yes |
| `functions/src/analytics-core.ts` | Functions analytics shared core. | Event/source shaping. | high | yes |
| `functions/src/analytics-runtime.ts` | Functions analytics runtime. | Runtime/source health. | medium | audit |
| `functions/src/analytics-semantics.ts` | Functions semantic mapping. | Semantic parity. | high | yes |
| `functions/src/analytics-task-events.ts` | Task analytics events. | Task lifecycle facts. | high | yes |
| `functions/src/analytics-timeline.ts` | Analytics timeline processing. | Timeline/read model. | medium | audit |
| `functions/src/analytics-security-events.ts` | Security event processing. | Security/admin/runtime events. | medium | audit |
| `functions/src/analytics-truth-contract.ts` | Analytics truth contract. | Functions truth shape. | high | yes |
| `functions/src/analytics-truth-runtime.ts` | Runtime truth generation. | Runtime/source truth. | high | yes |
| `functions/src/analytics-truth-schedule.ts` | Scheduled truth jobs. | Materializer freshness. | high | yes |
| `functions/src/analytics-truth-cli.ts` | Truth CLI. | Manual rebuild/debug. | medium | audit |
| `functions/src/orchestration-identity.ts` | Orchestration identity. | Actor/source identity. | high | audit |
| `functions/src/orchestration-parity.ts` | Orchestration parity. | Parity/debug. | high | yes |
| `functions/src/privacy-consent-enforcement.ts` | Consent enforcement. | Guest telemetry eligibility. | high | audit |
| `functions/src/firebase-admin.ts` | Functions Firebase Admin setup. | Firebase source config. | high | audit |
| `functions/src/firebase-runtime.ts` | Functions runtime helpers. | Runtime/config truth. | medium | audit |

## Cache, Polling, Fallback, and Runtime Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `src/hooks/useAdminPollingSWR.ts` | Admin polling SWR hook. | Polling/fallback source state. | high | yes |
| `src/hooks/useAdminOverviewRealtime.ts` | Admin Overview realtime hook. | Firestore listener upgrade. | high | audit |
| `src/hooks/useAdminDropsFeed.ts` | Admin drops feed hook. | Firestore realtime/drop queue. | medium | audit |
| `src/hooks/useAdminModerationRealtime.ts` | Admin moderation realtime. | Realtime admin ops. | medium | audit |
| `src/hooks/useAdminSupportRealtime.ts` | Admin support realtime. | Realtime admin ops. | medium | audit |
| `src/lib/admin-parity.ts` | Admin truth state coercion. | Source-state labels. | high | yes |
| `src/lib/admin-analytics-truth.ts` | Analytics truth summary helper. | Module/source summaries. | high | yes |
| `src/lib/admin-analytics-live-runtime.ts` | Live runtime model. | Live/runtime source truth. | medium | audit |
| `src/lib/route-runtime-health.ts` | Client/shared route runtime health. | Runtime source. | high | audit |
| `src/lib/client-diagnostics.ts` | Client diagnostics. | Client source/runtime. | medium | audit |
| `src/lib/client-error-reporting.ts` | Client error/reporting. | Runtime diagnostics. | medium | audit |
| `src/lib/firestore-client-errors.ts` | Firestore client error normalization. | Listener/source failures. | medium | audit |
| `src/lib/self-healing.ts` | UI/runtime self-healing. | Runtime debug. | medium | audit |
| `src/lib/http-cache.ts` | HTTP cache helper. | Cache source state. | medium | audit |

## Config, Rules, Deploy, and Environment Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `firebase.json` | Firebase hosting/functions/emulator config. | Deploy/runtime config. | high | audit |
| `.firebaserc` | Firebase project config. | Deploy target truth. | medium | audit |
| `firestore.rules` | Firestore security rules. | Client admin/realtime read permissions. | high | yes |
| `database.rules.json` | RTDB rules. | Presence/chat/RTDB truth. | high | audit |
| `storage.rules` | Storage security rules. | Media/watch/drop state. | medium | audit |
| `apphosting.yaml` | App Hosting env/secrets/runtime config. | Runtime provider config. | high | audit |
| `next.config.ts` | Next runtime/build config. | App runtime/source behavior. | medium | audit |
| `package.json` | Scripts and dependency truth. | Validation lanes. | high | yes |
| `functions/package.json` | Functions dependencies/scripts. | Functions validation. | high | audit |
| `tsconfig.json` | TypeScript config. | Typecheck coverage. | medium | audit |
| `vitest.config.ts` | Test config. | Unit validation. | medium | audit |
| `vitest.contracts.config.ts` | Contract test config. | Contract validation. | medium | audit |
| `dataconnect/schema/schema.gql` | Data Connect derived mirror schema if present. | Derived retrieval plane, never stronger than repo truth. | medium | audit |

## Tests

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `tests/unit/admin-analytics-page.spec.tsx` | Admin Analytics page coverage. | UI/module rendering. | medium | yes |
| `tests/unit/admin-analytics-realtime-route.spec.ts` | Realtime route/hot cache tests. | Hot cache and first-party live route. | high | yes |
| `tests/unit/admin-analytics-live-runtime.spec.ts` | Live runtime tests. | Live/runtime source state. | medium | audit |
| `tests/unit/admin-analytics-truth.spec.ts` | Analytics truth helper tests. | Source labels. | medium | yes |
| `tests/unit/admin-analytics-data.spec.ts` | Analytics data route/helper tests. | GA4/historical source. | high | yes |
| `tests/unit/admin-analytics-audience-snapshot.spec.ts` | Audience Snapshot model tests. | Audience/guest estimate truth. | medium | yes |
| `tests/unit/admin-analytics-commerce-snapshot.spec.ts` | Commerce Snapshot model tests. | Commerce source truth. | medium | yes |
| `tests/unit/admin-analytics-live-pulse.spec.ts` | Live Pulse model tests. | Presence/graph truth. | medium | yes |
| `tests/unit/admin-analytics-journey-funnel.spec.ts` | Journey Funnel model tests. | Funnel count mode truth. | medium | yes |
| `tests/unit/admin-analytics-auth-outcome-split.spec.ts` | Auth Outcomes model tests. | Auth method/timing truth. | medium | yes |
| `tests/unit/admin-onboarding-velocity.spec.ts` | Onboarding velocity tests. | Onboarding timing/discrepancy. | medium | yes |
| `tests/unit/admin-analytics-guest-bounce-quality.spec.ts` | Guest quality tests. | Guest estimate/quality availability. | medium | yes |
| `tests/unit/admin-analytics-event-mix.spec.ts` | Event Mix model tests. | Event ranking/context. | medium | yes |
| `tests/unit/admin-analytics-live-interaction-stream.spec.ts` | Live stream model tests. | Admin exclusion/actor display. | medium | yes |
| `tests/unit/admin-task-pipeline.spec.ts` | Task pipeline/speed/leaderboard tests. | Task lifecycle truth. | high | yes |
| `tests/unit/admin-notification-funnel.spec.ts` | Notification Funnel model tests. | Notification pipeline summary. | high | yes |
| `tests/unit/admin-data-validation.spec.ts` | Data Validation tests. | Debug validation truth. | high | yes |
| `tests/unit/admin-debug-route-runtime.spec.ts` | Debug route runtime tests. | Runtime/debug truth. | medium | audit |
| `tests/unit/admin-debug-summary-cards.spec.ts` | Debug summary cards tests. | Debug source labels. | medium | audit |
| `tests/unit/analytics-identifiers.spec.ts` | Analytics identifier tests. | Identity/session taxonomy. | high | yes |
| `tests/unit/analytics-ingest-route.spec.ts` | Ingest route tests. | Guest/identified event ingestion. | high | yes |
| `tests/unit/analytics-metric-catalog.spec.ts` | Metric catalog tests. | Metric definitions. | medium | audit |
| `tests/unit/server-analytics-active-users.spec.ts` | Server analytics active-user tests. | Active user mirror. | high | yes |
| `tests/unit/telemetry.spec.ts` | Telemetry tests. | Client event emission. | high | audit |
| `tests/unit/telemetry-flows.spec.ts` | Telemetry flow tests. | Event sequences. | high | yes |
| `tests/unit/lib/telemetry.spec.ts` | Library telemetry tests. | Telemetry helper truth. | medium | audit |
| `tests/contracts/telemetry-contracts.spec.ts` | Telemetry contracts. | Event catalog/emitters. | high | yes |
| `tests/unit/task-guidance.spec.ts` | Task guidance tests. | Task guidance signals. | medium | audit |
| `tests/unit/task-observability.spec.ts` | Task observability tests. | Task debug/source state. | high | yes |
| `tests/unit/task-timestamps.spec.ts` | Task timestamp tests. | Timing source truth. | high | audit |
| `tests/contracts/task-economy-contract.spec.ts` | Task economy contract. | Rewards/GumDrops task economy. | high | yes |
| `tests/unit/notification-contracts.spec.ts` | Notification contract tests. | Dedupe/idempotency/read semantics. | high | yes |
| `tests/unit/notifications-route.spec.ts` | Notification API tests. | Read/clear/inbox truth. | high | yes |
| `tests/unit/notify-active-drops-route.spec.ts` | Active drop notification cron tests. | Drop notification send/dedupe. | high | yes |
| `tests/unit/fcm-utils.spec.ts` | FCM helper tests. | Push send truth. | medium | yes |
| `tests/unit/paypal-capture-route.spec.ts` | PayPal capture tests. | Payment completion truth. | high | yes |
| `tests/unit/gumdrop-ledger.spec.ts` | GumDrops ledger tests. | Unlock/economy truth. | high | audit |
| `tests/unit/gumdrop-economics.spec.ts` | Economics tests. | Commerce formula truth. | high | audit |
| `tests/unit/complete-onboarding-route.spec.ts` | Complete onboarding route tests. | Onboarding completion. | high | yes |
| `tests/unit/client-session.spec.ts` | Client session tests. | Guest/session identity. | high | yes |
| `tests/firebase/firestore.rules.spec.ts` | Firestore rules tests. | Client admin/realtime reads. | high | yes |
| `tests/firebase/database.rules.spec.ts` | RTDB rules tests. | RTDB presence/read rules. | high | audit |
| `tests/ui-audits/runtime.spec.ts` | UI runtime audit. | UI runtime/source states. | medium | audit |
| `tests/ui-audits/accessibility.spec.ts` | UI accessibility audit. | Admin/user UI coverage. | medium | audit |
| `tests/ui-audits/visual-regression.spec.ts` | Visual regression audit. | UI surface layout. | medium | audit |

## Scripts and Agent Index Files

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `scripts/audit-telemetry.ts` | Telemetry emitter/catalog audit. | Event coverage. | high | yes |
| `scripts/check-telemetry-parity-contracts.ts` | Telemetry parity contracts. | Event/module/semantic parity. | high | yes |
| `scripts/check-analytics-continuity.ts` | Analytics continuity guard. | Active users, guest sources, export heartbeat. | high | yes |
| `scripts/check-analytics-semantics.ts` | Semantic parity guard. | Semantic mapping. | high | yes |
| `scripts/check-admin-truth-contracts.ts` | Admin truth state guard. | Admin labels and fake state prevention. | high | yes |
| `scripts/check-admin-analytics-overview.ts` | Overview module guard. | Platform Pulse/overview. | medium | yes |
| `scripts/check-admin-analytics-audience-snapshot.ts` | Audience Snapshot guard. | Audience source truth. | medium | yes |
| `scripts/check-admin-analytics-commerce-snapshot.ts` | Commerce Snapshot guard. | Commerce source truth. | medium | yes |
| `scripts/check-admin-analytics-live-pulse.ts` | Live Pulse guard. | Presence/graph truth. | medium | yes |
| `scripts/check-admin-analytics-journey-funnel.ts` | Journey Funnel guard. | Funnel mode truth. | medium | yes |
| `scripts/check-admin-analytics-auth-outcome-split.ts` | Auth Outcomes guard. | Auth source/timing truth. | medium | yes |
| `scripts/check-admin-analytics-onboarding-performance.ts` | Onboarding Performance guard. | Consolidated onboarding truth. | medium | yes |
| `scripts/check-admin-analytics-guest-bounce-quality.ts` | Guest quality guard. | Guest quality/source truth. | medium | yes |
| `scripts/check-admin-analytics-event-mix.ts` | Event Mix guard. | Event ranking/context truth. | medium | yes |
| `scripts/check-admin-analytics-live-interaction-stream.ts` | Live stream guard. | Admin exclusion/source truth. | medium | yes |
| `scripts/check-admin-analytics-daily-task-pipeline.ts` | Daily Task Pipeline guard. | Task lifecycle/speed/leaderboard truth. | high | yes |
| `scripts/check-admin-data-validation-relocation.ts` | Data Validation relocation guard. | Debug validation placement. | medium | yes |
| `scripts/check-notification-pipeline.ts` | Notification pipeline guard. | Dedupe/read/funnel truth. | high | yes |
| `scripts/backfill-analytics-parity.ts` | Analytics parity backfill. | Legacy/source recovery. | high | audit |
| `scripts/rebuild-analytics-truth.ts` | Analytics truth rebuild. | Truth layer rebuild. | high | yes |
| `scripts/rebuild-behavioral-intelligence.ts` | Behavior rebuild. | Derived behavior, not canonical. | medium | audit |
| `scripts/check-client-firestore-connectivity.ts` | Client Firestore listener/rules guard. | Listener source availability. | high | yes |
| `scripts/check-route-runtime-parity.ts` | Route runtime parity guard. | Route diagnostics. | high | audit |
| `scripts/check-queue-runtime.ts` | Queue runtime guard. | Queue/drop lifecycle. | high | audit |
| `scripts/check-scheduler-freshness.ts` | Scheduler freshness guard. | Materializer freshness. | high | yes |
| `scripts/agent/build-agent-indexes.ts` | Agent index builder. | Repo inventory/source retrieval. | medium | audit |
| `scripts/agent/validate-agent-indexes.ts` | Agent index validator. | Schema guard. | medium | audit |
| `scripts/agent/extract-runtime-observability.ts` | Runtime observability index extractor. | Runtime/source index. | medium | yes |
| `scripts/agent/sync-sql.ts` | SQL/Data Connect mirror sync. | Derived retrieval plane. | medium | audit |
| `scripts/agent/verification-selector.ts` | Verification lane selector. | Agent workflow. | medium | audit |
| `agent/index/repo-inventory.json` | Machine-readable repo inventory. | File/source retrieval. | low | audit |
| `agent/index/surface-map.json` | Surface map. | Admin/analytics blast radius. | low | audit |
| `agent/index/canonical-helpers.json` | Canonical helper map. | Shared source helpers. | low | audit |
| `agent/index/runtime-observability.json` | Runtime observability index. | Route/materializer truth. | low | yes |
| `agent/index/blast-radius.json` | Blast-radius index. | Change risk. | low | audit |
| `agent/index/ui-surface-coverage.json` | UI surface coverage index. | Admin/user UI coverage. | low | audit |
| `agent/index/analytics-truth-layer-v2.json` | Phase 1 analytics truth machine index. | Doctrine/module/file/risk summary. | low | no |

## Agent Truth Docs

| Path | Role | Lane/source | Risk | Refactor later |
| --- | --- | --- | --- | --- |
| `docs/agent-truth/admin-analytics-overview.md` | Overview doctrine. | Platform Pulse/admin overview. | low | audit |
| `docs/agent-truth/admin-analytics-audience-snapshot.md` | Audience module doctrine. | Audience source truth. | low | audit |
| `docs/agent-truth/admin-analytics-commerce-snapshot.md` | Commerce module doctrine. | Commerce source truth. | low | audit |
| `docs/agent-truth/admin-analytics-live-pulse.md` | Live Pulse doctrine. | Presence truth. | low | audit |
| `docs/agent-truth/admin-analytics-journey-funnel.md` | Journey Funnel doctrine. | Funnel truth. | low | audit |
| `docs/agent-truth/admin-analytics-auth-outcome-split.md` | Auth Outcomes doctrine. | Auth truth. | low | audit |
| `docs/agent-truth/admin-analytics-onboarding-performance.md` | Onboarding Performance doctrine. | Onboarding truth. | low | audit |
| `docs/agent-truth/admin-analytics-guest-bounce-quality.md` | Guest quality doctrine. | Guest quality truth. | low | audit |
| `docs/agent-truth/admin-analytics-event-mix.md` | Event Mix doctrine. | Event context truth. | low | audit |
| `docs/agent-truth/admin-analytics-live-interaction-stream.md` | Live stream doctrine. | Interaction stream truth. | low | audit |
| `docs/agent-truth/admin-analytics-daily-task-pipeline.md` | Task module doctrine. | Task lifecycle/speed/leaderboard truth. | low | audit |
| `docs/agent-truth/admin-data-validation.md` | Data Validation relocation doctrine. | Debug validation. | low | audit |
| `docs/agent-truth/notification-pipeline.md` | Notification pipeline doctrine. | Notification truth. | low | audit |
| `docs/agent-truth/analytics-truth-layer-v2.md` | Phase 1 truth layer doctrine. | Global analytics truth. | low | no |
| `docs/agent-truth/analytics-source-hierarchy.md` | Phase 1 source hierarchy. | Source authority order. | low | no |
| `docs/agent-truth/analytics-actor-taxonomy.md` | Phase 1 actor taxonomy. | Actor lane separation. | low | no |
| `docs/agent-truth/analytics-module-map.md` | Phase 1 module map. | Module contracts. | low | no |
| `docs/agent-truth/analytics-file-inventory.md` | Phase 1 blast-radius inventory. | File map. | low | no |

## Inventory Gaps to Close in Later Phases

- Some provider-specific GA4/BigQuery details are centralized in `src/lib/server/admin-analytics-data.ts`; later phases should split stable daily export from intraday/current-day labels in the shared snapshot contract.
- Some source and actor classification exists only inside module-specific normalizers; later phases should move it into shared analytics source metadata.
- Some UI modules still consume broad historical response payloads instead of module-specific verified snapshots.
- Some listener paths must expose `fromCache` and `hasPendingWrites` consistently before being treated as live.
- SQL/Data Connect mirror artifacts are derived retrieval planes and must stay below verified runtime code and configuration.
