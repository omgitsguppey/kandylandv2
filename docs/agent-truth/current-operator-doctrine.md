# Current Operator Doctrine

Authority: Current authority for Phase 1 operator workflow and full-loop source-of-truth cleanup.

This document consolidates the current KandyDrops operating doctrine for agents. Older docs remain useful as history, evidence, or surface-specific detail, but this document wins when stale instructions conflict with current Phase 1 source-truth rules.

## Direct Fix Mode vs Audit Mode

Direct Fix Mode is the default when raw code, tests, or generated evidence already proves the defect. The agent must inspect the relevant files, name the broken function/path, remove or replace stale logic, update surrounding callers, update validators/tests, grep for leftovers, and commit the focused fix.

Audit/Triage Mode is reserved for genuinely unknown ownership, unknown route/source mapping, or cross-repo conflicts. Do not use broad investigation language when the broken path is already visible in source.

## Screenshot-First Source-Rooted Debugging

Screenshots are symptom receipts. A screenshot issue must be traced through:

visible label/button/card -> component -> hook/state -> API route/server action -> server helper/source contract -> collection/report/snapshot -> validator/doc.

Do not patch the visible component only when the underlying source, loading, stale, permission, or metric contract is wrong.

## Full-Loop Closure

No backend-only fixes and no UI-only fixes. Every touched feature must close the loop across:

- UI component/card/button
- hook/state/loading/error handling
- API route/server action
- server helper/source contract
- database/report/snapshot/source
- auth, permissions, admin projection, and read-only behavior
- pending/double-submit/race guard
- empty, unavailable, stale, and error states
- cost behavior
- validator, test, docs, and source-of-truth update

## No Additive Patch Stacking

Do not add new wrappers, badges, metrics, snapshots, fallback paths, or helper fields to hide broken old logic. Every fix must either connect to the canonical source, remove stale logic, demote stale logic to Debug/evidence-only, or explicitly mark it deprecated with a validator preventing reuse.

## UI/Button/Action Closure

Every button, link, toggle, or CTA must have:

- real destination or action
- permission/read-only guard
- loading/pending guard
- error path
- disabled/unavailable state
- no double-submit risk
- no self-loop unless it scrolls or focuses a real section
- no placeholder route pretending to be live

If no real route/action exists, remove the fake action, disable it honestly, or label it configuration-only.

## Measurement/Source-Of-Truth

Do not add a new measurement lane until the existing measurement path is traced end-to-end. For every metric/event touched:

- identify the canonical source
- identify duplicate, legacy, diagnostic, and fallback sources
- remove, demote, or label non-canonical sources
- update UI to read canonical metric contracts or snapshots
- keep Debug responsible for formulas, source detail, confidence, and fallback detail
- update validators so duplicate paths cannot return
- add no new event volume unless explicitly required

## Metric Cadence + Math Precision

No fake realtime. No random snapshots as truth. No badge/disclaimer sprawl in primary UI.

Every displayed metric must have:

- metricKey
- label
- canonicalSource
- formula
- unit
- timeWindow
- refreshCadence
- lastRefreshedAt
- freshnessTolerance
- exactness: exact | derived | estimated | unavailable
- fallbackPolicy
- zeroPolicy
- debugSourceDetail

Primary UI shows the number plus one compact freshness line: `Updated X ago` or `Unavailable`.

Debug shows source, formula, cadence, fallback, confidence, and legacy warnings.

## Metric Classes

- exact: direct canonical source proof for the selected window.
- derived: computed from canonical or approved source fields with a visible formula.
- estimated: directional or recovered evidence; never present as exact.
- unavailable: missing, stale beyond tolerance, or unsupported by the selected source.

A zero is a number. Missing data is not zero. Object presence is not truth. No fake live. No fake healthy. No fake ready. No estimate displayed as exact. No diagnostic/fallback value displayed as canonical. A snapshot is only cached output of a known formula over a known source and refresh window. No generated-report snapshot treated as live authority unless a current contract explicitly consumes it and freshness/current-head checks pass.

## Watch-Time Truth

Canonical watch time comes from valid watch-session rollups only:

`analytics_watch_sessions.validWatchMs` where `watchScoreSource = watch_session_rollup`.

`watchSecondsTotal`, page duration, `viewerOpenMs`, `diagnosticEstimate`, and legacy page duration are fallback/diagnostic only unless explicitly labeled. Diagnostic estimates cannot populate canonical `watchTimeMs`.

## Creator Feature Connection Truth

Creator Dashboard, Fan Pass, requests, calls/bookings, chat, broadcasts, earnings, and audience must be source-connected.

Fan Pass is guidance/configuration-only unless a real purchase/subscription flow is connected. Paid GD only, never reward/free GD.

Requests and bookings are inline/configuration-only unless dedicated management destinations exist. Do not restore fake `Open section` links back to `/dashboard/creator`.

Chat links only if `/dashboard/chat` exists and messaging is enabled and unrestricted. Paid GD guidance does not imply chat availability.

Broadcasts must not fetch or send while restricted, read-only projected, or missing `creatorId`.

## Admin Debug / Admin Analytics Separation

Admin Debug is the control room, not the main product UI. Debug may show stale, missing, source, formula, fallback, and validator detail. Admin primary panels should not drown in disclaimers.

Stale shown as stale is honest, not a bug. Stale shown as live/current is a bug. Debug should expose owning validator or refresh command when possible.

## Score/Readiness Evidence Truth

Public beta score must read formal evidence artifacts directly. Provider smoke does not come from final-launch-report string parsing. Operator-reported PayPal is tracked, not formal provider smoke. Targeted behavior evidence is not visual QA, runtime smoke, provider smoke, real-device smoke, or admin truth sample evidence. Local validators are not deployed runtime smoke. The score can stay low if evidence is honestly missing.

## Release-Note Automation Rule

Every accepted non-release-artifact patch must update the Beta badge through the canonical release-note flow.

Accepted source/config/UI patches must ship release-note artifacts in the same commit, not as a separate follow-up. Release-note-only commits are manual recovery only, must not trigger another release-note loop, and must use `[skip release-notes]`. Do not create another Beta badge commit for a release-note-only recovery commit. A skipped Public Beta Release Notes workflow is not a failure when the commit only touches release-note artifacts.

GitHub Actions hosted-runner billing lock is external and not app failure. Firebase App Hosting rollout status and GitHub Actions billing status are separate.

## Cost/Race-Condition Rules

No new broad Firestore reads. No new realtime listeners. No polling loops. No refresh every render. No new metric/event volume unless explicitly required. Prefer cadence-based refresh per component. Debug can explain stale/cache state. Primary UI must not pretend everything is realtime.

Every async identity or creator-context fetch must guard against stale response overwrite. Every mutating action must have permission/read-only checks and pending guards.

## Mobile/Admin Source-Rooted Fix Rule

Mobile admin fixes must be screenshot-first and source-rooted. No admin mobile patch may only adjust layout if the underlying source/data state is wrong. Fix the source chain first, then simplify UI.

## Required Future Prompt Structure

Every future Codex prompt must include:

- exact symptom or code defect
- exact files to inspect before editing
- exact stale logic to remove/demote
- exact canonical source to connect
- surrounding callers/routes/UI/tests to inspect
- grep cleanup checks
- targeted validators/tests
- allowed files
- forbidden files
- release-note rule
- commit message
