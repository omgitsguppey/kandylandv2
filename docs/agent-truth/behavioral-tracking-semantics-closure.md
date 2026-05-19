# Behavioral Tracking Semantics Closure

Generated: 2026-05-19T23:31:18.652Z
Current code version: 2e91fea3b74d8c5e1122a1fe7acb475510e9019a

## Summary

- Tracking surface map created: yes
- Client tracking policy created: yes
- Disabled behavior suppressed: yes
- Enabled behavior bounded: yes
- Client and ingest events aligned: yes
- Watch time runtime-only: yes
- Hardcoded behavior scores blocked: yes
- Telemetry graph present: yes
- Ingest contract present: yes

## Behavioral Surfaces

### Page behavior

- Lane: page_behavior
- Surface: main_site
- Priority: high
- Events: page_view, page_leave, click, hover, scroll, visibility, semantic_page_viewed, semantic_target_clicked, semantic_page_engaged, semantic_page_passive, semantic_page_bounced, semantic_page_exited
- Required identity: anonymousVisitorId or actorUserId, sessionId
- Disabled allowed: no
- Persistence: analytics_guest_batches / analytics_event_facts
- Aggregation: behavioral_timeline_facts and admin analytics snapshots
- UI consumer: Route-level UX and recommendation context
- Admin consumer: Admin Analytics event mix and guest/user behavior evidence
- Disabled behavior: Suppress behavior queue, external analytics, and non-essential diagnostics.

### Drop discovery, preview, and unlock companions

- Lane: drop_behavior
- Surface: drops
- Priority: critical
- Events: drop_card_impression, featured_slide_viewed, featured_slide_clicked, drop_preview_opened, drop_preview_cta_clicked, drop_unlock_attempted, drop_unlocked, file_viewed
- Required identity: anonymousVisitorId or actorUserId, sessionId, dropId
- Disabled allowed: no
- Persistence: analytics_event_facts with server entitlement truth for unlocks
- Aggregation: drop/user behavior materializers
- UI consumer: Drop cards, preview, and viewer companion state
- Admin consumer: Admin revenue/top drops and public beta behavior evidence
- Disabled behavior: Do not infer drop engagement from UI state when behavior analytics is disabled.

### Creator profile and fan interactions

- Lane: creator_interactions
- Surface: creator_profile
- Priority: high
- Events: creator_profile_link_clicked, creator_followed, creator_unfollowed, creator_rail_impression, creator_profile_viewed
- Required identity: actorUserId or anonymousVisitorId, targetCreatorId, sessionId
- Disabled allowed: no
- Persistence: analytics_event_facts
- Aggregation: creator CRM and behavior timeline materializers
- UI consumer: Creator profile and creator discovery surfaces
- Admin consumer: Creator lane parity and Fan Pass CRM evidence
- Disabled behavior: Suppress creator interaction behavior events unless a server route owns a required product fact.

### Fan Pass and creator monetization

- Lane: creator_monetization
- Surface: creator_profile
- Priority: critical
- Events: creator_fan_pass_started, creator_subscription_started, creator_subscription_renewed, fan_pass_subscription_started
- Required identity: actorUserId, targetCreatorId, sourceTruth
- Disabled allowed: yes
- Persistence: analytics_event_facts plus canonical creator subscription records
- Aggregation: creator CRM and revenue evidence
- UI consumer: Creator profile monetization UI
- Admin consumer: Fan Pass CRM and creator monetization reports
- Disabled behavior: Keep required product integrity telemetry separate from behavior analytics; do not send passive behavior spam.

### Creator requests and bookings

- Lane: creator_requests_bookings
- Surface: creator_profile
- Priority: critical
- Events: creator_custom_request_created, creator_call_booking_created, creator_call_booking_completed, booking_created, request_submitted
- Required identity: actorUserId, targetCreatorId, sourceTruth
- Disabled allowed: yes
- Persistence: analytics_event_facts plus canonical creator request/booking records
- Aggregation: creator revenue and request/booking evidence
- UI consumer: Creator request and booking flows
- Admin consumer: Creator dashboard parity and creator monetization evidence
- Disabled behavior: Allow required account/product integrity facts only; no passive creator behavior signals.

