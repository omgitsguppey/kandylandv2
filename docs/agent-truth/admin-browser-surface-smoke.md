# Admin Browser Surface Smoke

Status: compact local browser evidence boundary for admin surfaces.

This report is not production admin truth, provider smoke, deployed runtime smoke, or GumDrop/payment proof.

## Summary

- Status: source_contract_ready
- Passed in source validation: true
- Admin surfaces: 14
- Route targets: 14
- Source admin pages: 14
- Layout selector contract present: true
- Browser harness contract present: true
- Optional authenticated reproduction surface/device checks: 18
- Evidence entries: 0
- Authenticated checks present: 0
- Local fixture checks present: 0
- Account-free fixture checks covered: 0
- Account-free fixture checks pending: 18
- Unauthenticated boundary checks present: 0
- Unauthenticated redirect checks present: 0
- Source contract only: 18
- Unauthenticated boundary verified: 0
- Account-free fixture verified: 0
- Account-free fixture missing: 18
- Authenticated admin verified: 0
- Optional authenticated browser reproduction missing: 18
- Protected label-only surfaces: 1
- Evidence source: none
- Evidence mode: none
- Evidence base URL: none
- Evidence captured at: none
- Protected surfaces: admin_economy

## Source Smoke

- admin_overview: route=/admin; component=src/app/admin/page.tsx; selector=[data-admin-browser-surface="admin_overview"]; marker=Admin Overview; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Overview source contract is clear; use browser only to reproduce a source-reported issue.
- admin_analytics: route=/admin/analytics; component=src/app/admin/analytics/page.tsx; selector=[data-admin-browser-surface="admin_analytics"]; marker=Analytics Overview; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Analytics source contract is clear; use browser only to reproduce a source-reported issue.
- admin_drops: route=/admin/drops; component=src/app/admin/drops/page.tsx; selector=[data-admin-browser-surface="admin_drops"]; marker=Manage Drops; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Drops source contract is clear; use browser only to reproduce a source-reported issue.
- admin_users: route=/admin/users; component=src/app/admin/users/page.tsx; selector=[data-admin-browser-surface="admin_users"]; marker=User Management; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Users source contract is clear; use browser only to reproduce a source-reported issue.
- admin_user_detail: route=/admin/user/[userId]; component=src/app/admin/user/[userId]/page.tsx; selector=[data-admin-browser-surface="admin_user_detail"]; marker=Engagement verdict; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin User Detail source contract is clear; use browser only to reproduce a source-reported issue.
- admin_roster: route=/admin/roster; component=src/app/admin/roster/page.tsx; selector=[data-admin-browser-surface="admin_roster"]; marker=Creator Review; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Roster source contract is clear; use browser only to reproduce a source-reported issue.
- admin_debug: route=/admin/debug; component=src/app/admin/debug/page.tsx; selector=[data-admin-browser-surface="admin_debug"]; marker=Debug Console; sourceTruth=source_reports_only; freshnessState=source_reports_only; confidence=medium; next=Admin Debug uses local generated source reports for account-free smoke; use browser only to reproduce a source-reported issue.
- admin_ai: route=/admin/ai; component=src/app/admin/ai/page.tsx; selector=[data-admin-browser-surface="admin_ai"]; marker=Cover Ops; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin AI source contract is clear; use browser only to reproduce a source-reported issue.
- admin_support: route=/admin/support; component=src/app/admin/support/page.tsx; selector=[data-admin-browser-surface="admin_support"]; marker=Support Workspace; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Support source contract is clear; use browser only to reproduce a source-reported issue.
- admin_moderation: route=/admin/moderation; component=src/app/admin/moderation/page.tsx; selector=[data-admin-browser-surface="admin_moderation"]; marker=Moderation Control Tower; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Moderation source contract is clear; use browser only to reproduce a source-reported issue.
- admin_content: route=/admin/content; component=src/app/admin/content/page.tsx; selector=[data-admin-browser-surface="admin_content"]; marker=Storage assets; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Content source contract is clear; use browser only to reproduce a source-reported issue.
- admin_queue: route=/admin/queue; component=src/app/admin/queue/page.tsx; selector=[data-admin-browser-surface="admin_queue"]; marker=Manage Queue; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Queue source contract is clear; use browser only to reproduce a source-reported issue.
- admin_privacy: route=/admin/privacy; component=src/app/admin/privacy/page.tsx; selector=[data-admin-browser-surface="admin_privacy"]; marker=Privacy Console; sourceTruth=source_clear; freshnessState=source_fresh; confidence=high; next=Admin Privacy source contract is clear; use browser only to reproduce a source-reported issue.
- admin_economy: route=/admin/economy; component=src/app/admin/economy/page.tsx; selector=[data-admin-browser-surface="admin_economy"]; marker=GumDrops Commerce Control Center; sourceTruth=provider_required; freshnessState=external_proof_required; confidence=external_required; next=Admin Economy is source-visible only; keep GumDrop/payment proof in the formal provider/admin truth lane.

