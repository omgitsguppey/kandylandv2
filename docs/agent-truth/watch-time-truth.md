# Watch Time Truth

Status: Public beta analytics doctrine and validation lane
Last updated: 2026-05-04

## Doctrine

Watch time is foreground visible content engagement, not page duration. KandyDrops must count only active, visible, or playing intervals, exclude hidden and idle time, score image and video content differently, label legacy fallbacks, and feed behavioral intelligence from watch-session rollups before page duration.

Literal truth is now split by media type:

- video watch time equals actual foreground visible playback time
- image watch time equals foreground visible image-in-view time

Estimated watch time is diagnostics-only. It must never be blended into verified production watch time without an explicit estimate label and capped confidence.

Moderation may use watch-time mismatch as one scrape-risk signal, but weak visibility/blur events alone do not justify action. KandyDrops moderation must never pretend browser/PWA screenshot detection is confirmed. Screenshot-like events are weak heuristic context unless confirmed by a real platform/server source.

## Canonical Events

Viewer watch tracking owns these deterministic session events:

- `watch_session_started`
- `watch_session_visible_tick`
- `watch_session_progress`
- `watch_session_paused`
- `watch_session_resumed`
- `watch_session_hidden`
- `watch_session_ended`
- `watch_score_computed`

Payloads must include `source_component`, `drop_id`, `watch_session_id`, media identity when available, valid watch time, visible/active/playing/hidden/idle timing, visibility state, idle state, score, tier, and reason codes. Telemetry enrichment continues to attach allowed session, route, auth, and consent-aware identity fields.

## Counting Rules

Start a watch session only when the viewer route is active, a drop id exists, viewer content is mounted and loaded, the content container is at least 50 percent visible, the document is visible, and analytics consent allows the event lane.

Count watch time only while the document is visible, the content remains at least 50 percent visible, the viewer route still owns the session, modal overlays are not covering the viewer, and the user has not exceeded the active idle threshold. Video `playingMs` counts only while the video is playing and visible. Image watch credit requires foreground visible time and cannot complete from instant open.

Video valid watch time is the sum of intervals where the document is visible, the content is at least 50 percent visible, the media element is visible, playback is active, the user is not idle, and the viewer route still owns the session.

Image valid watch time is the sum of intervals where the document is visible, the content is at least 50 percent visible, the image is loaded, the user is not idle, and the viewer route still owns the session.

Do not count hidden tab time, route-leave time, offscreen content time, time before content load, modal-covered time, or idle time after threshold. Ticks must be coarse, currently 5 seconds, and flush on hidden, pagehide, route change, and unmount.

## Scoring

`src/lib/watch-time-scoring.ts` owns deterministic watch scoring:

- `none`: less than 1 second valid watch time
- `skim`: 1s to 4.9s
- `viewed`: at least 5s image, 10s video, or 20 percent video progress
- `engaged`: at least 10s image or 50 percent video progress
- `completed`: at least 15s image, image manual advance after at least 8s, 90 percent video progress, or explicit ended/completed state

The scorer returns `validWatchMs`, `visibleMs`, `activeMs`, `playingMs`, `completionCredit`, and reason codes. Hidden and idle time are recorded for audit but must not inflate the score.

## Storage And Behavioral Intelligence

`/api/viewer/watch-session` stores rollups in `analytics_watch_sessions`, `analytics_watch_assets`, and `analytics_watch_observations`. Rollups must not store raw internal content URLs.

Behavioral intelligence must prefer watch-session rollups and label that source as `watch_session_rollup`. If no watch session exists for legacy history, page duration can support a fallback only when labeled `legacy_page_duration` with lower confidence.

If views exist but verified watch time is zero, canonical rollups must emit `watch_time_missing_despite_views`. They may also attach a diagnostics-only estimate:

`estimatedWatchMs = min(viewerOpenMs, medianKnownWatchMsForMediaType * viewedFileCount, pageDurationMs * 0.6)`

Confidence caps for the diagnostics-only estimate:

- 25 percent if no watch-session events exist
- 40 percent if viewer sessions exist but media ticks are missing
- 60 percent if partial media ticks exist

Admin diagnostics may display that estimate. Production watch totals, user cards, and behavioral scoring must not silently merge it into verified watch time.

Within the broader behavioral truth hierarchy, watch-session rollups count as `event_facts` and must outrank any `legacy_fallback` page-duration recovery path.

## Validation

Use `npm run check:watch-time-truth-v2` plus the targeted watch scoring and watch-session route tests before broad audits. This lane is source and unit-test based; it must not require Playwright, Lighthouse, Cypress, high-frequency polling, or browser automation.

Admin user surfaces also consume this doctrine through `npm run check:admin-user-behavior-truth`. If User Management or admin user detail stops using watch-session rollups first, that validator must fail.

The canonical user engagement score also depends on this truth. Its watch component uses valid watch minutes from watch-session-first rollups; it must not silently swap back to page-open duration.

## Admin Watch Truth Resolver

Admin reporting uses `resolveWatchTruth` semantics from `src/lib/deterministic-admin-truth.ts`: verified watch, estimated watch, and fallback watch remain separate. Exact quality requires no estimated/fallback watch and no unexplained raw gaps. Final totals may include estimates only when quality is mixed/estimated/review.
