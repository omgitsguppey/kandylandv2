# Blocked Refresh Queue Resolver

Status: pass

This pass resolves the blocked self-healing refresh queue rows by routing UI visual work through deterministic source coverage first and keeping runtime, provider, and admin truth blockers non-automatic.

## Score

- Old score: 70.79
- New score: 70.79

## Blocked Entries

- Blocked count: 5
- Refreshable blocked entries remaining: 0
- Obsolete entries retired: 0

### admin_truth_sample_evidence

- Owner: admin
- Score impact estimate: 8.32
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

- None

## Validation

- Pass.
