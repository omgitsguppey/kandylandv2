# Admin Analytics Live Interaction Stream

The Live Interaction Stream shows recent user, guest, and creator behavior from the live site telemetry surface. It is not an admin activity log.

Admin actions must be excluded. System and internal events must also stay out of this stream unless a separate module explicitly documents why they belong in user behavior monitoring. Event math shown in this section must use the filtered user stream, while Debug keeps the excluded counts.

Visible rows should use readable action labels such as `Task failed`, `Unlock`, `Daily reward`, or `Purchase`. Raw backend event keys stay available in Debug or row metadata, but they must not dominate the row title.

Actor display labels follow this fallback order: safe username or display name, guest session label, short session label, then unknown actor. Full raw actor IDs belong in Debug only.

The stream can be called live only when the source is first-party realtime or server-confirmed live telemetry. Backend snapshots, polled snapshots, stale cache, GA4 intraday, and Firebase Analytics batch exports must be labeled as snapshot, stale, fallback, or waiting. Stale snapshots must not pretend to be live.

Repeated task assignment or failure events should be compacted by actor, task/action, route, and a short time bucket. The UI can show `x2` or similar compact grouping, while Debug preserves the raw grouping key and counts.

If route or surface context is missing, the visible row may say `unknown surface`, but Debug must expose the missing mapping. Unknown actor classification must not silently become a user classification.

Firebase Analytics events can be batched in normal use; DebugView is only near-realtime validation. Firestore listeners can emit cached snapshots first, so `fromCache` and `hasPendingWrites` metadata must be surfaced when that source is used.

Mobile density rule: this module uses compact one- or two-line rows, a small source summary, and a short stats strip. Future agents must not reintroduce giant stream cards, full raw IDs as primary labels, admin events, or stale snapshots labeled as live.
