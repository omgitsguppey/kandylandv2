# Public Beta Score

Status: deterministic source-truth audit guard  
Recorded: 2026-05-03

Report artifact: `agent/state/public-beta-score.generated.json`  
Validator: `npm run check:beta-score`

## Doctrine

KandyDrops public beta scoring is deterministic and mathematical. It exists to reduce terminal audit sprawl. Agents must use score:beta/check:beta-score and targeted tests first. Heavy browser audits are forbidden by default unless a finding explicitly escalates to runtime visual verification.

KandyDrops hardening is deterministic first. Agents must score and target the affected domain before broad verification. No full-suite terminal marathons by default. The repo must protect cost surfaces, source-of-truth layers, privacy/telemetry, payments, locked content, chat/support reliability, image/device performance, and legacy cleanup without rewriting stable business logic.

KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits. Runtime issues already detected by the app must become pre-catcher issue candidates before relying on manual bug reports. Support uses one unified inbox model, with admin routes able to list/read/reply to all support threads and users scoped only to their own threads. Debug evidence writes must never block user flows.

## Scoring Model

Each domain starts at 100. Findings apply severity, confidence, blast-radius, and optional recency multipliers. Critical findings with confidence at or above 0.85 force the affected domain and overall status to `fail`; lower-confidence criticals become major escalations unless they are hardcoded content/security leaks.

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
