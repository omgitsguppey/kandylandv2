# Fan Pass Lifecycle

Generated: 2026-05-26T01:36:07.965Z

Status: pass

## Summary

- Lifecycle contract: pass
- Access resolver: pass
- Telemetry mapping: pass
- Person metrics mapping: pass
- Feature registration: pass
- Debug visibility: pass
- Chat bypass contract: pass
- Creator settings source: pass
- Notification intent: pass
- Payment runtime: unchanged
- GumDrop math: unchanged
- Production reads performed: false
- Provider calls performed: false

## Debug Lane

- Label: Fan Pass lifecycle
- Status: live
- Configured creators: 0
- Views: 0
- Attempts: 0
- Successes: 0
- Failures: 0
- Access mismatches: 0
- Chat bypass mismatches: 0
- Not configured surfaces: 0

## Event Spine

| Event | Status |
| --- | --- |
| fan_pass_surface_viewed | registered |
| fan_pass_cta_clicked | registered |
| fan_pass_purchase_attempted | registered |
| fan_pass_purchase_succeeded | registered |
| fan_pass_purchase_failed | registered |
| fan_pass_access_granted | registered |
| fan_pass_access_denied | registered |
| fan_pass_cancelled | registered |
| fan_pass_expired | registered |

## Score

- Before: 77.83
- After: 77.83
- Dimensions: sourceHealth, runtimeHealth, evidenceCompleteness, regressionRisk

## Dirty Files

| File | Classification |
| --- | --- |
| CHANGELOG.md | release_artifact_expected |
| agent/state/creator-pricing-wiring.generated.json | current_generated_artifact_to_commit |
| agent/state/creator-settings-control-plane.generated.json | current_generated_artifact_to_commit |
| agent/state/event-translation-bridge.generated.json | current_generated_artifact_to_commit |
| agent/state/fan-pass-lifecycle.generated.json | current_generated_artifact_to_commit |
| agent/state/feature-registration-gate.generated.json | current_generated_artifact_to_commit |
| agent/state/person-metrics-hydration.generated.json | current_generated_artifact_to_commit |
| agent/state/public-beta-score.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/creator-pricing-wiring.md | documentation_artifact_expected |
| docs/agent-truth/creator-settings-control-plane.md | documentation_artifact_expected |
| docs/agent-truth/event-translation-bridge.md | documentation_artifact_expected |
| docs/agent-truth/fan-pass-lifecycle.md | documentation_artifact_expected |
| docs/agent-truth/feature-registration-gate.md | documentation_artifact_expected |
| docs/agent-truth/person-metrics-hydration.md | documentation_artifact_expected |
| package.json | real_source_change_needs_review |
| public/kandydrops-release-notes.json | release_artifact_expected |
| scripts/agent/validate-fan-pass-lifecycle.ts | validator_artifact_expected |
| src/app/api/creator/subscriptions/route.ts | real_source_change_needs_review |
| src/lib/analytics/event-translation-bridge.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-contract.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-hydration.ts | real_source_change_needs_review |
| src/lib/fan-pass/fan-pass-access-resolver.ts | current_source_change |
| src/lib/fan-pass/fan-pass-lifecycle-contract.ts | current_source_change |
| src/lib/release-notes/public-release-notes.ts | release_artifact_expected |
| src/lib/release-notes/release-version-contract.ts | release_artifact_expected |
| src/lib/server/chat.ts | real_source_change_needs_review |
| src/lib/telemetry-catalog.ts | real_source_change_needs_review |
| tests/unit/fan-pass-lifecycle.spec.ts | test_artifact_expected |

## Remaining Gaps

- Runtime subscription provider smoke remains outside this source-only lifecycle contract.

## Next Exact Steps

- Use this contract when wiring future Fan Pass renewal and cancellation provider evidence.

## Validation Failures

- None
