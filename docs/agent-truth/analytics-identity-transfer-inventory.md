# Analytics Identity Transfer Inventory

Generated: 2026-05-18T04:40:06.626Z
Current head: 5804de2bee6bb7ee37b6764af26094c391d03abf

## Summary

- Guest identity sources: 2
- User identity sources: 2
- Session sources: 1
- Watch session sources: 3
- Transfer candidates: 5
- Product truth sources: 2
- Evidence-only sources: 2
- Cloud SQL status: cloud_sql_agent_context_mirror_detected_no_product_runtime_dependency
- Gemini/Cloud Assist status: vertex_admin_ai_detected_outside_analytics_identity_transfer
- Route 4xx findings: 2

## Identity Map

- client-anonymous-visitor-id: src/lib/client-session.ts (product_truth) - Durable anonymous subject is persisted only when consent allows it; denied consent returns no anonymous visitor id.
- deeptracker-guest-batch: src/components/Analytics/DeepTracker.tsx -> /api/analytics/ingest (product_truth) - Guest events are batched with client identity and must remain recoverable instead of being discarded at login.
- server-guest-session-cookie: analytics_sessions / analytics_guest_batches (product_truth) - Server anon session key is a transport fallback; canonical anonymous visitor id prefers the client anonymous subject when valid.
- identified-ingest-user: src/app/api/analytics/ingest-identified/route.ts -> analytics_event_facts (product_truth) - Authenticated telemetry writes canonical runtime facts and can process identity_linked events.
- identity-linked-bridge: analytics_identity_links / identity_lineage_indexes (supporting_index) - This bridge links guest and user identities without rewriting old guest events into user events.
- admin-analytics-snapshots: src/lib/server/admin-analytics-data.ts (admin_display) - Admin snapshots are UI/display read models; they can expose linked context only when first-party source labels prove it.

## Transfer Gaps

- login-signup-transfer-entrypoint-not-proven [p1]: Identity link contract and server upsert path exist, and identified ingest handles identity_linked events. Next: Next pass should trace AuthContext/login/signup telemetry and wire a guarded identity_linked handoff if absent.
- guest-history-not-reclassified [p2]: Guest events remain guest-lane facts in analytics_guest_batches and behavioral timeline facts. Next: Keep transfer implementation link-based and avoid backfilling guest rows into user rows.
- admin-consumer-linked-context-not-proven [p2]: Admin display truth reads snapshots/hot caches and first-party facts, but this inventory does not prove every UI reads identity lineage. Next: After transfer wiring, add admin snapshot fields that distinguish direct user facts from linked guest context.

## Product Truth vs Evidence

- first-party-runtime-facts: analytics_event_facts -> product_truth; UI consumer: admin analytics, behavioral timeline, debug truth; product truth allowed: true
- first-party-guest-batches: analytics_guest_batches -> product_truth; UI consumer: live pulse, guest traffic, behavioral timeline; product truth allowed: true
- identity-lineage-indexes: analytics_identity_links / identity_lineage_indexes -> supporting_index; UI consumer: future guest-to-user recovery views; product truth allowed: true
- admin-snapshot-display: analytics_admin_metric_snapshots / analytics_aggregate_stats -> admin_display; UI consumer: Admin Analytics; product truth allowed: false
- external-provider-evidence: GA4 / BigQuery / PostHog -> evidence_only; UI consumer: Debug parity and export evidence; product truth allowed: false

## Watch Time

- watch-session-rollups: runtime playback truth=true; page-open allowed=false. Canonical watch time comes from runtime viewer/watch sessions and playback/visibility observations.
- watch-assets-observations: runtime playback truth=true; page-open allowed=false. Asset observations support deduped/finalized playback time and missing-watch diagnostics.
- deeptracker-page-duration: runtime playback truth=false; page-open allowed=false. Page dwell can diagnose engagement but must not populate canonical watch time.

## Cost and 4xx

- analytics-ingest-cloud-run-bounded (cloud_run, p2, source_inventory_complete): Guest ingest has body-size, event-count, consent, idempotent batch, and transaction boundaries; future transfer must not add eager broad reads before validation.
- identified-ingest-cloud-run-bounded (cloud_run, p2, source_inventory_complete): Identified ingest is auth-gated, rate-limited, validates event batches, and handles identity_linked records during canonical event processing.
- cloud-sql-agent-context-mirror-detected (cloud_sql, p2, cloud_sql_agent_context_mirror_detected_no_product_runtime_dependency): Cloud SQL/Data Connect appears as an agent-context mirror, not as an analytics identity transfer runtime dependency.
- gemini-cloud-assist-outside-transfer-lane (gemini_cloud_assist, p2, vertex_admin_ai_detected_outside_analytics_identity_transfer): Gemini/Vertex model references are admin/AI cover/debug lanes; no analytics identity transfer model call was found.
- analytics-expected-4xx (route_4xx, p2, classified): 401 unauthenticated and ignored invalid/payload-too-large analytics submissions are expected product 4xx/ignored paths.
- analytics-unexpected-client-4xx-risk (route_4xx, p1, owner_review_required): Malformed identity/event payloads, stale route targets, or consent/identity mismatch would be unexpected tracking/client 4xx sources during transfer wiring.

## Next Fix Order

1. Trace AuthContext login/signup/session-restore paths and prove whether identity_linked is emitted after authentication.
2. If absent, add an idempotent guest-to-user identity transfer event using anonymousVisitorId, sessionId, userId, consent, and eligiblePastSessionIds.
3. After source transfer exists, update admin/user analytics consumers to label direct user facts versus linked guest context.

