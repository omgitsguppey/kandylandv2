# KandyDrops Engineering Constitution

Authority level: 3

This constitution defines code organization, file-size budgets, contributor workflow, audit command budgets, security, cost, and machine-readable context rules.

## Source Hierarchy

- `src/app` is route entrypoints only.
- `src/features` is the migration target for domain/product ownership.
- `src/lib` is shared primitives only.
- `src/lib/server` is server-only shared logic.
- `src/components/ui` is pure reusable UI.
- `scripts/agent` is repo inspection and validation only.
- `docs` are human doctrine.
- `agent/context` is machine-readable doctrine.

## File Budgets

- Warn at component >350 LOC, route handler >250 LOC, server helper >400 LOC, validator >500 LOC, markdown >300 lines, and generated JSON >500 lines unless JSONL or sharded.
- Review required at component >600 LOC, route handler >450 LOC, server helper >800 LOC, validator >900 LOC, markdown >600 lines, and generated JSON >1500 lines unless JSONL or sharded.
- Critical failure: source file >1500 LOC without waiver, generated JSON >5000 lines without JSONL/sharding, route handler with 5+ inline responsibilities, component with more than 8 domain helper imports, or shared lib importing feature-specific runtime logic.

## Pull Request Rules

- Keep changes small, self-contained, reviewable, and easy to roll back.
- Use CODEOWNERS for sensitive surfaces.
- Resolve PR conversations before merge.
- Dependency additions require owner review, reason, license/security consideration, and dependency review.

## Command Budget

- Start with affected-file planning and compact context.
- Use surface validators before broad suites.
- Do not run Playwright, Lighthouse, Cypress, deploys, or full `npm run check` by default.
- Run `npm run typecheck` when TypeScript changed.

## Security And Cost

- Payment, auth, unlock, Firebase rules, Storage rules, Data Connect, Cloud SQL, BigQuery, AI, and GitHub workflows require owner approval.
- Cost-bearing Google surfaces must have explicit route or infrastructure contracts before use.
- Data Connect and Cloud SQL remain agent-context mirror infrastructure unless explicitly promoted by contract.

## Agent Context

- Agents read `agent/context/doctrine-registry.json` first.
- Then stream relevant records from `agent/context/doctrine-cards.jsonl`.
- Then open the canonical surface doc.
- Full Markdown is read only when compact context leaves uncertainty.
- Do not read every Markdown file by default.
