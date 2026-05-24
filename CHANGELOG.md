# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.4.21 - 2026-05-24
- Auth provider conflict guidance
- Improved auth guidance when Google and email/password sign-in methods conflict.
- Mapped common Firebase auth errors to clear next steps.
- Added telemetry for auth provider conflicts.

## 1.4.20 - 2026-05-24
- Notification and PWA readiness lock
- Locked notification permission, targeting, and PWA service worker readiness.
- Connected notification and PWA health to telemetry, debug, and score.
- Kept push sends, chat, tasks, payment, and GumDrop runtime unchanged.

## 1.4.19 - 2026-05-24
- PWA service worker safety
- Hardened PWA service worker registration, update, and offline safety.
- Blocked sensitive wallet, chat, and private content from unsafe caching.
- Added PWA/service worker debug visibility.

## 1.4.18 - 2026-05-24
- Notification targeting intent
- Added notification delivery intent and targeting contracts.
- Mapped drops, broadcasts, chat, tasks, wallet, and system notices to safe notification rules.
- Blocked notification targeting for opted-out or ineligible users.

## 1.4.17 - 2026-05-24
- Push token registration
- Hardened push token registration and device binding.
- Tracked token registration, refresh, revocation, and failure states.
- Protected push tokens from raw debug/log exposure.

## 1.4.16 - 2026-05-24
- Notification permission lifecycle
- Finalized notification permission prompt lifecycle.
- Tracked notification prompt views, grants, denials, and failures.
- Added debug visibility for notification permission health.

## 1.4.15 - 2026-05-24
- Score dimension lock
- Locked beta score by dimension toward the 80 target.
- Separated formal gates, stale artifacts, cost review, and in-flight lanes.
- Kept future activity placeholders from returning as score drag.

## 1.4.14 - 2026-05-24
- Regression evidence refresh
- Refreshed regression evidence for high-blast analytics, debug, chat, task, settings, and wallet lanes.
- Rebuilt targeted behavior evidence from current validators.
- Separated in-flight work from stale regression drag.

## 1.4.13 - 2026-05-24
- Formal evidence bridge
- Bridged source-backed, operator-confirmed, and formal evidence without faking runtime proof.
- Clarified evidence completeness by gate.
- Kept provider, runtime, and admin formal gates honest.

## 1.4.12 - 2026-05-24
- Cost risk readiness updates
- Refined cost risk scoring from source guard evidence.
- Separated external billing review from source cost readiness.
- Reduced generic owner-review cost drag where guards exist.

## 1.4.11 - 2026-05-24
- Event tracking liveness checks
- Added event liveness checks for quiet future activity signals.
- Separated true future-only events from suspicious idle tracking paths.
- Mapped expected daily activity into debug and score readiness.

## 1.4.10 - 2026-05-24
- Daily task reliability
- Locked daily task reset, telemetry, reward ledger, and guidance truth.
- Added task duration and failure tracking.
- Connected task rewards to reward-GD source truth.

## 1.4.9 - 2026-05-24
- Daily task guidance route accuracy
- Aligned daily task guidance with current site routes and completion signals.
- Hid or classified tasks that cannot be completed yet.
- Added debug visibility for task guidance health.

## 1.4.8 - 2026-05-24
- Daily task reward ledger integrity
- Hardened daily task reward GumDrop ledger classification.
- Prevented task rewards from being treated as paid GumDrops.
- Added duplicate reward protection and debug visibility.

## 1.4.7 - 2026-05-24
- Daily task lifecycle telemetry
- Added daily task lifecycle telemetry and active duration tracking.
- Separated task reward truth from client completion events.
- Added task metrics to global and per-user analytics.

## 1.4.6 - 2026-05-24
- Daily task reset truth
- Clarified daily task eligibility, reset timing, and reward-GD source.
- Prevented duplicate daily reward claims.
- Connected daily task reset health to debug.

## 1.4.5 - 2026-05-23
- Chat functionality readiness lock
- Locked chat realtime, typing, gating, moderation, and telemetry readiness.
- Connected chat usage and errors to admin truth and person metrics.
- Kept chat design, GumDrop math, and payment runtime unchanged.

## 1.4.4 - 2026-05-23
- Chat gating and moderation reliability
- Verified chat paid-GD gating and moderation enforcement.
- Tracked blocked chat attempts and bypass states.
- Kept GumDrop math and payment logic unchanged.

## 1.4.3 - 2026-05-23
- Chat presence and typing reliability
- Hardened chat typing and presence cleanup.
- Reduced typing write spam with throttled ephemeral state.
- Added debug visibility for presence health.

## 1.4.2 - 2026-05-23
- Chat realtime reliability
- Hardened chat realtime listener scope and cleanup.
- Added chat message propagation telemetry.
- Kept chat UI and payment/GumDrop logic unchanged.

## 1.4.1 - 2026-05-23
- Signal zero lock
- Locked future activity signals out of actionable debug noise.
- Reduced false waiting-on-activity and non-event score penalties to zero.
- Reported score progress by dimension with exact next actions.

## 1.4.0 - 2026-05-23
- Non-event beta score policy
- Stopped future activity placeholders from reducing beta score.
- Scored actionable signal groups instead of raw debug noise.
- Clarified below-80 dimensions by true blocker type.

## 1.3.99 - 2026-05-23
- Debug signal grouping
- Grouped duplicate debug and telemetry signals by root cause.
- Collapsed future activity catalog noise by default.
- Reduced P1/P2 counts to actionable groups.

## 1.3.98 - 2026-05-23
- Debug signal actionability scoring
- Added actionability scoring for debug and telemetry signals.
- Collapsed duplicate and non-actionable future activity signals.
- Focused debug output on score-impacting work.

## 1.3.97 - 2026-05-23
- Beta activity signal cleanup
- Reclassified future user activity placeholders as quiet catalog items.
- Stopped source-ready future activity from appearing as actionable debug noise.
- Kept broken telemetry paths actionable.
