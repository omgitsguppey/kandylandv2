# Orphaned Logic Score

Status: deterministic stale-artifact and orphaned-logic audit guard  
Report artifact: `agent/state/orphaned-logic-score.generated.json`  
Scorer: `npm run score:orphans`  
Validator: `npm run check:orphaned-logic`

## Doctrine

KandyDrops orphaned logic scoring is deterministic and source-only. It exists to reduce stale duplicate PR logic, deprecated route/modal ownership, duplicate truth helpers, broken generated audit chunks, stale docs, wrong GumDrops vocabulary, obsolete realtime patterns, duplicate telemetry intent names, and dead imports without relying on browser audits. It may propose exact cleanup only when the evidence is deterministic; product behavior changes, route deletion, component deletion, telemetry renaming, and ambiguous doctrine conflicts must be escalated.

## Rules

- Duplicate normalizers or exported truth helpers with the same name must become one canonical owner plus documented adapters.
- `DropPreviewModal` is legacy fallback only. Locked Drop preview ownership belongs to the full-page `/drops/[id]/preview` route.
- Duplicate useDrops optimization notes and duplicate bot PR audit chunks should not spread across generated docs.
- Broken template text such as unresolved placeholders is stale generated evidence and should be removed only when the duplicate chunk is exact.
- Unused route handlers after migration should be escalated, not deleted automatically.
- Stale docs must not contradict current doctrine for full-page locked preview, mobile shell tokens, GumDrops vocabulary, or hot-cache admin truth.
- Old `Coins`, `Tokens`, or `Credits` vocabulary is allowed only when explicitly documenting forbidden substitutes.
- Admin analytics direct realtime/timer logic must be reviewed against the current hot-cache doctrine.
- Duplicate telemetry events with the same intent require catalog and validator review before any rename.
- Dead imports in public beta surfaces are cleanup candidates only after TypeScript confirms they are unused.

## Autofix

Autofix plans are suggestions only in this lane. Do not delete route files or components without an explicit deprecated marker and owner approval. Safe cleanup may be considered only for exact unused imports after `npm run typecheck` confirms they are unused, or exact duplicate broken doc chunks that contain no unique source-of-truth content. Anything affecting product behavior, telemetry semantics, route ownership, locked content, auth, payment, or creator eligibility must be escalated.

## Verification

Allowed targeted commands:

- `npm run score:orphans`
- `npm run check:orphaned-logic`
- `npm run typecheck` only because the scorer and validator are TypeScript files

Forbidden by default:

- Playwright
- Cypress
- Lighthouse
- full `npm run check`
- broad UI audits
