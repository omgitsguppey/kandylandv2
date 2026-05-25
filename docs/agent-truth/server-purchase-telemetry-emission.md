# server-purchase-telemetry-emission

Generated: 2026-05-25T07:00:00.000Z

Status: pass

## Summary
- Verified PayPal capture now builds a deterministic `server_purchase_verified` event after the transaction ledger write.
- The telemetry event carries transaction linkage, redacted provider references, revenue, delivered GumDrops, paid GumDrops, bonus GumDrops, and an idempotency key.
- Payment math and GumDrop source-of-funds policy are unchanged.

## Validation Failures
- none
