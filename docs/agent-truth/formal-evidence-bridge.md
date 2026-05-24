# Formal Evidence Bridge

Generated: 2026-05-24T05:11:18.451Z

Current head: e7d4eb198c8b9f728589fe48b41345f295a854d1

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
| runtimeHealth | 66 | 82.25 |
| evidenceCompleteness | 37.5 | 67 |
| freshness | 62.86 | 62.86 |
| costRisk | 80.5 | 80.5 |
| regressionRisk | 18 | 18 |
| overallHealthScore | 62.9 | 72.05 |

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
