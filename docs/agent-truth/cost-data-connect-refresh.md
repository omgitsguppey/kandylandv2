# Cost Data Connect Refresh

Generated source-only artifact. No production reads, provider calls, deployed runtime calls, payment runtime changes, or GumDrop math changes were performed.

```json
{
  "generatedAtUtc": "2026-05-24T19:37:48.938Z",
  "currentHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
  "googleCostAgeBefore": 301.2,
  "googleCostAgeAfter": 0,
  "googleCostScore": 100,
  "googleCostStatus": "clean",
  "cloudCostAgeBefore": 399.7,
  "cloudCostAgeAfter": 0.67,
  "cloudCostScore": 90,
  "cloudCostStatus": "pass",
  "dataConnectMirrorStatusBefore": "unknown",
  "dataConnectMirrorStatusAfter": "manual_only_safe",
  "liveSyncRequiresExplicitApproval": true,
  "costLanesClaimExternalBillingProof": false,
  "refreshedArtifacts": [
    "agent/state/google-cost-bleed.generated.json",
    "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
    "agent/state/data-connect-mirror-status.generated.json"
  ]
}
```
