# Private Media Access

Generated: 2026-05-25T22:31:54.098Z

Status: pass

## Summary

- Access reasons: 14
- Telemetry events: 5
- Chat attachment access: true
- Drop media access: true
- Creator upload access: true
- Profile/timeline classification: true
- Raw private URL/path telemetry protected: true
- Production reads performed by validator: false
- Provider calls performed by validator: false
- Payment/GumDrop math changed: false

## Debug Lane

- Label: Private media access
- Status: degraded
- Missing assets: 1
- Unsafe unknown: 1
- Expired/locked mismatches: 2
- Owner/creator/admin bypass health: monitored

## Reasons

| Reason | Status |
| --- | --- |
| public_allowed | covered |
| owner_allowed | covered |
| creator_allowed | covered |
| admin_allowed | covered |
| unlocked_allowed | covered |
| fan_pass_allowed | covered |
| chat_thread_participant_allowed | covered |
| expired_blocked | covered |
| locked_blocked | covered |
| purchase_required | covered |
| auth_required | covered |
| moderation_blocked | covered |
| not_found | covered |
| unsafe_unknown | covered |

## Events

| Event | Status |
| --- | --- |
| media_access_allowed | registered |
| media_access_blocked | registered |
| media_access_failed | registered |
| media_asset_missing | registered |
| media_expired_blocked | registered |

## Dirty Files

| File | Classification |
| --- | --- |
| CHANGELOG.md | release_artifact_expected |
| agent/state/feature-registration-gate.generated.json | current_generated_artifact_to_commit |
| agent/state/private-media-access.generated.json | current_generated_artifact_to_commit |
| agent/state/public-beta-score.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/feature-registration-gate.md | documentation_artifact_expected |
| docs/agent-truth/private-media-access.md | documentation_artifact_expected |
| package.json | real_source_change_needs_review |
| public/kandydrops-release-notes.json | release_artifact_expected |
| scripts/agent/validate-feature-registration-gate.ts | real_source_change_needs_review |
| scripts/agent/validate-private-media-access.ts | validator_artifact_expected |
| src/app/api/chat/attachments/complete/route.ts | real_source_change_needs_review |
| src/app/api/creator/drops/assets/route.ts | real_source_change_needs_review |
| src/app/api/drops/content/route.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-contract.ts | real_source_change_needs_review |
| src/lib/media/media-access-contract.ts | real_source_change_needs_review |
| src/lib/media/media-access-resolver.ts | real_source_change_needs_review |
| src/lib/release-notes/public-release-notes.ts | release_artifact_expected |
| src/lib/release-notes/release-version-contract.ts | release_artifact_expected |
| src/lib/telemetry-catalog.ts | real_source_change_needs_review |
| tests/unit/drops-content-route.spec.ts | test_artifact_expected |
| tests/unit/private-media-access.spec.ts | test_artifact_expected |

## Validation Failures

- None
