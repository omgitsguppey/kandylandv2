# Admin Truth Redaction Packet

Artifact: `agent/state/admin-truth-redaction-packet.generated.json`
Validator: `npm run check:admin-truth-redaction-packet`

## Summary

- Generated: `2026-05-26T21:08:58.066Z`
- Current head: `c00b6d90c112eb289ec1b354f92fdbbc9a793ab9`
- Status: `pass`

## Report

```json
{
  "reportKey": "admin-truth-redaction-packet",
  "generatedAtUtc": "2026-05-26T21:08:58.066Z",
  "currentHead": "c00b6d90c112eb289ec1b354f92fdbbc9a793ab9",
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
    "redacted production admin truth sample",
    "operator attestation optional"
  ],
  "linkedToBetaExitStatus": true,
  "validationFailures": []
}
```

## Evidence Boundary

This source-generated packet does not prove deployed runtime, provider, billing, production admin truth, or operator-final visual QA unless the report explicitly includes a formal artifact for that category.

## Validation

- Pass.
