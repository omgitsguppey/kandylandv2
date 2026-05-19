# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.3.14 - 2026-05-19
- Bug fixes and general improvements
- Clarified BigQuery export readiness.
- Kept analytics exports batched, bounded, and evidence-based.
- Prevented missing BigQuery from showing as zero activity.

## 1.3.13 - 2026-05-19
- Bug fixes and general improvements
- Closed telemetry materialization gaps.
- Mapped Firestore analytics records to event facts and summaries.
- Separated legacy analytics from current truth.

## 1.3.12 - 2026-05-19
- Bug fixes and general improvements
- Closed behavior tracking event gaps.
- Aligned behavior telemetry with tracking toggles.
- Kept watch time separate from passive page activity.

## 1.3.11 - 2026-05-19
- Bug fixes and general improvements
- Closed guest-to-user telemetry transfer gaps.
- Improved individual user tracking continuity.
- Prevented linked guest history from double-counting users.

## 1.3.10 - 2026-05-19
- Bug fixes and general improvements
- Hardened analytics ingest event contracts.
- Clarified Firestore write destinations for telemetry.
- Reduced retry and diagnostic noise for invalid analytics payloads.

## 1.3.9 - 2026-05-19
- Bug fixes and general improvements
- Mapped telemetry dependencies from client events to analytics evidence.
- Closed broken telemetry lanes and stale tracking claims.
- Kept product truth separate from debug and external evidence.

## 1.3.8 - 2026-05-19
- Bug fixes and general improvements
- Clarified Google Analytics evidence status.
- Kept first-party analytics as product truth.
- Prevented missing GA4 data from showing as zero traffic.

## 1.3.7 - 2026-05-19
- Bug fixes and general improvements
- Split large Admin Analytics and Debug logic into focused modules.
- Removed or deferred unnecessary admin analytics work.
- Classified GA4 as configured, missing, or evidence-only instead of guessing.

## 1.3.6 - 2026-05-19
- Bug fixes and general improvements
- Cleaned up creator and user dashboard logic.
- Consolidated creator navigation and dashboard surface rules.
- Reduced stale duplicated dashboard logic.

## 1.3.5 - 2026-05-19
- Bug fixes and general improvements
- Refined Creator Drop Manager for mobile.
- Clarified submit-for-review flow for creator drops.
- Kept creator drop management separate from My KandyDrops.

## 1.3.4 - 2026-05-19
- Bug fixes and general improvements
- Added a creator drop management lane separate from My KandyDrops.
- Let creators submit drops for admin approval.
- Kept pending creator submissions out of public rotation until approved.

## 1.3.3 - 2026-05-19
- Bug fixes and general improvements
- Refined creator dashboard mobile overview layout.
- Changed creator overview Fans label to Followers.
- Reduced creator overview grid density for a more compact mobile fit.

## 1.3.2 - 2026-05-19
- Bug fixes and general improvements
- Made Beta readiness freshness messages easier to understand.
- Replaced Git jargon with plain refresh guidance.
- Kept internal freshness checks strict while improving operator copy.

## 1.3.1 - 2026-05-19
- Bug fixes and general improvements
- Refreshed Beta readiness from the latest source state.
- Mapped remaining Beta evidence gaps with exact next steps.
- Kept revenue, runtime, and admin proof separate from source-only checks.

## 1.3.0 - 2026-05-19
- Bug fixes and general improvements
- Refined Beta health scoring beyond hard pass/fail gates.
- Separated source readiness, runtime proof, evidence freshness, and cost risk.
- Kept formal beta exit gates intact while improving score nuance.

## 1.2.99 - 2026-05-19
- Bug fixes and general improvements
- Cleaned up Creator Dashboard and Creator Settings navigation.
- Removed stale creator/user dashboard stacking rules.
- Locked readable Fan Pass CRM and broadcast audience behavior.

## 1.2.98 - 2026-05-19
- Bug fixes and general improvements
- Separated Creator Dashboard from user reward and library sections.
- Kept Daily Rewards and My KandyDrops on the normal user dashboard.
- Cleaned up creator dashboard route boundaries on mobile.

## 1.2.97 - 2026-05-19
- Bug fixes and general improvements
- Made Fan Pass subscribers readable in Creator Dashboard.
- Added mobile-first Fan Pass CRM rows.
- Clarified Creator Broadcast audience language.

## 1.2.96 - 2026-05-19
- Bug fixes and general improvements
- Combined Creator Dashboard stats into one compact overview.
- Fixed creator fan and content count source mapping.
- Separated creator-owned content counts from public drop discovery.

## 1.2.95 - 2026-05-19
- Bug fixes and general improvements
- Locked the full analytics cost cleanup audit.
- Verified cost reductions do not compromise tracking accuracy.
- Refreshed Beta readiness with cost and analytics evidence.

## 1.2.94 - 2026-05-19
- Bug fixes and general improvements
- Guarded SQL mirror and Data Connect cost paths.
- Clarified Cloud SQL and Gemini cost owner-review lanes.
- Blocked accidental background AI or SQL cost work.

## 1.2.93 - 2026-05-19
- Bug fixes and general improvements
- Reduced scheduled analytics and runtime scan costs.
- Moved recurring jobs toward due-only and incremental work.
- Kept subscription, notification, and queue correctness intact.

## 1.2.92 - 2026-05-19
- Bug fixes and general improvements
- Reduced default Admin Analytics and Debug read costs.
- Moved expensive admin sections behind snapshots, cache, or drilldowns.
- Preserved truth labels for stale, missing, and unavailable data.

## 1.2.91 - 2026-05-19
- Bug fixes and general improvements
- Reduced non-priority client analytics flush volume.
- Summarized hover, visibility, and scroll telemetry.
- Kept priority conversion and watch-time tracking accurate.

## 1.2.90 - 2026-05-19
- Bug fixes and general improvements
- Reduced hot-path analytics ingest and export cost risks.
- Moved low-priority analytics work toward batched lanes.
- Kept priority tracking accuracy intact while cutting retry and export churn.

## 1.2.89 - 2026-05-19
- Bug fixes and general improvements
- Reduced hot-path analytics and export cost risks.
- Moved non-priority analytics work toward batched and cached lanes.
- Kept priority tracking accuracy intact while reducing retry and export churn.

## 1.2.88 - 2026-05-18
- Bug fixes and general improvements
- Kept admin debug panels from showing missing evidence as healthy.
- Reduced duplicate admin analytics and debug lookup work.
- Updated the Scorecard security action and closed out the remaining PR lane.

## 1.2.87 - 2026-05-18
- Bug fixes and general improvements
- Improved loading state accessibility for buttons.
- Kept remaining risky PRs out of the beta cleanup lane.
- Recorded final open PR owner-review actions.
