# purchase-journey-normalization

Generated: 2026-05-25T07:00:00.000Z

Status: pass

## Summary
- One canonical server purchase event maps to one purchase journey step.
- Missing wallet-open or checkout-start pre-events are attribution gaps, not a reason to drop provider/ledger-backed purchase truth.
- Duplicate canonical purchase events remain a blocking double-count risk.

## Validation Failures
- none
