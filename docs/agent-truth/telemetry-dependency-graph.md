# Telemetry Dependency Graph

Generated: 2026-05-19T23:18:03.690Z
Current code version: 9844e076b0a5cae98555944ec63c0fc2cc67227f

## Summary

- Lanes mapped: 14
- Priority lanes closed: yes
- Catalog events mapped: yes
- Fake tracked claims blocked: yes
- Admin consumers have producers: yes
- BigQuery export has event facts: yes
- External evidence separated: yes

## Lanes

### Page view and route engagement
- Lane: page_view
- Producer: PageViewEvent, DeepTracker, route-level client components
- Route/API: /api/analytics/ingest for anonymous batches; /api/analytics/ingest-identified for authenticated events
- Persistence: analytics_guest_batches, analytics_sessions, analytics_event_facts
- Materializer/export: behavioral_timeline_facts from guest ingest; analytics rollups and BigQuery export from analytics_event_facts
- Admin/evidence consumer: Admin Analytics hot-cache/snapshots, Admin Debug telemetry evidence, public beta analytics evidence
- Identity requirements: sessionId, anonymousVisitorId or actorUserId, route
- Enabled behavior: Persist anonymous page context as guest batches and authenticated page events as event facts.
- Disabled behavior: Respect analytics consent; anonymous denied consent returns ignored without writes.
- Failure behavior: Do not show fake zero traffic; mark page-view evidence unavailable or stale when persistence is missing.
- Product truth: yes
- Evidence-only: no
### Session lifecycle
- Lane: session
- Producer: DeepTracker, AuthContext, client session helpers
- Route/API: /api/analytics/ingest and /api/analytics/ingest-identified
- Persistence: analytics_sessions, analytics_guest_batches, analytics_event_facts
- Materializer/export: session rollups, behavioral timeline facts, admin analytics snapshots
- Admin/evidence consumer: Admin Analytics audience/live pulse and Admin Debug session evidence
- Identity requirements: sessionId, anonymousVisitorId or actorUserId, occurredAt
- Enabled behavior: Persist session events and anonymous session snapshots with bounded guest batches.
- Disabled behavior: Do not create guest session records when anonymous analytics consent is denied.
- Failure behavior: Treat missing session persistence as unavailable session evidence, not zero users.
- Product truth: yes
- Evidence-only: no
### Anonymous guest event batches
- Lane: guest_event
- Producer: DeepTracker semantic event queue
- Route/API: /api/analytics/ingest
- Persistence: analytics_guest_batches and analytics_sessions
- Materializer/export: behavioral_timeline_facts writes plus later guest-to-user transfer materializers
- Admin/evidence consumer: Guest analytics cutover report, Admin Analytics guest bounce quality, Admin Debug guest evidence
- Identity requirements: anonymousVisitorId, sessionId, consent.analytics
- Enabled behavior: Queue anonymous telemetry with sendBeacon/fetch and persist accepted batches.
- Disabled behavior: Return ignored for denied consent without writing priority guest telemetry.
- Failure behavior: Mark guest evidence unavailable when batches are absent; do not infer tracked state from client calls alone.
- Product truth: yes
- Evidence-only: no
### Authentication and onboarding transitions
- Lane: auth_transition
- Producer: Auth UI, onboarding flows, server auth handlers
- Route/API: /api/analytics/ingest-identified for authenticated events; server trackServerEvent for canonical backend outcomes
- Persistence: analytics_event_facts; analytics_guest_batches before login when anonymous
- Materializer/export: behavioral_timeline_facts, analytics rollups, admin auth outcome snapshots
- Admin/evidence consumer: Admin Analytics auth outcomes, onboarding performance, analytics truth layer
- Identity requirements: actorUserId or anonymousVisitorId, sessionId when client-sourced, source
- Enabled behavior: Persist auth and onboarding transitions with actor classification and source truth.
- Disabled behavior: Keep unauthenticated pre-login events in guest batches when consent allows; otherwise skip writes.
- Failure behavior: Do not coerce unknown actors to users; missing auth evidence remains unavailable.
- Product truth: yes
- Evidence-only: no
### Guest-to-user identity transfer
- Lane: identity_link
- Producer: analytics identity-link route and identified ingest identity_linked events
- Route/API: /api/analytics/identity-link and /api/analytics/ingest-identified
- Persistence: analytics_identity_links and analytics_event_facts
- Materializer/export: guest-to-user transfer materializers, behavioral timeline facts
- Admin/evidence consumer: Analytics identity transfer inventory, guest-user analytics cutover, Admin Debug identity evidence
- Identity requirements: anonymousVisitorId, sessionId, actorUserId
- Enabled behavior: Persist explicit identity links without erasing guest lineage.
- Disabled behavior: Reject missing authenticated user context and do not link anonymous records silently.
- Failure behavior: Treat link failure as transfer unavailable; preserve original guest records.
- Product truth: yes
- Evidence-only: no
### Purchase and checkout telemetry
- Lane: purchase
- Producer: Checkout UI and server purchase verification
- Route/API: Client analytics ingest plus server trackServerEvent from purchase verification routes
- Persistence: analytics_event_facts and canonical transaction records
- Materializer/export: commerce snapshots, analytics rollups, BigQuery export from event facts
- Admin/evidence consumer: Admin revenue/top drops truth, Admin Analytics commerce snapshot, beta revenue evidence
- Identity requirements: actorUserId, objectId or transactionId, sourceTruth
- Enabled behavior: Persist telemetry only after canonical checkout/purchase outcomes; server facts outrank client intent.
- Disabled behavior: Client checkout intent may be queued, but purchase success is not product truth without server verification.
- Failure behavior: Missing purchase telemetry is unavailable evidence; never infer revenue from GA4-only events.
- Product truth: yes
- Evidence-only: no
### GumDrop balance and reward lifecycle
- Lane: gumdrop_balance
- Producer: Daily task pipeline, wallet/economy server handlers, ledger-backed reward flows
- Route/API: Canonical server task/economy handlers plus /api/analytics/ingest-identified for UI companions
- Persistence: analytics_event_facts plus canonical GumDrop ledger/transaction truth
- Materializer/export: task pipeline rollups, commerce/economy admin evidence, BigQuery export from event facts
- Admin/evidence consumer: Admin daily task pipeline, economy evidence, public beta score economy lane
- Identity requirements: actorUserId, sourceTruth, objectId when applicable
- Enabled behavior: Persist reward/economy telemetry as companions to canonical ledger transitions.
- Disabled behavior: Do not emit economy success telemetry when ledger write fails or is unavailable.
- Failure behavior: Ledger truth wins; telemetry gaps cannot change balances.
- Product truth: yes
- Evidence-only: no
### Creator experience and fan actions
- Lane: creator_experience
- Producer: Creator profile, Fan Pass, broadcast, chat, booking, and creator dashboard surfaces
- Route/API: /api/analytics/ingest-identified and creator/admin server routes using trackServerEvent
- Persistence: analytics_event_facts with actor/target creator separation
- Materializer/export: creator CRM/admin evidence, behavioral timeline facts, BigQuery export from event facts
- Admin/evidence consumer: Creator dashboard role boundary reports, Fan Pass CRM/broadcast evidence, Admin Analytics creator lanes
- Identity requirements: actorUserId or actorCreatorId, targetCreatorId when fan action targets creator, sourceTruth
- Enabled behavior: Persist creator/fan events with actor and target creator fields separated.
- Disabled behavior: Do not promote fan actions into creator behavior without creator actor context.
- Failure behavior: Missing creator evidence is unavailable and must not be replaced by raw UID labels.
- Product truth: yes
- Evidence-only: no
### Creator subscription and Fan Pass lifecycle
- Lane: creator_subscription
- Producer: Creator subscription/Fan Pass server routes and UI companions
- Route/API: Creator subscription server routes using trackServerEvent plus identified ingest companions
- Persistence: analytics_event_facts and canonical creator subscription records
- Materializer/export: creator CRM/subscriber materializers, admin creator evidence, BigQuery export
- Admin/evidence consumer: Fan Pass CRM/broadcast evidence, creator parity reports, creator dashboard stats evidence
- Identity requirements: actorUserId, targetCreatorId, sourceTruth
- Enabled behavior: Persist subscription state changes only when canonical subscription state changes or user action is queued.
- Disabled behavior: Do not count UI-only subscription intent as active subscription truth.
- Failure behavior: Subscription records outrank telemetry; missing events stay evidence gaps.
- Product truth: yes
- Evidence-only: no
### Creator drop submission and admin review
- Lane: creator_drop_submission
- Producer: Creator drop API and Admin drops review route
- Route/API: /api/creator/drops and /api/admin/drops using trackServerEvent
- Persistence: analytics_event_facts plus pending creator drop submission records
- Materializer/export: creator drop management approval evidence, admin CMS workflow evidence, BigQuery export
- Admin/evidence consumer: Creator drop management approval report, Admin Drops CMS audit, public beta creator supply evidence
- Identity requirements: actorUserId or actorAdminId, actorCreatorId or targetCreatorId, sourceTruth
- Enabled behavior: Persist creator submission and admin review telemetry alongside approval-state mutations.
- Disabled behavior: Do not mark a creator drop tracked or approved when the pending/review record write fails.
- Failure behavior: Pending submissions stay out of public discovery and rotation when telemetry is missing.
- Product truth: yes
- Evidence-only: no
### Runtime watch-time proof
- Lane: runtime_watch
- Producer: useViewerWatchSession and viewer watch-session route; RuntimeWatchTracker is source-ready but not the persisted default path
- Route/API: /api/viewer/watch-session for persisted runtime proof; /api/analytics/ingest-identified for companion event facts
- Persistence: analytics_watch_sessions, analytics_watch_observations, analytics_event_facts companions
- Materializer/export: watch-session rollups, runtime watch-time evidence, analytics admin snapshots
- Admin/evidence consumer: Runtime watch-time v2 evidence, Admin Analytics watch-time health, public beta runtime proof
- Identity requirements: actorUserId, dropId or assetId, visible/foreground timing source
- Enabled behavior: Persist watch intervals through the watch-session route; source-only trackers are not enough.
- Disabled behavior: When route wiring is absent, mark watch-time as source-ready or evidence missing instead of tracked.
- Failure behavior: Do not use page duration as watch-time truth; mark deployed runtime proof missing when sessions are absent.
- Product truth: yes
- Evidence-only: no
- Source-ready note: RuntimeWatchTracker defaults to no ingest endpoint and is not production-mounted as the product-truth persistence path.
### Behavior and recommendation signals
- Lane: behavior_signal
- Producer: Client interactions, recommendation surfaces, support flows, behavioral normalizers
- Route/API: /api/analytics/ingest, /api/analytics/ingest-identified, server trackServerEvent for canonical outcomes
- Persistence: analytics_guest_batches, analytics_event_facts, behavioral_timeline_facts
- Materializer/export: behavioral intelligence materializers, recommendation ranker inputs, admin event mix
- Admin/evidence consumer: Admin Analytics event mix, recommendation evidence, public beta behavior evidence
- Identity requirements: anonymousVisitorId or actorUserId, eventName, objectId when applicable
- Enabled behavior: Persist user actions as guest batches or identified facts, then materialize normalized behavior.
- Disabled behavior: Skip or queue only within consent/auth rules; debug-only UI calls are not product truth.
- Failure behavior: Missing behavior signals reduce confidence; do not synthesize engagement from UI state.
- Product truth: yes
- Evidence-only: no
### Admin/debug/security evidence
- Lane: admin_evidence
- Producer: Admin routes, security/moderation handlers, debug evidence pipeline, server system jobs
- Route/API: Admin/server routes using trackServerEvent and admin evidence validators
- Persistence: analytics_event_facts, debug evidence artifacts, admin metric snapshots
- Materializer/export: admin/debug snapshots, source-truth reports, BigQuery export from event facts when applicable
- Admin/evidence consumer: Admin Debug Control Tower, source truth authority map, public beta evidence reports
- Identity requirements: actorAdminId or actorType=system, sourceTruth, route or job id
- Enabled behavior: Persist admin/system evidence with admin actor separation and explicit source-state labels.
- Disabled behavior: Do not mix admin projection or system evidence into user behavior analytics.
- Failure behavior: Unavailable admin evidence must be labeled unavailable/degraded, never healthy by fallback.
- Product truth: yes
- Evidence-only: no
### External GA4/PostHog/BigQuery evidence
- Lane: external_ga4_evidence
- Producer: Ga4EvidenceTracker, PostHog provider, analytics export jobs
- Route/API: No default Admin Data API route; explicit evidence refresh only when configured
- Persistence: GA4 vendor store or exported evidence snapshot only; excluded from first-party event fact truth
- Materializer/export: GA4 recovery truth report, admin analytics external evidence panel, BigQuery export snapshots
- Admin/evidence consumer: Admin Analytics external evidence, GA4 recovery truth, beta analytics supporting evidence
- Identity requirements: measurementId/propertyId when configured, consent.analytics, external source label
- Enabled behavior: Load or refresh only when configured, consented, explicit, and TTL guarded.
- Disabled behavior: Show unavailable/config missing; do not display missing GA4 as zero traffic.
- Failure behavior: External evidence failures do not override first-party analytics product truth.
- Product truth: no
- Evidence-only: yes
## Findings

