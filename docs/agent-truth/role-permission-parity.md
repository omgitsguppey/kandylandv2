# Role Permission Parity

Generated: 2026-06-11T15:03:17.374Z
Status: pass
Head: c5e5f6fccd93481f42b0da25a10f85ae0df6f0a8

## Summary

This report is the Phase 4 role parity lock for guest, user, creator, admin, and system roles. It maps major surfaces to view permissions, action permissions, denied states, telemetry, debug visibility, and score evidence without changing auth provider logic, navigation, payment runtime, or GumDrop math.

- Surfaces registered: 17
- Roles: guest, user, creator, admin, system
- Permissions: view_surface, use_action, mutate_settings, submit_drop, approve_drop, view_admin_truth, view_creator_metrics, view_user_wallet, send_chat, manage_support, receive_notification
- Production reads: no
- Provider calls: no
- Auth provider logic changed: no
- Payment runtime changed: no
- GumDrop math changed: no
- Nav changed: no

## Surfaces

| Surface | Feature | Visible roles | Denied telemetry | Denied title |
| --- | --- | --- | --- | --- |
| public_homepage | drops | guest:allowed, user:allowed, creator:allowed, admin:allowed | public_homepage_permission_denied | Access is required |
| auth | auth_identity | guest:allowed | auth_permission_denied | Access is required |
| user_dashboard | user_dashboard | user:allowed, creator:allowed, admin:allowed | user_dashboard_permission_denied | Access is required |
| wallet_purchase_modal | wallet | user:allowed, creator:allowed, admin:allowed | wallet_purchase_modal_permission_denied | Sign in first |
| drops_library | library | guest:readonly, user:allowed, creator:allowed, admin:allowed | drops_library_permission_denied | Access is required |
| creator_dashboard | creator_dashboard | creator:allowed, admin:allowed | creator_dashboard_permission_denied | Creator access required |
| creator_settings | creator_settings | creator:allowed, admin:allowed | creator_settings_permission_denied | Creator access required |
| creator_drop_manager | creator_drop_manager | creator:allowed, admin:allowed | creator_drop_manager_permission_denied | Creator access required |
| creator_profile_timeline | creator_profile | guest:readonly, user:allowed, creator:allowed, admin:allowed | creator_profile_timeline_permission_denied | Creator access required |
| chat | chat_system_internal | user:allowed, creator:allowed | chat_permission_denied | Access is required |
| daily_tasks_checkin | daily_checkin | user:allowed, creator:allowed, admin:allowed | daily_tasks_checkin_permission_denied | Access is required |
| notifications_pwa_prompt | notifications | guest:readonly, user:allowed, creator:allowed, admin:allowed | notifications_pwa_prompt_permission_denied | Access is required |
| account_settings | user_dashboard | user:allowed, creator:allowed, admin:allowed | account_settings_permission_denied | Access is required |
| admin_dashboard | admin_debug | admin:allowed, system:service_only | admin_dashboard_permission_denied | Admin access required |
| admin_debug | admin_debug | admin:allowed, system:service_only | admin_debug_permission_denied | Admin access required |
| user_management | admin_debug | admin:allowed, system:service_only | user_management_permission_denied | Admin access required |
| support_policies | support | guest:readonly, user:allowed, creator:allowed, admin:allowed, system:service_only | support_policies_permission_denied | Access is required |

## Debug Lane

- Lane: Role parity
- Route mismatches: 0
- Denied-state gaps: 0
- Leaked controls: 0
- Missing role mappings: 0

## Account / Creator Settings Split

- Account Settings user visible: true
- Creator Settings plain user denied: true
- Creator Settings creator visible: true

## Score Dimension Impact

- Before: Role permissions were enforced through route-local checks, feature branches, and scattered settings/admin assumptions.
- After: User, creator, admin, guest, and system roles now share one permission map with denied states, telemetry, and debug evidence.
- Dimensions: sourceHealth, runtimeHealth, evidenceCompleteness, regressionRisk

## Existing Logic Classification

- src/context/AuthContext.tsx: active_canonical - Auth provider owns Firebase identity and profile hydration; Phase 4 reads role only and does not change provider logic.
- src/lib/user-utils.ts: active_canonical - User profile normalization remains the canonical role source for user, creator, and admin profile roles.
- src/lib/chat.ts: in_flight_classified_only - Chat role internals remain untouched; parity only classifies chat as user/creator visible and admin hidden.

## Validation

- No validation failures.
