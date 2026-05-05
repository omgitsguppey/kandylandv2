# Admin UI Doctrine

Authority: primary surface doctrine for admin routes, admin diagnostics, admin analytics, moderation, support queues, AI tooling, and operational triage surfaces.

## Priority

Admin UI prioritizes truth, speed, density, triage, evidence, source state, freshness, confidence, and safe action targeting.

## Rules

- Compact card grids are allowed when they improve triage.
- Truth badges are required for live, cached, stale, fallback, partial, failed, unknown, degraded, and unavailable states.
- Missing, stale, degraded, failed, fallback, or unavailable data must be explicit.
- Metrics must show source, freshness, confidence, and target where relevant.
- Admin tables are allowed when they are useful, responsive, and more scannable than cards.
- Raw JSON is collapsed by default.
- Admin actions must show risk, target, status, and expected consequence.
- Admin projection and owner actions must be labeled and excluded from user behavior metrics.

## Must Not

- Do not show fake healthy states.
- Do not hide missing source truth behind green cards.
- Do not reuse user conversion density or playful copy when evidence or safety state is required.
- Do not let local-only projection count as live user, creator, revenue, unlock, or engagement behavior.

## Applies To

- `/admin/**`, admin route components, admin support/moderation queues, admin analytics, admin debug, admin AI, admin creator projection, and admin-only operational components.

## Validators

- `check:surface-doctrine-split`
- `check:admin-truth`
- `check:admin-debug-control-tower`
- `check:admin-projection-analytics-exclusion`
- `check:human-readable-admin-copy`
