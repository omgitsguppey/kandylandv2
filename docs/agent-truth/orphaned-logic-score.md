# Orphaned Logic Score

Status: deterministic stale-artifact and orphaned-logic audit guard  
Report artifact: `agent/state/orphaned-logic-score.generated.json`  
Scorer: `npm run score:orphans`  
Validator: `npm run check:orphaned-logic`

## Doctrine

KandyDrops orphaned logic scoring is deterministic and source-only. It exists to reduce stale duplicate PR logic, deprecated route/modal ownership, duplicate truth helpers, broken generated audit chunks, stale docs, wrong GumDrops vocabulary, obsolete realtime patterns, duplicate telemetry intent names, and dead imports without relying on browser audits. It may propose exact cleanup only when the evidence is deterministic; product behavior changes, route deletion, component deletion, telemetry renaming, and ambiguous doctrine conflicts must be escalated.

KandyDrops legacy phaseout is a hardcoded registry. Orphan scoring now treats `src/lib/legacy/legacy-registry.ts` and `docs/agent-truth/legacy-phaseout.md` as the owner for phase-out deadlines, blocked references, allowed fallback paths, and canonical replacements.

## Rules

- Duplicate normalizers or exported truth helpers with the same name must become one canonical owner plus documented adapters.
- `DropPreviewModal` is legacy fallback only. Locked Drop preview ownership belongs to the full-page `/drops/[id]/preview` route.
- `/drops?drop=` is legacy handoff only. It must not become the primary modal preview flow again.
- Duplicate useDrops optimization notes and duplicate bot PR audit chunks should not spread across generated docs.
- Broken template text such as unresolved placeholders is stale generated evidence and should be removed only when the duplicate chunk is exact.
- Unused route handlers after migration should be escalated, not deleted automatically.
- Stale docs must not contradict current doctrine for full-page locked preview, mobile shell tokens, GumDrops vocabulary, or hot-cache admin truth.
- Old visible wallet paid/bonus row subcopy is stale. Wallet package cards use compact public-beta density while backend source-of-funds truth stays explicit.
- Old `Coins`, `Tokens`, or `Credits` vocabulary is allowed only when explicitly documenting forbidden substitutes.
- The chat floating action offset must resolve through the shared bottom-nav-safe token, not a hardcoded `0px` value.
- Support route expectations must use nested `support_messages` under `support_threads`; admin routes may list/read/reply globally while user routes stay owner-scoped.
- Admin analytics direct realtime/timer logic must be reviewed against the current hot-cache doctrine.
- Duplicate telemetry events with the same intent require catalog and validator review before any rename.
- Dead imports in public beta surfaces are cleanup candidates only after TypeScript confirms they are unused.
- Legacy phase-out registry ownership and deadlines must stay current so deprecated logic cannot become canonical without a registry update.

## Autofix

Autofix plans are suggestions only in this lane. Do not delete route files or components without an explicit deprecated marker and owner approval. Safe cleanup may be considered only for exact unused imports after `npm run typecheck` confirms they are unused, or exact duplicate broken doc chunks that contain no unique source-of-truth content. Anything affecting product behavior, telemetry semantics, route ownership, locked content, auth, payment, or creator eligibility must be escalated.

## Verification

Allowed targeted commands:

- `npm run score:orphans`
- `npm run check:orphaned-logic`
- `npm run score:legacy-phaseout`
- `npm run check:legacy-phaseout`
- `npm run typecheck` only because the scorer and validator are TypeScript files

Forbidden by default:

- Playwright
- Cypress
- Lighthouse
- full `npm run check`
- broad UI audits
