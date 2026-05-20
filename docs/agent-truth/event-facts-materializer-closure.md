# Event Facts Materializer Closure

Generated: 2026-05-20T06:22:50.251Z
Current code version: f7dca270d0e4e2e73a8ce94418a090b0d745e529

## Summary

- Materialization contract created: yes
- Persisted collections classified: yes
- Event fact dedupe present: yes
- Low-priority rollups deferred: yes
- Admin reads summaries by default: yes
- BigQuery candidates marked: yes
- Unknown legacy separated: yes
- Telemetry graph reused: yes
- Ingest contract reused: yes

## Collection Classifications

### analytics_event_facts

- Classification: event_fact
- Producer: identified ingest, server trackServerEvent, callable ingestAnalyticsEvent
- Inputs: analytics_event_facts
- Event fact outputs: analytics_event_facts
- Rollup outputs: analytics_rollups_daily, analytics_event_stats, analytics_users_rollup, analytics_user_daily, analytics_drops_rollup, analytics_drop_daily, analytics_session_facts, analytics_semantic_daily, analytics_event_rollup_batches
- Dedupe keys: analytics_dedupe/{eventId}, eventId, idempotencyKey
- Cadence: immediate, minute, day, deferred
- Admin consumers: Admin Analytics snapshots, Admin Debug telemetry evidence, BigQuery export candidates
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Priority event facts roll up immediately; non-priority event facts enqueue minute batches before summary materialization.

### analytics_guest_batches

- Classification: materialized_summary
- Producer: DeepTracker anonymous ingest
- Inputs: analytics_guest_batches
- Event fact outputs: behavioral_timeline_facts
- Rollup outputs: analytics_page_daily, analytics_semantic_daily, behavioral_timeline_facts
- Dedupe keys: guest_batch:{sessionKey}:{batchId}, session_batch
- Cadence: minute, day, deferred
- Admin consumers: Admin Analytics audience snapshot, Guest analytics cutover, Admin Debug guest evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Guest batches are bounded batches and must not hot-write one rollup per hover/scroll/visibility signal.

### analytics_sessions

- Classification: materialized_summary
- Producer: anonymous ingest session snapshots and identity/session helpers
- Inputs: analytics_guest_batches, analytics_sessions
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots, identity_lineage_indexes
- Dedupe keys: sessionKey, clientSessionId
- Cadence: minute, hour, day
- Admin consumers: Admin Analytics audience/live pulse, Identity transfer evidence
- BigQuery candidate: no
- Current truth: yes
- Legacy state: current
- Notes: Session records support audience and identity summaries; missing sessions are unavailable evidence, not zero users.

### behavioral_timeline_facts

- Classification: event_fact
- Producer: analytics ingest and identified event fact normalizers
- Inputs: analytics_guest_batches, analytics_event_facts
- Event fact outputs: behavioral_timeline_facts
- Rollup outputs: user_tracking_indexes, guest_tracking_indexes, analytics_admin_metric_snapshots
- Dedupe keys: eventId, session_batch_event_index
- Cadence: minute, hour, day, deferred
- Admin consumers: Recommendation ranker, Admin Analytics event mix, Behavioral evidence reports
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Behavioral facts normalize current telemetry; admin/projection/synthetic activity remains excluded from user behavior metrics.

### analytics_watch_sessions

- Classification: materialized_summary
- Producer: viewer watch-session route
- Inputs: analytics_watch_sessions, analytics_watch_observations
- Event fact outputs: analytics_event_facts
- Rollup outputs: analytics_session_facts, analytics_admin_metric_snapshots, behavioral intelligence watch rollups
- Dedupe keys: watchSessionId, actorUserId:dropId:assetId
- Cadence: immediate, minute, day
- Admin consumers: Runtime watch-time v2, Admin Analytics watch-time health, Beta analytics/watch-time evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Watch-time truth comes from foreground runtime media/session intervals, not page duration.

### analytics_watch_observations

- Classification: materialized_summary
- Producer: viewer watch-session route observation writes
- Inputs: analytics_watch_observations
- Event fact outputs: none
- Rollup outputs: analytics_watch_sessions, analytics_session_facts
- Dedupe keys: observationId, watchSessionId:sequence
- Cadence: immediate, minute
- Admin consumers: Runtime watch-time v2 diagnostics
- BigQuery candidate: no
- Current truth: yes
- Legacy state: current
- Notes: Observation rows support watch-session rollups and should stay bounded to runtime media observations.

### analytics_event_rollup_batches

- Classification: materialized_summary
- Producer: onAnalyticsEventFactCreated non-priority queue
- Inputs: analytics_event_facts
- Event fact outputs: none
- Rollup outputs: analytics_rollups_daily, analytics_event_stats, analytics_admin_metric_snapshots
- Dedupe keys: minuteKey
- Cadence: minute, deferred
- Admin consumers: Admin Analytics event mix, analytics materializer health
- BigQuery candidate: no
- Current truth: yes
- Legacy state: current
- Notes: This queue prevents low-priority event facts from hot-writing every downstream aggregate.

