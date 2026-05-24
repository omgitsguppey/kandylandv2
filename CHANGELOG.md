# Changelog

## 1.4.38 - 2026-05-24

- Cleaned recovery playbook CTAs and canonical business truth status.
- Separated stale business snapshots from ops-health failures.
- Added source-class clarity for revenue, purchases, unwraps, and watch metrics.

## 1.4.37 - 2026-05-24

- Cleaned Control Tower canonical score, evidence, and operator queue display.
- Separated formal evidence gates from source-code issues.
- Refreshed or retired stale Control Tower reports and collapsed non-actionable cockpit items.

## 1.4.36 - 2026-05-24

- Reconciled admin ops health, route runtime, open actions, and AI fallback statuses.
- Collapsed stale route runtime rows into actionable groups.
- Separated deterministic AI fallback from feed/preflight failures.

## 1.4.35 - 2026-05-24

- Cleaned chat, cost, backlog, and future catalog debug lane statuses.
- Separated config health from runtime activity samples.
- Kept paid-GD chat gating and future activity catalog truth visible without noisy live/stale ambiguity.

## 1.4.34 - 2026-05-24

- Cleaned admin/user/auth/notification/task debug lane status truth.
- Separated config health from live activity samples.
- Reclassified all-zero lanes as collecting, proven-zero, or source-missing.

## 1.4.33 - 2026-05-24

- Reclassified empty live tracking lanes as collecting, source-missing, or proven-zero.
- Clarified PWA registration status without conflating optional registration with failure.
- Cleaned stale badge display across tracking summary lanes.

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.4.32 - 2026-05-24
- Tracking summary lane cleanup
- Cleaned tracking summary lanes and fixed expected-live event source classification.
- Grouped runtime/debug warnings and reclassified behavior math and legacy recovery statuses.
- Kept raw tracking details behind drilldowns while surfacing real source gaps.

## 1.4.31 - 2026-05-24
- Debug cockpit evidence gate cleanup
- Reclassified formal evidence gates outside the source-fix queue.
- Refreshed or retired stale cockpit artifacts.
- Reduced operator cockpit noise around telemetry, cost, AI critic, and recovery playbooks.

## 1.4.30 - 2026-05-24
- Debug cockpit PR readiness
- Finalized open PRs before debug cockpit cleanup.
- Merged, cherry-picked, manually implemented, or closed every PR with classification.
- Prepared main for accurate cockpit/evidence refresh.

## 1.4.29 - 2026-05-24
- SQL/database parity and cost accuracy
- Locked SQL/database parity between raw events, global summaries, user metrics, and journey exports.
- Preserved cost guards with batched exports and summary-first reads.
- Added debug visibility for parity mismatches and export freshness.

## 1.4.28 - 2026-05-24
- User journey intelligence
- Added normalized user journey logs for behavioral intelligence.
- Mapped sessions, drops, wallet, tasks, chat, and signup into compact journey summaries.
- Protected private/payment/chat payloads from behavioral storage.

## 1.4.27 - 2026-05-24
- Session and bounce accuracy
- Improved session time and bounce calculations.
- Separated active, idle, and hidden session time.
- Linked guest and user sessions without double-counting.

## 1.4.26 - 2026-05-24
- Drop watch time accuracy
- Improved drop watch time accuracy with active playback and visibility rules.
- Separated watch time from passive page time.
- Added normalized watch percent and confidence labels.

## 1.4.25 - 2026-05-24
- Analytics dedupe normalization
- Normalized global and user-level analytics deduplication.
- Prevented guest-to-user handoff from double-counting actions.
- Added SQL/export parity fields for normalized event facts.

## 1.4.24 - 2026-05-24
- Auth readiness lock
- Locked auth provider conflict handling, email/password flows, and session persistence.
- Added auth runtime telemetry and admin debug truth.
- Reduced unexpected logout risk while keeping security protections.

## 1.4.23 - 2026-05-24
- Auth runtime telemetry and debug truth
- Connected auth signup, login, provider conflicts, and session stability to telemetry.
- Added admin debug visibility for auth runtime health.
- Protected auth telemetry from raw PII or token exposure.

## 1.4.22 - 2026-05-24
- Email/password auth reliability
- Refined email/password signup and login reliability.
- Improved registration rollback, creator intent, and welcome bonus handling.
- Kept Google auth and GumDrop math unchanged.

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
