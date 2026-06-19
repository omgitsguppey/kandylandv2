# Blocked Refresh Queue Resolver

Status: pass

This pass resolves the blocked self-healing refresh queue rows by routing UI visual work through deterministic source coverage first and keeping runtime, provider, and admin truth blockers non-automatic.

## Score

- Old score: 78.18
- New score: 78.18

## Blocked Entries

- Blocked count: 8
- Refreshable blocked entries remaining: 0
- Obsolete entries retired: 0

### debug_runtime_evidence

- Owner: runtime
- Score impact estimate: 16.33
- Classification: blocked_formal_evidence
- Formal gate: runtime
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: deployed runtime smoke artifact required; source/debug evidence is partial only and cannot clear formal runtime gate.
- Next action: Attach deployed runtime smoke evidence, then run npm run check:evidence-capture-status.

### runtime_provider_smoke

- Owner: runtime
- Score impact estimate: 16.33
- Classification: blocked_formal_evidence
- Formal gate: provider
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: formal provider smoke artifact required; operator-confirmed usage remains partial confidence only.
- Next action: Attach formal provider smoke evidence, then run npm run check:evidence-capture-status.

### admin_truth_sample_evidence

- Owner: admin
- Score impact estimate: 12
- Classification: blocked_formal_evidence
- Formal gate: admin_truth
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: first-party admin truth sample artifact required; source samples remain partial confidence only.
- Next action: Attach admin truth sample evidence, then run npm run check:evidence-capture-status.

### visual_manual_smoke

- Owner: manual
- Score impact estimate: 12
- Classification: failed_validator
- Formal gate: none
- Score treatment: resolved_source_refreshable
- Blocked reason: source_validation_required: deterministic UI source coverage must run before optional visual reproduction; screenshots are not required to discover UI issues.
- Next action: Run npm run check:ui-visual-smoke-minimal and fix source-reported UI surface gaps; use screenshots only to reproduce a reported issue.

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

### agent/state/debug-runtime-evidence.generated.json

- Owner: runtime
- Score impact estimate: 0.01
- Classification: blocked_formal_evidence
- Formal gate: none
- Score treatment: blocked_formal_evidence_not_auto_refreshable
- Blocked reason: blocked_formal_evidence: formal artifact required; source queue cannot generate proof.
- Next action: npm run check:debug-runtime-evidence

## Open PRs

- #278: deferred_unrelated; Aggregation hotspot work is outside blocked refresh queue resolver scope.
- #277: deferred_forbidden_surface; Payment/source-of-funds adjacent branch is deferred by hard-rule scope.

## Dirty File Classification

- agent/state/blocked-refresh-queue-resolver.generated.json: current_generated_artifact_to_commit; Generated score/debug evidence artifact refreshed by this resolver.
- docs/agent-truth/blocked-refresh-queue-resolver.md: documentation_artifact_expected; Agent-truth documentation for the blocked refresh resolver.
- scripts/agent/validate-blocked-refresh-queue-resolver.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-evidence-freshness-index.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-final-beta-exit-gate-readiness.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-final-morning-beta-lock.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-overnight-final-integration-lock.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-score-80-path-lock.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- scripts/agent/validate-score-80-refresh-queue-execution.ts: validator_artifact_expected; Dedicated validator requested by this batch.
- tests/unit/targeted-behavior-evidence-repair.spec.ts: test_artifact_expected; Dedicated unit coverage requested by this batch.

## Validation

- Pass.
