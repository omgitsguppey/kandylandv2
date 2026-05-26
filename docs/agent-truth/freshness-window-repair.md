# Freshness Window Repair

Status: `pass`
Artifact: `agent/state/freshness-window-repair.generated.json`
Validator: `npm run check:freshness-window-repair`

## Summary

- Current head: `e75d98523cda258032a04e11eb16e1d128bea2f9`
- Latest main head: `e75d98523cda258032a04e11eb16e1d128bea2f9`
- Stale required reports before: 7
- Freshness: 75.63 -> 83.75
- Health score: 78.03 -> 84.12
- Formal evidence impact: `does_not_clear_formal_gates`
- Production reads/provider calls/deploys performed: false

## Stale Report Classifications

| Artifact | Classification | Action | Current/replacement artifact | Next action |
| --- | --- | --- | --- | --- |
| agent/state/evidence-capture-status.generated.json | refreshed | npm run check:evidence-capture-status | agent/state/evidence-capture-status.generated.json | No action needed after refresh. |
| agent/state/gumdrop-economy-accuracy.generated.json | refreshed | npm run check:gumdrop-economy-accuracy | agent/state/gumdrop-economy-accuracy.generated.json | No action needed after refresh. |
| agent/state/creator-experience-simplification.generated.json | refreshed | npm run check:creator-experience-simplification | agent/state/creator-experience-simplification.generated.json | No action needed after refresh. |
| agent/state/post-economy-creator-flow-qa.generated.json | retired_superseded | retired from REQUIRED_EVIDENCE_REPORTS | agent/state/creator-monetization-readiness-lock.generated.json | Use creator monetization readiness lock and GumDrop source-of-funds truth for current source behavior evidence. |
| agent/state/user-creator-ui-parity.generated.json | refreshed | npm run check:user-creator-ui-parity | agent/state/user-creator-ui-parity.generated.json | No action needed after refresh. |
| agent/state/user-facing-feature-connection-audit.generated.json | retired_superseded | retired from REQUIRED_EVIDENCE_REPORTS | agent/state/final-parity-telemetry-lock.generated.json | Use final parity telemetry lock, feature registration gate, and targeted behavior evidence for current surface connection proof. |
| agent/state/creator-dashboard-error-cost-inventory.generated.json | retired_superseded | retired from REQUIRED_EVIDENCE_REPORTS | agent/state/score-80-cost-readiness.generated.json | Use beta score cost readiness and route/cost lanes; keep creator dashboard issue visible outside required freshness math. |

## Current Required Reports

- `agent/state/evidence-capture-status.generated.json`
- `agent/state/gumdrop-economy-accuracy.generated.json`
- `agent/state/creator-experience-simplification.generated.json`
- `agent/state/user-creator-ui-parity.generated.json`
- `agent/state/targeted-behavior-evidence.generated.json`
- `agent/state/final-parity-telemetry-lock.generated.json`
- `agent/state/media-discovery-score-lock.generated.json`
- `agent/state/creator-monetization-readiness-lock.generated.json`

## Dirty File Classification

| File | Classification |
| --- | --- |
| CHANGELOG.md | release_artifact_expected |
| agent/state/creator-experience-simplification.generated.json | current_generated_artifact_to_commit |
| agent/state/current-beta-exit-status.generated.json | current_generated_artifact_to_commit |
| agent/state/evidence-capture-status.generated.json | current_generated_artifact_to_commit |
| agent/state/freshness-window-repair.generated.json | current_generated_artifact_to_commit |
| agent/state/gumdrop-economy-accuracy.generated.json | current_generated_artifact_to_commit |
| agent/state/overnight-beta-readiness-lock.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/public-beta-score.generated.json | current_generated_artifact_to_commit |
| agent/state/refresh-safeguards.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/self-healing-refresh-queue.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/user-creator-ui-parity.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/current-beta-exit-status.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/evidence-capture-status.md | current_generated_artifact_to_commit |
| docs/agent-truth/freshness-window-repair.md | current_generated_artifact_to_commit |
| docs/agent-truth/overnight-beta-readiness-lock.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/refresh-safeguards.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/self-healing-refresh-queue.md | stale_generated_artifact_to_regenerate |
| package.json | freshness_required_input_fix |
| public/kandydrops-release-notes.json | release_artifact_expected |
| scripts/agent/score-public-beta-readiness.ts | freshness_required_input_fix |
| scripts/agent/validate-freshness-window-repair.ts | failed_validator_to_repair |
| src/lib/release-notes/public-release-notes.ts | release_artifact_expected |
| src/lib/release-notes/release-version-contract.ts | release_artifact_expected |
| tests/unit/freshness-window-repair.spec.ts | failed_validator_to_repair |

## Remaining Gaps

- No freshness-window repair gaps remain.

## Next Exact Steps

- Run npm run score:beta and npm run check:beta-score after any further source changes.
- Do not use source freshness repair to clear formal manual, provider, runtime, or admin truth gates.
