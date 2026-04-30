# Admin Analytics Event Mix

Event Mix shows which events drove activity in the selected range. It should be a compact ranked list, not a large vertical bar chart with slanted labels.

## Count Modes

The default mode is raw event count. Raw events count every occurrence, including repeats from the same actor or session. Unique user and unique session counts may only be shown when the source explicitly provides them.

Event share is `event count / total counted events in the selected range`. If the denominator is unavailable, do not show a share percentage.

## Sources

Source hierarchy is first-party telemetry, GA4 daily stable export, GA4 intraday live-ish export, backend snapshot, then stale cache. GA4 intraday data can be incomplete. Firebase Analytics events are batched in normal use and DebugView is near-realtime validation only.

The current Event Mix UI uses source-labeled backend snapshot raw counts when available and marks stale/cache/fallback state in Debug.

## Context

Component or surface context must be labeled separately from raw event counts. `0 surfaces` is forbidden unless mapping ran successfully and found zero. If context did not hydrate, the UI must say `Surface context unavailable for this range.`

Readable display labels belong in the UI. Raw event keys remain available in Debug.

## UI Rule

Mobile should use ranked rows with count, share, mini bar, and surface/context status. Do not reintroduce the giant slanted-label bar chart or giant empty Component Context panel.

Approved badges: RAW, LIVE, STALE, GA, FIRST, MIXED, WAIT, ERROR. Badges must stay inside their containers.

Fake zeros are forbidden. Missing event data should show Waiting or Unavailable.

Future agents must not reintroduce the giant slanted-label bar chart or giant empty Component Context panel.

Official references:
- [Firebase Analytics events](https://firebase.google.com/docs/analytics/events)
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)
- [GA4 BigQuery export setup](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
