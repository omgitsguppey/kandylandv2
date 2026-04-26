Verification plan

Matched paths: src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx
Broad work: yes
Touched domains: admin_ops, app_routes

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx  # Run the narrowest related contract/unit tests first.
- npm run check:ui:coverage  # Indexed UI/admin surfaces changed.
- npm run check:ui:runtime  # Hydration/runtime UI continuity should stay truthful.
- npm run check:telemetry  # Telemetry or analytics semantics changed.
- npm run check:analytics-semantics  # Canonical analytics naming/schema must remain aligned.

Signoff loop:
- npm run check:ui:audits  # UI/admin signoff requires Playwright audit coverage.
- npm run check:analytics:continuity  # Analytics continuity needs explicit signoff for behavioral/runtime changes.
- npm run check:continuity  # Broad/shared/helper/tooling work requires continuity signoff.

Advisories:
- Run `npm run check:ui:lighthouse` only if the touched UI change affects loading, rendering, or performance-sensitive behavior.
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts
