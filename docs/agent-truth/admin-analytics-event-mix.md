# Admin Analytics Event Mix

Event Mix shows which events drove activity in the selected range. It should be a compact ranked list, not a large vertical bar chart with slanted labels.

## Count Modes

The default operator view is event activity. Debug may call the technical denominator raw event count because it counts every occurrence, including repeats from the same actor or session. Unique user and unique session counts may only be shown when the source explicitly provides them.

Event share is `event count / total counted events in the selected range`. If the denominator is unavailable, do not show a share percentage.

## Sources

Source hierarchy is first-party telemetry, GA4 daily stable export, GA4 intraday live-ish export, backend snapshot, then stale cache. GA4 intraday data can be incomplete. Firebase Analytics events are batched in normal use and DebugView is near-realtime validation only.

The current Event Mix UI uses verified snapshot event activity when available and marks delayed/cache/saved-data state in Debug.

## Context

Component or surface context must be labeled separately from event counts. `0 surfaces` is forbidden unless mapping ran successfully and found zero. If context did not hydrate, the UI must say `Surface context is unavailable for this range.`

Readable display labels belong in the UI. Raw event keys remain available in Debug technical evidence.

## UI Rule

Mobile should use ranked rows with count, share, mini bar, and surface/context status. Do not reintroduce the giant slanted-label bar chart or giant empty Component Context panel.

Approved visible badges: LIVE, UPDATED, REFRESHING, DELAYED, EST, PARTIAL, WAIT, REVIEW, ERROR, SNAP. Badges must stay inside their containers.

Fake zeros are forbidden. Missing event data should show Collecting activity, No verified data yet, or Unavailable.

Future agents must not reintroduce the giant slanted-label bar chart or giant empty Component Context panel.

Official references:
- [Firebase Analytics events](https://firebase.google.com/docs/analytics/events)
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)

## Phase 5 Snapshot Migration

Event Mix reads the Admin Analytics snapshot registry first and uses compact ranked event-activity rows rather than a giant bar chart. Surface context may show a short unavailable state, but `0 surfaces` is forbidden unless mapping actually ran. Admin Debug owns raw keys, share denominators, mapping source, missing mappings, context hydration state, source freshness, and fake-zero prevention.
- [GA4 BigQuery export setup](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
