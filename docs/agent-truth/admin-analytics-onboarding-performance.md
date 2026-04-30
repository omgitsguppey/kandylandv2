# Admin Analytics Onboarding Performance

Onboarding Velocity and Onboarding Step Flow are one onboarding truth family. Admin Analytics should render one consolidated onboarding performance module, not two giant modules.

## What It Shows

The module shows onboarding starts, completions, completion rate, drop-offs, completion timing, duration distribution, and per-step flow. It should answer where users drop off, which step is slowest, and whether source comparisons are clean.

Onboarding starts come from canonical onboarding-start events or server state. Auth sign-ups are different auth events and must not be treated as onboarding starts. A mismatch between auth sign-ups and onboarding starts should be classified, summarized briefly in the UI, and fully explained in Admin Debug.

## Formulas

Completion rate is `completed / started`.

Overall drop-offs are `started - completed`.

Step conversion is `step completions / step starts`.

Step drop-offs are `step starts - step completions`.

Overall duration requires start and completion timestamps. Step duration requires step start and step completion or advance timestamps. Missing or defaulted timing must show `Unavailable` or `Timing unavailable`, never fake `0s`.

Duration bucket totals must reconcile with completed count. If they do not, Debug must expose `bucketReconciliationDelta`.

## Debug Split

The main UI gets compact plain-English discrepancy copy such as `Source mismatch: auth sign-ups and onboarding starts measure different events.` Full counts, formulas, source comparisons, discrepancy type, severity, bucket reconciliation, and per-step source states belong in Admin Debug.

Debug metadata must include `perStep`, `biggestDropoffStep`, `slowestStep`, `fastestStep`, `stepConversionFormula`, `stepDropoffFormula`, and `consolidatedModuleEnabled`.

## Source Caveats

Firebase Analytics events can be batched in normal use, and DebugView is near-realtime validation only. Firestore listeners may emit cached snapshots first; if listener cache/server transitions matter, expose `fromCache` and `hasPendingWrites`. GA4 BigQuery intraday tables are incomplete for current-day data, while daily export tables are stable for completed days.

## UI Rule

The default mobile layout is compact: four KPI tiles, one short discrepancy row, one action insight row, a small duration histogram, and dense step rows. Do not render separate giant Onboarding Velocity and Onboarding Step Flow modules.

Future agents must not reintroduce separate giant onboarding modules or treat auth sign-ups as onboarding starts.

Official references:
- [Firebase Analytics events](https://firebase.google.com/docs/analytics/events)
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export setup](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
