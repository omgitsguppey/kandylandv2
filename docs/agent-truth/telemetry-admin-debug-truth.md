# Telemetry Admin Debug Truth

Generated: 2026-06-16T17:15:23.771Z
Current code version: b22b5e497b300f932bf2214998324e45646c0b0a

## Summary

- Compact health model created: yes
- Lanes: 11
- Live: 0
- Degraded: 0
- Unavailable/config missing: 2
- Runtime unproven: 4
- Raw details behind drilldown: yes
- Default broad reads blocked: yes
- Missing external analytics shown as zero: no

## Lanes

- client_tracking: source_ready | client tracking policy, DeepTracker, telemetry dependency graph | next: Use ingest, session, and event-fact lanes to confirm persisted runtime evidence.
- ingest: runtime_unproven | /api/analytics/ingest and /api/analytics/ingest-identified route runtime health | next: Open the route runtime drilldown or wait for runtime samples before treating ingest as proven.
- guest_sessions: source_ready | analytics_guest_batches, analytics_sessions, telemetry dependency graph | next: Confirm guest batch freshness through admin snapshots or the explicit analytics drilldown.
- identity_links: source_ready | analytics_identity_links, identity transfer closure | next: Use identity transfer evidence when validating guest-to-user continuity.
- user_events: runtime_unproven | analytics_event_facts and analytics_admin_metric_snapshots | next: Refresh admin analytics snapshots before reading user-event health.
- behavior_signals: source_ready | behavioral_timeline_facts, behavioral tracking semantics, materialization contract | next: Keep behavior scoring tied to event facts and avoid synthesizing scores from UI state.
- watch_time: runtime_unproven | analytics watch sessions and runtime watch-session rollups; page duration is not watch time | next: Attach or verify deployed runtime watch-session evidence before treating watch time as proven.
- materializers: runtime_unproven | admin analytics materializers and analytics_admin_metric_snapshots | next: Use snapshot metadata before raw collections.
- bigquery_export: config_missing | BigQuery export contract and analytics_export_status watermark | next: Configure export only in an owner-approved cloud pipeline pass.
- ga4_external_evidence: source_ready | external analytics truth closure and GA4 recovery truth | next: Keep external analytics separate from first-party event facts and require explicit refresh for vendor evidence.
- admin_snapshots: unavailable | analytics_admin_metric_snapshots and Admin Debug compact summary | next: Run the admin analytics refresh lane before treating this as current.

## Dependencies

- fixed: Telemetry dependency graph is present and separates external evidence.
- fixed: External analytics truth closure is present.
- fixed: BigQuery closure prevents missing export evidence from becoming zero traffic.
- fixed: Materializer closure classifies persisted telemetry records.

## Route

- fixed: Default Admin Debug summary includes compact telemetry health.
- fixed: Full Admin Debug drilldown also carries telemetry health metadata.
- fixed: Broad raw debug collection reads remain behind section=all or forced refresh.

## UI

- fixed: Admin Debug renders a compact telemetry pipeline health section.
- fixed: Raw telemetry source/next-action details stay behind disclosure controls.
- fixed: Right-now debug tab mounts the compact telemetry health summary.

## Truth

- fixed: Telemetry health model validates.
- fixed: Every required telemetry pipeline lane is present.
- fixed: GA4 unavailable/config missing is not displayed as zero traffic.
- fixed: BigQuery config missing is not displayed as exported.
- fixed: Every degraded/unavailable/source-ready lane has an operator next action.

## Fixes Applied

- fixed: Added compact admin telemetry health model.
- fixed: Added readable admin/debug telemetry health UI.
- fixed: Added telemetry admin debug truth validator.

## Next Fix Order

1. Keep raw telemetry collections behind explicit Admin Debug drilldowns.
2. Use telemetryHealth lanes as the first admin/debug operator view before opening raw event lists.
3. Refresh beta exit status separately; current beta status artifact is stale evidence from an earlier code version.
