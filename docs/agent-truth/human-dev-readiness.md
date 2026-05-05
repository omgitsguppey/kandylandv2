# Human Developer Readiness

KandyDrops human-dev readiness is a repo-governance lane for outsourced development. It adds review rails, ownership, onboarding, environment contracts, security reporting, supply-chain checks, runbooks, and ADR scaffolding without changing product runtime behavior.

## Governance

- `CONTRIBUTING.md` defines branch naming, PR size, doctrine reading, allowed and forbidden commands, dependency policy, screenshot rules, sensitive surfaces, and uncertainty handling.
- `.github/CODEOWNERS` gates sensitive surfaces through owner review. Branch protection should require code owner approval, required status checks, conversation resolution, signed commits, linear history, and blocked force-push/delete.
- `.github/pull_request_template.md` requires summary, touched surfaces, source-of-truth impact, telemetry impact, security/payment/unlock impact, validators, skipped commands, rollback, dependency/env changes, and risks.
- GitHub issue forms collect bug and feature requests without secrets or private user/payment/content data.

## Supply Chain

- `.github/dependabot.yml` covers npm root, npm functions, and GitHub Actions updates. Minor/patch updates are grouped; auto-merge is intentionally not configured.
- `.github/workflows/dependency-review.yml` runs dependency review for PRs touching manifests, lockfiles, or workflows.
- `.github/workflows/openssf-scorecard.yml` runs report-only OpenSSF Scorecard with read-only permissions.

## CI

Lightweight PR CI runs `npm ci`, affected-audit planning, affected-router validation, human-dev readiness validation, and `npm run typecheck`. It does not run Playwright, Lighthouse, Cypress, or full `npm run check` by default.

## Security And Incidents

- `SECURITY.md` defines supported branch, private vulnerability reporting, response window, production secrets policy, and emergency contact placeholder.
- Runbooks cover general incident response, payment incidents, Firestore/Storage rules incidents, and analytics truth incidents.

## Observability Boundaries

KandyDrops keeps product analytics, operational telemetry, security evidence, audit evidence, and business metrics separate. OpenTelemetry-style traces, metrics, logs, and baggage are operational signals; they do not replace canonical business facts such as server purchase, entitlement, ledger, or normalized event facts.

## Validator

`npm run check:human-dev-readiness` confirms required docs, GitHub files, least-permission workflows, CODEOWNERS sensitive-surface entries, safe environment examples, runbooks, ADR template, package wiring, and generated readiness state.
