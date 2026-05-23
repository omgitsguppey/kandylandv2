# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

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
