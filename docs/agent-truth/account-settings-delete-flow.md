# Account Settings Delete Flow

Generated: 2026-06-20T14:16:19.531Z
Status: pass
Current head: a911e986de81d6667ab9cc108cacbe3831cd8465

## Contract

- Account Settings owns additional bottom scroll padding so the Delete Account row can move above the floating Report issue chip, bottom nav, and safe area.
- The Report issue chip, top nav, bottom nav, chat, payment, wallet, PayPal, and GumDrop math remain untouched.
- Delete Account uses an explicit confirmation modal before calling the existing authenticated server delete route.
- The client never passes an arbitrary user id. `/api/user/delete` scopes deletion to the authenticated caller.
- Failures use human-readable account-safety copy and create debug-visible client evidence.
- Telemetry is identity-aware through the canonical client telemetry envelope and does not include PII or provider payloads.

## Flow Inventory

- Before: fully_wired_route_with_window_confirm_and_raw_failure_copy
- After: fully_wired_modal_confirmed_immediate_server_delete
- Immediate deletion behavior: Existing authenticated server route deletes account data and deletes the Firebase Auth user; client only submits intent and signs out after success.

## Checks

- pass: accountSettingsBottomSafe
- pass: reportIssueChipUntouched
- pass: bottomNavUntouched
- pass: topNavUntouched
- pass: chatPaymentGumdropMathUntouched
- pass: deleteUiHasConfirmationStep
- pass: deleteUsesExistingSafeRoute
- pass: clientCannotPassArbitraryUserId
- pass: immediateDeletionTruthful
- pass: humanFailureCopy
- pass: deleteTelemetryRegistered
- pass: deleteTelemetryNoPii
- pass: debugVisibleFailure
- pass: packageScriptPresent

## Changed Files

- .jules/bolt.md
- FULL_SCALE_CODEBASE_AUDIT.md
- agent/state/creator-landing-dashboard-mobile.generated.json
- agent/state/creator-settings-source-health.generated.json
- agent/state/creator-surface-routing.generated.json
- agent/state/notification-permission-lifecycle.generated.json
- agent/state/settings-debug-validator-authority.generated.json
- agent/state/settings-route-alias-cleanup.generated.json
- agent/state/support-policy-surface-cleanup.generated.json
- agent/state/user-profile-api-contract.generated.json
- docs/agent-truth/creator-settings-source-health.md
- docs/agent-truth/notification-permission-lifecycle.md
- docs/agent-truth/settings-debug-validator-authority.md
- docs/agent-truth/settings-route-alias-cleanup.md
- docs/agent-truth/support-policy-surface-cleanup.md
- docs/agent-truth/user-profile-api-contract.md
- pnpm-lock.yaml
- src/components/Creators/CreatorDropManager.tsx

## Validation Failures

- none
