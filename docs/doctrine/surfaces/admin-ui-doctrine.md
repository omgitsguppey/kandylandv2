# Admin UI Doctrine

Authority: primary surface doctrine for admin routes, admin diagnostics, admin analytics, moderation, support queues, AI tooling, and operational triage surfaces.

## Priority

Admin UI prioritizes truth, speed, density, triage, evidence, source state, freshness, confidence, and safe action targeting.

## Rules

- Apply the current whole-site visual direction from Shared Brand Primitives. Admin composition starts with the task, selected record and necessary operational context. Use compact readable lists, grouped controls and summary-first data; source evidence remains accessible in its existing drilldown owner.
- Navigation must expose every authorized workspace on phone, tablet and desktop without horizontal page overflow. Do not compress the twelve workspaces into tiny or unlabeled tab targets. Use the same route registry for compact workspace selection and wider navigation.
- Avoid repeated decorative mastheads and per-row truth-badge sprawl. Use one compact freshness/source line where the canonical contract permits; retain distinct warnings, confidence and safety states where they change the operator's decision.

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
