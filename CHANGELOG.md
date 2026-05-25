# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.4.60 - 2026-05-25
- Task guidance parity repair
- Repaired task guidance telemetry parity across UI instrumentation, event normalization, and admin validation.
- Separated task lifecycle/onboarding activity from task guidance UI evidence.
- Kept task reward, reset, and GumDrop math unchanged.

## 1.4.59 - 2026-05-25
- Telemetry parity gate repair
- Fixed telemetry parity pass gating for low-confidence samples and refresh diagnostics failures.
- Separated event sample presence from parity readiness.
- Mapped Analytics.IngestIdentified and unknown route diagnostics into blocking telemetry parity evidence.

## 1.4.58 - 2026-05-25
- Analytics source hierarchy repair
- Fixed analytics chart readiness hierarchy so source agreement failure blocks ready status.
- Separated GA4 report availability from usable chart data.
- Aligned Debug validation and Analytics tab source-of-truth states.

## 1.4.57 - 2026-05-25
- Bug validation truth cleanup
- Fixed Bug Report Truth terminal loading states and redacted source handling.
- Separated analytics chart readiness from source agreement and validation parity.
- Made blocked validation passes actionable without implying chart data is unavailable.

## 1.4.56 - 2026-05-25
- AI repair workbench
- Refactored AI Debug Assistant into an async repair workbench with bounded context, deterministic triage, critic review, and approval gates.
- Separated deterministic fallback summaries from repair proposals.
- Prevented live AI calls, raw sensitive context, and silent auto-apply without explicit approval.

## 1.4.55 - 2026-05-25
- Infrastructure dependency inventory
- Expanded infrastructure dependency inventory to include every root/functions dependency, override, external service, and expected-absent dependency.
- Separated package inventory from runtime connectivity checks.
- Replaced fake package updated timestamps with explicit timestamp-unavailable classification.

## 1.4.54 - 2026-05-25
- Queue drop metadata cleanup
- Resolved queue dispatch drop metadata enrichment and scheduler key timestamp parsing.
- Separated notification dispatch outcomes from debug metadata enrichment gaps.
- Replaced generic Unknown drop rows with bounded metadata status and fallback labels.

## 1.4.53 - 2026-05-24
- Queue continuity cleanup
- Separated queue heartbeat evidence from dispatch outcome readability.
- Classified missing queue heartbeats, dispatch outcomes, and legacy adapter drift.
- Prevented queue continuity from showing live when scheduler heartbeat evidence is missing.

## 1.4.52 - 2026-05-24
- Commerce source truth cleanup
- Added source-of-funds truth for unlock transactions and recent commerce feed display.
- Redacted full user IDs from default transaction summaries.
- Mapped same-user commerce sequences into bounded behavioral journey evidence.

## 1.4.51 - 2026-05-24
- No-sample route cohort cleanup
- Finalized no-sample route cohort classification.
- Removed false LIVE states from unseen route runtime cards.
- Added high-risk smoke plans and optional/manual/legacy route policies.

## 1.4.50 - 2026-05-24
- Runtime evidence cleanup
- Classified stale and no-sample route runtime states without treating them as live health.
- Fixed AI description feedback Firestore undefined-write evidence.
- Grouped stale route samples and preserved critical payment/support evidence requirements.

## 1.4.49 - 2026-05-24
- Bug fixes and general improvements
- Improved chat media sizing and message-thread scrolling.
- Improved guest analytics and admin truth checks behind the scenes.
- Updated Beta readiness evidence so stale or missing launch evidence stays visible.

## 1.4.48 - 2026-05-24
- Route hotspot repair
- Repaired active analytics ingest identified route failure and classified wallet package client errors.
- Separated current route failures from historical error counters.
- Prioritized route latency hotspots with summary-first and cache-safe policies.

