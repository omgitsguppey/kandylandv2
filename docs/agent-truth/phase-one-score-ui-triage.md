# Phase One Score UI Triage

## Purpose

This triage explains why Phase 1 beta readiness can remain stuck at `25/100` even after analytics rewire and smoke-evidence tracking work. It also records source-level UI connection risks for Admin Debug, Admin Analytics watch-time truth, and Creator Dashboard state.

This is a local/static audit. It does not prove production data, provider smoke, deployed runtime health, visual QA, or real-device behavior.

## Scope

The triage report is generated at:

- `agent/state/phase-one-score-ui-triage.generated.json`

The validator is:

- `npm run check:phase-one-score-ui-triage`

The validator reads source files and local generated evidence only. It must not call Firebase production, BigQuery, GA4, PostHog, PayPal, or browser automation.

## Key Findings

The current beta score is source-safety-only. Formal tracking artifacts exist for provider smoke, runtime smoke, and admin truth samples, but the score runner does not directly ingest those artifacts yet.

The score runner still has these source-level issues:

- Targeted behavior evidence is hardcoded as `false`.
- Provider smoke is inferred by parsing final launch readiness report text.
- Visual/manual evidence is based on file existence, not a schema-validated artifact.
- Admin truth sample evidence is derived from debug entries instead of the formal admin truth sample report.

The score math is honest about missing evidence, but it is too coarse for operator diagnosis. Missing/operator-reported evidence must not become a pass, but the score should still show formal tracking states instead of treating everything as unknown.

## UI Connection Findings

Admin Debug Control Tower reads generated reports, including the public beta score, but its visible overall score is an aggregate of required report scores. That can drift from the canonical public beta score and hide why the public beta score is capped.

Admin Debug also still has dense panel stacking. The recovery evidence panel is compact by default, but Control Tower, System Health, Recovery Evidence, Creator Lane, and diagnostics are still presented together in the Now view.

## Watch-Time Truth

Canonical watch time is valid foreground viewer time from watch-session rollups:

- Canonical: `watch_session_rollup`
- Fallback only when explicitly allowed and labeled: `legacy_page_duration`
- Diagnostic only: missing-watch estimates

The rollup contract keeps diagnostic estimates out of canonical watch time. However, an admin user metrics test still expects `watchSecondsTotal` to become `watchTimeMs` without valid watch sessions. That test should be realigned before watch-time UI changes continue.

## Creator Dashboard Truth

The Creator Dashboard settings route returns a `stats` object without source freshness, sample count, or unavailable reason metadata. The UI marks several sections as `live` whenever `stats` exists. That creates a fake-live risk when aggregates are zero, missing, or stale.

The next focused fix should add source/sample metadata before showing creator stats as live. It should not touch payment, wallet, chat, AI cover, public UI, or creator monetization behavior beyond source labels and state mapping.

## Recommended Fix Order

1. Score evidence ingestion: read the formal provider/runtime/admin truth evidence artifacts as status-bearing inputs while keeping missing evidence non-passing.
2. Creator dashboard source/sample contract: add source freshness and sample metadata before stats can render as live.
3. Admin Debug score connection: show the canonical public beta score and cap reason separately from aggregate Control Tower health.
4. Watch-time contract lock: realign admin user metrics tests and validators around watch-session rollup truth.
5. Admin Debug clutter follow-up: collapse repeated panels after the truth defects are fixed.

## What This Must Not Be Used For

This report must not be used to mark beta ready, provider smoke passed, runtime smoke passed, visual QA complete, real-device smoke complete, or production data recovered. It is a triage map for focused follow-up fixes.
