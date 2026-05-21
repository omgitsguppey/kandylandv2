# Behavior Math Verification

Status: verified_local_contract

## Source Rules

- Disabled tracking events are excluded from behavior metrics.
- Linked guest activity is attributed once to the resolved signed-in user.
- Legacy unknown records are quarantined until dry-run recovery classifies confidence and duplicate risk.
- Watch time uses watch-session rollup evidence only; page time and visibility duration do not become watch time.
- Purchase intent remains a behavior signal; purchase truth stays server-owned.

## Fixture Counts

- Raw events: 7
- Eligible events: 4
- Disabled excluded: 1
- Legacy unknown excluded: 1
- Duplicates deduped: 1
- Page-time watch exclusions: 1
- Linked guest events attributed to users: 1

## Debug Output

- Behavior math health: verified_local_contract
- Disabled tracking handling: excluded_from_behavior_metrics
- Legacy recovery readiness: dry_run_only_from_2026_03_01
- Watch time truth: watch_session_rollups_only_not_page_time
- Per-user confidence: {"user-1":"exact"}

## Legacy Recovery

- Start date: 2026-03-01
- Mode: dry_run_only
- Production reads: false
- Mutations allowed: false
- In-window records: 2
