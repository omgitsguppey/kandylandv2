# Score 80 Path Lock

Generated: 2026-06-21T12:52:46.185Z

Latest code version: ff622c126819018ce3fb9b0ba1f04b7053dd6767

## Score

- Old score: 41.92
- New score: 86.83
- Source health: 97.2
- Runtime health: 83.74
- Evidence completeness: 92
- Freshness: 91.88
- Cost risk: 42
- Regression risk: 94
- Launch gate: owner_review
- Can start beta exit review: false

## Remaining Score Drag

| Dimension | Score | Weight | Weighted point impact | Reason |
| --- | ---: | ---: | ---: | --- |
| costRiskScore | 42 | 10 | 5.8 | Source cost readiness is partial while external billing owner review remains separate. |
| runtimeHealthScore | 83.74 | 20 | 3.25 | Source-backed runtime confidence helps, but deployed route evidence remains missing. |
| evidenceCompletenessScore | 92 | 20 | 1.6 | UI source coverage plus provider, runtime, and admin truth evidence is still required. |
| freshnessScore | 91.88 | 15 | 1.22 | Stale or missing generated evidence reports still decay freshness. |
| sourceHealthScore | 97.2 | 25 | 0.7 | Source health is affected by failed or stale implemented source validators. |
| regressionRiskScore | 94 | 10 | 0.6 | Recent high-blast source changes keep regression risk from reaching zero. |

## Artifacts Blocking 80

| Artifact or gate | Status | Point impact | Refresh action |
| --- | --- | ---: | --- |
| provider_backed_site_activity_deployed_route_evidence | Source evidence required: Provider-backed site activity + deployed route evidence | 3.25 | Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status |
| agent/state/overnight-final-integration-lock.generated.json | stale_source_version | 2 | npm run check:overnight-final-integration-lock |
| admin_source_activity_sample_evidence | Source evidence required: Admin source activity sample evidence | 1.6 | Produce admin source activity sample evidence, then run npm run check:evidence-capture-status |

## Clean Build Status

- Status: clean
- Dirty files: 0
- Open PRs: 0
- Stale score artifacts: 1

## Dirty Files

| Path | Status | Classification | Action |
| --- | --- | --- | --- |
| none | clean | clean | No dirty files at generation time. |

## Open PRs

| PR | Merge state | Classification | Action |
| --- | --- | --- | --- |
| none | none | classified | No open PRs. |

## Next Three Actions

1. Produce deployed route and provider-backed site activity evidence; source-backed confidence does not clear those gates.
2. Run UI source coverage and produce admin source activity sample evidence so evidence completeness can move without fake proof.
3. Refresh or retire every stale score-impacting artifact using its listed command before re-running npm run score:beta.

## Boundary

This lock refreshes source-backed score evidence and dirty-build prevention only. It does not mark beta exit ready and does not clear provider-backed, deployed route, or admin source activity lanes without matching source evidence.
