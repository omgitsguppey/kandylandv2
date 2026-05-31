# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.5.26 - 2026-05-31
- Analytics panel truth cleanup
- Reconnected admin analytics panel hydration to canonical event and person metric sources.
- Reclassified wired-but-unobserved metrics without treating them as fake runtime proof.
- Kept provider, payment, billing, and runtime evidence gates separate from source-only telemetry checks.

## 1.5.25 - 2026-05-31
- Higher build memory headroom
- Raised Firebase/App Hosting build memory headroom from 4GB to 16GB to reduce deployment worker OOM risk.
- Added NODE_OPTIONS build memory headroom to the App Hosting environment config.
- Kept runtime behavior unchanged.

## 1.5.24 - 2026-05-30
- Deployment build stability
- Raised the production Next build Node heap to prevent OOM during TypeScript/build phase.
- Kept runtime behavior unchanged.
- Refreshed release-note freshness for deployment gates.

## 1.5.23 - 2026-05-29
- Creator drop approval repair
- Repaired creator drop submission, admin approval parity, creator status visibility, and creator 4xx handling.
- Connected creator drop workflow to telemetry, analytics hydration, live evidence, and debug.
- Added system memory rules for creator workflow chain fixes.

## 1.5.22 - 2026-05-27
- Privacy data lifecycle consolidation
- Consolidated privacy, consent, data export, delete retention, admin redaction, and support account safety policy.
- Added system memory rules for privacy/data lifecycle discipline.
- Prevented raw sensitive data from leaking through exports, admin summaries, or debug artifacts.

## 1.5.21 - 2026-05-27
- Deep 4xx route mitigation
- Deepened 4xx mitigation across route params, stale links, bots, auth drift, and client retry loops.
- Grouped expected 4xx failures without letting them inflate product errors or cost.
- Added system memory rules for deep 4xx root-cause checks.

## 1.5.20 - 2026-05-27
- Safer error handling and wallet truth guardrails
- Improved handling for invalid, unauthorized, missing, conflicted, or rate-limited requests so the app avoids wasteful retry loops.
- Added clearer source-truth guardrails for wallet, GumDrop, revenue, entitlement, reconciliation, and audit reporting.
- Kept payment checkout behavior and GumDrop math unchanged while strengthening finance display safety.

## 1.5.19 - 2026-05-27
- Test fixture QA refinement
- Consolidated test fixtures, mock evidence classes, validators, and QA harness ownership.
- Reduced test-layer schema drift and fake proof risk.
- Added system memory rules for test and fixture discipline.

## 1.5.18 - 2026-05-27
- Test fixture harness consolidation
- Consolidated test fixtures, mock evidence classes, validators, and QA harness ownership.
- Reduced test-layer schema drift and fake proof risk.
- Added system memory rules for test and fixture discipline.

## 1.5.17 - 2026-05-27
- Type schema contract consolidation
- Consolidated shared types, schemas, DTOs, and generated report contracts.
- Reduced duplicate type definitions and validation shape drift.
- Added system memory rules for canonical type ownership.

## 1.5.16 - 2026-05-27
- Config infrastructure policy consolidation
- Consolidated config, env, CI, release, dependency, and security-rule policy.
- Added system memory rules for config/deployment risk and dependency hygiene.
- Reduced duplicate package script and release-gate drift.

## 1.5.15 - 2026-05-27
- Frontend client runtime consolidation
- Consolidated frontend component state, telemetry, and hydration handling.
- Reduced duplicate client-side logic and hydration race risk.
- Added Codex memory writeback for frontend consolidation mistakes.

## 1.5.14 - 2026-05-27
- Backend consolidation
- Consolidated backend routes and services into canonical owner systems.
- Reduced duplicate backend logic, raw debug reads, and generated artifact bloat.
- Added Codex memory writeback so repeated backend mistakes are remembered.

## 1.5.13 - 2026-05-27
- Analytics hydration consolidation
- Consolidated analytics panel hydration into existing metrics, liveness, and debug systems.
- Reduced duplicate hydration registry and oversized generated artifact output.
- Kept panel-level explanations without creating a parallel analytics subsystem.

