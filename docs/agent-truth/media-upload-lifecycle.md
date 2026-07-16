# Media Upload Lifecycle

Generated: 2026-07-16T04:25:43.433Z

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
| agent/state/creator-discovery-relationship-funnel.generated.json | unsafe_unknown |
| docs/agent-truth/creator-discovery-relationship-funnel.md | unsafe_unknown |

## Validation Failures

- None
