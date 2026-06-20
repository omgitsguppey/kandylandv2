# Control Tower Formal Gate Display

Generated Control Tower cleanup evidence. Formal gates remain visible but are not source-code bugs.

```json
{
  "generatedAtUtc": "2026-06-20T18:01:06.956Z",
  "reportKey": "control-tower-formal-gate-display",
  "currentHead": "aa12e6692a62b9749ef6730e4c4331e85a622b43",
  "gates": {
    "runtimeProvider": {
      "gateId": "runtime_provider_smoke",
      "displayStatus": "operator_confirmed_partial",
      "notSourceBug": true,
      "evidencePaths": [
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/runtime-smoke-evidence.generated.json"
      ],
      "nextAction": "Attach formal provider and deployed runtime smoke artifacts before clearing this gate.",
      "operatorSignal": "GumDrop payment operator-confirmed; formal provider artifact remains separate.",
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
      "nextAction": "Attach formal provider and deployed runtime smoke artifacts before clearing this gate.",
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
        "redacted first-party admin truth sample"
      ],
      "nextAction": "Attach a redacted first-party admin truth sample before clearing the formal admin gate.",
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
    "GumDrop payment operator-confirmed; formal provider artifact remains separate."
  ],
  "sourceBugGateCount": 0
}
```
