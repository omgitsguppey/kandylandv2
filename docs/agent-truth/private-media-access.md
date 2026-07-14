# Private Media Access

Generated: 2026-07-14T16:05:50.609Z

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
- Payment/GumDrop math changed: true

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
| agent/index/dependency-graph.summary.json | unsafe_unknown |
| agent/index/governance-truth.json | unsafe_unknown |
| agent/index/known-pitfalls.json | unsafe_unknown |
| agent/index/package-manager-truth.json | unsafe_unknown |
| agent/state/private-media-access.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/private-media-access.md | documentation_artifact_expected |
| FULL_SCALE_CODEBASE_AUDIT.md | unsafe_unknown |
| README.md | unsafe_unknown |
| REPO_MEMORY_LEDGER.md | unsafe_unknown |
| src/app/api/chat/attachments/complete/route.ts | real_source_change_needs_review |
| src/app/api/creator/drops/assets/route.ts | real_source_change_needs_review |

## Validation Failures

- None
