# Blocked Refresh Queue Resolver

Status: pass

This pass resolves the blocked self-healing refresh queue rows by routing UI source checks through deterministic source coverage first and keeping runtime, provider, and admin truth source-evidence blockers non-automatic.

## Score

- Old score: 73.57
- New score: 73.57

## Blocked Entries

- Blocked count: 5
- Refreshable blocked entries remaining: 0
- Obsolete entries retired: 0

### admin_truth_sample_evidence

- Owner: admin
- Score impact estimate: 11.32
- Classification: blocked_formal_evidence
- Formal gate: admin_truth
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: redacted admin source activity sample required; source samples remain partial confidence only.
- Next action: Produce redacted admin source activity sample, then run npm run check:evidence-capture-status.

### runtime_provider_smoke

- Owner: runtime
- Score impact estimate: 5.76
- Classification: blocked_formal_evidence
- Formal gate: provider
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: provider-backed site activity evidence required; operator-confirmed usage remains partial confidence only.
- Next action: Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status.

### agent/state/provider-smoke-evidence.generated.json

- Owner: runtime
- Score impact estimate: 4
- Classification: blocked_formal_evidence
- Formal gate: provider
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: provider-backed site activity evidence required; operator-confirmed usage remains partial confidence only.
- Next action: Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status.

### agent/state/admin-truth-sample-evidence.generated.json

- Owner: admin
- Score impact estimate: 1
- Classification: blocked_formal_evidence
- Formal gate: admin_truth
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: redacted admin source activity sample required; source samples remain partial confidence only.
- Next action: Produce redacted admin source activity sample, then run npm run check:evidence-capture-status.

### agent/state/runtime-smoke-evidence.generated.json

- Owner: runtime
- Score impact estimate: 1
- Classification: blocked_formal_evidence
- Formal gate: runtime
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: deployed runtime route evidence required; source/debug evidence is partial only.
- Next action: Produce deployed runtime route evidence, then run npm run check:evidence-capture-status.

## Open PRs

- #278: deferred_unrelated; Aggregation hotspot work is outside blocked refresh queue resolver scope.
- #277: deferred_forbidden_surface; Payment/source-of-funds adjacent branch is deferred by hard-rule scope.

## Dirty File Classification

- agent/state/ai-critic-p1-triage.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- agent/state/ai-debug-critic.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- agent/state/blocked-refresh-queue-resolver.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- agent/state/future-activity-signal-reclassification.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- agent/state/score-80-refresh-queue-execution.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- docs/agent-truth/ai-critic-p1-triage.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- docs/agent-truth/blocked-refresh-queue-resolver.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- docs/agent-truth/future-activity-signal-reclassification.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- docs/agent-truth/score-80-refresh-queue-execution.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- scripts/agent/validate-blocked-refresh-queue-resolver.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-future-activity-signal-reclassification.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-score-80-refresh-queue-execution.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- src/lib/debug/ai-critic-p1-triage.ts: real_source_change_needs_review; Admin/debug wording now routes proof copy through source-evidence language without changing compatibility enums.
- src/lib/debug/ai-debug-critic-rules.ts: real_source_change_needs_review; Admin/debug wording now routes proof copy through source-evidence language without changing compatibility enums.
- src/lib/debug/ai-debug-critic.ts: real_source_change_needs_review; Admin/debug wording now routes proof copy through source-evidence language without changing compatibility enums.
- src/lib/debug/future-activity-classifier.ts: real_source_change_needs_review; Admin/debug wording now routes proof copy through source-evidence language without changing compatibility enums.
- tests/unit/ai-critic-p1-triage.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.
- tests/unit/ai-debug-critic.spec.ts: test_artifact_expected; Dedicated source-evidence wording coverage for debug critic compatibility.
- tests/unit/blocked-refresh-queue-resolver.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.
- tests/unit/score-80-refresh-queue-execution.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.

## Validation

- Pass.
