# Settings Connection Parity

Generated: 2026-07-16T04:27:39.304Z
Status: pass
Head: 621afada2aea0ef269a02c7ac68d4424bfce5214

## Summary

- Account Settings owns account, privacy, support, sign out, data export, and delete account controls.
- Creator Settings owns creator profile, Fan Pass, GumDrop experiences, broadcasts, timeline, pricing, and Drop Manager handoffs.
- The canonical map is `src/lib/settings/settings-surface-contract.ts`; it indexes existing routes instead of creating duplicate settings APIs.
- The debug source is one `Settings health` lane.

## Account Settings Items

- profile_basics
- account_timezone
- notification_preferences
- sign_out
- anonymous_analytics
- account_linked_analytics
- activity_recommendations
- honor_global_privacy_control
- essential_only_mode
- download_my_data
- privacy_policy
- faq
- support
- policies
- delete_account

## Creator Settings Items

- profile_basics
- creator_profile_visibility
- fan_pass_enabled
- fan_pass_pricing
- creator_experiences_enabled
- paid_message_price_gd
- custom_request_min_gd
- live_call_enabled
- live_call_price_gd
- live_call_duration_minutes
- live_call_weeklyAvailability
- broadcasts_enabled
- broadcast_audience
- timeline_enabled
- show_drops_on_timeline
- show_broadcasts_on_timeline
- creator_drop_manager

## Removed Stale Logic

- scripts/shred_profile.py
- scripts/shred_profile_components.py
- scripts/rewrite_profile_page.py

## Checks

- pass: packageScriptPresent
- pass: accountSettingsMapped
- pass: creatorSettingsMapped
- pass: everyVisibleSettingHasBackendOrHonestStatus
- pass: backendRoutesCovered
- pass: featureRegistrationCovered
- pass: telemetryEventsRegistered
- pass: telemetryEventsWired
- pass: debugLanePresent
- pass: privacyTogglesUseConsentPolicy
- pass: creatorSettingsAffectConsumers
- pass: routeLabelsClear
- pass: noCreatorOnlyControlsInAccountSettings
- pass: rawInternalServerErrorHidden
- pass: staleDuplicateLogicRemovedOrClassified
- pass: protectedSurfacesUntouched
- pass: navigationRowsTrackLinkActions

## Validation Failures

- none
