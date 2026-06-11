# Surface Telemetry Parity

Generated: 2026-06-11T15:03:01.612Z

Status: pass

## Summary

- Major surfaces registered: 17
- Canonical event kinds: surface_viewed, surface_loaded, surface_empty_viewed, surface_degraded_viewed, surface_error_viewed, surface_action_attempted, surface_action_succeeded, surface_action_failed, surface_permission_denied, surface_not_configured_viewed
- Catalog events registered: 170
- Envelope mappings: 170
- Production reads performed: false
- Provider calls performed: false
- Fake events used: false
- High-frequency events added: false

## Surface Event Spine

| Surface | Feature | Events | Action triplet |
| --- | --- | ---: | --- |
| public_homepage | drops | 10 | public_homepage_surface_action_attempted / public_homepage_surface_action_succeeded / public_homepage_surface_action_failed |
| auth | auth_identity | 10 | auth_surface_action_attempted / auth_surface_action_succeeded / auth_surface_action_failed |
| user_dashboard | user_dashboard | 10 | user_dashboard_surface_action_attempted / user_dashboard_surface_action_succeeded / user_dashboard_surface_action_failed |
| wallet_purchase_modal | wallet | 10 | wallet_purchase_modal_surface_action_attempted / wallet_purchase_modal_surface_action_succeeded / wallet_purchase_modal_surface_action_failed |
| drops_library | library | 10 | drops_library_surface_action_attempted / drops_library_surface_action_succeeded / drops_library_surface_action_failed |
| creator_dashboard | creator_dashboard | 10 | creator_dashboard_surface_action_attempted / creator_dashboard_surface_action_succeeded / creator_dashboard_surface_action_failed |
| creator_settings | creator_settings | 10 | creator_settings_surface_action_attempted / creator_settings_surface_action_succeeded / creator_settings_surface_action_failed |
| creator_drop_manager | creator_drop_manager | 10 | creator_drop_manager_surface_action_attempted / creator_drop_manager_surface_action_succeeded / creator_drop_manager_surface_action_failed |
| creator_profile_timeline | creator_profile | 10 | creator_profile_timeline_surface_action_attempted / creator_profile_timeline_surface_action_succeeded / creator_profile_timeline_surface_action_failed |
| chat | chat_system_internal | 10 | chat_surface_action_attempted / chat_surface_action_succeeded / chat_surface_action_failed |
| daily_tasks_checkin | daily_checkin | 10 | daily_tasks_checkin_surface_action_attempted / daily_tasks_checkin_surface_action_succeeded / daily_tasks_checkin_surface_action_failed |
| notifications_pwa_prompt | notifications | 10 | notifications_pwa_prompt_surface_action_attempted / notifications_pwa_prompt_surface_action_succeeded / notifications_pwa_prompt_surface_action_failed |
| account_settings | user_dashboard | 10 | account_settings_surface_action_attempted / account_settings_surface_action_succeeded / account_settings_surface_action_failed |
| admin_dashboard | admin_debug | 10 | admin_dashboard_surface_action_attempted / admin_dashboard_surface_action_succeeded / admin_dashboard_surface_action_failed |
| admin_debug | admin_debug | 10 | admin_debug_surface_action_attempted / admin_debug_surface_action_succeeded / admin_debug_surface_action_failed |
| user_management | admin_debug | 10 | user_management_surface_action_attempted / user_management_surface_action_succeeded / user_management_surface_action_failed |
| support_policies | support | 10 | support_policies_surface_action_attempted / support_policies_surface_action_succeeded / support_policies_surface_action_failed |

## Legacy Aliases

Legacy names remain aliases only. New parity work should emit canonical surface spine names.

