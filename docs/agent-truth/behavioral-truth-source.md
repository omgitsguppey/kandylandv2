# Behavioral Truth Source

Status: canonical behavioral hierarchy
Last updated: 2026-05-04

## Doctrine

Admin metrics, User Management, admin user detail, behavioral recommendations, moderation, and behavioral intelligence must use one truth hierarchy instead of inventing per-surface source labels.

Canonical source order:

1. `materialized_rollup` wins when it is fresh for the surface.
2. `event_facts` take over when rollups are stale or missing.
3. `user_profile_fields` may fill identity or profile gaps only.
4. `live_fallback` is allowed for temporary runtime cards and must stay labeled.
5. `legacy_fallback` is last resort and must stay labeled.
6. Missing data hides production cards, but diagnostics must explain which source is absent.

## Freshness Windows

- `admin_metrics`: 5 minutes
- `user_detail_behavior`: 30 minutes
- `recommendation_profile`: 24 hours
- `strategic_analytics`: 72 hours

Anything older is `stale` or `degraded`, never `live`.

## Confidence Formula

Behavioral confidence is deterministic and explainable:

`sourceAgreement = agreeingSources / availableSources`

`freshnessScore = max(0, 1 - ageMs / maxFreshnessMs)`

`sampleScore = min(1, log10(sampleCount + 1) / 3)`

`schemaScore = requiredFieldsPresent / requiredFieldsTotal`

`issuePenalty = min(0.6, issueCount * 0.12)`

`confidence = clamp01(0.35 * sourceAgreement + 0.25 * freshnessScore + 0.25 * sampleScore + 0.15 * schemaScore - issuePenalty)`

Labels:

- `insufficient`: 0-29
- `low`: 30-49
- `usable`: 50-74
- `strong`: 75-89
- `verified`: 90-100

## UI Rules

- No `LIVE` badge unless the source is fresh and confidence is at least `usable`.
- No error badge if a valid stale value still exists.
- Production cards should collapse or hide when confidence is below threshold.
- Diagnostics must expose source, freshness, confidence, and issues even when production cards stay hidden.
- No card should render `[unavailable]` as the value itself.

## Required Surfaces

- `src/lib/server/admin-user-metrics-snapshot.ts`
- `src/lib/server/user-behavior-rollup.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/user/[userId]/route.ts`
- `src/app/admin/users/page.tsx`
- `src/app/admin/user/[userId]/page.tsx`
- `functions/src/behavioral-intelligence-runtime.ts`

## Validation

Run:

- `npm run check:behavioral-truth-source`

This validator exists to catch drift in freshness thresholds, source hierarchy, confidence math, watch-session-first sourcing, fallback labeling, and low-confidence production-card spam before broader analytics QA.
