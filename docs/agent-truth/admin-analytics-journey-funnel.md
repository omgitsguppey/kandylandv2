# Admin Analytics Journey Funnel

Journey Funnel is only an ordered funnel when the data proves ordered steps by actor or session within the selected range. If the surface only has repeated event counts, it must be labeled as an Event Chain. Raw event view is a Debug-only technical phrase.

## Count Modes

Debug raw events count every event occurrence. They can include repeats, retries, duplicate actions, imported payment records, and multiple actions by the same actor.

Unique users count distinct identified actors. Unique sessions count distinct sessions. Ordered journeys count actors or sessions that advanced through the steps in order.

The UI may call the section a Journey Funnel only when ordered transition counts exist. Without ordered transitions, percentages are directional event ratios.

## Percentages

The current compact Event Chain uses prior-step event ratios. The base row is the first step in the displayed chain and its denominator is itself.

Repeated event ratios are event-volume ratios, not user conversion. Operator copy must say "event volume" or "activity volume" unless ordered actor/session proof exists.

If a later step exceeds a prior step, the mode must not be ordered. This is allowed for repeated event counts, but the UI must say that some steps need review and Debug must list `nonSequentialSteps`.

Purchases can exceed checkout starts when purchase records come from a different source, repeated purchases are included, checkout starts are missing, or ranges/sources disagree. That must be exposed as `sourceMismatchSteps`.

## Onboarding Comparison

Journey Funnel auth/signup counts may differ from onboarding velocity or step-flow stats because those modules may use different source facts and recovery paths. Large differences must be exposed in Admin Debug, not hidden.

## UI Rule

The section must be compact on mobile: small summary tiles, short step rows, short mode/status labels, and thin progress bars. Do not render huge repeated degraded badges on every row when one section-level status already explains the mode.

Approved operator copy:
- "Repeated event-volume chain. Not a unique-user funnel."
- "This is event volume, not a sequential conversion funnel. Counts can exceed earlier steps when users repeat actions."
- "Largest event-volume decrease"
- "True user funnel unavailable until unique actor/session chain is computed."

Approved visible labels: LIVE, UPDATED, REFRESHING, DELAYED, EST, PARTIAL, WAIT, REVIEW, ERROR, SNAP.

Fake zeros are forbidden. When the source is unavailable, show Waiting for first snapshot, No verified data yet, or Unavailable instead of zero.

Future agents must not display raw event ratios as ordered conversion or primary operator copy.

Official references:
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)

## Phase 5 Snapshot Migration

Journey Funnel/Event Chain reads the Admin Analytics snapshot registry first and labels its count mode before showing percentages. Ordered, unique user, unique session, raw event, and mixed/degraded technical modes must not be conflated. If later steps exceed earlier steps, the visible UI must classify the module as partial or needing review, while Debug stores denominators, non-sequential steps, source mismatches, and parity proof.
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
