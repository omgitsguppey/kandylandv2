# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.3.31 - 2026-05-20
- Bug fixes and general improvements
- Added creator-facing drop status and expiry labels.
- Showed drop views, clicks, and unwraps inline when available.
- Kept admin-only drop controls hidden from creators.

## 1.3.30 - 2026-05-20
- Bug fixes and general improvements
- Improved user dashboard and wallet loading on mobile.
- Reduced wallet module scale without changing payment logic.
- Kept chat and navigation unchanged.

## 1.3.29 - 2026-05-20
- Bug fixes and general improvements
- Refined existing scoring, telemetry, layout, pricing, and drop-status algorithms.
- Removed duplicate fallback logic instead of adding new systems.
- Kept chat and payment logic unchanged.

## 1.3.28 - 2026-05-20
- Bug fixes and general improvements
- Checked recent creator, UI, and telemetry wiring for stale or orphaned logic.
- Cleaned up disconnected routes, telemetry lanes, and parity conflicts.
- Kept chat unchanged while tightening product surface wiring.

## 1.3.27 - 2026-05-20
- Bug fixes and general improvements
- Reused marquee behavior for long truncated titles.
- Improved readability for long creator, drop, and admin labels.
- Respected reduced-motion preferences for title animations.

## 1.3.26 - 2026-05-20
- Bug fixes and general improvements
- Reduced creator profile header scale on mobile.
- Prepared creator profiles for drop and broadcast timelines.
- Kept private and pending creator content hidden from public profiles.

## 1.3.25 - 2026-05-20
- Bug fixes and general improvements
- Prepared creator broadcasts for follower notifications.
- Added timeline-ready broadcast and drop source contracts.
- Kept broadcast fanout bounded and idempotent.

## 1.3.24 - 2026-05-20
- Bug fixes and general improvements
- Connected creator Fan Pass pricing to user-facing flows.
- Aligned creator experience prices with creator settings.
- Preserved paid-GumDrop-only rules for creator experiences.

## 1.3.23 - 2026-05-20
- Bug fixes and general improvements
- Added creator settings controls for Fan Pass, broadcasts, and creator experiences.
- Connected creator setup warnings to actual settings.
- Kept creator settings mobile-first and user-facing safe.

## 1.3.22 - 2026-05-20
- Bug fixes and general improvements
- Locked mobile UI scaling and organization checks.
- Added self-check rules for future UI changes.
- Kept navigation and chat protected from broad mobile cleanup.

## 1.3.21 - 2026-05-20
- Bug fixes and general improvements
- Improved mobile organization across admin, user, and creator screens.
- Collapsed desktop-heavy sections into mobile summaries and drilldowns.
- Kept navigation and chat unchanged.

## 1.3.20 - 2026-05-20
- Bug fixes and general improvements
- Improved mobile loading and skeleton stability.
- Reduced layout shift during dashboard hydration.
- Added stale-request guards for mobile data loading.

## 1.3.19 - 2026-05-19
- Bug fixes and general improvements
- Reduced oversized mobile layouts across admin, user, and creator screens.
- Replaced desktop-scale spacing with compact mobile density rules.
- Kept navigation and chat surfaces unchanged.

## 1.3.18 - 2026-05-19
- Bug fixes and general improvements
- Added mobile-first UI scaling rules.
- Prepared shared density and skeleton guidance for admin, user, and creator screens.
- Protected navigation and chat surfaces from broad UI cleanup.

## 1.3.17 - 2026-05-19
- Bug fixes and general improvements
- Locked telemetry dependency closure status.
- Mapped analytics from client tracking through admin evidence.
- Kept beta evidence requirements separate from source readiness.

## 1.3.16 - 2026-05-19
- Bug fixes and general improvements
- Simplified admin telemetry health reporting.
- Separated live, degraded, unavailable, and unproven analytics lanes.
- Kept raw telemetry details behind debug drilldowns.

## 1.3.15 - 2026-05-19
- Bug fixes and general improvements
- Closed Google Analytics evidence ambiguity.
- Kept external analytics separate from product truth.
- Prevented missing external analytics from showing as zero traffic.

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
