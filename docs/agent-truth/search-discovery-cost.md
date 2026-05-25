# Search Discovery Cost

Generated: 2026-05-25T23:18:14.507Z

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
| CHANGELOG.md | release_artifact_expected |
| agent/state/event-translation-bridge.generated.json | current_generated_artifact_to_commit |
| agent/state/feature-registration-gate.generated.json | current_generated_artifact_to_commit |
| agent/state/person-metrics-hydration.generated.json | current_generated_artifact_to_commit |
| agent/state/public-beta-score.generated.json | current_generated_artifact_to_commit |
| agent/state/search-discovery-cost.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/event-translation-bridge.md | documentation_artifact_expected |
| docs/agent-truth/feature-registration-gate.md | documentation_artifact_expected |
| docs/agent-truth/person-metrics-hydration.md | documentation_artifact_expected |
| docs/agent-truth/search-discovery-cost.md | documentation_artifact_expected |
| package.json | real_source_change_needs_review |
| public/kandydrops-release-notes.json | release_artifact_expected |
| scripts/agent/validate-search-discovery-cost.ts | validator_artifact_expected |
| src/app/drops/DropsClient.tsx | real_source_change_needs_review |
| src/components/StickyFilterBar.tsx | real_source_change_needs_review |
| src/hooks/useDropsSearchTelemetry.ts | real_source_change_needs_review |
| src/lib/analytics/event-translation-bridge.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-contract.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-hydration.ts | real_source_change_needs_review |
| src/lib/behavioral/event-fact-contract.ts | real_source_change_needs_review |
| src/lib/behavioral/normalize-event-fact.ts | real_source_change_needs_review |
| src/lib/behavioral/search-intent-profile.ts | real_source_change_needs_review |
| src/lib/behavioral/tracking-surface-map.ts | real_source_change_needs_review |
| src/lib/discovery/search-cost-contract.ts | real_source_change_needs_review |
| src/lib/discovery/search-telemetry-contract.ts | real_source_change_needs_review |
| src/lib/release-notes/public-release-notes.ts | release_artifact_expected |
| src/lib/release-notes/release-version-contract.ts | release_artifact_expected |
| src/lib/telemetry-catalog.ts | real_source_change_needs_review |
| tests/unit/search-discovery-cost.spec.ts | test_artifact_expected |
| tests/unit/user-management-refactor.spec.ts | test_artifact_expected |

## Validation Failures

- None
