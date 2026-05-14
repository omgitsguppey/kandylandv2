# Public Beta Score

Status: deterministic source-truth audit guard  
Recorded: 2026-05-03

Report artifact: `agent/state/public-beta-score.generated.json`  
Validator: `npm run check:beta-score`

## Doctrine

KandyDrops public beta scoring is deterministic and mathematical. It exists to reduce terminal audit sprawl. Agents must use score:beta/check:beta-score and targeted tests first. Heavy browser audits are forbidden by default unless a finding explicitly escalates to runtime visual verification.

KandyDrops hardening is deterministic first. Agents must score and target the affected domain before broad verification. No full-suite terminal marathons by default. The repo must protect cost surfaces, source-of-truth layers, privacy/telemetry, payments, locked content, chat/support reliability, image/device performance, and legacy cleanup without rewriting stable business logic.

KandyDrops speed and security hardening is deterministic. Public/stable surfaces should cache intentionally. User/payment/support/chat/security surfaces stay no-store where needed. Every API route must declare auth, trusted origin, rate limit, idempotency, cost risk, cache mode, and expected failure codes. Firebase rules remain default deny with explicit owner/admin access. App Check is staged from monitor to enforcement. Heavy browser audits are forbidden by default.

KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits. Runtime issues already detected by the app must become pre-catcher issue candidates before relying on manual bug reports. Support uses one unified inbox model, with admin routes able to list/read/reply to all support threads and users scoped only to their own threads. Debug evidence writes must never block user flows.

## Scoring Model

Each domain starts at 100. Findings apply severity, confidence, blast-radius, and optional recency multipliers. Critical findings with confidence at or above 0.85 force the affected domain and overall status to `fail`; lower-confidence criticals become major escalations unless they are hardcoded content/security leaks.

Scanner cleanliness is not readiness by itself. The score now also records evidence-aware readiness gates:

- source safety
- targeted behavior tests
- visual/manual smoke evidence
- runtime/provider smoke evidence
- admin truth/sample evidence
- generated report freshness, open PR, and current HEAD integrity

The report keeps the scanner score separately from the evidence-aware readiness score. Zero scanner findings plus missing evidence must not produce `clean`, `Ready`, or 100/100.

Honest readiness statuses:

- `Ready`
- `Ready with smoke required`
- `Needs review`
- `Blocked`
- `Unknown evidence`
- `Stale evidence`
- `Runtime unverified`
- `Visual QA required`

If manual/screenshot evidence is absent, readiness is capped at `Visual QA required`. If provider smoke is absent, readiness is capped at `Ready with smoke required`. If generated reports are older than 24 hours, readiness is capped at `Stale evidence` or `Needs review`. Empty debug evidence is `Unknown evidence`, not proof of health.

Domain weights:

- layout: 18
- hydration: 14
- economy: 16
- telemetry: 14
- contentProtection: 16
- orphanedLogic: 8
- accessibilityTouch: 6
- testingCoverage: 8

Default status thresholds:

- 95-100: clean
- 90-94: pass
- 80-89: warning
- 70-79: beta-risk
- 0-69: fail

Evidence-weighted readiness model:

- Source safety: 25
- Targeted behavior tests: 20
- User-critical visual/manual smoke evidence: 20
- Runtime/provider smoke state: 15
- Admin truth/sample evidence: 10
- Freshness/open-PR/source-commit integrity: 10

Generated reports are evidence snapshots, not doctrine. Reports older than 24 hours must be regenerated or treated as stale evidence before a readiness claim is trusted.

## Autofix Policy

`repair:beta` is dry-run by default. `repair:beta -- --apply` may only apply fixes that pass the shared gate in `src/lib/agent-score/autofix.ts`.

The gate requires:

- finding is marked autofixable
- confidence is at least 0.95
- target file and exact old text match
- expected occurrence count matches
- target is not payment, auth, GumDrops economy, unlock, or content access logic
- score does not decrease after the edit
- no new critical findings appear

Never autofix GumDrops source-of-funds logic, PayPal/capture logic, auth/session logic, locked content payload rules, creator eligibility, preview route migration, keyboard runtime behavior that needs visual verification, copy strategy, or ambiguous layout judgement.

## Command Budget

Use the short deterministic lane first:

- `npm run score:beta`
- `npm run check:beta-score`
- `npm run repair:beta`
- `npm run repair:beta -- --apply`
- `npx vitest run --config vitest.contracts.config.ts tests/unit/public-beta-score.spec.ts`
- `npm run typecheck` only when TypeScript source changed

Forbidden by default:

- `npm run check`
- `npm run check:ui:audits`
- `npm run check:ui:continuity`
- `npm run check:ui:omni`
- `npm run check:ui:lighthouse`
- Playwright
- Cypress
- Lighthouse
- `npm run test:gate:signoff`

If a finding needs one of those commands, record the escalation reason in the report instead of running it automatically.

## Debug Evidence Injection

`score:beta` includes a concise `debugEvidence` section when `agent/state/debug-evidence-index.generated.json` exists. The injected evidence is redacted and limited to the top 10 records per domain by severity, occurrence count, and recency. Public beta reports must not include support message bodies, emails, authorization tokens, or locked content URLs.

## Owners

- Math and report shape: `src/lib/agent-score/core.ts`, `src/lib/agent-score/weights.ts`, `src/lib/agent-score/reporting.ts`
- Deterministic scanners: `src/lib/agent-score/public-beta-scanner.ts`
- Safe repairs: `src/lib/agent-score/autofix.ts`
- CLI entrypoints: `scripts/agent/score-public-beta-readiness.ts`, `scripts/agent/repair-public-beta-safe.ts`, `scripts/agent/validate-public-beta-score.ts`
- Debug evidence injection: `scripts/agent/inject-debug-evidence.ts`, `scripts/agent/load-debug-evidence-for-audit.ts`, `scripts/agent/precatch-runtime-issues.ts`

## 2026-05-14 Phase 1 Evidence Refresh

Current HEAD for this refresh: `142bba579d7a2f0b73610b0b5f0498a26e19b836`.

`npm run score:beta` refreshed `agent/state/public-beta-score.generated.json` at `2026-05-14T02:36:22.302Z`.

- Public beta score: 25/100.
- Evidence score: 25/100.
- Scanner-only score: 100/100 clean.
- Current Phase 1 status: `Stale evidence`.

The score still applies caps for targeted behavior evidence, visual/manual smoke, runtime/provider smoke, admin truth/sample evidence, freshness/PR/HEAD integrity, and empty Debug/runtime evidence. This is an evidence-blocked state, not a proven runtime code blocker.

## 2026-05-14 Formal Smoke Evidence Tracking

Formal local evidence artifacts now exist for the remaining smoke lanes:

- `agent/state/provider-smoke-evidence.generated.json`
- `agent/state/runtime-smoke-evidence.generated.json`
- `agent/state/admin-truth-sample-evidence.generated.json`

These artifacts intentionally do not clear provider, PayPal, deployed runtime, real-device, visual QA, or admin truth sample gates. PayPal refill remains `operator_reported_not_formal_provider_smoke`; provider smoke remains `missing_formal_evidence`; runtime remains `runtime_unverified`; admin truth samples remain `missing_or_unknown`.

After this evidence tracking pass, `npm run score:beta` still reports 25/100 overall, 25/100 evidence score, and 100/100 scanner-only score. The honest status remains `Stale evidence`.
