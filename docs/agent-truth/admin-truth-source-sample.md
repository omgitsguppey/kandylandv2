# Admin Truth Source Sample

Generated: 2026-06-21T13:04:02.634Z

Latest code version: c86e30d693c31d8ab185cdcf25626d96bb12ee2f

## Summary

- Status: `source_ready_admin_truth_sample`
- Admin truth source ready: true
- Production sample attached: false
- Deployed runtime evidence attached: false
- Admin source sample gate passed: false
- Launch gate impact: `partial_source_admin_truth_only`
- Telemetry health lane status: `partial`
- Degraded/unavailable lanes: 6
- Critical admin truth issues: 0

This is source wiring evidence only. It points to the bounded redacted admin source activity sample still needed for the admin source activity gate.

## Degraded Or Unavailable Lanes

- ingest: runtime_unproven. Next: Open the route runtime drilldown or wait for runtime samples before treating ingest as proven.
- user_events: runtime_unproven. Next: Refresh admin analytics snapshots before reading user-event health.
- watch_time: runtime_unproven. Next: Attach or verify deployed runtime watch-session evidence before treating watch time as proven.
- materializers: runtime_unproven. Next: Use snapshot metadata before raw collections.
- bigquery_export: config_missing. Next: Configure export only in an owner-approved cloud pipeline pass.
- admin_snapshots: unavailable. Next: Run the admin analytics refresh lane before treating this as current.
