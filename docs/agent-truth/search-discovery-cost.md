# Search Discovery Cost

Generated: 2026-07-16T04:25:46.530Z

Status: pass

## Summary

- Events: 8
- Query telemetry redacted: true
- Debounce policy: 350ms
- Backend minimum query length: 3
- Backend call per keystroke allowed: false
- Paged result max: 24
- Zero-result tracking: true
- Result-click tracking: true
- Debug lane: Search/discovery
- Production reads performed by validator: false
- Provider calls performed by validator: false

## Events

| Event | Status |
| --- | --- |
| search_focused | registered |
| search_query_changed | registered |
| search_submitted | registered |
| search_results_loaded | registered |
| search_zero_results | registered |
| search_result_clicked | registered |
| search_failed | registered |
| search_cleared | registered |

## Cost Classifications

| Route | Classification |
| --- | --- |
| src/app/drops/DropsClient.tsx | cost_safe_local_filter |
| src/app/api/drops/route.ts | paged_feed_existing_not_backend_search |

## Dirty Files

| File | Classification |
| --- | --- |
| agent/state/creator-discovery-relationship-funnel.generated.json | current_generated_artifact_to_commit |
| agent/state/media-upload-lifecycle.generated.json | current_generated_artifact_to_commit |
| agent/state/private-media-access.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/creator-discovery-relationship-funnel.md | documentation_artifact_expected |
| docs/agent-truth/media-upload-lifecycle.md | documentation_artifact_expected |
| docs/agent-truth/private-media-access.md | documentation_artifact_expected |

## Validation Failures

- None
