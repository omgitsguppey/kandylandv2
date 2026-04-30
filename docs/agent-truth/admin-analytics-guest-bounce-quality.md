# Admin Analytics Guest + Bounce Quality

Guest + Bounce Quality shows whether guest traffic can be counted and whether guest or signed-in quality can be measured for the selected range.

## Metric Meaning

Guest views are public/guest page views. Guest bounce is guest bounced visits divided by guest visits. Guest engagement is guest engaged visits divided by guest visits. Signed-in bounce is signed-in bounced visits divided by signed-in visits.

Guest views may be estimated only when GA total views and identified first-party views use the same selected range and compatible definitions. The formula is `GA total views - identified first-party views`. If the result is negative, clamp only with a debug warning through `guestEstimateClamped`.

Guest bounce and guest engagement require consented guest quality batches. If those batches are missing, the UI must say guest quality is unavailable and must not render fake bounce or engagement numbers.

Signed-in bounce requires a valid signed-in visit denominator. If signed-in bounced visits are zero but the denominator is missing or zero, the UI must show `Unavailable` or `No sample`, not `0%`.

## UI Rule

The main UI uses short plain English. Do not say `semantic engine`, `GA totals minus identified first-party traffic`, or `consented guest semantic batches did not land` in visible copy. Put formulas and full source details in Admin Debug.

Do not render a giant empty chart. If chart series are unavailable or non-informative, collapse the chart and show a compact status row.

Approved labels: LIVE, EST, STALE, WAIT, PARTIAL, ERROR, NO SAMPLE. Badges must stay inside cards.

Fake zeros are forbidden. Unknown guest quality must remain unavailable.

Future agents must not render giant empty charts or present unknown guest quality as a metric card.

Official references:
- [Firebase Analytics events](https://firebase.google.com/docs/analytics/events)
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export setup](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
