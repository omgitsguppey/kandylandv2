# Media Upload Lifecycle

Generated: 2026-07-14T14:37:48.015Z

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
| .env.example | unsafe_unknown |
| agent/context/doctrine-cards.jsonl | unsafe_unknown |
| agent/context/doctrine-conflicts.generated.json | unsafe_unknown |
| agent/context/doctrine-registry.json | unsafe_unknown |
| agent/context/doctrine.cards.jsonl | unsafe_unknown |
| agent/context/doctrine.index.json | unsafe_unknown |
| agent/context/file-size-budget.json | unsafe_unknown |
| agent/context/legacy-registry.json | unsafe_unknown |
| agent/context/optimized-task-context.generated.json | unrelated_agent_context_file_to_ignore |
| agent/context/task-pack.generated.json | unsafe_unknown |
| agent/context/validator-authority.json | unsafe_unknown |
| agent/context/validator-map.json | unsafe_unknown |
| agent/index/blast-radius.json | unsafe_unknown |
| agent/index/canonical-helpers.json | unsafe_unknown |
| agent/state/media-upload-lifecycle.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/media-upload-lifecycle.md | documentation_artifact_expected |
| FULL_SCALE_CODEBASE_AUDIT.md | unsafe_unknown |
| README.md | unsafe_unknown |
| REPO_MEMORY_LEDGER.md | unsafe_unknown |
| scripts/agent/validate-media-upload-lifecycle.ts | validator_artifact_expected |
| src/app/api/chat/attachments/cancel/route.ts | real_source_change_needs_review |
| src/app/api/chat/attachments/complete/route.ts | real_source_change_needs_review |
| src/app/api/chat/attachments/prepare/route.ts | real_source_change_needs_review |
| src/components/Chat/ChatExperience.tsx | real_source_change_needs_review |
| tests/unit/media-upload-lifecycle.spec.ts | test_artifact_expected |

## Validation Failures

- None
