# Metric Canonicalization Legacy Recovery

Generated: 2026-06-20T17:25:16.011Z
Current head: f1f3c52f16b8255d61764cd0c841bc3f76b37294
Status: pass

## Contract

- Recovery starts at the formal launch anchor `2026-02-12`.
- This is dry-run only: no production reads, writes, mutations, or live backfill.
- Unknown legacy cannot become exact user truth.
- Exact legacy identity requires deterministic userId, eventId, timestamp, and source route.
- Exact source with incomplete identity is capped at inferred, partial route/event match is capped at weak, and unknown source/identity is archive-only.
- Payment/ledger dedupe uses idempotency or provider/order fingerprints only and does not change payment or GumDrop math.

## Alias Categories

- watch_page_duration
- unlock_drop_open
- wallet_payment
- signup_login
- daily_task_checkin
- chat_message
- notification
- creator_profile_follow
- search_discovery
- support_settings

## Dry-Run Summary

- Input records: 4
- Candidate count: 4
- Canonical metric count: 2
- Archive-only count: 1
- Manual review count: 1

## Dirty Files

- scripts/agent/validate-metric-canonicalization-legacy-recovery.ts: failed_validator_to_repair
- src/lib/math/legacy-metric-canonicalization.ts: real_source_change_needs_review
- src/lib/math/legacy-recovery-dry-run-engine.ts: real_source_change_needs_review
- tests/unit/metric-canonicalization-legacy-recovery.spec.ts: current_generated_artifact_to_commit

## Open PR Classification

- none

## Validation Failures

- none
