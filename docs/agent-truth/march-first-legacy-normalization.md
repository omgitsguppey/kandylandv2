# March First Legacy Normalization

Generated: 2026-05-21T15:50:52.810Z

This is a dry-run normalization plan for legacy KandyDrops records from March 1, 2026 onward. It does not read production data, run live backfill, mutate current records, or promote unknown legacy rows into current truth.

## Contract

- Recovery start date: 2026-03-01
- Mode: dry_run_only
- Production reads: false
- Live backfill: false
- Mutations allowed: false
- Current truth eligible records: 0
- Read-only purchase/GumDrop ledger references: 1

## Legacy Domains

- guest_sessions
- user_sessions
- identity_links
- behavior_events
- watch_sessions
- drops
- creator_profile_views
- fan_pass_subscriptions
- creator_broadcasts
- purchases_gumdrop_ledger_references
- admin_truth_samples

## Dry-Run Summary

- Input records: 11
- In-window records: 11
- Probable: 6
- Weak: 4
- Unknown: 1
- High duplicate risk: 2

## Debug Backlog Integration

- march-first-legacy-normalization-evidence-refresh: Review generated dry-run candidates, refresh source evidence locally, and keep unknown legacy rows archived until identity improves.
- march-first-ledger-readonly-manual-review: Keep purchase and GumDrop ledger references read-only; require a separate reviewed migration before any ledger write plan.
