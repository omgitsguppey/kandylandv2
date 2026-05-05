# User Management Doctrine

Authority level: 4

Owner: admin user behavior truth

## Must

- Read normalized user facts for engagement and value.
- Exclude admin, owner, projection, and synthetic actions from user metrics.
- Show live, cached, stale, fallback, partial, failed, or unknown state honestly.
- Use hot-cache/materialized snapshots where realtime reads would create cost or truth drift.

## Must Not

- Show missing data as healthy.
- Calculate user metrics differently across admin panels.
- Count admin QA as user behavior.

## Source Truth

- Event facts, behavioral rollups, user metrics snapshot, admin user route.

## Validators

- `check:admin-user-behavior-truth`
- `check:user-engagement-score`
- `check:user-value-score`
- `check:admin-user-metrics-snapshot`
