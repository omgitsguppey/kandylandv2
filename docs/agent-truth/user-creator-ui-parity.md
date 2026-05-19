# User + Creator UI Parity

Generated evidence: `agent/state/user-creator-ui-parity.generated.json`
Validator: `npm run check:user-creator-ui-parity`

This lane is scoped to user-facing and creator-facing UI quality only. It must not modify Admin backend, Admin Debug, Admin Analytics, Cloud/Firebase/BigQuery, payment/wallet/PayPal runtime, or AI cover runtime.

## Locked Rules

- Creator dashboard managers load only when their section is opened.
- Creator Dashboard and the normal user dashboard must remain separate route bodies. `/dashboard/creator` renders creator modules only, while `/dashboard` preserves the user reward, spotlight, activity, and library modules for normal users.
- Creator dashboard card actions must be real routes or section toggles with specific labels.
- Fan Pass in the Creator Dashboard is subscriber visibility only; fan subscribe/cancel actions stay in public creator flows.
- Requests and bookings managers expose creator-side management only, not fan-side create flows.
- Manager buttons need mobile-safe hit targets and disabled/loading/error states when they mutate or fetch.
- Primary creator/user cards should show compact state and action copy. Source/audit detail stays in data attributes, Debug, or detail-only surfaces.
- Nested creator scroll regions require an explicit approval data attribute and a bounded reason.
- Chat UI shell checks are limited to front-end layout/safe-area markers; message persistence and chat backend internals are out of scope.

## This Pass

- Replaced generic creator card route copy with specific profile/chat labels.
- Removed source-evidence helper copy from primary creator dashboard card details.
- Raised creator manager refresh/action controls and Beta release drawer pagination controls to mobile-safe tap targets.
- Marked the creator agreement legal-text scroll region as an approved bounded nested scroll.
- Added a user/creator parity report and validator to keep fake actions, eager manager mounts, Fan Pass mutation controls, and forbidden admin drift from returning.

## Deferred

- Admin backend/debug/analytics backlog is forbidden for this lane.
- Payment, wallet, PayPal, entitlement, and unlock runtime parity are forbidden for this lane.
- Screenshot QA is the next confirmation layer for user and creator surfaces; it should confirm source parity, not rediscover basic route/action truth.
