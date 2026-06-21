# Watch Time Truth

Generated: 2026-05-24T21:44:38.887Z
Status: source_ready_evidence_gap

Watch time is foreground visible engagement. Page-open duration is not canonical watch time, hidden and idle time are excluded, and runtime watch remains degraded until persisted watch-session evidence proves the metric in admin/debug output.

In the behavioral truth hierarchy, watch-session rollups count as `event_facts` because they are persisted first-party engagement facts. Legacy page duration remains diagnostic fallback evidence and cannot become canonical watch time.

Canonical source rules:
- video watch time equals actual foreground visible playback time.
- image watch time equals foreground visible image-in-view time.
- `legacy_page_duration` is compatibility evidence only unless a caller explicitly labels it as fallback.
- A diagnostics-only estimate can explain likely missing engagement, but it never becomes verified `watchTimeMs`.
- Admin Watch Truth Resolver paths must show verified watch sessions, estimated fallback, and source-missing states separately.
