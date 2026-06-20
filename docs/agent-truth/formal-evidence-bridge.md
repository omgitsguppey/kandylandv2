# Formal Evidence Bridge

Generated: 2026-06-20T17:41:56.663Z

Current head: 42be9be767fc81370662e9a84f6673b1284d203e

## Summary

- Provider formal gate cleared: false
- Deployed runtime formal gate cleared: false
- Admin production sample gate cleared: false
- Operator revenue signal: operator_signal_only
- Formal gaps remaining: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
| sourceHealth | 99.2 | 99.2 |
| runtimeHealth | 71.2 | 71.2 |
| evidenceCompleteness | 58.4 | 58.4 |
| freshness | 83.75 | 83.75 |
| costRisk | 42 | 42 |
| regressionRisk | 94 | 94 |
| overallHealthScore | 76.88 | 76.88 |

## Bridge Gates

| Gate | Status | Evidence credit | Runtime credit | Formal cleared | Next action |
| --- | --- | ---: | ---: | --- | --- |
| runtimeProviderSmoke | partial_source_confidence | 78 | 92 | false | Attach formal provider and deployed runtime smoke before clearing this gate. |
| adminTruthSamples | missing_formal_artifact | 0 | 0 | false | Attach a redacted production admin truth sample before clearing the formal admin gate. |
| debugRuntimeEvidence | partial_source_confidence | 80 | 80 | false | Use debug/source runtime evidence as current confidence only; attach deployed smoke before formal closure. |

## Boundary

The bridge gives partial score/reporting credit for source-backed, operator-confirmed, admin-source, debug, and runtime-substitute evidence. It does not clear formal provider smoke, deployed runtime smoke, or production admin truth sample gates.

## Next Steps

- formal_provider_smoke: attach formal evidence artifact before clearing the gate.
- deployed_runtime_smoke: attach formal evidence artifact before clearing the gate.
- production_admin_truth_sample: attach formal evidence artifact before clearing the gate.
