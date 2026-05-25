# debug-cockpit-batch32-commerce-parity

Generated: 2026-05-25T07:00:00.000Z

Status: pass

## Summary
- Batch 32 repairs the verified capture to server telemetry path without changing payment math.
- Commerce validation now reports source reasons for purchase ledger, server telemetry, rollup, and journey mismatches.
- Historical missing telemetry remains blocked because this batch does not fake events or backfill production.

## Validation Failures
- none
