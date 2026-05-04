# Admin User Behavior Truth

Status: deterministic regression gate
Last updated: 2026-05-04

## Doctrine

Admin User Management and admin user detail must tell the same story about user metrics, watch time, behavior rollups, action history, and truth-state badges.

The admin user surfaces are allowed to load in lanes, but they are not allowed to drift:

- summary metrics come from the canonical admin user metrics snapshot
- overview and User Management stay on the same snapshot contract
- behavioral truth source order is shared: `materialized_rollup` -> `event_facts` -> `user_profile_fields` -> `live_fallback` -> `legacy_fallback`
- compact metric cards keep the last usable value visible when freshness degrades
- per-user behavior comes from the canonical user behavior rollup
- watch time prefers watch-session rollups and labels `legacy_page_duration` when fallback is used
- engagement score is canonical and verdict-first: unwraps, valid watch time, purchases, repeat visits, meaningful actions, then low-weight free-GD intent
- behavioral recommendations collapse to `Insufficient signal` when confidence is not high enough
- action ledger rows use normalized user-action taxonomy, not raw random event names
- truth badges follow the shared doctrine: `live`, `refreshing`, `stale`, `degraded`, `failed`, `unavailable`, `delayed`, `review`

## Required Surfaces

- `src/app/admin/users/page.tsx`
- `src/app/admin/user/[userId]/page.tsx`
- `src/components/Admin/AdminStatsBar.tsx`
- `src/lib/server/admin-user-metrics-snapshot.ts`
- `src/lib/server/user-behavior-rollup.ts`
- `src/lib/server/watch-time-rollup.ts`
- `src/lib/admin-truth-state.ts`
- `src/components/Admin/AdminTruthBadge.tsx`

## Regression Rules

User Management must keep the compact grid marker and must not sprawl back into oversized full-width cards. Summary cards must not show giant `[unavailable]` values when the lane has no fresh snapshot yet; they should keep compact placeholders or last-known values and let the truth badge carry freshness.

Realtime transport issues must not erase usable values. If a summary snapshot exists and refresh fails, the page must stay `stale`, `degraded`, `review`, or `delayed` as appropriate. It must not flip a valid number into `ERROR` or `Unavailable`.

Watch time is not page-open duration. Admin summary totals, User Management cards, and user detail all derive watch-time truth from watch-session rollups first. Any fallback to route/page duration must be explicitly labeled `legacy_page_duration`.

Behavioral intelligence must not fill the admin detail page with deterministic zero-affinity spam. Low-signal states collapse to `Insufficient signal`, and fallback recommendations stay capped and labeled.

## Validation

Run:

- `npm run check:admin-user-behavior-truth`

This lane is deterministic and source-based. It is intended to catch admin metric drift, stats-grid regressions, watch-time detachment, truth-badge drift, and low-value behavioral spam before broader admin QA.
