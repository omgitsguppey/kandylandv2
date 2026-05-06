# Admin Analytics Daily Task Pipeline

Daily Task Pipeline shows task lifecycle health, not generic task guidance volume.

Daily task assignment is canonical daily-window truth. The app reset window matches the check-in reset policy and is exposed as `dailyTaskWindowId`, `windowStartAtUtc`, `windowEndAtUtc`, and `resetAtUtc`. Eligible users should have one idempotent assignment envelope per user/window with `idempotencyKey` shaped like `daily_tasks:{userId}:{dailyTaskWindowId}`, `schemaVersion`, `assignedAtUtc`, `expiresAtUtc`, and source `daily_task_materializer`, `on_demand_backfill`, or `debug_repair`. The scheduled/materialized path is primary; dashboard open may backfill only as a labeled fallback and must emit `daily_task_assignment_backfilled_on_open`.

Incomplete prior-window tasks expire with reason `daily_window_expired`. `daily_task_reset_due_inactivity` is not the primary reset mechanism and must not be used for normal daily rollover. Same-task failed/assigned pairs are acceptable only across different daily windows, with reason/source/window evidence visible in Admin Debug.

Lifecycle states are assigned, started, completed, failed, and reminded. Guidance signals such as guide views, guide taps, and guide wins must be shown separately unless they are explicitly mapped to a task lifecycle state.

Canonical source hierarchy is user task state first, lifecycle logs second, first-party telemetry third, GA/Firebase analytics fourth, and stale backend snapshot last. The current analytics payload uses lifecycle logs plus guidance telemetry, so the UI must label the mode as mixed or raw event counts instead of claiming a strict state pipeline.

Per-user task issue attribution must classify "expected tasks vs found tasks" before repair. Expected count is sourced from the task catalog or assignment policy. Found count is sourced from user task assignments when diagnosing assignment gaps, not from telemetry samples alone. The diagnostic must expose `expectedSource`, `foundSource`, `issueType`, `sourceFreshness`, eligibility, and a safe action. Eligible users with fresh missing assignment state may escalate to ERROR; incomplete onboarding, exempt users, stale materializers, and sample-window uncertainty must stay INFO or REVIEW with source-specific next steps.

A strict lifecycle pipeline requires identity linkage across userId or sessionId, taskId, assignment timestamp, start timestamp, and completion or failure timestamp. Without that linkage, the module shows directional lifecycle event counts and mismatch checks.

Rates must expose denominators:
- Start rate is `started / assigned`.
- Completion rate is `completed / started`.
- Fail rate is `failed / started`.

Orphan started means started count exceeds assigned count. Orphan completed means completed count exceeds started count. Stuck assigned means assigned count exceeds started count. Started open means started count exceeds completed count. These are aggregate warnings until per-user task state is joined.

Task Completion Speed belongs inside Daily Task Pipeline because it depends on the same lifecycle truth. A standalone Task Completion Speed module is forbidden unless a future product decision explicitly reintroduces it with a new source contract. Completion speed requires linked start and completion timestamps for the same user/task lifecycle; raw completion events alone are not enough.

Speed buckets count timed completions only. Total completed tasks and timed completions may differ, so the UI and debug metadata must expose timing coverage. If completion timestamps exist but start timestamps are missing, do not calculate a duration; expose missing timestamp counts in Debug. Fake `0s` timing is forbidden when timestamps are missing or defaulted.

The compact speed view should use brand/semantic colors: brand purple for completed timing, muted slate for empty/unavailable buckets, and restrained warning or error colors for slow/problem states. Bright cyan is not the semantic color for task completion speed unless doctrine later documents it for this exact use. Do not use a large vertical speed bar chart on mobile; use a compact inline histogram or summary inside Daily Task Pipeline.

Task Leaderboard also belongs inside Daily Task Pipeline because its rows are per-task slices of the same lifecycle truth. A standalone Task Leaderboard module is forbidden unless a future product decision explicitly reintroduces it with a new source contract. The leaderboard must use compact inline rows with pagination instead of giant task cards.

Leaderboard rows must declare their ranking mode. The default mode is completions. Completion rate is `completed / assigned` unless a future model explicitly exposes another denominator. Failed counts come from failed lifecycle logs; if failed exceeds started, the row must be flagged instead of displayed as normal. Mixed, stale, fallback, or telemetry-derived rows must be labeled.

Reward totals are not final business truth unless they reconcile against task catalog reward definitions. Built-in task rewards can be checked against the catalog. Custom task rewards must be treated as unverified until custom catalog data is included in the analytics payload. Do not display unverified reward totals as final; put raw reward totals and reconciliation deltas in Debug.

Paid rewards must come from completed/credited task rewards only.

Assigned, failed, expired, and reminder events are potential or forfeited reward signals, not paid reward truth.

Daily rows with zero completed tasks must not display paid rewards unless credited task completion evidence is present.

## Phase 5 Snapshot Migration

Daily Task Pipeline reads the Admin Analytics snapshot registry first and is the single home for lifecycle flow, completion speed, and task leaderboard. Standalone Task Completion Speed and Task Leaderboard modules remain forbidden. The compact module must keep lifecycle states separate from guidance/reminder signals, include inline leaderboard pagination, and send reward, timing, source, and pipeline parity details to Admin Debug.

Leaderboard totals must reconcile with Daily Task Pipeline totals or expose `leaderboardPipelineDelta`. Leaderboard timing must reconcile with the completion-speed timing model or expose `speedTimingDelta`. Average task time requires linked durations and must expose timing coverage when only some completions have durations.

Do not render zero unless the source is loaded and server-confirmed. If the payload is missing, show waiting or unavailable. Stale cache must be labeled stale.

Firebase Analytics events can be batched in normal use. Firestore listeners can emit cached/local-write data; expose `fromCache` and `hasPendingWrites` if Firestore becomes the source. GA4 intraday is incomplete; GA4 daily export is the stable completed-day source.

Mobile density rule: use compact lifecycle tiles, a small horizontal progression, a guidance signal row, compact completion-speed timing, and inline paginated leaderboard rows. Future agents must not reintroduce the unhelpful vertical bar chart, standalone Task Completion Speed chart, giant Task Leaderboard cards, unverified reward totals, or mix guide views into lifecycle states without labeling.
