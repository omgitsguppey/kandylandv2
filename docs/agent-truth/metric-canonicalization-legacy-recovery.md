# Metric Canonicalization Legacy Recovery

Generated: 2026-06-20T18:15:55.246Z
Current head: 2aa8515d504357c3c3e055fcfc443547d1fe0fc7
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

- none

## Open PR Classification

- none

## Validation Failures

- none
