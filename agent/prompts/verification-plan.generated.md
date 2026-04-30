Verification plan

Matched paths: src/lib/server/admin-panel-system-logs.ts, src/app/api/admin/debug/route.ts, tests/unit/admin-panel-system-logs.spec.ts
Broad work: yes
Touched domains: admin_ops, app_routes, shared_server_helpers

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- src/lib/server/admin-panel-system-logs.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- src/app/api/admin/debug/route.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- tests/unit/admin-panel-system-logs.spec.ts  # Run the narrowest related contract/unit tests first.
- npm run check:ui:coverage  # Indexed UI/admin surfaces changed.
- npm run check:ui:runtime  # Hydration/runtime UI continuity should stay truthful.

Signoff loop:
- npm run check:ui:audits  # UI/admin signoff requires Playwright audit coverage.
- npm run check:continuity  # Broad/shared/helper/tooling work requires continuity signoff.

Advisories:
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts
