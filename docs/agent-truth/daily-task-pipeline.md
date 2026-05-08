# Daily Task Pipeline

Status: canonical pipeline note for daily task assignment, progress, and reward flow  
Recorded: 2026-05-08

The daily task pipeline now treats the active daily window as durable state. Materialization, dashboard backfill, and progress writes all flow through the same window-aware engine so tasks stay visible until the reset boundary.

## Pipeline Contract

- The materializer assigns deterministic tasks once per active daily window.
- Dashboard reads may repair metadata, but they may not rotate active-window assignments.
- Queue or repair paths must preserve existing active assignments instead of reselection.
- Progress dedupes by unique-by-param keys and idempotent receipts.
- Completion and claim events are distinct from assignment events.

## Reward Contract

- Rewards are normalized through one resolver before assignment.
- Legacy reward versions are converted once, not multiplied repeatedly.
- Assigned totals, claimable totals, claimed totals, expired totals, and check-in totals are tracked separately.
- Reward totals must reconcile against the stored normalized assignment values.

## UI Expectations

- Daily tasks show the reset timer and the stable assigned list.
- Claimed tasks remain visible as claimed until the window ends.
- Incomplete tasks do not disappear mid-window.
- Repair-required state shows explicit refresh copy instead of silent rotation.

## Forbidden Paths

- Early incomplete-cycle rotation.
- Rotation triggered by malformed `nextRefreshMs` on an active window.
- Raw reward multiplication outside the resolver.
- Direct task-reward credit into the paid GumDrop balance.
