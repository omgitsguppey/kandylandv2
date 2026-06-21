# Blocked Refresh Queue Resolver

Status: pass

This pass resolves the blocked self-healing refresh queue rows by routing UI source checks through deterministic source coverage first and keeping runtime, provider, and admin truth blockers non-automatic.

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
- Blocked reason: blocked_formal_evidence: first-party admin truth sample artifact required; source samples remain partial confidence only.
- Next action: Attach admin truth sample evidence, then run npm run check:evidence-capture-status.

### runtime_provider_smoke

- Owner: runtime
- Score impact estimate: 5.76
- Classification: blocked_formal_evidence
- Formal gate: provider
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: formal provider smoke artifact required; operator-confirmed usage remains partial confidence only.
- Next action: Attach formal provider smoke evidence, then run npm run check:evidence-capture-status.

### agent/state/provider-smoke-evidence.generated.json

- Owner: runtime
- Score impact estimate: 4
- Classification: blocked_formal_evidence
- Formal gate: none
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: formal artifact required; source queue cannot generate proof.
- Next action: npm run check:provider-smoke-evidence

### agent/state/admin-truth-sample-evidence.generated.json

- Owner: admin
- Score impact estimate: 1
- Classification: blocked_formal_evidence
- Formal gate: none
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: formal artifact required; source queue cannot generate proof.
- Next action: npm run check:admin-truth-sample-evidence

### agent/state/runtime-smoke-evidence.generated.json

- Owner: runtime
- Score impact estimate: 1
- Classification: blocked_formal_evidence
- Formal gate: none
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: formal artifact required; source queue cannot generate proof.
- Next action: npm run check:runtime-smoke-evidence

## Open PRs

- #278: deferred_unrelated; Aggregation hotspot work is outside blocked refresh queue resolver scope.
- #277: deferred_forbidden_surface; Payment/source-of-funds adjacent branch is deferred by hard-rule scope.

## Dirty File Classification

- agent/state/blocked-refresh-queue-resolver.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- agent/state/live-evidence-gate-replacement.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- agent/state/score-80-refresh-queue-execution.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- docs/agent-truth/blocked-refresh-queue-resolver.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- docs/agent-truth/live-evidence-gate-replacement.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- docs/agent-truth/score-80-refresh-queue-execution.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- scripts/agent/validate-blocked-refresh-queue-resolver.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-current-beta-exit-status.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-score-80-refresh-queue-execution.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- src/lib/debug/debug-operator-cockpit.ts: real_source_change_needs_review; Admin/debug copy now routes browser diagnostics through UI source coverage instead of proof shortcuts.
- src/lib/release-readiness/live-evidence-resolver.ts: real_source_change_needs_review; Admin/debug copy now routes browser diagnostics through UI source coverage instead of proof shortcuts.
- tests/unit/blocked-refresh-queue-resolver.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.
- tests/unit/live-evidence-gate-replacement.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.
- tests/unit/score-80-refresh-queue-execution.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.
- tests/unit/self-healing-refresh-queue.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.

## Validation

- Pass.
