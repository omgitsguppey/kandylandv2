# Admin Analytics Daily Task Pipeline

Daily Task Pipeline shows task lifecycle health, not generic task guidance volume.

Lifecycle states are assigned, started, completed, failed, and reminded. Guidance signals such as guide views, guide taps, and guide wins must be shown separately unless they are explicitly mapped to a task lifecycle state.

Canonical source hierarchy is user task state first, lifecycle logs second, first-party telemetry third, GA/Firebase analytics fourth, and stale backend snapshot last. The current analytics payload uses lifecycle logs plus guidance telemetry, so the UI must label the mode as mixed or raw event counts instead of claiming a strict state pipeline.

A strict lifecycle pipeline requires identity linkage across userId or sessionId, taskId, assignment timestamp, start timestamp, and completion or failure timestamp. Without that linkage, the module shows directional lifecycle event counts and mismatch checks.

Rates must expose denominators:
- Start rate is `started / assigned`.
- Completion rate is `completed / started`.
- Fail rate is `failed / started`.

Orphan started means started count exceeds assigned count. Orphan completed means completed count exceeds started count. Stuck assigned means assigned count exceeds started count. Started open means started count exceeds completed count. These are aggregate warnings until per-user task state is joined.

Task Completion Speed belongs inside Daily Task Pipeline because it depends on the same lifecycle truth. A standalone Task Completion Speed module is forbidden unless a future product decision explicitly reintroduces it with a new source contract. Completion speed requires linked start and completion timestamps for the same user/task lifecycle; raw completion events alone are not enough.

Speed buckets count timed completions only. Total completed tasks and timed completions may differ, so the UI and debug metadata must expose timing coverage. If completion timestamps exist but start timestamps are missing, do not calculate a duration; expose missing timestamp counts in Debug. Fake `0s` timing is forbidden when timestamps are missing or defaulted.

The compact speed view should use brand/semantic colors: brand purple for completed timing, muted slate for empty/unavailable buckets, and restrained warning or error colors for slow/problem states. Bright cyan is not the semantic color for task completion speed unless doctrine later documents it for this exact use. Do not use a large vertical speed bar chart on mobile; use a compact inline histogram or summary inside Daily Task Pipeline.

Do not render zero unless the source is loaded and server-confirmed. If the payload is missing, show waiting or unavailable. Stale cache must be labeled stale.

Firebase Analytics events can be batched in normal use. Firestore listeners can emit cached/local-write data; expose `fromCache` and `hasPendingWrites` if Firestore becomes the source. GA4 intraday is incomplete; GA4 daily export is the stable completed-day source.

Mobile density rule: use compact lifecycle tiles, a small horizontal progression, a guidance signal row, and compact completion-speed timing. Future agents must not reintroduce the unhelpful vertical bar chart, standalone Task Completion Speed chart, or mix guide views into lifecycle states without labeling.