## 1.5.12 - 2026-05-27
- Live evidence gate replacement
- Replaced broad manual beta gates with live evidence gates where telemetry and admin truth exist.
- Limited manual visual QA to layout and responsive checks.
- Separated live product evidence from external provider and billing proof.

## 1.5.11 - 2026-05-27
- Final beta-exit closure
- Resolved final security PR blockers and refreshed beta-exit evidence.
- Classified or deferred remaining PRs for beta-exit hygiene.
- Refreshed current-head score and final operator evidence packet.
- Kept runtime/provider/admin formal gates honest.

## 1.5.10 - 2026-05-26
- Automated truth reconciliation
- Added automated truth reconciliation to audit claimed readiness, validator authority, wiring completeness, score freshness, cost risk, and manual-QA readiness.
- Blocked manual QA recommendation until release-critical automated gaps and PR/security hygiene are resolved.
- Kept formal provider/runtime/admin evidence gates honest.

## 1.5.9 - 2026-05-26
- Release evidence finalization
- Added final release evidence, runtime smoke harness, PR hygiene, rollback, operator QA, and beta exit readiness packet.
- Classified formal provider/runtime/admin evidence without faking proof.
- Prepared release notes and rollback readiness for operator-final beta exit review.

## 1.5.8 - 2026-05-26
- Legacy pipeline hardening
- Reinforced legacy, math, cost, debug, and pipeline ownership checks.
- Mapped stale logic into removal, canonical pipeline, legacy alias, dry-run recovery, or unsafe-unknown lanes.
- Kept production data, provider calls, payment runtime, and GumDrop pricing math unchanged.

## 1.5.7 - 2026-05-26
- Final math normalization lock
- Locked global math normalization, legacy recovery, source-of-funds, watch/session, and display accuracy.
- Documented formula refinements and accuracy improvements.
- Kept production data, payment runtime, and GumDrop pricing math unchanged.

## 1.5.6 - 2026-05-26
- Metric display accuracy
- Standardized metric display states across user, creator, and admin surfaces.
- Prevented missing or weak data from showing as exact zero.
- Added confidence and freshness-aware display rules.

## 1.5.5 - 2026-05-26
- Cost export parity math
- Finalized cost, export, SQL parity, batching, and summary math.
- Protected metric accuracy while reducing duplicate reads, writes, and exports.
- Separated source cost guards from external billing proof.

## 1.5.4 - 2026-05-26
- Creator revenue math
- Finalized creator revenue, Fan Pass, paid chat bypass, and entitlement math.
- Separated exact, linked, inferred, weak, and unknown revenue confidence.
- Prevented expired/refunded entitlements from remaining active.

## 1.5.3 - 2026-05-26
- GumDrop ledger math
- Finalized GumDrop ledger math across paid, bonus, reward, task, admin, refund, and legacy sources.
- Prevented source-of-funds drift from affecting spend eligibility.
- Aligned wallet display labels with ledger source truth.

## 1.5.2 - 2026-05-26
- App session reliability
- Improved session activity, idle time, bounce, engagement, and journey duration tracking.
- Prevented hidden time and unknown closeouts from corrupting session metrics.
- Preserved guest-to-user session continuity.

## 1.5.1 - 2026-05-26
- Drop watch and unlock math
- Finalized drop open, unlock, unwrap, and watch-time math.
- Separated active watch time from page duration.
- Added confidence and normalized completion rules for video and static drops.

## 1.5.0 - 2026-05-26
- Global user counting math
- Finalized global, guest, signed-in, linked-person, and creator-role counting math.
- Added exact dedupe windows and duplicate suppression reasons.
- Prevented linked guest/user actions from inflating metrics.

## 1.4.99 - 2026-05-26
- Legacy metric canonicalization
- Added dry-run canonicalization for legacy event and metric data from March 1.
- Mapped old event aliases into current metrics with confidence and duplicate risk.
- Kept unknown legacy data from becoming exact user truth.
