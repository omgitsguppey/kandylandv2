# Admin Analytics Journey Funnel

Journey Funnel is only an ordered funnel when the data proves ordered steps by actor or session within the selected range. If the surface only has repeated event counts, it must be labeled as an Event Chain or raw event view.

## Count Modes

Raw events count every event occurrence. They can include repeats, retries, duplicate actions, imported payment records, and multiple actions by the same actor.

Unique users count distinct identified actors. Unique sessions count distinct sessions. Ordered journeys count actors or sessions that advanced through the steps in order.

The UI may call the section a Journey Funnel only when ordered transition counts exist. Without ordered transitions, percentages are directional raw-event ratios.

## Percentages

The current compact Event Chain uses prior-step raw ratios. The base row is the first step in the displayed chain and its denominator is itself.

If a later step exceeds a prior step, the mode must not be ordered. This is allowed for raw events, but the UI must say that repeated or mixed event sources are being counted and Debug must list `nonSequentialSteps`.

Purchases can exceed checkout starts when purchase records come from a different source, repeated purchases are included, checkout starts are missing, or ranges/sources disagree. That must be exposed as `sourceMismatchSteps`.

## Onboarding Comparison

Journey Funnel auth/signup counts may differ from onboarding velocity or step-flow stats because those modules may use different source facts and recovery paths. Large differences must be exposed in Admin Debug, not hidden.

## UI Rule

The section must be compact on mobile: small summary tiles, short step rows, short mode/status labels, and thin progress bars. Do not render huge repeated degraded badges on every row when one section-level status already explains the mode.

Approved visible labels: LIVE, STALE, RAW, UNIQUE, ORDERED, MIXED, WAIT, ERROR.

Fake zeros are forbidden. When the source is unavailable, show Waiting or Unavailable instead of zero.

Future agents must not display raw event ratios as ordered conversion.

Official references:
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
