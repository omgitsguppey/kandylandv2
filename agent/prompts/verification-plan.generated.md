Verification plan

Matched paths: src/components/PurchaseModal.tsx
Broad work: no
Touched domains: (none)

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- src/components/PurchaseModal.tsx  # Run the narrowest related contract/unit tests first.
- npm run check:ui:coverage  # Indexed UI/admin surfaces changed.
- npm run check:ui:runtime  # Hydration/runtime UI continuity should stay truthful.
- npm run check:payment-unlock-security  # Payment/unlock/economy source truth is protected.
- npm run check:purchase-telemetry-truth  # Purchase telemetry must remain source-truth aligned.
- npm run check:unlock-telemetry-truth  # Unlock telemetry must remain source-truth aligned.

Signoff loop:
- npm run check:ui:audits  # UI/admin signoff requires Playwright audit coverage.
- npm run check:legal-payment-copy  # Payment-adjacent user-facing copy/legal state needs signoff.

Advisories:
- Run `npm run check:ui:lighthouse` only if the touched UI change affects loading, rendering, or performance-sensitive behavior.
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Protected-domain escalations:
- payment_economy_unlock: do not weaken source-of-funds, entitlement, provider callback, or locked content truth.

Manual evidence requirements:
- payment_provider: PayPal/provider success requires formal external smoke evidence, not source-only checks.

Forbidden by default:
- npm run check
- npm run check:ui:audits
- npm run check:ui:lighthouse
- npm run check:ui:omni
- npx cypress run
- playwright
- cypress
- lighthouse
- firebase deploy
- gcloud
- provider API calls

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts
