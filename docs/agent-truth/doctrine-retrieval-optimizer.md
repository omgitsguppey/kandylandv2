# Doctrine Retrieval Optimizer

KandyDrops doctrine retrieval is an optimization problem. Agents must load the smallest sufficient context pack based on changed files, task intent, risk, authority, and validator coverage. Full markdown docs are fallback evidence, not the default context source.

## Purpose

The optimizer prevents agents from reading the whole doctrine pile for every task while preserving hierarchy correctness, source truth, conflict safety, legacy warnings, and validator coverage.

## Inputs

- `taskSummary`: short task intent.
- `changedFiles`: changed or likely touched repo paths.
- `explicitSurfaces`: optional surface overrides.
- `explicitFeatures`: optional feature overrides.
- `riskHints`: optional risk words such as payment, auth, unlock, cost, content, or security.
- `maxCards`: default 8 cards, high-risk hard cap 12.
- `maxTokenBudget`: default 12,000 estimated tokens.

## Scoring

Each doctrine card receives a coverage score:

`0.35 * pathMatchScore + 0.25 * intentMatchScore + 0.20 * riskScore + 0.10 * authorityScore + 0.10 * recencyScore`

The utility score divides coverage by cost:

`utilityScore = coverageScore / max(0.1, tokenEstimate / maxTokenBudget)`

Cards are selected by required hierarchy first, then greedy utility until the context pack covers affected files, surfaces, high-risk domains, validators, and legacy warnings.

## Required Coverage

- Source-of-truth constitution is mandatory for server, payment, auth, unlock, analytics, security, content, or cost work.
- Engineering constitution is mandatory for `scripts/agent`, package, workflow, doctrine, and context work.
- Shared brand primitives are mandatory for User, Creator, or Admin UI work.
- Surface doctrine is mandatory for every affected primary surface.
- Feature doctrine is mandatory for every affected feature.
- Legacy cards are mandatory when changed files match the legacy registry.
- Validator map is mandatory so selected checks have doctrine coverage.

## Outputs

- `agent/context/optimized-task-context.generated.json` is the per-task context pack.
- `agent/state/doctrine-retrieval-optimizer.generated.json` summarizes sample-task efficiency, stale cards, duplicate cards, low-utility cards, missing surface cards, tasks over budget, and unresolved conflicts.

## Commands

```bash
npm run optimize:doctrine-context -- --task "wallet density fix" --changed src/components/PurchaseModal.tsx
npm run check:doctrine-retrieval-optimizer
```

Do not run Playwright, Lighthouse, Cypress, Firebase/Google Cloud commands, or full `npm run check` for this lane.
