# Creator Discovery Relationship Funnel

Generated: 2026-05-25T22:54:24.177Z

Status: pass

## Summary

- Events: 13
- States: 7
- Creator card/profile funnel tracked: true
- Follow/unfollow telemetry triplet: true
- Recommendation impressions/clicks tracked: true
- Relationship route debug-visible: true
- Person/global metric mapping: true
- Production reads performed by validator: false
- Provider calls performed by validator: false
- Payment/GumDrop math changed: false

## Debug Lane

- Label: Creator discovery/relationships
- Follow failures: 1
- Relationship list failures: 1
- Empty recommendation state: 1
- Profile route missing: 1
- Recommendation source health: review

## Events

| Event | Status |
| --- | --- |
| creator_discovery_surface_viewed | registered |
| creator_card_viewed | registered |
| creator_card_clicked | registered |
| creator_profile_opened | registered |
| creator_follow_attempted | registered |
| creator_follow_succeeded | registered |
| creator_follow_failed | registered |
| creator_unfollow_attempted | registered |
| creator_unfollow_succeeded | registered |
| creator_recommendation_viewed | registered |
| creator_recommendation_clicked | registered |
| creator_relationship_list_loaded | registered |
| creator_relationship_list_failed | registered |

## States

| State | Status |
| --- | --- |
| not_following | covered |
| following | covered |
| blocked | covered |
| unavailable | covered |
| self | covered |
| creator_hidden | covered |
| unknown | covered |

## Dirty Files

| File | Classification |
| --- | --- |
| CHANGELOG.md | release_artifact_expected |
| agent/context/optimized-task-context.generated.json | unrelated_agent_context_file_to_ignore |
| agent/state/creator-discovery-relationship-funnel.generated.json | current_generated_artifact_to_commit |
| agent/state/event-translation-bridge.generated.json | current_generated_artifact_to_commit |
| agent/state/feature-registration-gate.generated.json | current_generated_artifact_to_commit |
| agent/state/person-metrics-hydration.generated.json | current_generated_artifact_to_commit |
| agent/state/public-beta-score.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/creator-discovery-relationship-funnel.md | documentation_artifact_expected |
| docs/agent-truth/event-translation-bridge.md | documentation_artifact_expected |
| docs/agent-truth/feature-registration-gate.md | documentation_artifact_expected |
| docs/agent-truth/person-metrics-hydration.md | documentation_artifact_expected |
| package.json | real_source_change_needs_review |
| public/kandydrops-release-notes.json | release_artifact_expected |
| scripts/agent/validate-creator-discovery-relationship-funnel.ts | validator_artifact_expected |
| src/app/api/creator/relationships/route.ts | real_source_change_needs_review |
| src/app/creators/[username]/CreatorProfileClient.tsx | real_source_change_needs_review |
| src/components/CreatorDiscoveryRail.tsx | real_source_change_needs_review |
| src/lib/analytics/event-translation-bridge.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-contract.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-hydration.ts | real_source_change_needs_review |
| src/lib/behavioral/behavior-feature-registry.ts | real_source_change_needs_review |
| src/lib/behavioral/event-fact-contract.ts | real_source_change_needs_review |
| src/lib/behavioral/normalize-event-fact.ts | real_source_change_needs_review |
| src/lib/behavioral/tracking-surface-map.ts | real_source_change_needs_review |
| src/lib/discovery/creator-relationship-contract.ts | real_source_change_needs_review |
| src/lib/release-notes/public-release-notes.ts | release_artifact_expected |
| src/lib/release-notes/release-version-contract.ts | release_artifact_expected |
| src/lib/telemetry-catalog.ts | real_source_change_needs_review |
| src/lib/telemetry/surface-telemetry-catalog-events.ts | real_source_change_needs_review |
| tests/unit/creator-discovery-relationship-funnel.spec.ts | test_artifact_expected |

## Validation Failures

- None