### analytics_rollups_daily

- Classification: materialized_summary
- Producer: analytics event fact materializer
- Inputs: analytics_event_facts, analytics_event_rollup_batches
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: dayKey
- Cadence: day, deferred
- Admin consumers: Admin Analytics platform pulse, Admin Debug analytics truth
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Daily rollups are current summaries only when source timestamps and materializer status are fresh.

### analytics_event_stats

- Classification: materialized_summary
- Producer: analytics event fact materializer
- Inputs: analytics_event_facts
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: eventName
- Cadence: minute, day, deferred
- Admin consumers: Admin Analytics event mix
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Event stats summarize observed event facts and cannot invent event totals detached from source facts.

### analytics_users_rollup

- Classification: materialized_summary
- Producer: analytics event fact materializer
- Inputs: analytics_event_facts
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots, user_tracking_indexes
- Dedupe keys: userId
- Cadence: minute, day, deferred
- Admin consumers: Admin user analytics, behavioral intelligence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: User rollups must keep linked guest lineage separate to prevent double counting.

### analytics_user_daily

- Classification: materialized_summary
- Producer: analytics event fact materializer
- Inputs: analytics_event_facts
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots, user_tracking_indexes
- Dedupe keys: dayKey:userId
- Cadence: day, deferred
- Admin consumers: Admin user analytics
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: User daily rows are summary outputs, not raw truth replacements.

### analytics_drops_rollup

- Classification: materialized_summary
- Producer: analytics event fact materializer
- Inputs: analytics_event_facts, analytics_watch_sessions
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: dropId
- Cadence: minute, day, deferred
- Admin consumers: Admin top drops, Drop behavior evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Drop rollups summarize source facts and server entitlement/watch records.

### analytics_drop_daily

- Classification: materialized_summary
- Producer: analytics event fact materializer
- Inputs: analytics_event_facts, analytics_watch_sessions
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: dayKey:dropId
- Cadence: day, deferred
- Admin consumers: Admin top drops, Drop behavior evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Drop daily rows are source-backed summaries only.

### analytics_session_facts

- Classification: materialized_summary
- Producer: analytics event fact and watch-session materializers
- Inputs: analytics_event_facts, analytics_watch_sessions
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots, behavioral intelligence watch rollups
- Dedupe keys: sessionId:dropId
- Cadence: minute, day, deferred
- Admin consumers: Admin Analytics session health, Runtime watch-time evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Session facts must label legacy page-duration watch scores as low confidence.

### analytics_semantic_daily

- Classification: materialized_summary
- Producer: analytics semantic rollup materializer
- Inputs: analytics_event_facts, analytics_guest_batches
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: dayKey:category:scopeKey
- Cadence: day, deferred
- Admin consumers: Admin Analytics semantic scopes, source truth evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Semantic daily rows summarize normalized source scopes and should not be treated as raw events.

### analytics_page_daily

- Classification: materialized_summary
- Producer: guest batch page materializer
- Inputs: analytics_guest_batches
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: dayKey:pagePath
- Cadence: day, deferred
- Admin consumers: Admin Analytics audience/page evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Page daily records derive from bounded guest batches, not raw hover spam.

### analytics_admin_metric_snapshots

- Classification: admin_evidence
- Producer: admin analytics materializer registry
- Inputs: analytics_event_facts, analytics_guest_batches, analytics_watch_sessions, analytics_rollups_daily
- Event fact outputs: none
- Rollup outputs: none
- Dedupe keys: moduleKey:rangeKey
- Cadence: manual, deferred
- Admin consumers: Admin Analytics default display, Admin Debug source truth
- BigQuery candidate: no
- Current truth: yes
- Legacy state: current
- Notes: Default Admin Analytics should read snapshots/summaries first and keep raw ledgers as debug input only.

### analytics_identity_links

- Classification: event_fact
- Producer: identity-link route and identified ingest identity_linked event
- Inputs: analytics_identity_links, analytics_event_facts
- Event fact outputs: analytics_event_facts
- Rollup outputs: identity_lineage_indexes
- Dedupe keys: userId:anonymousVisitorId:sessionId
- Cadence: immediate, deferred
- Admin consumers: Identity transfer evidence, Guest-user analytics cutover
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Identity links join lineage without rewriting or duplicating guest events.

### identity_lineage_indexes

- Classification: materialized_summary
- Producer: identity transfer materializer
- Inputs: analytics_identity_links, analytics_guest_batches, analytics_event_facts
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: userId
- Cadence: deferred
- Admin consumers: Individual user telemetry and linked-user evidence
- BigQuery candidate: no
- Current truth: yes
- Legacy state: current
- Notes: Linked guest history remains lineage and must not double count as new user events.

### user_tracking_indexes

- Classification: materialized_summary
- Producer: behavioral materializers
- Inputs: analytics_event_facts, behavioral_timeline_facts, analytics_watch_sessions
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: userId
- Cadence: deferred
- Admin consumers: Recommendations, Admin user behavior, behavioral evidence
- BigQuery candidate: no
- Current truth: yes
- Legacy state: current
- Notes: Tracking indexes are serving models over source facts, not independent truth.

