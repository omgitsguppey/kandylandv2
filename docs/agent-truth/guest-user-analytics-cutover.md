# Guest User Analytics Cutover

Status: canonical Phase 1 cutover for guest + identified behavioral truth.

## Doctrine

KandyDrops analytics is first-party first. Guest and identified behavior flow into one behavioral timeline with actor/target separation, source reliability, consent state, and confidence caps. Google Analytics is optional external evidence and cannot be required for product truth. Behavioral confidence is source-derived and outcome-aware.

## Canonical Contracts

- `src/lib/behavioral/behavioral-timeline-contract.ts`
- `src/lib/analytics/identity-link-contract.ts`
- `src/lib/analytics/google-analytics-source-policy.ts`
- `src/lib/behavioral/behavioral-confidence-v2.ts`
- `src/lib/behavioral/guest-user-behavior-contract.ts`

## Runtime Writers

- Guest ingest writes timeline facts: `src/app/api/analytics/ingest/route.ts`
- Identified ingest writes timeline facts: `src/app/api/analytics/ingest-identified/route.ts`
- Identity linking: `src/lib/server/analytics-identity-linking.ts`
- Rollups: `src/lib/server/guest-user-behavior-rollup.ts`

## Guardrails

- GA4 is optional evidence only; missing GA must not fail canonical truth.
- Privacy-limited paths must be labeled `privacy_limited`, not forced into dormant/low-engagement outcomes.
- Low-value hover/visibility/page-leave events are diagnostic-only and must not inflate confidence.
- Page duration is diagnostic and is never watch truth.
