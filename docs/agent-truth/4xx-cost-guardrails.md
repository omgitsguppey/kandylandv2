# 4xx Cost Guardrails

Status: canonical source-only guardrail for high-volume 4xx traffic.

## Doctrine

KandyDrops treats 4xx traffic as a cost surface. Common 4xx paths must be cheap, typed, deduped, and cache-aware where safe. Bad requests, bot probes, stale legacy paths, missing entitlement, and unsupported analytics traffic must not trigger expensive rendering, avoidable Firestore reads, or unlimited logging.

## Canonical Modules

- `src/lib/server/http-error-cost-contract.ts`
- `src/lib/server/cheap-4xx-response.ts`
- `src/lib/server/route-4xx-classifier.ts`
- `src/lib/server/route-4xx-dedupe.ts`

## Runtime Controls

- Middleware short-circuits known probe and legacy paths with cheap 4xx responses.
- Request guard performs cheap checks first: method -> body size -> content type -> auth header presence.
- Analytics ingest routes enforce cheap method/body/content-type prechecks before heavy logic.
- 4xx response payloads are typed and minimal.

## Reporting

Generated report:
- `agent/state/4xx-cost-guardrails.generated.json`

Score lane:
- `npm run score:4xx-cost`
- `npm run check:4xx-cost`
