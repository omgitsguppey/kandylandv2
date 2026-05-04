# Codebase Hardening Score

Doctrine note:
KandyDrops hardening is deterministic first. Agents must score and target the affected domain before broad verification. No full-suite terminal marathons by default. The repo must protect cost surfaces, source-of-truth layers, privacy/telemetry, payments, locked content, chat/support reliability, image/device performance, and legacy cleanup without rewriting stable business logic.

## Purpose

The hardening score is a whole-codebase source audit that consolidates public-beta stability checks into one deterministic report. It is meant to reduce whack-a-mole debugging and command sprawl, not to rewrite working systems.

It checks:

- route caching and data-request cost
- client hydration and Effects
- API rate limits and Google/Firebase/SQL/AI cost surfaces
- payment, wallet, and GumDrops source-of-funds truth
- locked content protection and entitlements
- telemetry, privacy, session, and debug evidence
- device UI and image performance
- support, notifications, chat, creator booking, and Fan Pass reliability
- legacy/orphan cleanup

## Commands

- `npm run score:hardening` writes `agent/state/codebase-hardening.generated.json`.
- `npm run check:hardening` validates the report, schema, domain coverage, command budget, safe-repair gate, and docs.
- `npm run repair:hardening` dry-runs exact safe repairs.
- `npm run repair:hardening -- --apply` applies only high-confidence exact text repairs and re-scores after each one.

Default forbidden commands:

- `npm run check`
- `npm run check:ui:audits`
- `npm run check:ui:continuity`
- `npm run check:ui:omni`
- `npm run check:ui:lighthouse`
- Playwright
- Cypress
- Lighthouse
- `test:gate:signoff`

If runtime visual proof is needed, the report should escalate with a reason instead of running broad audits automatically.

## Scoring

Each domain starts at 100. Overall score is a weighted average.

Weights:

- `routeCachingAndDataCost`: 12
- `clientHydrationAndEffects`: 12
- `apiRateLimitAndCloudCost`: 14
- `paymentWalletAndEconomyTruth`: 12
- `contentProtectionAndEntitlements`: 12
- `telemetryPrivacyAndDebugEvidence`: 12
- `deviceUiAndImagePerformance`: 10
- `supportNotificationsAndChatReliability`: 8
- `legacyOrphanCleanup`: 8

Severity penalties:

- `info`: 0
- `minor`: -2
- `moderate`: -5
- `major`: -10
- `critical`: -25 and auto-fail

Any critical finding fails the report. Any major finding caps status at `beta-risk` unless a future owner-approved waiver is added.

## Repair Policy

Safe repair is intentionally narrow. It can only apply deterministic exact-text replacements with confidence at least `0.95`, then rerun the score and revert if the score worsens or a new critical appears.

Allowed repair classes:

- exact `100vh` to `100dvh` in approved shell files
- exact zero chat bottom offset to shared shell token
- exact old wallet emerald token to brand-purple token
- exact non-behavioral data/doc cleanup when represented by a high-confidence finding

Never repair automatically:

- payment, PayPal, capture, ledger, GumDrops spend logic
- auth/session behavior
- entitlement/content access
- SQL/Data Connect runtime usage
- Cloud Run/provider settings
- BigQuery import/export jobs
- creator monetization business rules
- visual layout judgment requiring screenshots
- copy/product strategy

## Report Fields

`agent/state/codebase-hardening.generated.json` includes:

- `overallScore`
- `status`
- `domainScores`
- `findings`
- `criticalFindings`
- `topFindings`
- `safeAutofixesAvailable`
- `safeAutofixesApplied`
- `recommendedFixOrder`
- `minimalCommands`
- `forbiddenCommands`
- `filesMostAtRisk`
- `routeCostClassificationSummary`
- `legacyCleanupPlan`

## Agent Rules

Use this score before broad verification whenever a task touches multiple surfaces, shared helpers, API routes, telemetry, Firebase/Google cost, device shell, image loading, payment-adjacent code, support/chat reliability, or old preview/drop logic.

The report is advisory unless a safe repair is exact and gated. Findings that touch product behavior, security, economy, or provider billing must become targeted tasks with their own validators and tests.
