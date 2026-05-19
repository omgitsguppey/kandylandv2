# Analytics Ingest Firestore Closure

Generated: 2026-05-19T23:31:09.179Z
Current code version: 2e91fea3b74d8c5e1122a1fe7acb475510e9019a

## Summary

- Ingest contract created: yes
- Accepted events mapped: yes
- Failure retryability explicit: yes
- Firestore destinations centralized: yes
- Dedupe rules centralized: yes
- Diagnostics sampled: yes
- Telemetry graph reused: yes
- Client tracking policy present: yes

## Firestore Write Path

- Guest batches: analytics_guest_batches
- Guest sessions: analytics_sessions
- Behavioral timeline facts: behavioral_timeline_facts
- Diagnostics: server_diagnostics

## Event Contracts

### click

- Priority: priority
- Persistence: persisted
- Dedupe: session_batch
- Destinations: guest_batch, guest_session, behavioral_timeline, user_tracking_materialization
- Identity: sessionKey, anonymousVisitorId, clientSessionId_optional, consent_allows_anonymous_analytics
- Downstream: guest_batch_page_rollup, behavioral_timeline_fact_write, deferred_user_tracking_materialization, admin_analytics_snapshot_consumption

### hover

- Priority: supporting
- Persistence: sampled
- Dedupe: session_batch
- Destinations: guest_batch, guest_session, behavioral_timeline, user_tracking_materialization
- Identity: sessionKey, anonymousVisitorId, clientSessionId_optional, consent_allows_anonymous_analytics
- Downstream: guest_batch_page_rollup, behavioral_timeline_fact_write, deferred_user_tracking_materialization, admin_analytics_snapshot_consumption

### scroll

- Priority: supporting
- Persistence: sampled
- Dedupe: session_batch
- Destinations: guest_batch, guest_session, behavioral_timeline, user_tracking_materialization
- Identity: sessionKey, anonymousVisitorId, clientSessionId_optional, consent_allows_anonymous_analytics
- Downstream: guest_batch_page_rollup, behavioral_timeline_fact_write, deferred_user_tracking_materialization, admin_analytics_snapshot_consumption

### visibility

- Priority: supporting
- Persistence: sampled
- Dedupe: session_batch
- Destinations: guest_batch, guest_session, behavioral_timeline, user_tracking_materialization
- Identity: sessionKey, anonymousVisitorId, clientSessionId_optional, consent_allows_anonymous_analytics
- Downstream: guest_batch_page_rollup, behavioral_timeline_fact_write, deferred_user_tracking_materialization, admin_analytics_snapshot_consumption

### page_view

- Priority: priority
- Persistence: persisted
- Dedupe: session_batch
- Destinations: guest_batch, guest_session, behavioral_timeline, user_tracking_materialization
- Identity: sessionKey, anonymousVisitorId, clientSessionId_optional, consent_allows_anonymous_analytics
- Downstream: guest_batch_page_rollup, behavioral_timeline_fact_write, deferred_user_tracking_materialization, admin_analytics_snapshot_consumption

### page_leave

- Priority: priority
- Persistence: persisted
- Dedupe: session_batch
- Destinations: guest_batch, guest_session, behavioral_timeline, user_tracking_materialization
- Identity: sessionKey, anonymousVisitorId, clientSessionId_optional, consent_allows_anonymous_analytics
- Downstream: guest_batch_page_rollup, behavioral_timeline_fact_write, deferred_user_tracking_materialization, admin_analytics_snapshot_consumption

## Findings

- fixed: Telemetry dependency graph is present and reused as the upstream lane map.
- fixed: Client tracking policy is present for toggle/consent semantics.
- fixed: Canonical analytics ingest contract module exists.
- fixed: Each accepted anonymous event type maps to identity requirements, destinations, dedupe, and downstream processing.
- fixed: Ingest route uses the contract's accepted event list instead of a duplicate event enum.
- fixed: Ingest responses include explicit accepted, dropped, rejected, or temporary failure status.
- fixed: Firestore collection names for guest batches and sessions are centralized through the ingest contract.
- fixed: Persisted guest batches use the contract dedupe helper.
- fixed: Invalid JSON, invalid payloads, empty payloads, oversized payloads, and consent-denied drops are permanent non-retryable outcomes.
- fixed: 503 retryable responses are reserved for temporary infrastructure failures.
- fixed: Diagnostics are capped by fingerprint/hour and consent denial does not create high-volume diagnostics.

## Fixes Applied

- fixed: Added a canonical ingest contract with destination and retryability rules.
- fixed: Refactored ingest route to consume contract collection and dedupe rules.
- fixed: Added a focused validator and generated truth artifact lane.
- fixed: Added unit tests for ingest contract closure.

## Next Fix Order

1. Land the queued client tracking policy pass so client-side consent/toggle decisions use one shared policy before reaching ingest.
2. Keep new anonymous event types out of /api/analytics/ingest until they are added to the ingest contract with destinations and dedupe rules.
3. If a new Firestore destination is introduced, add it to ANALYTICS_INGEST_FIRESTORE_COLLECTIONS before writing route code.