| Legacy event | Canonical event | Status |
| --- | --- | --- |
| home_page_viewed | public_homepage_surface_viewed | legacy_alias |
| hero_cta_clicked | public_homepage_surface_action_attempted | legacy_alias |
| auth_surface_viewed | auth_surface_viewed | legacy_alias |
| auth_modal_opened | auth_surface_viewed | legacy_alias |
| auth_attempt_started | auth_surface_action_attempted | legacy_alias |
| auth_attempt_succeeded | auth_surface_action_succeeded | legacy_alias |
| auth_attempt_failed | auth_surface_action_failed | legacy_alias |
| dashboard_viewed | user_dashboard_surface_viewed | legacy_alias |
| page_viewed | user_dashboard_surface_viewed | legacy_alias |
| wallet_opened | wallet_purchase_modal_surface_viewed | legacy_alias |
| purchase_package_selected | wallet_purchase_modal_surface_action_attempted | legacy_alias |
| begin_checkout | wallet_purchase_modal_surface_action_attempted | legacy_alias |
| gumdrops_purchase_completed | wallet_purchase_modal_surface_action_succeeded | legacy_alias |
| purchase | wallet_purchase_modal_surface_action_succeeded | legacy_alias |
| gumdrops_purchase_failed | wallet_purchase_modal_surface_action_failed | legacy_alias |
| library_viewed | drops_library_surface_viewed | legacy_alias |
| drop_library_viewed | drops_library_surface_viewed | legacy_alias |
| drop_clicked | drops_library_surface_action_attempted | legacy_alias |
| drop_unlocked | drops_library_surface_action_succeeded | legacy_alias |
| drop_unlock_failed | drops_library_surface_action_failed | legacy_alias |
| creator_dashboard_viewed | creator_dashboard_surface_viewed | legacy_alias |
| creator_settings_viewed | creator_settings_surface_viewed | legacy_alias |
| creator_settings_saved | creator_settings_surface_action_succeeded | legacy_alias |
| creator_settings_save_failed | creator_settings_surface_action_failed | legacy_alias |
| creator_drop_manager_opened | creator_drop_manager_surface_viewed | legacy_alias |
| creator_drop_submission_started | creator_drop_manager_surface_action_attempted | legacy_alias |
| creator_drop_submit_failed | creator_drop_manager_surface_action_failed | legacy_alias |
| creator_profile_viewed | creator_profile_timeline_surface_viewed | legacy_alias |
| creator_timeline_viewed | creator_profile_timeline_surface_viewed | legacy_alias |
| creator_discovery_surface_viewed | creator_profile_timeline_surface_viewed | legacy_alias |
| creator_profile_opened | creator_profile_timeline_surface_viewed | legacy_alias |
| creator_relationship_list_loaded | creator_profile_timeline_surface_loaded | legacy_alias |
| creator_recommendation_viewed | creator_profile_timeline_surface_empty_viewed | legacy_alias |
| creator_follow_attempted | creator_profile_timeline_surface_action_attempted | legacy_alias |
| creator_unfollow_attempted | creator_profile_timeline_surface_action_attempted | legacy_alias |
| creator_card_clicked | creator_profile_timeline_surface_action_attempted | legacy_alias |
| creator_recommendation_clicked | creator_profile_timeline_surface_action_attempted | legacy_alias |
| creator_followed | creator_profile_timeline_surface_action_succeeded | legacy_alias |
| creator_follow_succeeded | creator_profile_timeline_surface_action_succeeded | legacy_alias |
| creator_unfollowed | creator_profile_timeline_surface_action_succeeded | legacy_alias |
| creator_unfollow_succeeded | creator_profile_timeline_surface_action_succeeded | legacy_alias |
| creator_follow_failed | creator_profile_timeline_surface_action_failed | legacy_alias |
| creator_relationship_list_failed | creator_profile_timeline_surface_action_failed | legacy_alias |
| chat_surface_viewed | chat_surface_viewed | legacy_alias |
| chat_thread_list_loaded | chat_surface_loaded | legacy_alias |
| chat_message_sent | chat_surface_action_succeeded | legacy_alias |
| chat_message_failed | chat_surface_action_failed | legacy_alias |
| daily_checkin_viewed | daily_tasks_checkin_surface_viewed | legacy_alias |
| daily_task_panel_viewed | daily_tasks_checkin_surface_viewed | legacy_alias |
| daily_checkin_claimed | daily_tasks_checkin_surface_action_succeeded | legacy_alias |
| daily_task_completed | daily_tasks_checkin_surface_action_succeeded | legacy_alias |
| daily_checkin_failed | daily_tasks_checkin_surface_action_failed | legacy_alias |
| daily_task_failed | daily_tasks_checkin_surface_action_failed | legacy_alias |
| notification_prompt_viewed | notifications_pwa_prompt_surface_viewed | legacy_alias |
| notification_permission_requested | notifications_pwa_prompt_surface_action_attempted | legacy_alias |
| notification_permission_granted | notifications_pwa_prompt_surface_action_succeeded | legacy_alias |
| notification_permission_denied | notifications_pwa_prompt_surface_action_failed | legacy_alias |
| notification_permission_denied | notifications_pwa_prompt_surface_permission_denied | legacy_alias |
| user_settings_viewed | account_settings_surface_viewed | legacy_alias |
| settings_surface_viewed | account_settings_surface_viewed | legacy_alias |

## Debug Lane

The debug lane is **Surface telemetry parity**. Missing surface events are grouped by surface in `agent/state/surface-telemetry-parity.generated.json`.

## Validation Failures

- None
