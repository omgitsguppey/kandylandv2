# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.3.89 - 2026-05-23
- Support and policy surface cleanup
- Connected FAQ, Support, Policies, Privacy Policy, and Download My Data to canonical trust surfaces.
- Consolidated policy links so Account Settings avoids dead or duplicated placeholder pages.
- Added debug visibility for support and policy surface health.

## 1.3.88 - 2026-05-23
- Settings preference cleanup
- Phased out stale client-only preference truth paths.
- Kept privacy and creator settings tied to backend contracts.
- Added debug visibility for stale client preference bypasses.

## 1.3.87 - 2026-05-23
- Settings route cleanup
- Cleaned stale Settings route aliases and redirects.
- Separated Account Settings and Creator Settings routes.
- Kept chat, navigation components, payment, and GumDrop logic unchanged.

## 1.3.86 - 2026-05-23
- Account and Creator Settings parity
- Connected Account Settings and Creator Settings to backend state and telemetry.
- Cleaned up stale/conflicting settings logic.
- Aligned Account Settings mobile padding with the app shell.

## 1.3.85 - 2026-05-22
- Account settings delete flow
- Added safe bottom spacing for Account Settings on mobile.
- Finalized the Delete Account flow with confirmation and clear failure states.
- Kept Report issue, navigation, chat, payment, and GumDrop logic unchanged.

## 1.3.84 - 2026-05-22
- New message modal polish
- Lifted the new message modal above the bottom navigation on mobile.
- Matched the new message modal to the black frosted glass design.
- Kept chat routing, messaging, and creator picker logic unchanged.

## 1.3.83 - 2026-05-22
- Final user tracking handoff lock
- Locked guest-to-user tracking and per-person analytics handoff.
- Simplified debug tracking lanes.
- Prepared telemetry for future features without recurring refactors.

## 1.3.82 - 2026-05-22
- Per-person metrics contract
- Added per-person metrics contract for guest and signed-in behavior.
- Separated global, guest, user, and linked-person analytics.
- Prevented checkout starts from counting as successful payments.

## 1.3.81 - 2026-05-22
- Debug tracking panel simplification
- Simplified debug tracking panels into clear summary lanes.
- Collapsed duplicate telemetry and identity monitors.
- Kept raw debug details behind drilldowns.

## 1.3.80 - 2026-05-22
- March 1 legacy event recovery
- Added dry-run legacy event recovery from March 1.
- Mapped older events into the new identity-aware envelope model.
- Simplified debug legacy recovery into one lane.

## 1.3.79 - 2026-05-22
- Event envelope normalization
- Normalized telemetry events into a shared identity-aware envelope.
- Blocked orphaned and unregistered events from normal analytics.
- Simplified debug event health into one lane.

## 1.3.78 - 2026-05-22
- Identity handoff spine
- Finalized guest-to-user identity handoff contracts.
- Prevented double-counting across signup and login.
- Simplified debug identity status into one source of truth.

## 1.3.77 - 2026-05-22
- Payment module symmetry refinement
- Refined payment module copy, symmetry, and mobile density.
- Shortened GumDrop bonus labels for cleaner package rows.
- Kept PayPal, wallet crediting, pricing, and GumDrop math unchanged.

## 1.3.76 - 2026-05-21
- New additions score coverage lock
- Verified new additions are tracked in telemetry, debug, and score systems.
- Closed orphaned score coverage for privacy and behavioral telemetry work.
- Kept manual visual review outside Codex score blocking.

## 1.3.75 - 2026-05-21
- Guest and user activity verification
- Added guest and user activity verification engine.
- Used consent-aware activity paths to reduce manual verification.
- Flagged features with activity but missing telemetry or materializers.

## 1.3.74 - 2026-05-21
- Feature registration gate
- Added feature registration gate for telemetry, debug, and score tracking.
- Prevented new features from shipping with orphaned analytics.
- Mapped routes, surfaces, consent, identity, and score impact per feature.

## 1.3.73 - 2026-05-21
- Visual checks moved out of Codex score gates
- Moved visual screenshot checks out of Codex score gates.
- Kept UI visual review as an operator-final checklist.
- Stopped screenshots from blocking non-UI algorithmic readiness.

## 1.3.72 - 2026-05-21
- Minimal visual smoke evidence lane
- Added minimal UI visual smoke evidence lane.
- Limited manual visual checks to layout-sensitive UI surfaces.
- Kept non-UI proof algorithmic where truthful.

