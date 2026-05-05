# Contributing

KandyDrops development is doctrine-first and source-truth-first. Keep changes small, reviewable, easy to roll back, and covered by the narrowest affected validators.

## Branches And Commits

- Use short branches with owner/scope prefixes, for example `codex/wallet-source-truth`, `contractor/support-thread-fix`, or `docs/runbook-payment`.
- Keep PRs small. Target one surface or one contract change per PR. Split mixed wallet, analytics, Firebase, UI, and admin work.
- Use conventional commits: `fix(scope): summary`, `feat(scope): summary`, `docs(scope): summary`, `chore(scope): summary`, or `test(scope): summary`.

## Required Reading

- Start broad repo/tooling work with `AGENTS.md`, `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, and the relevant compact context in `agent/context/`.
- Read `docs/doctrine/` before UI, copy, product-facing, telemetry, state, admin truth, or Firebase work.
- Read the matching `docs/agent-truth/*` file before touching wallet, payments, unlocks, viewer, analytics, support, moderation, creator monetization, Google cost, or legacy paths.

## Commands

Allowed by default:

- `npm run plan:affected-audits`
- `npm run check:affected-audit-router`
- Surface-specific `npm run check:*` validators selected by the affected plan
- `npm run typecheck` when TypeScript changed
- `npm run agent:test -- <path>` for narrow related tests

Forbidden by default unless the issue explicitly authorizes them:

- `npm run check`
- `npm run check:ui:audits`
- `npm run check:ui:continuity`
- `npm run check:ui:lighthouse`
- Playwright, Lighthouse, Cypress, deploys, Firebase deploys, `gcloud`, BigQuery jobs, broad emulators, and full-suite marathons

## Pull Requests

- Use the PR template.
- List touched surfaces, validators run, commands intentionally not run, rollback plan, dependency/env changes, and known risks.
- UI PRs need screenshots or a written reason screenshots were not applicable.
- Security, payment, unlock, auth, Firebase, Cloud SQL/Data Connect, and analytics truth PRs need owner approval before merge.
- Resolve conversations before merge. Do not bypass requested changes.

## Dependency Policy

- Do not add dependencies to save a few lines of code.
- New runtime dependencies require a reason, owner, license check, bundle/cost impact, and dependency-review pass.
- Lockfile changes must be intentional and described in the PR.
- Dependabot updates are reviewed like human PRs. Do not auto-merge them.

## Screenshots And Evidence

- Screenshots are UI evidence only; they are not source truth for security, moderation, payment, unlock, or analytics facts.
- Runtime issues should feed debug evidence where the existing pipeline supports it.
- Never paste secrets, tokens, private keys, raw content URLs, or customer data into issues, PRs, screenshots, logs, or docs.

## Sensitive Surfaces

Owner approval is required for wallet/payment/GumDrops, unlock/content protection/viewer, creator monetization, analytics/telemetry/behavioral intelligence, support/moderation, Firebase rules, Storage rules, Data Connect/Cloud SQL, GitHub workflows, and agent validators.

## Uncertainty

If the source truth is unclear, stop broad implementation. Document the uncertainty in the PR, add or update the relevant doctrine/validator first, and request owner review.
