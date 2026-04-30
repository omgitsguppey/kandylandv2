# Admin Analytics Auth Outcome Split

Auth Outcome Split shows how authentication attempts finish for the selected range. It is an operational readout, not the auth system itself.

## Meaning

An auth attempt is a tracked start of a sign-in or sign-up flow. A success is a completed auth flow. A failure is a rejected provider flow, Firebase auth error, internal validation error, or other tracked failed auth outcome. An unfinished attempt is an attempt without a tracked success or failure in the current summary.

Registered users or completed account creation are outcomes. They must not appear as auth methods unless a canonical source explicitly classifies them as methods. In the Admin Analytics UI, registration completion belongs in the outcome note, not in the method table.

## Formulas

Success rate is `successes / attempts` for the selected range. The denominator must be visible or available in debug.

Average finish time is only valid when the source has positive start and finish duration data. If timing fields are missing, zero, or defaulted, the UI must show `Unavailable` or `Timing unavailable`, not `0s`.

Unfinished attempts are currently derived as `attempts - successes - failures` in the selected range. The current summary does not provide a per-attempt timeout window, so debug must expose that limitation.

## Source Truth

The section uses first-party auth telemetry summaries before GA4 or other analytics exports. GA4 and Firebase Analytics events can be batched in normal use, so this section must not imply exact realtime auth flow truth from GA-derived events. Firestore listener cache/server metadata must be exposed when a listener is used.

Method labels are normalized for display. Event names remain case-sensitive in source systems, so casing drift must be normalized for UI and exposed in debug through raw event names.

## UI Rule

The mobile layout must be compact: summary tiles, one action insight row, and short method rows with small stacked bars. Use KandyDrops colors: brand purple for success, muted slate for unfinished, and restrained rose/error color for failures. Do not reintroduce giant auth cards or an oversized off-brand chart.

Use one compact section status label when the whole section shares the same state. Do not render repeated `[DEGRADED]` row badges unless a row differs from the section truth state. Badges must stay inside their containers.

Fake zeros are forbidden. Missing values must render as Waiting or Unavailable.

Future agents must not reintroduce giant auth cards, off-brand chart colors, fake `0s` timing, raw degraded badges on every row, or a registered-users row masquerading as an auth method.

Official references:
- [Firebase Analytics events](https://firebase.google.com/docs/analytics/events)
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export setup](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
