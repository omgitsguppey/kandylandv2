# Runtime Watch-Time v2

Generated: 2026-05-18T13:46:57.157Z
Current head: 5ca8a3b9cdcc0ceb2062b82e2b0f0b9a9c00f91f

## Summary

- Canonical model created: true
- Client tracker created: true
- Server delta rules modeled: true
- Heartbeat interval: 10000ms
- Heartbeat delta cap: 15000ms
- Integration status: deferred_source_ready
- Cloud SQL status: cloud_sql_not_detected_in_runtime_watch_v2
- Gemini/Cloud Assist status: gemini_cloud_assist_not_involved
- 4xx status: invalid_payload_returns_calm_non_retryable_422

## Server Delta Rules

- duplicate eventId produces zero delta
- negative or zero deltas are ignored
- heartbeat delta is capped at 15 seconds
- hidden or inactive events add zero watch time
- watch deltas are clamped by media duration and playhead movement
- page-open/start events add zero watch time
- client elapsed is input context, not trusted total watch time

## Client Rules

- heartbeat every 10 seconds while playing and visible
- emit play/start, pause, complete, visibility hidden, and pagehide/abandon
- clear heartbeat interval on pause, hidden, pagehide, and unmount
- prefer sendBeacon on pagehide when an ingest endpoint is supplied
- fallback to fetch keepalive when beacon is unavailable

## Cost Lanes

| Lane | Status | Evidence |
| --- | --- | --- |
| cloud_run | cost_safe_10s_heartbeat | RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS is 10000 and deltas are capped. |
| cloud_sql | cloud_sql_not_detected_in_runtime_watch_v2 | Runtime watch v2 model and tracker do not import or call SQL/Data Connect. |
| gemini_cloud_assist | gemini_cloud_assist_not_involved | No model, prompt, Vertex, Gemini, or Cloud Assist code path exists. |
| route_4xx | calm_non_retryable_422 | validateRuntimeWatchEventPayload returns non-retryable 422 for invalid payloads. |

## Deferred Integration

| Id | Reason | Next integration point |
| --- | --- | --- |
| viewer-media-runtime-watch-v2-integration | The safe media owner is MediaViewer, but this prompt's allowed runtime files exclude viewer component wiring. | src/app/dashboard/viewer/components/MediaViewer.tsx |

## Next Fix Order

1. Wire RuntimeWatchTracker into MediaViewer video/audio refs with existing watch-session ownership intact.
2. Accept runtimeWatchEvent payloads at the selected analytics ingest boundary after route cost/idempotency review.
3. Map runtime watch deltas into analytics_watch_sessions rollups without mixing page-open duration.
