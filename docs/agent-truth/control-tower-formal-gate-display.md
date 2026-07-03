# Control Tower Formal Gate Display

Generated Control Tower cleanup evidence. Typed evidence gates remain visible but are not source-code bugs.

```json
{
  "generatedAtUtc": "2026-07-03T02:01:58.344Z",
  "reportKey": "control-tower-formal-gate-display",
  "currentHead": "d7c614ae84aafbf7c3465651d9ef96ce18754859",
  "gates": {
    "runtimeProvider": {
      "gateId": "runtime_provider_smoke",
      "displayStatus": "operator_confirmed_partial",
      "notSourceBug": true,
      "evidencePaths": [
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/runtime-smoke-evidence.generated.json"
      ],
      "nextAction": "Produce provider-backed source activity evidence and deployed route evidence before clearing this gate.",
      "operatorSignal": "GumDrop payment operator-confirmed; provider-backed source evidence remains separate.",
      "formalProviderGateCleared": false,
      "deployedRuntimeGateCleared": false,
      "adminTruthStatus": "not_admin_gate"
    },
    "deployedRuntime": {
      "gateId": "deployed_runtime_smoke",
      "displayStatus": "formal_required",
      "notSourceBug": true,
      "evidencePaths": [
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/runtime-smoke-evidence.generated.json"
      ],
      "nextAction": "Produce provider-backed source activity evidence and deployed route evidence before clearing this gate.",
      "operatorSignal": null,
      "formalProviderGateCleared": false,
      "deployedRuntimeGateCleared": false,
      "adminTruthStatus": "not_admin_gate"
    },
    "adminTruth": {
      "gateId": "admin_truth_sample_artifact",
      "displayStatus": "source_ready_formal_missing",
      "notSourceBug": true,
      "evidencePaths": [
        "agent/state/admin-truth-source-sample.generated.json",
        "redacted admin source activity sample"
      ],
      "nextAction": "Produce a redacted admin source activity sample before clearing the admin lane.",
      "operatorSignal": null,
      "formalProviderGateCleared": false,
      "deployedRuntimeGateCleared": false,
      "adminTruthStatus": "source_ready_formal_admin_sample_required"
    }
  },
  "formalGatesRemaining": [
    "runtime_provider_smoke",
    "deployed_runtime_smoke",
    "admin_truth_sample_artifact"
  ],
  "operatorConfirmedSignals": [
    "GumDrop payment operator-confirmed; provider-backed source evidence remains separate."
  ],
  "sourceBugGateCount": 0
}
```
