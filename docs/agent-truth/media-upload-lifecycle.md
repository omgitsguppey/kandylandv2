# Media Upload Lifecycle

Generated: 2026-05-25T22:13:38.191Z

Status: pass

## Summary

- Lifecycle events: 14
- Chat prepare has correlation id: true
- Chat complete has ownership scope verification: true
- Raw storage path protected from broad telemetry/debug: true
- Orphan detection available: true
- Person/global metric mapping: true
- Production reads performed: false
- Provider calls performed: false

## Debug Lane

- Label: Media upload
- Status: degraded
- Prepare failures: 1
- Storage upload failures: 1
- Completion failures: 1
- Orphan risks: 1
- Size/type blocks: 2
- Average upload duration: 17ms

## Event Spine

| Event | Status |
| --- | --- |
| media_upload_prepare_started | registered |
| media_upload_prepare_completed | registered |
| media_upload_prepare_failed | registered |
| media_storage_upload_started | registered |
| media_storage_upload_completed | registered |
| media_storage_upload_failed | registered |
| media_upload_complete_started | registered |
| media_upload_complete_completed | registered |
| media_upload_complete_failed | registered |
| media_upload_cancelled | registered |
| media_upload_orphaned | registered |
| media_upload_recovered | registered |
| media_upload_blocked_size | registered |
| media_upload_blocked_type | registered |

## Dirty Files

| File | Classification |
| --- | --- |
| CHANGELOG.md | release_artifact_expected |
| agent/state/event-translation-bridge.generated.json | current_generated_artifact_to_commit |
| agent/state/feature-registration-gate.generated.json | current_generated_artifact_to_commit |
| agent/state/media-upload-lifecycle.generated.json | current_generated_artifact_to_commit |
| agent/state/person-metrics-hydration.generated.json | current_generated_artifact_to_commit |
| agent/state/public-beta-score.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/event-translation-bridge.md | documentation_artifact_expected |
| docs/agent-truth/feature-registration-gate.md | documentation_artifact_expected |
| docs/agent-truth/media-upload-lifecycle.md | documentation_artifact_expected |
| docs/agent-truth/person-metrics-hydration.md | documentation_artifact_expected |
| package.json | real_source_change_needs_review |
| public/kandydrops-release-notes.json | release_artifact_expected |
| scripts/agent/validate-feature-registration-gate.ts | real_source_change_needs_review |
| scripts/agent/validate-media-upload-lifecycle.ts | validator_artifact_expected |
| src/app/api/chat/attachments/complete/route.ts | real_source_change_needs_review |
| src/app/api/chat/attachments/prepare/route.ts | real_source_change_needs_review |
| src/components/Chat/ChatExperience.tsx | real_source_change_needs_review |
| src/lib/analytics/event-translation-bridge.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-contract.ts | real_source_change_needs_review |
| src/lib/analytics/person-metrics-hydration.ts | real_source_change_needs_review |
| src/lib/media/media-upload-contract.ts | real_source_change_needs_review |
| src/lib/media/media-upload-telemetry.ts | real_source_change_needs_review |
| src/lib/release-notes/public-release-notes.ts | release_artifact_expected |
| src/lib/release-notes/release-version-contract.ts | release_artifact_expected |
| src/lib/telemetry-catalog.ts | real_source_change_needs_review |
| tests/unit/media-upload-lifecycle.spec.ts | test_artifact_expected |

## Validation Failures

- None
