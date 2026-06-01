# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 6 public updates in pages of 5.

## 1.5.29 - 2026-06-01
- More reliable Drop viewing
- Fixed a Drop viewer access race that could show Not Authorized after a Drop was already unwrapped.
- Stabilized loading while account and unlock entitlement checks finish.
- Added safer access-state reporting for Drop viewer bug reports.

## 1.5.28 - 2026-05-31
- Bug fixes and general improvements
- Improved chat media sizing and message-thread scrolling.
- Improved guest analytics and admin truth checks behind the scenes.
- Updated Beta readiness evidence so stale or missing launch evidence stays visible.

## 1.5.27 - 2026-05-31
- Cost risk truth cleanup
- Updated Beta cost readiness so current source cost guard checks are counted accurately.
- Kept Cloud Run, Cloud SQL/Data Connect, Gemini/Vertex, and billing proof as owner-review requirements.
- Preserved the rule that source cost guards do not prove external billing savings.

## 1.5.26 - 2026-05-31
- Analytics panel truth cleanup
- Reclassified analytics panels so wired-but-unobserved metrics no longer appear as missing source.
- Kept provider, runtime, billing, and payment proof separate from source-only telemetry checks.
- Preserved missing data as collecting, expected-unobserved, source-ready, or manual-required instead of showing fake zeroes.

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
