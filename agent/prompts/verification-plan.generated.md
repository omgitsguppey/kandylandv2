Verification plan

Matched paths: src/context/AdminViewAsContext.tsx
Broad work: no
Touched domains: (none)

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- src/context/AdminViewAsContext.tsx  # Run the narrowest related contract/unit tests first.

Signoff loop:
- No signoff commands selected.

Advisories:
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts
