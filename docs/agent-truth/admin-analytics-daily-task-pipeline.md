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

Do not render zero unless the source is loaded and server-confirmed. If the payload is missing, show waiting or unavailable. Stale cache must be labeled stale.

Firebase Analytics events can be batched in normal use. Firestore listeners can emit cached/local-write data; expose `fromCache` and `hasPendingWrites` if Firestore becomes the source. GA4 intraday is incomplete; GA4 daily export is the stable completed-day source.

Mobile density rule: use compact lifecycle tiles, a small horizontal progression, and a guidance signal row. Future agents must not reintroduce the unhelpful vertical bar chart or mix guide views into lifecycle states without labeling.