## 1.3.71 - 2026-05-21
- Blocked refresh queue resolver
- Resolved blocked score refresh queue entries.
- Separated refreshable stale reports from formal evidence blockers.
- Retired obsolete score artifacts where safe.

## 1.3.70 - 2026-05-21
- Source cost review closure
- Refined cost owner-review lanes using source guard evidence.
- Separated external billing review from source cost readiness.
- Reduced generic cost-risk drag without claiming fake savings.

## 1.3.69 - 2026-05-21
- Score refresh queue execution
- Executed safe score-impact refresh queue.
- Cleared stale artifact drag without changing formal evidence gates.
- Kept in-flight privacy telemetry work isolated.

## 1.3.68 - 2026-05-21
- Behavioral privacy telemetry lock
- Locked privacy-aware behavioral telemetry.
- Connected cookie consent to guest, signup, and logged-in analytics.
- Made future behavioral events contract-driven instead of refactor-heavy.

## 1.3.67 - 2026-05-21
- Legacy privacy behavior recovery
- Added dry-run recovery for legacy privacy and behavior records.
- Kept unknown legacy consent from becoming full behavioral tracking.
- Mapped orphaned behavior data without mutating production.

## 1.3.66 - 2026-05-21
- Cookie banner settings sync
- Improved mobile cookie banner readability.
- Connected cookie choices to privacy tracking settings.
- Synced guest consent through signup and login.

## 1.3.65 - 2026-05-21
- Behavioral telemetry extensibility
- Made behavioral telemetry extensible for new features.
- Required consent and identity rules for every tracked event.
- Prevented new features from creating orphaned analytics.

## 1.3.64 - 2026-05-21
- Guest-to-user analytics handoff
- Improved guest-to-user analytics handoff.
- Kept behavioral attribution consent-aware.
- Prevented double-counting across signup and login.

## 1.3.63 - 2026-05-21
- Cookie consent tracking modes
- Connected cookie choices to actual analytics tracking modes.
- Made the cookie banner readable on mobile.
- Separated minimal analytics from full behavioral tracking.

## 1.3.62 - 2026-05-21
- Score 80 reconciliation lock
- Reconciled score-80 path after algorithmic evidence refinement.
- Separated manual-only checks from algorithmic and runtime proof.
- Ranked remaining score blockers by true proof type.

## 1.3.61 - 2026-05-21
- Runtime smoke substitute matrix
- Mapped runtime smoke checks to source, debug, telemetry, manual, and formal evidence lanes.
- Reduced manual testing scope to rows that need UI or deployed runtime confirmation.
- Kept deployed runtime smoke as a formal gate until a real artifact exists.

## 1.3.60 - 2026-05-21
- Real usage confidence calibration
- Calibrated real usage confidence from behavioral and operator-confirmed signals.
- Separated observed signals from inferred source readiness.
- Kept formal beta gates separate from real usage confidence.

## 1.3.59 - 2026-05-21
- Algorithmic evidence gates
- Separated UI manual evidence from algorithmic runtime and telemetry confidence.
- Allowed source-backed evidence to improve non-UI beta health without faking formal proof.
- Kept provider, runtime, and visual gates honest.

## 1.3.58 - 2026-05-21
- AI critic P1 triage
- Resolved source-fixable AI critic feedback.
- Ranked P1/P2 debug backlog by beta score impact.
- Separated code fixes from formal evidence requirements.

## 1.3.57 - 2026-05-21
- Algorithmic debug lock
- Locked the debug panel, score backlog, AI critic, behavior math, and refresh queues as the primary confidence engine.
- Reduced manual testing bottlenecks without clearing provider, runtime, or visual proof gates.
- Kept remaining formal evidence steps explicit for beta exit review.

## 1.3.56 - 2026-05-21
- Debug cockpit refinement
- Refined the admin debug panel into a clearer operator cockpit.
- Sorted next fixes by score impact, owner, and refresh action.
- Kept unknown, stale, and formal evidence states visible instead of treating them as healthy.

## 1.3.55 - 2026-05-21
- Self-healing refresh queue
- Added a self-healing refresh queue for stale beta and debug artifacts.
- Ordered refresh commands by owner, dependency, and score impact.
- Kept formal provider, runtime, and manual proof gates blocked until real artifacts exist.
