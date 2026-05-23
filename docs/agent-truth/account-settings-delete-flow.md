# Account Settings Delete Flow

Generated: 2026-05-23T00:11:23.421Z
Status: pass
Current head: 80ff5ebbd6a11a027951de58f1c8e1e859295785

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

- CHANGELOG.md
- agent/state/account-settings-delete-flow.generated.json
- docs/agent-truth/account-settings-delete-flow.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-account-settings-delete-flow.ts
- src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx
- src/app/dashboard/profile/hooks/useProfileState.tsx
- src/components/Settings/UserSettingsPage.tsx
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- tests/unit/account-settings-delete-flow.spec.ts

## Validation Failures

- none