## Source Smoke Contracts

- Route contract present: true
- Layout hydration marker present: true
- Control Tower fixture source reports only: true
- Route runtime health verification present: true
- Client-error fixture/debug evidence present: true

## Surfaces

- admin_overview: route=/admin; smokePath=/admin; devices=mobile,desktop; group=overview; selectors=[data-admin-browser-surface="admin_overview"]; markers=Admin Overview | data-admin-platform-pulse-grid; reason=Main admin landing page and shell navigation must render without hiding source-state labels.
- admin_analytics: route=/admin/analytics; smokePath=/admin/analytics; devices=mobile,desktop; group=analytics; selectors=[data-admin-browser-surface="admin_analytics"]; markers=Analytics Overview | data-admin-mobile-surface=analytics | data-admin-analytics-summary=primary; reason=Analytics panels are dense and must keep snapshot/cache states visible.
- admin_drops: route=/admin/drops; smokePath=/admin/drops; devices=desktop; group=content; selectors=[data-admin-browser-surface="admin_drops"]; markers=Manage Drops | Admin Drops; reason=Drop moderation and approval controls need source-state markers before optional browser reproduction.
- admin_users: route=/admin/users; smokePath=/admin/users; devices=mobile,desktop; group=people; selectors=[data-admin-browser-surface="admin_users"]; markers=User Management | data-admin-users-snapshot-state | data-admin-users-stats-layout=compact-grid; reason=User metrics must not collapse missing data into healthy zero states.
- admin_user_detail: route=/admin/user/[userId]; smokePath=/admin/user/browser-smoke-user; devices=desktop; group=people; selectors=[data-admin-browser-surface="admin_user_detail"]; markers=Engagement verdict | Recommendation verdict | Value verdict; reason=User detail drilldown is identity and support sensitive; use authenticated browser reproduction only for a source-reported issue.
- admin_roster: route=/admin/roster; smokePath=/admin/roster; devices=desktop; group=people; selectors=[data-admin-browser-surface="admin_roster"]; markers=Creator Review | data-roster-mode=decision_queue; reason=Creator roster decisions need explicit review/waiting/approved states.
- admin_debug: route=/admin/debug; smokePath=/admin/debug; devices=mobile,desktop; group=ops; selectors=[data-admin-browser-surface="admin_debug"]; markers=Debug Console | data-admin-mobile-surface=debug | data-admin-debug-sprawl-reduction=target-75-95; reason=Control Tower must show stale/missing/fallback evidence without raw dumps first.
- admin_ai: route=/admin/ai; smokePath=/admin/ai; devices=desktop; group=ops; selectors=[data-admin-browser-surface="admin_ai"]; markers=Cover Ops | Cover Ops Verification; reason=AI tooling must show enablement, budget, model, and fallback states safely.
- admin_support: route=/admin/support; smokePath=/admin/support; devices=desktop; group=ops; selectors=[data-admin-browser-surface="admin_support"]; markers=Support Workspace | Admin Console; reason=Support inbox states must distinguish missing thread, permission denial, retryable failure, submitted, and received.
- admin_moderation: route=/admin/moderation; smokePath=/admin/moderation; devices=desktop; group=ops; selectors=[data-admin-browser-surface="admin_moderation"]; markers=Moderation Control Tower | data-admin-moderation-v2=real-risk-workspace; reason=Moderation must avoid treating weak browser heuristics as confirmed server proof.
- admin_content: route=/admin/content; smokePath=/admin/content; devices=desktop; group=content; selectors=[data-admin-browser-surface="admin_content"]; markers=Storage assets | Admin content; reason=Content management affordances must be hidden, disabled, or unavailable when not implemented.
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
- Supports local fixture session: true
- Uses canonical selectors: true
- Uses browserSmokePath: true
- Checks route attribute: true
- Rejects public home fallback: true
- Writes optional evidence dir: true

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

## Missing Account-Free Fixture Evidence

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

- For local account-free UI rendering checks, run NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1 and ADMIN_BROWSER_SMOKE=1 ADMIN_BROWSER_SMOKE_FIXTURE_SESSION=1 ADMIN_BROWSER_SMOKE_EVIDENCE_DIR=<tmp-dir> npm run check:admin-browser-surface-smoke:browser; this records local_fixture_surface_verified evidence without requiring real admin test accounts.
- Use authenticated browser checks only as optional reproduction for a source-reported admin UI issue; do not use them as source, provider, runtime, admin-truth, payment, or GumDrop proof.
- For direct in-app Browser audits without Playwright, start the local dev server with NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1, open /api/admin-ui-test-session?redirect=/admin once to mint the bounded local fixture cookie, then navigate admin routes normally; this proves local route rendering only.
- Keep browser evidence fragments local or attach them to a specific issue; do not commit route-rendering logs as canonical proof.
- Keep /admin/economy in protected label-only review; browser smoke cannot prove GumDrop/payment truth.
- Use source validators for admin truth and runtime evidence separately; do not let browser smoke clear provider/runtime/admin-truth gates.
