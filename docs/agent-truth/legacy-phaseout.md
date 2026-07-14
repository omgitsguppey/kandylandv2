# Legacy Phaseout Registry

Status: deterministic legacy ownership and deadline registry
Registry: `src/lib/legacy/legacy-registry.ts`
Report: `agent/state/legacy-phaseout.generated.json`
Scorer: `npm run score:legacy-phaseout`
Validator: `npm run check:legacy-phaseout`

## Doctrine

KandyDrops legacy phaseout is a hardcoded registry. Old, simulative, deprecated, or blocked logic must have an owner, canonical replacement, allowed references, blocked references, review deadline, and remove deadline. Old systems cannot silently become canonical again; they need an explicit registry update and owner-approved replacement path.

The scorer is source-only. It does not run browser audits, does not mutate product behavior, and does not delete legacy code. It turns phaseout risk into deterministic debt and next actions.

## Scoring

`legacyDebtScore = sum(stagePenalty * riskWeight * overdueMultiplier)`

Stage penalty:

- `documented`: 5
- `guarded`: 3
- `redirected`: 2
- `unused`: 1
- `removed`: 0

Overdue multiplier:

- before `reviewBy`: 1
- after `reviewBy`: 1.5
- after `removeBy`: 3

Blocked but referenced is critical. A critical finding means a blocked or non-canonical legacy reference appeared in runtime source outside its allowed references. In validator language: blocked but referenced is critical.

## Initial Registry

- `drop-preview-modal-fallback`: `DropPreviewModal` is allowed fallback only. Canonical replacement is the full-page locked Drop preview route.
- `drops-query-modal-flow`: `/drops?drop` is redirect/handoff only and must not restore modal-first preview ownership.
- `synthetic-view-as-local-projection`: unsafe synthetic/simulative semantics are blocked and removed. Canonical admin creator projection is read-only/local, identifies the Admin actor and target creator, excludes user behavior, and delegates that precise exclusion to `check:admin-projection-analytics-exclusion`.
- `old-moderation-screenshot-certainty`: blocked. Canonical replacement is theft-risk scoring and evidence-weighted scrape-risk scoring.
- `admin-users-realtime-route`: guarded until admin user hot-cache/materialized snapshot replacement fully owns the route.
- `old-wallet-total-only-balance-chip`: blocked. Canonical replacement is source-aware free GD and paid GD display.
- `old-green-bonus-chips`: blocked. Canonical replacement is brand-purple bonus chip doctrine.
- `notification-opened-read-score-split`: blocked. Canonical behavioral action is `notification_read`; opened/clicked remain diagnostics.
- `admin-support-realtime-queue`: allowed fallback while support route truth and debug evidence remain the canonical support recovery path.

## Validation

`npm run check:legacy-phaseout` fails when:

- A blocked legacy reference appears in runtime source outside `allowedReferences`.
- Canonical runtime source imports blocked legacy.
- Registry item ids are duplicated or required initial items are missing.
- Registry items lack owner, replacement, dates, allowed references, or blocked references.
- Generated report is missing or does not match the registry.
- Legacy docs or governance ledgers do not mention this hardcoded registry.

It warns when deprecated or remove-by-deadline items lack phaseout dates.

## Commands

Allowed targeted commands:

- `npm run score:legacy-phaseout`
- `npm run check:legacy-phaseout`
- `npm run score:orphans`
- `npm run check:orphaned-logic`
- `npm run typecheck`

Forbidden by default:

- Playwright
- Cypress
- Lighthouse
- full `npm run check`
- broad UI audits
