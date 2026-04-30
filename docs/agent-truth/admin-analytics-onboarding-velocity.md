# Admin Analytics Onboarding Velocity

Onboarding Velocity now renders inside the consolidated Onboarding Performance module. It shows how many users start guided onboarding, how many finish it, and how long completed onboarding takes for the selected range, alongside the Step Flow rows.

## Source Meaning

Onboarding starts are canonical onboarding-start events or server state. Auth sign-ups are not onboarding starts. They are a separate auth outcome and must only be shown as a comparison signal.

If canonical onboarding starts are unavailable but completed onboarding sessions exist, the UI may use completion backfill only when it labels the source. If only auth sign-ups exist, the section must say auth-only fallback and must not call those values onboarding starts.

## Formulas

Completion rate is `completed / started`.

Drop-off count is `started - completed`.

Completion duration is valid only when start and completion timestamps produce a positive duration. Missing or defaulted timestamps must render as `Unavailable` or `Timing unavailable`, never fake `0s`.

Duration buckets must reconcile with completed count. If bucket totals differ from completions, Debug must expose `bucketReconciliationDelta`; the main UI may show a compact timing-partial note when visible values are affected.

## Discrepancies

Auth sign-ups and onboarding starts measure different events. A mismatch is often expected, but it must not silently pass. The main UI should use one short plain-English row such as `Source mismatch: auth sign-ups and onboarding starts measure different events.` Full counts, formulas, discrepancy type, and severity belong in Admin Debug.

Do not reintroduce a giant discrepancy warning card unless the section values are unusable.

## Analytics Caveats

Firebase Analytics events can be batched in normal use, and DebugView is only near-realtime validation. Firestore listeners may emit cached snapshots first; if listener cache/server transitions matter, metadata such as `fromCache` and `hasPendingWrites` must be exposed. GA4 BigQuery intraday tables are incomplete for current-day data, while daily export tables are stable for completed days.

## UI Rule

The mobile layout must be compact: four small KPI tiles, one short discrepancy row, a compact source/drop-off row, a small duration histogram, and dense step rows. Use KandyDrops visual style and source-state labels. Fake zeros are forbidden.

Future agents must not reintroduce giant discrepancy warning cards, separate giant Onboarding Velocity and Onboarding Step Flow modules, or treat auth sign-ups as onboarding starts.

Official references:
- [Firebase Analytics events](https://firebase.google.com/docs/analytics/events)
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export setup](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
