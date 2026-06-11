# Admin Browser Surface Smoke

Status: compact local browser evidence boundary for admin surfaces.

This report is not production admin truth, provider smoke, deployed runtime smoke, or GumDrop/payment proof.

## Summary

- Status: browser_boundary_partial
- Passed in source validation: false
- Admin surfaces: 14
- Route targets: 14
- Source admin pages: 14
- Layout selector contract present: true
- Browser harness contract present: true
- Required authenticated surface/device checks: 18
- Evidence entries: 18
- Authenticated checks present: 0
- Unauthenticated boundary checks present: 18
- Unauthenticated redirect checks present: 12
- Evidence source: local_in_app_browser
- Evidence mode: unauthenticated_only
- Evidence base URL: http://127.0.0.1:3210
- Evidence captured at: 2026-06-11T18:49:50.000Z
- Protected surfaces: admin_economy

## Surfaces

- admin_overview: route=/admin; smokePath=/admin; devices=mobile,desktop; group=overview; selectors=[data-admin-browser-surface="admin_overview"]; markers=Admin Overview | data-admin-platform-pulse-grid; reason=Main admin landing page and shell navigation must render without hiding source-state labels.
- admin_analytics: route=/admin/analytics; smokePath=/admin/analytics; devices=mobile,desktop; group=analytics; selectors=[data-admin-browser-surface="admin_analytics"]; markers=Analytics Overview | data-admin-mobile-surface=analytics | data-admin-analytics-summary=primary; reason=Analytics panels are dense and must keep snapshot/cache states visible.
- admin_drops: route=/admin/drops; smokePath=/admin/drops; devices=desktop; group=content; selectors=[data-admin-browser-surface="admin_drops"]; markers=Manage Drops | Admin Drops; reason=Drop moderation and approval controls need admin-only browser confirmation.
- admin_users: route=/admin/users; smokePath=/admin/users; devices=mobile,desktop; group=people; selectors=[data-admin-browser-surface="admin_users"]; markers=User Management | data-admin-users-snapshot-state | data-admin-users-stats-layout=compact-grid; reason=User metrics must not collapse missing data into healthy zero states.
- admin_user_detail: route=/admin/user/[userId]; smokePath=/admin/user/browser-smoke-user; devices=desktop; group=people; selectors=[data-admin-browser-surface="admin_user_detail"]; markers=Engagement verdict | Recommendation verdict | Value verdict; reason=User detail drilldown is identity and support sensitive and requires authenticated browser review.
- admin_roster: route=/admin/roster; smokePath=/admin/roster; devices=desktop; group=people; selectors=[data-admin-browser-surface="admin_roster"]; markers=Creator Review | data-roster-mode=decision_queue; reason=Creator roster decisions need explicit review/waiting/approved states.
- admin_debug: route=/admin/debug; smokePath=/admin/debug; devices=mobile,desktop; group=ops; selectors=[data-admin-browser-surface="admin_debug"]; markers=Debug Console | data-admin-mobile-surface=debug | data-admin-debug-sprawl-reduction=target-75-95; reason=Control Tower must show stale/missing/fallback evidence without raw dumps first.
- admin_ai: route=/admin/ai; smokePath=/admin/ai; devices=desktop; group=ops; selectors=[data-admin-browser-surface="admin_ai"]; markers=Cover Ops | Cover Ops Verification; reason=AI tooling must show enablement, budget, model, and fallback states safely.
- admin_support: route=/admin/support; smokePath=/admin/support; devices=desktop; group=ops; selectors=[data-admin-browser-surface="admin_support"]; markers=Support Workspace | Admin Console; reason=Support inbox states must distinguish missing thread, permission denial, retryable failure, submitted, and received.
- admin_moderation: route=/admin/moderation; smokePath=/admin/moderation; devices=desktop; group=ops; selectors=[data-admin-browser-surface="admin_moderation"]; markers=Moderation Control Tower | data-admin-moderation-v2=real-risk-workspace; reason=Moderation must avoid treating weak browser heuristics as confirmed server proof.
- admin_content: route=/admin/content; smokePath=/admin/content; devices=desktop; group=content; selectors=[data-admin-browser-surface="admin_content"]; markers=Content Manager | Admin Storage; reason=Content management affordances must be hidden, disabled, or unavailable when not implemented.
- admin_queue: route=/admin/queue; smokePath=/admin/queue; devices=desktop; group=content; selectors=[data-admin-browser-surface="admin_queue"]; markers=Manage Queue | Admin Queue; reason=Queue states must expose pending/review/source-missing truth.
- admin_privacy: route=/admin/privacy; smokePath=/admin/privacy; devices=desktop; group=ops; selectors=[data-admin-browser-surface="admin_privacy"]; markers=Privacy Console | Admin Setup; reason=Privacy and consent surfaces must keep source and policy boundaries visible.
- admin_economy: route=/admin/economy; smokePath=/admin/economy; devices=desktop; group=protected_money; selectors=[data-admin-browser-surface="admin_economy"]; markers=GumDrops Commerce Control Center | Platform Economy; reason=Economy views are protected: browser smoke may inspect labels only and cannot prove GumDrop/payment truth.

## Source Route Coverage

- /admin
- /admin/ai
- /admin/analytics
- /admin/content
- /admin/debug
- /admin/drops
- /admin/economy
- /admin/moderation
- /admin/privacy
- /admin/queue
- /admin/roster
- /admin/support
- /admin/user/[userId]
- /admin/users

## Missing Source Routes

- none

## Extra Surface Routes

- none

## Layout Selector Contract

- Owner: src/app/admin/layout.tsx
- Surface attribute: true
- Route attribute: true
- Group attribute: true
- Uses resolver: true

## Browser Harness Contract

- Owner: tests/ui-audits/admin-browser-surface-smoke.spec.ts
- Package script: check:admin-browser-surface-smoke:browser
- Package script present: true
- Imports canonical surface map: true
- Explicit env gate: true
- Uses storage state env: true
- Uses canonical selectors: true
- Uses browserSmokePath: true
- Checks route attribute: true
- Rejects public home fallback: true

## Missing Authenticated Browser Evidence

- admin_overview:mobile
- admin_overview:desktop
- admin_analytics:mobile
- admin_analytics:desktop
- admin_drops:desktop
- admin_users:mobile
- admin_users:desktop
- admin_user_detail:desktop
- admin_roster:desktop
- admin_debug:mobile
- admin_debug:desktop
- admin_ai:desktop
- admin_support:desktop
- admin_moderation:desktop
- admin_content:desktop
- admin_queue:desktop
- admin_privacy:desktop
- admin_economy:desktop

## Does Not Prove

- local browser smoke does not clear deployed runtime smoke
- local browser smoke does not clear provider smoke
- local browser smoke does not clear production admin truth sample evidence
- local browser smoke does not clear payment or GumDrop treasury truth

## Next Exact Steps

- Run ADMIN_BROWSER_SMOKE=1 ADMIN_BROWSER_SMOKE_STORAGE_STATE=<path> npm run check:admin-browser-surface-smoke:browser against an authenticated admin session or attach operator screenshots.
- Keep /admin/economy in protected label-only review; browser smoke cannot prove GumDrop/payment truth.
- Use source validators for admin truth and runtime evidence separately; do not let browser smoke clear provider/runtime/admin-truth gates.