## 1.4.47 - 2026-05-24
- Route runtime rollup cleanup
- Cleaned route runtime rollups and separated current failures, stale routes, unseen routes, warnings, and slow samples.
- Added native and compatibility chat route cohort status.
- Fixed route runtime display contradictions without hiding real failures.

## 1.4.46 - 2026-05-24
- AI debug repair orchestration
- Refactored AI debug into bounded async work items, planner, critic, and repair proposal contracts.
- Separated task/bug/repair zero-sample states from healthy live status.
- Kept manual utilities out of live health while preserving admin audit and GumDrop safeguards.

## 1.4.45 - 2026-05-24
- No-sample debug status cleanup
- Fixed false-positive LIVE states for empty diagnostics and panel-log lanes.
- Separated no-sample, proven-zero, and unavailable debug states.
- Kept raw diagnostics and panel logs collapsed behind drilldowns.

## 1.4.44 - 2026-05-24
- Orphaned logic action cleanup
- Classified admin analytics realtime listeners under hot-cache doctrine.
- Added telemetry intent alias handling for drop preview events.
- Deduped recommended actions and clarified materializer/recovery/creator lane sample states.

## 1.4.43 - 2026-05-24
- Telemetry and support readiness refresh
- Refreshed cost, telemetry, behavior, support, and creator readiness lanes.
- Added watch-time truth evidence-gap reporting and Data Connect mirror safety classification.
- Documented admin debug and admin analytics monolith split plans without unsafe broad refactors.

## 1.4.42 - 2026-05-24
- Live issue readiness refresh
- Refreshed debug evidence, pre-catcher, device, hydration, content, image, and GumDrop economy readiness.
- Resolved image-loading unavailable/no timestamp reporting.
- Kept GumDrop math and content protection behavior unchanged.

## 1.4.41 - 2026-05-24
- Device layout readiness refresh
- Refreshed device, content protection, cost, and telemetry parity readiness reports.
- Moved compact viewport detection onto the device layout contract.
- Classified responsive breakpoint and wallet-nav action findings without changing payment or bottom-nav behavior.

## 1.4.40 - 2026-05-24
- Beta readiness route hardening
- Hardened admin request body caps and typed admin route errors.
- Added viewer entitlement evidence and AI debug budget guard validation.
- Refreshed beta, self-healing, speed/security, and hardening artifacts.

## 1.4.39 - 2026-05-24
- Admin balance body cap hardening
- Added a bounded JSON body cap to the admin balance route.
- Refreshed beta score, self-healing refresh queue, and speed/security artifacts.
- Kept admin authorization, GumDrop ledger math, and source-of-funds behavior unchanged.

## 1.4.38 - 2026-05-24
- Business truth recovery cleanup
- Cleaned recovery playbook CTAs and canonical business truth status.
- Separated stale business snapshots from ops-health failures.
- Added source-class clarity for revenue, purchases, unwraps, and watch metrics.

## 1.4.37 - 2026-05-24
- Control Tower evidence cleanup
- Cleaned Control Tower canonical score, evidence, and operator queue display.
- Separated formal evidence gates from source-code issues.
- Refreshed or retired stale Control Tower reports and collapsed non-actionable cockpit items.

## 1.4.36 - 2026-05-24
- Ops health status lane cleanup
- Reconciled admin ops health, route runtime, open actions, and AI fallback statuses.
- Collapsed stale route runtime rows into actionable groups.
- Separated deterministic AI fallback from feed/preflight failures.

## 1.4.35 - 2026-05-24
- Chat and cost status lane cleanup
- Cleaned chat, cost, backlog, and future catalog debug lane statuses.
- Separated config health from runtime activity samples.
- Kept paid-GD chat gating and future activity catalog truth visible without noisy live/stale ambiguity.

## 1.4.34 - 2026-05-24
- Admin status lane cleanup
- Cleaned admin/user/auth/notification/task debug lane status truth.
- Separated config health from live activity samples.
- Reclassified all-zero lanes as collecting, proven-zero, or source-missing.
