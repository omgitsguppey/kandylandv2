# KandyDrops

KandyDrops is governed by a compact doctrine hierarchy. This README is a gateway, not the canonical doctrine body.

## Doctrine Gateway

Read in this order:

1. [Control Tower Start](./control-tower/00-START-HERE.md)
2. [Doctrine Registry](./agent/context/doctrine-registry.json)
3. [Compact Doctrine Cards](./agent/context/doctrine-cards.jsonl)
4. [Product Constitution](./docs/doctrine/00-product-constitution.md)
5. [Source-of-Truth Constitution](./docs/doctrine/01-source-of-truth-constitution.md)
6. [Engineering Constitution](./docs/doctrine/02-engineering-constitution.md)
7. [Surface Doctrine Cards](./docs/doctrine/surfaces/README.md)
8. [Doctrine Hierarchy Explainer](./docs/agent-truth/doctrine-hierarchy.md)

Agents and human contributors should read compact context first, then the relevant surface doctrine, then full historical Markdown only when needed.

## Authority Summary

- Level 1: Product Constitution.
- Level 2: Source-of-Truth Constitution.
- Level 3: Engineering Constitution.
- Level 4: Surface doctrine cards.
- Level 5: Runbooks and ADRs.
- Level 6: Generated reports as snapshots, not doctrine.
- Level 7: Legacy docs with superseded-by and phase-out metadata.

## Required Checks For Doctrine Changes

```bash
npm run score:doctrine
npm run check:doctrine
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
