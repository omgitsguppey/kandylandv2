# Formal Evidence Bridge

Generated: 2026-05-24T05:47:53.160Z

Current head: b0850954013ef36f732dec9ad90f64d5bcbfd65b

## Summary

- Provider formal gate cleared: false
- Deployed runtime formal gate cleared: false
- Admin production sample gate cleared: false
- Operator revenue signal: operator_signal_only
- Formal gaps remaining: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
| sourceHealth | 92.5 | 92.5 |
| runtimeHealth | 84.2 | 84.2 |
| evidenceCompleteness | 69.6 | 69.6 |
| freshness | 83.75 | 83.75 |
| costRisk | 80.5 | 80.5 |
| regressionRisk | 86 | 86 |
| overallHealthScore | 83.1 | 83.1 |

## Bridge Gates

| Gate | Status | Evidence credit | Runtime credit | Formal cleared | Next action |
| --- | --- | ---: | ---: | --- | --- |
| runtimeProviderSmoke | partial_source_confidence | 78 | 92 | false | Attach formal provider and deployed runtime smoke before clearing this gate. |
| adminTruthSamples | partial_source_confidence | 65 | 65 | false | Attach a redacted production admin truth sample before clearing the formal admin gate. |
| debugRuntimeEvidence | partial_source_confidence | 80 | 80 | false | Use debug/source runtime evidence as current confidence only; attach deployed smoke before formal closure. |

## Boundary

The bridge gives partial score/reporting credit for source-backed, operator-confirmed, admin-source, debug, and runtime-substitute evidence. It does not clear formal provider smoke, deployed runtime smoke, or production admin truth sample gates.

## Next Steps

- formal_provider_smoke: attach formal evidence artifact before clearing the gate.
- deployed_runtime_smoke: attach formal evidence artifact before clearing the gate.
- production_admin_truth_sample: attach formal evidence artifact before clearing the gate.
