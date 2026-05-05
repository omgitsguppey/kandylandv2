# KandyDrops Contractor Onboarding

This onboarding doctrine prepares outside human developers to work without weakening source truth, security, or audit speed.

## First Day

- Read `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `docs/agent-truth/human-dev-readiness.md`, and the relevant surface doctrine.
- Use `.env.example` to request only required environment variables.
- Confirm GitHub access, branch naming, PR template usage, and CODEOWNERS review expectations.
- Do not deploy, run broad audits, or request production secrets.

## Work Intake

Every task should include goal, acceptance criteria, likely touched files, forbidden surfaces, fast validator lane, signoff lane, rollback plan, and owner.

## Development Rules

- Keep PRs small and self-contained.
- Read compact context before long Markdown.
- Respect source-truth hierarchy: contract -> server truth -> client projection -> UI display -> telemetry -> validator -> docs.
- Use affected validators before broad checks.
- Escalate uncertainty instead of guessing.

## Sensitive Work

Payment, GumDrops, unlock, content protection, creator monetization, Firebase rules, Storage rules, analytics truth, Data Connect/Cloud SQL, GitHub workflows, and security issues require owner approval.

## Handoff

PRs must include validators run, commands intentionally not run, rollback plan, dependency/env changes, screenshots if UI, and known risks. Contractors should leave doctrine or validator updates when the task exposes a repeatable gap.
