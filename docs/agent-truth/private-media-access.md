# Private Media Access

Generated: 2026-07-16T04:25:45.033Z

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
| agent/state/creator-discovery-relationship-funnel.generated.json | current_generated_artifact_to_commit |
| agent/state/media-upload-lifecycle.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/creator-discovery-relationship-funnel.md | documentation_artifact_expected |
| docs/agent-truth/media-upload-lifecycle.md | documentation_artifact_expected |

## Validation Failures

- None
