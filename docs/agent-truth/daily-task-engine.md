# Daily Task Engine

Status: canonical source contract for the daily task lifecycle  
Recorded: 2026-05-08

KandyDrops daily tasks are stable for the active daily window. A task assignment cannot fail, reset, rotate, or disappear before the window ends except by explicit debug repair. Rewards are normalized once, stored on assignment, claimed idempotently, and credited only as reward/free GumDrops. Daily check-in rewards remain distinct from random task rewards when pinned outside the task pool.

## Canonical Window Rules

- One user + one dailyTaskWindowId = one stable assignment set.
- `dailyTaskWindowId`, `windowStartAtUtc`, `windowEndAtUtc`, and `resetAtUtc` define the window.
- Active-window tasks keep their ids, progress, and claimed state until `windowEndMs`.
- Incomplete tasks expire only after the window ends.
- A malformed `nextRefreshMs` repairs metadata but does not rotate active assignments.

## Assignment And Reward Rules

- Assignment selection is deterministic from uid + window + eligibility snapshot.
- Assigned tasks store normalized reward values, not raw rewards.
- Reward claims are idempotent by `task_reward:${uid}:${dailyTaskWindowId}:${taskId}`.
- Duplicate claims return success with `duplicatePrevented: true` and no new credit.
- Task rewards credit reward/free GumDrops only.
- Paid GumDrops are never created by daily tasks.

## Validation And Repair

- `repair_required` is reserved for malformed state and explicit debug repair.
- `expired` only applies after the active window ends.
- `failed` is reserved for system/materializer failure, not normal inactivity.
- Materializers may repair metadata, but they cannot rotate an active window.

## Related Files

- `src/lib/tasks/daily-task-window-contract.ts`
- `src/lib/tasks/daily-task-reward-contract.ts`
- `src/lib/tasks/daily-task-assignment-engine.ts`
- `src/lib/server/daily-task-runtime.ts`
- `src/lib/server/daily-tasks.ts`
- `src/components/Dashboard/DailyTasksModule.tsx`
