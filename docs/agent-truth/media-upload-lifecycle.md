# Media Upload Lifecycle

Generated: 2026-06-11T14:14:38.212Z

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
| agent/context/doctrine.cards.jsonl | unsafe_unknown |
| agent/context/doctrine.index.json | unsafe_unknown |
| agent/context/file-size-budget.json | unsafe_unknown |
| agent/context/legacy-registry.json | unsafe_unknown |
| agent/context/optimized-task-context.generated.json | unrelated_agent_context_file_to_ignore |
| agent/context/task-pack.generated.json | unsafe_unknown |
| agent/context/validator-map.json | unsafe_unknown |
| agent/index/blast-radius.json | unsafe_unknown |
| agent/index/canonical-helpers.json | unsafe_unknown |
| agent/index/dependency-graph.summary.json | unsafe_unknown |
| agent/index/governance-truth.json | unsafe_unknown |
| agent/index/known-pitfalls.json | unsafe_unknown |
| agent/index/package-manager-truth.json | unsafe_unknown |
| agent/index/recent-passes.json | unsafe_unknown |
| agent/index/repo-inventory.json | unsafe_unknown |
| agent/index/retrieval-index.json | unsafe_unknown |
| agent/index/runtime-observability.json | unsafe_unknown |
| agent/index/surface-map.json | unsafe_unknown |
| agent/index/ui-surface-coverage.json | unsafe_unknown |
| agent/index/verification-commands.json | unsafe_unknown |
| agent/index/workflow-guidance.json | unsafe_unknown |
| agent/state/admin-cms-workflow-audit.generated.json | unsafe_unknown |
| agent/state/media-upload-lifecycle.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/media-upload-lifecycle.md | documentation_artifact_expected |
| scripts/agent/validate-media-upload-lifecycle.ts | validator_artifact_expected |

## Validation Failures

- None
