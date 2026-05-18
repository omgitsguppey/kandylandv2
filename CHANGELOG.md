# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 14 public updates in pages of 5.

## 1.2.86 - 2026-05-18
- Bug fixes and general improvements
- Added runtime-based media watch-time tracking rules.
- Separated real watch time from page-open time.
- Locked guest, user, legacy, and watch analytics semantics with cost guards.

## 1.2.85 - 2026-05-18
- Bug fixes and general improvements
- Mapped legacy analytics history without overwriting current truth.
- Added confidence and duplicate-risk checks for recovered history.
- Kept older realtime sources from driving current analytics totals.

## 1.2.84 - 2026-05-18
- Bug fixes and general improvements
- Linked guest analytics history to signed-in users without double-counting.
- Improved individual user tracking semantics.
- Kept identity transfer idempotent and low-cost.

## 1.2.83 - 2026-05-18
- Bug fixes and general improvements
- Moved non-priority analytics checks toward a daily cadence.
- Added cost guards for analytics exports and evidence refreshes.
- Kept live tracking separate from lower-priority evidence work.

## 1.2.82 - 2026-05-18
- Bug fixes and general improvements
- Mapped analytics cost and runtime tracking surfaces.
- Added Cloud Run, Cloud SQL, BigQuery, and Gemini cost inventories.
- Prepared focused follow-ups for 4xx, retry, and analytics cadence cleanup.

## 1.2.81 - 2026-05-18
- Bug fixes and general improvements
- Locked guest, user, legacy, and watch-time analytics semantics.
- Updated Beta evidence to recognize analytics source readiness.
- Kept runtime proof and cost review blockers visible.

## 1.2.80 - 2026-05-18
- Bug fixes and general improvements
- Added runtime-based watch-time tracking rules.
- Separated media watch time from page-open time.
- Added cost-safe heartbeat and visibility guards for watch tracking.

## 1.2.79 - 2026-05-18
- Bug fixes and general improvements
- Mapped legacy analytics recovery without overwriting current truth.
- Added duplicate-risk checks for historical analytics recovery.
- Kept external analytics sources evidence-only until reconciled.

## 1.2.78 - 2026-05-18
- Bug fixes and general improvements
- Added guest-to-user analytics identity linking.
- Kept guest history recoverable without double-counting user activity.
- Improved individual user tracking semantics.

## 1.2.77 - 2026-05-18
- Bug fixes and general improvements
- Mapped guest-to-user analytics identity transfer points.
- Separated analytics product truth from external evidence layers.
- Added Cloud Run, Cloud SQL, Gemini, and 4xx cost checks to analytics tracking inventory.

## 1.2.76 - 2026-05-18
- Bug fixes and general improvements
- Made Creator Settings load safely when some creator data is missing.
- Separated Account Settings from Creator Settings labels.
- Kept creator dashboard source issues from showing as raw server errors.

## 1.2.75 - 2026-05-17
- Bug fixes and general improvements
- Fixed Creator Dashboard create-drop routing.
- Made the creator landing dashboard tighter on mobile.
- Kept creator dashboard and creator settings routes clearly separated.

## 1.2.74 - 2026-05-17
- Bug fixes and general improvements
- Separated Creator Dashboard from Creator Settings routing.
- Cleaned up mobile layouts across creator dashboard surfaces.
- Removed raw creator settings errors from creator-facing views.

## 1.2.73 - 2026-05-17
- Bug fixes and general improvements
- Cleaned up Creator Dashboard error messages on mobile.
- Made Creator Dashboard cards more compact on small screens.
- Kept raw settings errors routed away from normal creator views.
