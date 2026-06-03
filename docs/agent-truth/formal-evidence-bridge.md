# Formal Evidence Bridge

Generated: 2026-06-03T18:49:48.720Z

Current head: e4ff8fc598ad5b523a9955b5e4377a537282c029

## Summary

- Provider formal gate cleared: false
- Deployed runtime formal gate cleared: false
- Admin production sample gate cleared: false
- Operator revenue signal: operator_signal_only
- Formal gaps remaining: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
| sourceHealth | 100 | 100 |
| runtimeHealth | 94.4 | 94.4 |
| evidenceCompleteness | 98.4 | 98.4 |
| freshness | 100 | 100 |
| costRisk | 42 | 42 |
| regressionRisk | 94 | 94 |
| overallHealthScore | 92.16 | 92.16 |

## Bridge Gates

| Gate | Status | Evidence credit | Runtime credit | Formal cleared | Next action |
| --- | --- | ---: | ---: | --- | --- |
| runtimeProviderSmoke | partial_source_confidence | 78 | 100 | false | Attach formal provider and deployed runtime smoke before clearing this gate. |
| adminTruthSamples | missing_formal_artifact | 0 | 0 | false | Attach a redacted production admin truth sample before clearing the formal admin gate. |
| debugRuntimeEvidence | partial_source_confidence | 80 | 80 | false | Use debug/source runtime evidence as current confidence only; attach deployed smoke before formal closure. |

## Boundary

The bridge gives partial score/reporting credit for source-backed, operator-confirmed, admin-source, debug, and runtime-substitute evidence. It does not clear formal provider smoke, deployed runtime smoke, or production admin truth sample gates.

## Next Steps

- formal_provider_smoke: attach formal evidence artifact before clearing the gate.
- deployed_runtime_smoke: attach formal evidence artifact before clearing the gate.
- production_admin_truth_sample: attach formal evidence artifact before clearing the gate.
