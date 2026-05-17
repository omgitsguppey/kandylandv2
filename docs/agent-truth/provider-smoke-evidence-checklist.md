# Provider Smoke Evidence Checklist

This checklist prepares provider smoke evidence. It does not mark provider smoke as passed. Do not paste secrets, raw provider tokens, access tokens, payer IDs, or unredacted payment identifiers.

Required artifact shape:

```json
{
  "generatedAtUtc": "ISO timestamp",
  "reportKey": "provider-smoke-evidence",
  "currentHead": "git sha",
  "status": "formal_provider_smoke_passed | missing_formal_evidence | failed",
  "redactionsApplied": true,
  "items": [
    {
      "id": "paypal-order-create-capture",
      "status": "passed | failed",
      "evidencePath": "agent/evidence/provider-smoke/<file>.redacted.json"
    }
  ]
}
```

Required checks:

- PayPal order create smoke: prove order creation reached the provider path without exposing tokens.
- PayPal capture smoke: prove successful capture response path and idempotency context.
- GumDrop purchased balance increase: show purchased balance increased by delivered paid GD.
- Paid bonus remains purchased balance: show `paidBonusGd` credited into purchased balance, not reward balance.
- Reward balance does not fund creator experience: show a paid-only creator experience rejects reward-only eligibility.
- Creator request paid spend: show request spend has `purchasedAmountSpent` and `rewardAmountSpent: 0`.
- Booking slot paid spend: show booking spend has generated slot evidence and `rewardAmountSpent: 0`.
- Subscription paid spend if safe: show Fan Pass/subscription spend has paid-source metadata, or record why this item was not safe to run.

Redaction requirements:

- Redact provider IDs, payer data, access tokens, raw headers, email addresses, and full transaction IDs.
- Keep only the minimum proof fields needed for source-of-funds classification and status.
- Store evidence as a redacted artifact path; do not paste raw provider output into docs.

Provider smoke remains blocking for beta exit until a formal artifact exists and the provider smoke validator consumes it.
