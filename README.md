# KandyDrops

KandyDrops is governed by a compact doctrine hierarchy. This README is a gateway, not the canonical doctrine body.

## Doctrine Gateway

Read in this order:

1. [Control Tower Start](./control-tower/00-START-HERE.md)
2. [Doctrine Registry](./agent/context/doctrine-registry.json)
3. [Compact Doctrine Cards](./agent/context/doctrine-cards.jsonl)
4. [Surface Doctrine Map](./agent/context/surface-doctrine-map.json)
5. [Product Constitution](./docs/doctrine/00-product-constitution.md)
6. [Source-of-Truth Constitution](./docs/doctrine/01-source-of-truth-constitution.md)
7. [Engineering Constitution](./docs/doctrine/02-engineering-constitution.md)
8. [Surface Hierarchy](./docs/doctrine/03-surface-hierarchy.md)
9. [Surface Doctrine Cards](./docs/doctrine/surfaces/README.md)
10. [Doctrine Hierarchy Explainer](./docs/agent-truth/doctrine-hierarchy.md)

Agents and human contributors should read compact context first, route the file through the surface-specific doctrine map, then read the relevant surface doctrine and feature card. Full historical Markdown is only for unresolved uncertainty.

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

## Required Checks For Doctrine Changes

```bash
npm run score:doctrine
npm run check:doctrine
npm run check:surface-doctrine-split
npm run typecheck
```

Do not run Playwright, Lighthouse, Cypress, deploys, or full `npm run check` by default for doctrine-only work.

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