### guest_tracking_indexes

- Classification: materialized_summary
- Producer: behavioral materializers
- Inputs: analytics_guest_batches, behavioral_timeline_facts
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: anonymousVisitorId
- Cadence: deferred
- Admin consumers: Guest analytics evidence, recommendation context
- BigQuery candidate: no
- Current truth: yes
- Legacy state: current
- Notes: Guest indexes remain separate from linked user indexes until identity transfer joins lineage.

### transactions

- Classification: event_fact
- Producer: server payment capture and ledger routes
- Inputs: transactions
- Event fact outputs: analytics_event_facts
- Rollup outputs: analytics_admin_metric_snapshots, analytics_rollups_daily
- Dedupe keys: transactionId, providerCaptureId
- Cadence: immediate, day
- Admin consumers: Admin revenue truth, commerce snapshot
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Payment transaction truth outranks telemetry; this contract only classifies downstream analytics use.

### daily_task_events

- Classification: event_fact
- Producer: daily task/reward server routes
- Inputs: daily_task_events
- Event fact outputs: analytics_event_facts
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: eventId, userId:taskId:dayKey
- Cadence: immediate, day
- Admin consumers: Daily task pipeline, economy evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Task events are server facts and cannot be replaced by client-only telemetry.

### creator_subscriptions

- Classification: event_fact
- Producer: creator subscription server routes
- Inputs: creator_subscriptions
- Event fact outputs: analytics_event_facts
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: subscriptionId
- Cadence: immediate, day
- Admin consumers: Fan Pass CRM, creator monetization evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Creator subscription state is product truth; telemetry is companion evidence.

### creator_drop_submissions

- Classification: event_fact
- Producer: creator drop submission and admin review routes
- Inputs: creator_drop_submissions
- Event fact outputs: analytics_event_facts
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: dropId, submissionId
- Cadence: immediate, day
- Admin consumers: Creator drop management approval, Admin Drops CMS evidence
- BigQuery candidate: yes
- Current truth: yes
- Legacy state: current
- Notes: Pending creator submissions are excluded from public discovery until admin review changes server truth.

### ga4_daily

- Classification: archive_debug_only
- Producer: external GA4 evidence refresh when configured
- Inputs: ga4_daily
- Event fact outputs: none
- Rollup outputs: analytics_admin_metric_snapshots
- Dedupe keys: propertyId:date
- Cadence: manual
- Admin consumers: GA4 recovery truth, Admin Analytics external evidence
- BigQuery candidate: no
- Current truth: no
- Legacy state: debug_archive
- Notes: GA4 is external evidence only and never first-party product truth.

### server_diagnostics

- Classification: archive_debug_only
- Producer: bounded diagnostics and debug evidence
- Inputs: server_diagnostics
- Event fact outputs: none
- Rollup outputs: admin debug evidence
- Dedupe keys: fingerprint:hour
- Cadence: deferred, manual
- Admin consumers: Admin Debug
- BigQuery candidate: no
- Current truth: no
- Legacy state: debug_archive
- Notes: Diagnostics support debugging and must not become current behavior or revenue truth.

### legacy_page_duration_events

- Classification: archive_debug_only
- Producer: legacy analytics adapters
- Inputs: legacy_page_duration_events
- Event fact outputs: none
- Rollup outputs: none
- Dedupe keys: legacyEventId
- Cadence: manual
- Admin consumers: Admin Debug legacy archive only
- BigQuery candidate: no
- Current truth: no
- Legacy state: unknown_legacy
- Notes: Legacy page duration is not watch-time or current user behavior truth.

## Findings

- fixed: Canonical materialization contract exists.
- fixed: Telemetry dependency graph is reused as the upstream producer lane map.
- fixed: Analytics ingest contract is reused for anonymous event type materialization rules.
- fixed: Persisted collections have downstream classifications.
- fixed: analytics_event_facts writes use create semantics, analytics_dedupe, and duplicate guards.
- fixed: Low-priority event facts write deferred minute batches and guest behavior rollups are bounded by batch.
- fixed: Semantic rollups are sourced from event facts or guest batches.
- fixed: Admin Analytics default display is tied to snapshots/summaries while raw ledgers are input/debug evidence.
- fixed: Analytics metrics derive from supplied event facts, guest batches, and session facts instead of hardcoded totals.
- fixed: BigQuery export candidates are explicitly marked in the materialization contract.
- fixed: Legacy page-duration analytics remain unknown_legacy/debug-only and cannot become current watch-time truth.

## Fixes Applied

- fixed: Added the event facts/materializer contract.
- fixed: Added the focused event facts materializer validator.
- fixed: Added unit tests for event facts/materializer closure.

## Next Fix Order

1. When a new analytics collection is produced, classify it in materialization-contract before it can be treated as current evidence.
2. Keep low-priority event facts on deferred minute/day rollup paths; do not hot-write summary totals for every hover/scroll/visibility event.
3. Keep legacy page-duration records archived/debug-only unless a source-backed migration explicitly promotes them.
