# Watch-Time Rollup Truth

Canonical watch time comes from `analytics_watch_sessions.validWatchMs` records whose `watchScoreSource` is `watch_session_rollup`.

`watchSecondsTotal` is diagnostic context for older analytics rollups. It can support missing-watch diagnostics, but it must not populate canonical `watchTimeMs` unless a caller explicitly opts into and labels `legacy_page_duration`.

`diagnosticEstimate` is not canonical. It exists to explain likely missing engagement when views exist without valid watch-session rollups.

Legacy page duration is fallback only when `allowLegacyFallback === true`, and the resulting source must be `legacy_page_duration`.

Zero watch time is valid when no valid watch-session rollups exist. It is not fake missing data by itself; views plus zero valid watch time should surface `watch_time_missing_despite_views`.
