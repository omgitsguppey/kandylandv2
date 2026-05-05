# Environment Contract

KandyDrops environment configuration must be explicit, scoped, and safe for contractors.

## Rules

- `.env.example` contains variable names and safe comments only.
- Real `.env` files, service account keys, PayPal secrets, webhook secrets, private keys, OAuth secrets, and provider tokens are never committed.
- Client variables must use `NEXT_PUBLIC_` only when the value is safe for browsers.
- Server/admin variables must stay server-only and must not be exposed to client bundles.
- Contractors receive least-privilege environment access for their assigned surface only.

## Groups

- Firebase public config: browser-safe Firebase app identifiers.
- Firebase admin/server config: service identity and server-only Firebase settings.
- PayPal sandbox/live: checkout and capture configuration.
- PostHog/analytics: product analytics and GA Data API settings.
- Google/BigQuery/Data Connect: agent mirror and cost-bearing data plane settings.
- App URLs: public and server base URLs.
- Feature flags: runtime gates for staged or admin-only behavior.
- AI flags: admin AI enablement, model alias, budget, and location.

## Change Policy

- PRs that add, remove, or rename env variables must update `.env.example`, this document, and the PR template env section.
- Payment, auth, Firebase, Google cost, Data Connect/Cloud SQL, and AI env changes require CODEOWNER approval.
- Production values are provisioned outside Git and rotated if exposed.