- fixed: DeepTracker anonymous telemetry reaches /api/analytics/ingest, persists accepted guest batches, and writes bounded timeline facts.
- fixed: Anonymous consent denial returns ignored without writing priority guest telemetry.
- fixed: Identified ingest persists canonical event facts and writes behavioral timeline facts.
- fixed: Identity-link route persists guest-to-user links and emits canonical identity events.
- fixed: Server trackServerEvent writes analytics_event_facts before optional vendor evidence.
- fixed: RuntimeWatchTracker is source-ready, while runtime proof is persisted through the watch-session route.
- fixed: Telemetry catalog events resolve to one canonical dependency lane.
- fixed: Priority tracking lanes require persisted or explicitly queued destinations before they can be called tracked.
- fixed: Standalone RuntimeWatchTracker is documented as source-ready and not the product-truth persistence path.
- fixed: Admin analytics consumers read event facts, guest batches, and watch sessions instead of detached fake counters.
- fixed: GA4/PostHog/vendor analytics remain external evidence and do not replace first-party product truth.
- fixed: BigQuery export consumes analytics_event_facts instead of missing or client-only events.
- fixed: Canonical telemetry dependency graph module exists.

## Fixes Applied

- fixed: Created the canonical telemetry dependency graph.
- fixed: Added a focused validator for telemetry route closure.
- fixed: Added unit coverage for lane closure and evidence-only GA4 separation.

## Next Fix Order

1. Keep RuntimeWatchTracker source-ready until a product route intentionally mounts it or replaces the existing watch-session route.
2. When adding telemetry catalog events, map them to a dependency lane before claiming the event is tracked.
3. Keep GA4/PostHog/vendor data external evidence unless first-party persistence is added.
