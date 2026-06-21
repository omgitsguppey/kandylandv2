# Source Evidence Bridge

Generated: 2026-06-21T19:35:58.151Z

Current head: 187d6964a50ddf5a4077b19e88471c7e23414b75

## Summary

- Provider-backed site activity lane cleared: false
- Deployed route activity lane cleared: false
- Admin production sample gate cleared: false
- Operator revenue signal: operator_signal_only
- Source gaps remaining: provider_backed_site_activity, deployed_route_activity, admin_source_activity_sample

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
| sourceHealth | 97.2 | 97.2 |
| runtimeHealth | 91.11 | 91.11 |
| evidenceCompleteness | 95.2 | 95.2 |
| freshness | 91.88 | 91.88 |
| costRisk | 42 | 42 |
| regressionRisk | 94 | 94 |
| overallHealthScore | 89.31 | 89.31 |

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
