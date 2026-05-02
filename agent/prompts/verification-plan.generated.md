Verification plan

Matched paths: src/components/Creators/CreatorExperiencesPanel.tsx
Broad work: no
Touched domains: (none)

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- src/components/Creators/CreatorExperiencesPanel.tsx  # Run the narrowest related contract/unit tests first.
- npm run check:ui:coverage  # Indexed UI/admin surfaces changed.
- npm run check:ui:runtime  # Hydration/runtime UI continuity should stay truthful.

Signoff loop:
- npm run check:ui:audits  # UI/admin signoff requires Playwright audit coverage.

Advisories:
- Run `npm run check:ui:lighthouse` only if the touched UI change affects loading, rendering, or performance-sensitive behavior.
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts
