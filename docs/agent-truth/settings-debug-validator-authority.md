# Settings Debug Validator Authority

Generated: 2026-07-14T16:10:24.557Z

## Status

failed

## Settings Health Lane

- Lane: `Settings health`
- Source: `src/lib/debug/settings-debug-validator-authority.ts`
- Raw details default: collapsed

## Active Validators

- `check:settings-connection-parity` (settings_connection_parity)
- `check:settings-route-alias-cleanup` (settings_route_alias_cleanup)
- `check:stale-client-preferences-cleanup` (stale_client_preferences_cleanup)
- `check:support-policy-surface-cleanup` (support_policy_surface_cleanup)
- `check:user-profile-api-contract` (user_profile_api_contract)
- `check:account-settings-delete-flow` (account_settings_delete_flow)
- `check:settings-debug-validator-authority` (settings_debug_validator_authority)

## Superseded Validators

- `check:settings-creator-dashboard-split` superseded by `check:settings-connection-parity`, `check:settings-route-alias-cleanup`

## Deprecated Artifacts

- `agent/state/settings-creator-dashboard-split.generated.json` -> excluded_from_settings_health_score

## Failures

- protected surfaces changed: src/app/api/chat/attachments/cancel/route.ts, src/app/api/chat/attachments/complete/route.ts, src/app/api/chat/attachments/prepare/route.ts, src/app/api/chat/threads/[threadId]/messages/route.ts, src/app/api/paypal/capture/route.ts, src/app/api/paypal/create/route.ts, src/app/api/wallet/packages/route.ts, src/components/Chat/ChatExperience.tsx, src/components/Navigation/NotificationBell.tsx, src/components/Navigation/ProfileDropdown.tsx
