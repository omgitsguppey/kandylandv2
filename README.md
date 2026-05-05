# KandyDrops

KandyDrops is governed by a compact doctrine hierarchy. This README is a gateway, not the canonical doctrine body.

## Doctrine Gateway

Read in this order:

1. [Control Tower Start](./control-tower/00-START-HERE.md)
2. [Optimized Task Context](./agent/context/optimized-task-context.generated.json)
3. [Doctrine Registry](./agent/context/doctrine-registry.json)
4. [Compact Doctrine Cards](./agent/context/doctrine-cards.jsonl)
5. [Surface Doctrine Map](./agent/context/surface-doctrine-map.json)
6. [Product Constitution](./docs/doctrine/00-product-constitution.md)
7. [Source-of-Truth Constitution](./docs/doctrine/01-source-of-truth-constitution.md)
8. [Engineering Constitution](./docs/doctrine/02-engineering-constitution.md)
9. [Surface Hierarchy](./docs/doctrine/03-surface-hierarchy.md)
10. [Surface Doctrine Cards](./docs/doctrine/surfaces/README.md)
11. [Doctrine Hierarchy Explainer](./docs/agent-truth/doctrine-hierarchy.md)

KandyDrops doctrine retrieval is an optimization problem. Agents should generate or read the smallest sufficient context pack first, route files through the surface-specific doctrine map, then read relevant surface doctrine and feature cards. Full historical Markdown is only for unresolved uncertainty.

## Authority Summary

- Level 1: Product Constitution.
- Level 2: Source-of-Truth Constitution.
- Level 3: Engineering Constitution.
- Level 4: Surface hierarchy, surface doctrine cards, and feature doctrine cards.
- Level 5: Runbooks and ADRs.
- Level 6: Generated reports as snapshots, not doctrine.
- Level 7: Legacy docs with superseded-by and phase-out metadata.

## Surface Doctrine Gateway

Use [agent/context/surface-doctrine-map.json](./agent/context/surface-doctrine-map.json) before editing UI, copy, telemetry, state, admin truth, or server truth. It routes files to User UI, Creator UI, Admin UI, Server Truth, Shared Brand Primitives, or Cross-Surface Contracts so surface-specific doctrine wins over generic layout assumptions.

- User UI: [docs/doctrine/surfaces/user-ui-doctrine.md](./docs/doctrine/surfaces/user-ui-doctrine.md)
- Creator UI: [docs/doctrine/surfaces/creator-ui-doctrine.md](./docs/doctrine/surfaces/creator-ui-doctrine.md)
- Admin UI: [docs/doctrine/surfaces/admin-ui-doctrine.md](./docs/doctrine/surfaces/admin-ui-doctrine.md)
- Server Truth: [docs/doctrine/surfaces/server-truth-doctrine.md](./docs/doctrine/surfaces/server-truth-doctrine.md)
- Shared Brand Primitives: [docs/doctrine/surfaces/shared-brand-primitives.md](./docs/doctrine/surfaces/shared-brand-primitives.md)

## Doctrine Retrieval Optimizer

Run `npm run optimize:doctrine-context -- --task "<task>" --changed <path>` to write [agent/context/optimized-task-context.generated.json](./agent/context/optimized-task-context.generated.json). The optimizer scores cards by path match, task intent, risk, authority, recency, and token cost, then selects the cheapest safe pack with validator coverage and conflict protection.

- Optimizer truth: [docs/agent-truth/doctrine-retrieval-optimizer.md](./docs/agent-truth/doctrine-retrieval-optimizer.md)
- Storage strategy: [docs/agent-truth/doctrine-storage-strategy.md](./docs/agent-truth/doctrine-storage-strategy.md)
- Global report: [agent/state/doctrine-retrieval-optimizer.generated.json](./agent/state/doctrine-retrieval-optimizer.generated.json)

## Required Checks For Doctrine Changes

```bash
npm run score:doctrine
npm run check:doctrine
npm run optimize:doctrine-context -- --task "wallet density fix" --changed src/components/PurchaseModal.tsx
npm run check:doctrine-retrieval-optimizer
npm run check:surface-doctrine-split
npm run typecheck
```

Do not run Playwright, Lighthouse, Cypress, deploys, or full `npm run check` by default for doctrine-only work.

## Global Cost Surfaces

KandyDrops global cost guardrails cover runtime telemetry, PostHog/GA/session replay, cloud logging, debug evidence, Firebase Storage/media proxy access, auth abuse, notification fan-out, CI/build minutes, visual/browser audit tooling, scheduled rebuilds, analytics materializers, dependency tooling, and admin import/export jobs.

Google cost-bearing surfaces must be declared before use.

- Contract: [src/lib/server/global-cost-surface-contract.ts](./src/lib/server/global-cost-surface-contract.ts)
- Report: [agent/state/global-cost-surfaces.generated.json](./agent/state/global-cost-surfaces.generated.json)
- Doctrine: [docs/agent-truth/global-cost-surfaces.md](./docs/agent-truth/global-cost-surfaces.md)
- Commands: `npm run score:global-cost` and `npm run check:global-cost`

## Contributor Gateway

- [Contributing](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Environment Contract](./docs/agent-truth/environment-contract.md)
- [Contractor Onboarding](./docs/agent-truth/contractor-onboarding.md)

## Beta Release Notes

KandyDrops Beta release notes are user-facing and update after every commit. The Beta badge beside the top nav title opens the last 5 app-style updates. Versioning uses MAJOR.MINOR.PATCH starting at 1.0.0. MAJOR never auto-increments. Effective non-generated diff size above 100 additions/deletions bumps MINOR and resets PATCH. Effective diff size of 100 or below bumps PATCH. Changelog copy must explain what changed for users, not dump technical commit noise.

- Public notes: [public/kandydrops-release-notes.json](./public/kandydrops-release-notes.json)
- Human changelog: [CHANGELOG.md](./CHANGELOG.md)
- Dev truth: [Public Beta Release Notes](./docs/agent-truth/public-beta-release-notes.md)
- Commands: `npm run release:notes` and `npm run check:release-notes`

## Current Rule

If a README sentence appears to conflict with a constitution, surface doctrine, registry entry, or verified runtime code, the README loses.
