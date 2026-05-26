# Creator Monetization Admin Debug

Generated: 2026-05-26T03:03:52.227Z
Status: pass

## Summary

- Admin debug shows creator monetization configuration, Fan Pass status, chat pricing health, access denial reasons, and source-of-funds mismatch counts as a compact summary.
- Raw creator monetization records, private user identifiers, and payment/provider payloads remain outside the default admin summary.
- The admin route reuses already loaded creator/user/transaction snapshots and does not add provider reads.

## Telemetry

- admin_creator_monetization_summary_viewed
- admin_creator_monetization_issue_opened
- creator_monetization_mismatch_reviewed

## Validation

- No validation failures.
