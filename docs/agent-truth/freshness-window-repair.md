# Freshness Window Repair

Status: `pass`
Artifact: `agent/state/freshness-window-repair.generated.json`
Validator: `npm run check:freshness-window-repair`

## Summary

- Current head: `a81cdb0b885f65dec63a582e4b9fe4cfdfeced39`
- Latest main head: `a81cdb0b885f65dec63a582e4b9fe4cfdfeced39`
- Stale required reports before: 7
- Freshness: 75.63 -> 91.88
- Health score: 78.03 -> 89.19
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
| agent/context/optimized-task-context.generated.json | unrelated_agent_context_file_to_ignore |
| agent/state/targeted-behavior-evidence-repair.generated.json | stale_generated_artifact_to_regenerate |
| docs/agent-truth/targeted-behavior-evidence-repair.md | stale_generated_artifact_to_regenerate |

## Remaining Gaps

- No freshness-window repair gaps remain.

## Next Exact Steps

- Run npm run score:beta and npm run check:beta-score after any further source changes.
- Do not use source freshness repair to clear formal manual, provider, runtime, or admin truth gates.
