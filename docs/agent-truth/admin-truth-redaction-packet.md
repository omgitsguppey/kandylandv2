# Admin Truth Redaction Packet

Artifact: `agent/state/admin-truth-redaction-packet.generated.json`
Validator: `npm run check:admin-truth-redaction-packet`

## Summary

- Generated: `2026-06-21T14:53:53.719Z`
- Current head: `c42e13204e9def7042a988a33f7e140574cb9047`
- Status: `pass`

## Report

```json
{
  "reportKey": "admin-truth-redaction-packet",
  "generatedAtUtc": "2026-06-21T14:53:53.719Z",
  "currentHead": "c42e13204e9def7042a988a33f7e140574cb9047",
  "environment": "source_schema_only_no_production_read",
  "sampleSource": "none_attached",
  "redactionPolicy": {
    "forbiddenRawFields": [
      "email",
      "userId",
      "paymentProviderId",
      "providerOrderId",
      "chatContent",
      "privateMediaUrl",
      "accessToken",
      "storagePath",
      "fcmToken",
      "pushToken"
    ],
    "hashRequiredFields": [
      "userFingerprint",
      "creatorFingerprint",
      "paymentFingerprint"
    ],
    "privateContentExcluded": [
      "raw chat/private content",
      "private media URLs",
      "storage paths",
      "access tokens",
      "push tokens"
    ]
  },
  "packetSchema": {
    "adminSummary": "redacted aggregate admin state",
    "userCounts": "hashed/fingerprinted user aggregates",
    "creatorCounts": "hashed/fingerprinted creator aggregates",
    "walletPaymentConfidenceSummary": "bucketed confidence only",
    "gumdropLedgerSummary": "source buckets only",
    "dropsUnwrapWatchSummary": "aggregate facts only",
    "chatSummary": "counts/status only, no message content",
    "taskSummary": "aggregate task state",
    "notificationSummary": "aggregate prompt/token status without token",
    "errorDebugSummary": "fingerprinted errors only",
    "costSummary": "source guard/external review status",
    "missingFormalProof": "explicit formal_missing list"
  },
  "missingFormalProof": [
    "redacted admin source sample",
    "operator attestation optional"
  ],
  "linkedToBetaExitStatus": true,
  "validationFailures": [],
  "status": "pass",
  "evidenceClass": "source_snapshot",
  "canClearSourceGate": true,
  "canClearRuntimeGate": false,
  "canClearProviderGate": false,
  "canClearAdminTruthGate": false,
  "nextExactSteps": [
    "Use the owning release-readiness validator, then attach formal runtime/provider/admin evidence separately."
  ],
  "doesNotProve": [
    "Does not prove deployed runtime behavior.",
    "Does not prove provider smoke success.",
    "Does not prove current admin truth samples.",
    "Does not prove external billing or GitHub PR state unless an opt-in fresh evidence artifact says so."
  ]
}
```

## Evidence Boundary

This source-generated packet does not prove deployed runtime, provider, billing, production admin truth, or optional visual reproduction unless the report explicitly includes a typed evidence artifact for that category.

## Validation

- Pass.
