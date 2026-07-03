# Source Evidence Bridge

Generated: 2026-07-03T08:12:04.070Z

Current head: 84820ddc673f44a8094c37b382e7d0af5f3fb3ad

## Summary

- Provider-backed site activity lane cleared: false
- Deployed route activity lane cleared: false
- Admin production sample gate cleared: false
- Operator revenue signal: operator_signal_only
- Source gaps remaining: provider_backed_site_activity, deployed_route_activity, admin_source_activity_sample

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
| sourceHealth | 98.6 | 98.6 |
| runtimeHealth | 65.34 | 66 |
| evidenceCompleteness | 75.11 | 75.11 |
| freshness | 91.88 | 91.88 |
| costRisk | 92.5 | 92.5 |
| regressionRisk | 94 | 94 |
| overallHealthScore | 81.19 | 81.32 |

## Bridge Gates

| Gate | Status | Evidence credit | Runtime credit | Formal cleared | Next action |
| --- | --- | ---: | ---: | --- | --- |
| runtimeProviderSmoke | partial_source_confidence | 78 | 100 | false | Produce provider-backed site activity and deployed runtime route evidence before clearing this gate. |
| adminTruthSamples | missing_formal_artifact | 0 | 0 | false | Produce a redacted admin source activity sample before clearing the admin lane. |
| debugRuntimeEvidence | partial_source_confidence | 80 | 80 | false | Use debug/source runtime evidence as current confidence; produce deployed route evidence before runtime closure. |

## Boundary

The bridge gives partial score/reporting credit for source-backed, operator-confirmed, admin-source, debug, and runtime-substitute evidence. It does not clear provider-backed site activity, deployed route activity, or admin source activity lanes without matching source records.

## Next Steps

- provider_backed_site_activity: produce the matching source activity record before clearing the lane.
- deployed_route_activity: produce the matching source activity record before clearing the lane.
- admin_source_activity_sample: produce the matching source activity record before clearing the lane.
