# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

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

## 1.3.96 - 2026-05-23
- Improved internal beta reliability
- Locked testing, tracking, telemetry triggers, and person metric hydration.
- Reduced false waiting-on-activity states.
- Reported score progress by dimension, not just overall.

## 1.3.95 - 2026-05-23
- User management metrics refactor
- Refactored user management around identity, activity, and confidence summaries.
- Connected individual user metrics to hydration and debug lanes.
- Reduced raw user-management sprawl.

## 1.3.94 - 2026-05-23
- Telemetry trigger coverage
- Added telemetry trigger coverage from user action to score input.
- Reduced waiting-on-activity gaps with deterministic tests.
- Cleaned stale and duplicate tracking validators.

## 1.3.93 - 2026-05-23
- Person metrics hydration reliability
- Hydrated individual user metrics from canonical event envelopes.
- Added confidence explanations for global, guest, user, and linked-person metrics.
- Cleaned stale person-metric logic.

## 1.3.92 - 2026-05-23
- Event translation bridge reliability
- Connected tracked events to feature activity, person metrics, debug evidence, and score inputs.
- Reduced false waiting-on-activity states.
- Cleaned stale event translation logic.

## 1.3.91 - 2026-05-23
- Notification and security reliability fixes
- Resolved open PR backlog by merging, cherry-picking, or closing stale work.
- Integrated safe security, accessibility, and admin performance fixes.
- Closed superseded monolith/analytics PRs where current doctrine already covers them.

## 1.3.90 - 2026-05-23
- Profile settings contract hardening
- Hardened Account Settings profile saves around one backend profile contract.
- Blocked stale profile writes from changing server-owned account fields.
- Kept Delete Account, Creator Settings, chat, navigation, payment, and GumDrop logic unchanged.

## 1.3.89 - 2026-05-23
- Support and policy surface cleanup
- Connected FAQ, Support, Policies, Privacy Policy, and Download My Data to canonical trust surfaces.
- Consolidated policy links so Account Settings avoids dead or duplicated placeholder pages.
- Added debug visibility for support and policy surface health.
