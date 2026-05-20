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

## Current Operator Doctrine

Current Phase 1 operator doctrine lives at [docs/agent-truth/current-operator-doctrine.md](./docs/agent-truth/current-operator-doctrine.md). Future agents must follow it over older stale docs: no backend-only or UI-only fixes, no extra measurement limbs before tracing the current source path, no fake live/ready/zero states, and no generated-report snapshot treated as live authority. Release-note-only commits must use `[skip release-notes]` and must not create another Beta badge loop. GitHub hosted-runner billing lock is external infrastructure status, not app failure.

## Authority Summary

- Level 1: Product Constitution.
- Level 2: Source-of-Truth Constitution.
- Level 3: Engineering Constitution.
- Level 4: Surface hierarchy, surface doctrine cards, and feature doctrine cards.
- Level 5: Runbooks and ADRs.
- Level 6: Generated reports as snapshots, not doctrine.
- Level 7: Legacy docs with superseded-by and phase-out metadata.

Generated reports are evidence snapshots only. `agent/state/*.generated.json`, `agent/index/*.json`, and generated `agent/context/*.json` cannot override doctrine or runtime business truth, and they are stale after 24 hours unless a contract explicitly says otherwise. Use `npm run check:generated-report-authority` to verify the authority boundary.

## Economy Truth Note

Paid package bonus GumDrops are paid-source GumDrops. They count toward `gumDropsPurchasedBalance` and can be used for paid-only creator monetization surfaces. Reward-source GumDrops are only non-purchase rewards such as check-ins, tasks, referrals, onboarding, or admin reward adjustments.

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

## Phase 1 Final Cleanup Gate

Use the targeted cleanup pass for final Phase 1 hardening:

```bash
npm run scan:codebase-junk
npm run check:beta-versioning-final
npm run check:phase-one-final-cleanup
```

The final gate aggregates cleanup, loading-speed, parity, timeline, and cloud-cost handoff checks without running broad browser audits.

## Global Cost Surfaces

KandyDrops global cost guardrails cover runtime telemetry, PostHog/GA/session replay, cloud logging, debug evidence, Firebase Storage/media proxy access, auth abuse, notification fan-out, CI/build minutes, visual/browser audit tooling, scheduled rebuilds, analytics materializers, dependency tooling, and admin import/export jobs.

KandyDrops hardening is deterministic first. Agents must score and target the affected domain before broad verification. No full-suite terminal marathons by default. The repo must protect cost surfaces, source-of-truth layers, privacy/telemetry, payments, locked content, chat/support reliability, image/device performance, and legacy cleanup without rewriting stable business logic.

## Drop Cover Visibility

Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.

KandyDrops speed and security hardening is deterministic. Public/stable surfaces should cache intentionally. User/payment/support/chat/security surfaces stay no-store where needed. Every API route must declare auth, trusted origin, rate limit, idempotency, cost risk, cache mode, and expected failure codes. Firebase rules remain default deny with explicit owner/admin access. App Check is staged from monitor to enforcement. Heavy browser audits are forbidden by default.

Google cost-bearing surfaces must be declared before use.
KandyDrops uses Firebase Data Connect with Cloud SQL only as an agent-context mirror unless explicitly promoted.

- Contract: [src/lib/server/global-cost-surface-contract.ts](./src/lib/server/global-cost-surface-contract.ts)
- Report: [agent/state/global-cost-surfaces.generated.json](./agent/state/global-cost-surfaces.generated.json)
- Doctrine: [docs/agent-truth/global-cost-surfaces.md](./docs/agent-truth/global-cost-surfaces.md)
- Commands: `npm run score:global-cost` and `npm run check:global-cost`

## Codex Cloud Auth Readiness

Codex must verify authentication before attempting cloud or billing checks. Read-only checks are allowed after auth verification. Mutations require explicit instruction.

- Report: [agent/state/codex-auth-readiness.generated.json](./agent/state/codex-auth-readiness.generated.json)
- Doctrine: [docs/agent-truth/codex-native-auth-readiness.md](./docs/agent-truth/codex-native-auth-readiness.md)
- Bootstrap runbook: [docs/runbooks/cloud-auth-bootstrap.md](./docs/runbooks/cloud-auth-bootstrap.md)
- Commands: `npm run check:codex-auth`, `npm run plan:cloud-auth-bootstrap`, and `npm run check:codex-auth-readiness`

## Beta Stabilization

Phase 1 is debug-first stabilization: fix one selected Debug Control Tower/admin-evidence issue at a time, with allowed files, forbidden files, validator, release-note impact, and rollback note stated before implementation. KreditFlow by iKandy is Phase 2. Advocacy and referrals are Phase 3.

KandyDrops public beta scoring is deterministic and mathematical.

- Roadmap: [docs/agent-truth/beta-roadmap.md](./docs/agent-truth/beta-roadmap.md)
- Command: `npm run check:debug-first-roadmap`

## Contributor Gateway

- [Contributing](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Environment Contract](./docs/agent-truth/environment-contract.md)
- [Contractor Onboarding](./docs/agent-truth/contractor-onboarding.md)

## Beta Release Notes

KandyDrops Beta release notes are user-facing and track accepted public beta releases, not raw commits. The Beta badge beside the top nav title opens the last 5 app-style updates. Versioning uses odometer format `1.<block>.<release>`, where each accepted public beta release increments one counter by exactly 1. The legacy visible version `1.113.4` migrated to `betaReleaseCounter = 201`, which displays as `1.2.1`, and the first accepted public beta release after migration increments to `1.2.2`. Public notes may group multiple commits into one accepted public beta release. Changelog copy must explain what changed for users, not dump technical commit noise.

- Public notes: [public/kandydrops-release-notes.json](./public/kandydrops-release-notes.json)
- Human changelog: [CHANGELOG.md](./CHANGELOG.md)
- Dev truth: [Public Beta Release Notes](./docs/agent-truth/public-beta-release-notes.md)
- Commands: `npm run release:notes`, `npm run release:notes:accept`, and `npm run check:release-notes`

## Current Rule

If a README sentence appears to conflict with a constitution, surface doctrine, registry entry, or verified runtime code, the README loses.
