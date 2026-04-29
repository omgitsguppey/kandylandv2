Verification plan

Matched paths: src/lib/ai-drop-covers.ts, src/lib/server/ai-drop-covers.ts, src/components/Admin/AiDropCoverGeneratorPanel.tsx, src/components/Admin/CreateDropModal.tsx, src/app/admin/ai/page.tsx, src/lib/server/ai-drop-descriptions.ts
Broad work: yes
Touched domains: admin_ops, ai_admin, app_routes, shared_server_helpers

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- src/lib/ai-drop-covers.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- src/lib/server/ai-drop-covers.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- src/components/Admin/AiDropCoverGeneratorPanel.tsx  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- src/components/Admin/CreateDropModal.tsx  # Run the narrowest related contract/unit tests first.
- npm run check:ui:coverage  # Indexed UI/admin surfaces changed.
- npm run check:ui:runtime  # Hydration/runtime UI continuity should stay truthful.

Signoff loop:
- npm run check:ui:audits  # UI/admin signoff requires Playwright audit coverage.
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
