# Formal Evidence Bridge

Generated: 2026-06-01T00:01:19.662Z

Current head: 9795630e505231581241589fe40debd01b23d9b0

## Summary

- Provider formal gate cleared: false
- Deployed runtime formal gate cleared: false
- Admin production sample gate cleared: false
- Operator revenue signal: operator_signal_only
- Formal gaps remaining: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
| sourceHealth | 91.7 | 91.7 |
| runtimeHealth | 84.2 | 84.2 |
| evidenceCompleteness | 69.6 | 69.6 |
| freshness | 67.5 | 67.5 |
| costRisk | 42 | 42 |
| regressionRisk | 86 | 86 |
| overallHealthScore | 76.61 | 76.61 |

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
