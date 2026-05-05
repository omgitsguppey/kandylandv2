# Watch-Time Doctrine

Authority level: 4

Owner: viewer/watch-time

## Must

- Count foreground visible content engagement, not page duration.
- Exclude hidden, idle, offscreen, or modal-covered intervals.
- Prefer watch-session rollups in behavioral intelligence.
- Label legacy page-duration fallback as legacy.

## Must Not

- Treat page duration as canonical watch time.
- Credit hidden tabs or idle sessions.
- Store raw content URLs in watch payloads.

## Source Truth

- Watch session helper, visibility state, playback state, server rollup.

## Validators

- `check:watch-time-truth`
- `check:watch-time-rollup-truth`
- `check:watch-time-truth-v2`