### Chat and support behavior

- Lane: chat_behavior
- Surface: chat
- Priority: high
- Events: chat_thread_opened, chat_message_sent, chat_message_send_failed, support_ticket_created, support_reply_viewed, support_reply_sent
- Required identity: actorUserId, sessionId, threadId
- Disabled allowed: yes
- Persistence: analytics_event_facts plus canonical support/chat records
- Aggregation: support and chat admin evidence
- UI consumer: Chat and support inbox surfaces
- Admin consumer: Admin Support and Admin Analytics event mix
- Disabled behavior: Keep required account/support facts only; suppress hover, visibility, and passive behavior telemetry.

### Runtime media watch time

- Lane: runtime_watch_time
- Surface: viewer
- Priority: critical
- Events: watch_start, watch_heartbeat, watch_pause, watch_resume, watch_complete, watch_abandon, runtime_watch_time_v2
- Required identity: actorUserId or anonymousVisitorId, sessionId, watchSessionId
- Disabled allowed: no
- Persistence: analytics_watch_sessions / analytics_watch_observations
- Aggregation: watch-session rollups and runtime watch-time evidence
- UI consumer: Viewer media runtime
- Admin consumer: Runtime watch-time v2 and beta analytics/watch-time health
- Disabled behavior: Disabled behavior analytics cannot compute watch time from page view, visibility, or page duration; watch time is not page time.

### Admin projection and diagnostics

- Lane: admin_projection_behavior
- Surface: admin
- Priority: standard
- Events: admin_users_viewed, admin_user_detail_viewed, admin_view_as_creator_started, admin_view_as_creator_ended, admin_view_as_creator_action_blocked
- Required identity: actorAdminId, targetUserId or targetCreatorId
- Disabled allowed: yes
- Persistence: analytics_event_facts with admin projection exclusion
- Aggregation: admin diagnostics only
- UI consumer: Admin projection tools
- Admin consumer: Admin Debug and source truth reports
- Disabled behavior: Admin evidence remains admin-only and never becomes live user or creator behavior.

## Findings

- fixed: Canonical client tracking policy exists.
- fixed: Telemetry dependency graph is present and reused.
- fixed: Analytics ingest contract is present and reused.
- fixed: Required behavioral surfaces are represented in the tracking surface map.
- fixed: Tracking surface map validates against anonymous ingest event types.
- fixed: Policy distinguishes disabled tracking from consent denied.
- fixed: Disabled behavior analytics suppress page, hover, scroll, visibility, click, creator interaction, drop, and watch-time behavior events.
- fixed: Enabled behavior remains bounded and diagnostics are sampled.
- fixed: Identified telemetry and GA companion dispatch consult the same client tracking policy.
- fixed: DeepTracker anonymous event types match the ingest contract and tracking surface map.
- fixed: Runtime watch-time uses runtime media/session events and is not computed from page view or visibility alone.
- fixed: No hardcoded behavior score shortcuts are reachable in the behavioral tracking closure files.

## Fixes Applied

- fixed: Added canonical client tracking policy with event kind decisions.
- fixed: Refined the tracking surface map with persistence, aggregation, UI, admin, identity, and disabled behavior semantics.
- fixed: Wired DeepTracker to the client tracking policy before queueing anonymous behavior events.
- fixed: Wired trackEvent to the client tracking policy for identified and external companion dispatch.
- fixed: Added the behavioral tracking semantics validator and generated truth artifact lane.
- fixed: Added unit tests for tracking toggle and surface semantics.

## Next Fix Order

1. When adding new behavior events, add them to the tracking surface map and ingest contract before emitting them from a client component.
2. Keep runtime watch-time sourced from media/session events only; do not derive it from page duration, page views, or visibility summaries.
3. Keep disabled behavior analytics quiet while preserving required account, security, and product integrity events through the policy.
