# Feature Telemetry Coverage Cleanup

Generated: 2026-05-24T15:35:22.219Z
Current head: 4214aa6fca1f18201e8f09ed9197f38316b035c9
Status: source_ready

## Summary

```json
{
  "reportKey": "feature-telemetry-coverage-cleanup",
  "generatedAtUtc": "2026-05-24T15:35:22.219Z",
  "currentHead": "4214aa6fca1f18201e8f09ed9197f38316b035c9",
  "status": "source_ready",
  "featureCoverageStatus": "source_ready",
  "registeredFeatureCount": 21,
  "telemetryEventCount": 522,
  "missingItems": [],
  "eventOwnerMap": [
    {
      "eventName": "auth_modal_opened",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_surface_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_modal_closed_incomplete",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_mode_switched",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_google_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_google_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_google_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_login_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_login_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_login_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_signup_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_signup_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_signup_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_google_sign_in_attempted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_google_sign_in_success",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_google_sign_in_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_sign_in_attempted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_sign_in_success",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_sign_in_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_sign_up_attempted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_sign_up_success",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_sign_up_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_attempt_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_attempt_succeeded",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_attempt_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_attempt_unfinished",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_session_established",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_registration_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_registration_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_navigation_session_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_navigation_session_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_navigation_session_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_provider_conflict_detected",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_provider_conflict_resolution_shown",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_provider_conflict_cta_clicked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_sign_in_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_email_sign_up_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_persistence_established",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_state_changed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_unexpected_session_drop",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_logout_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_logout_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_navigation_session_deleted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_profile_bootstrap_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_profile_bootstrap_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_profile_bootstrap_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_profile_snapshot_reconnect",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_profile_snapshot_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "user_registered",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_session_restored",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_logout",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_password_reset_requested",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "auth_password_reset_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "password_reset_requested",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "password_reset_sent",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "password_reset_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "guided_onboarding_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "guided_onboarding_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "guided_onboarding_step_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "guided_onboarding_step_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "onboarding_step_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "avatar_uploaded",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "page_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "home_page_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "hero_cta_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_apply_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_waitlist_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_agreement_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_agreement_section_opened",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_agreement_acknowledgement_checked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_agreement_signed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_intake_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_intake_step_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_intake_goal_selected",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_intake_recommended_setup_shown",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_intake_submitted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_onboarding_submitted",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_application_updated",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_intro_acknowledged",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_legally_cleared_override",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_admin_queue_materialized",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_id_requested",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_id_document_uploaded",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_id_submitted",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_id_submission_failed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_id_verified",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_id_rejected",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_legal_sent",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_contract_signed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_legal_signed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_segment_assigned",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_approved",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_rejected",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_needs_changes",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_role_activated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_role_activation_blocked",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "owner_override_applied",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "owner_override_cleared",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "privacy_page_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "terms_page_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drops_page_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "faq_page_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "faq_search_used",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "faq_category_selected",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "faq_question_toggled",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "dashboard_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "library_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "library"
      ],
      "materializerLane": "library_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "user_settings_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "user_settings_creator_tools_cta_clicked",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "profile_settings_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "settings_surface_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "setting_toggle_changed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "setting_action_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "setting_save_succeeded",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "setting_save_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "data_export_requested",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "account_delete_clicked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "account_delete_confirm_opened",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "account_delete_confirmed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "account_delete_cancelled",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "account_delete_request_submitted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "account_delete_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "account_delete_completed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "support_inbox_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "support_ticket_created",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "support_thread_opened",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "support_reply_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "support_reply_sent",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "support_thread_reply_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "bug_report_submitted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "experience_hub_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_checkin_claimed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_window_assigned",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_window_repaired",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_progressed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_completed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_claimed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_claim_duplicate_prevented",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_expired",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_reward_normalized",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_state_repair_required",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "wallet_opened",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "wallet_closed_incomplete",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "purchase_package_selected",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "begin_checkout",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "purchase",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "spend_virtual_currency",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "gumdrops_purchase_completed",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "gumdrops_purchase_failed",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "server_purchase_verified",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_card_impression",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "search_query_submitted",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "filter_selected",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "sort_changed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "category_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_search_selected",
      "canonicalOwner": "creator_profile",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "creator_profile_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "view_drop_details",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_opened",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_page_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_creator_cover_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_creator_share_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_guest_signup_cta_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_guest_signup_cta_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_topup_cta_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_topup_cta_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_unwrap_cta_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_unwrap_cta_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_owned_view_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_cta_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_cta_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_feedback_reacted",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_idle_reached",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_closed_incomplete",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_unlock_success_state_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_open_library_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "library"
      ],
      "materializerLane": "library_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_preview_keep_unwrapping_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "content_satisfaction_positive",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "content_satisfaction_negative",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "content_satisfaction_skipped",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "recommendation_reason_helpful",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "recommendation_reason_not_helpful",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_not_interested",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "category_not_interested",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "recommendation_dismissed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_unwrap_intent_blocked_by_funds",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_unlock_attempted",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_unwrapped",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "unlock_drop_success",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "entitlement_granted",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_share_copied",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_opened",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_session_started",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_session_completed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_session_started",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_session_visible_tick",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_session_progress",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_session_paused",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_session_resumed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_session_hidden",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_session_ended",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_watch_started",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_watch_progress",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_watch_completed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_watch_abandoned",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_watch_hidden",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_watch_replayed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drop_watch_duration_unavailable",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "watch_score_computed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "file_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_asset_completed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_asset_consumed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "video_played",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_watch_checkpoint",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_content_loaded",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_source_downloaded",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_related_drop_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "viewer_backgrounded",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_followed",
      "canonicalOwner": "creator_profile",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "creator_profile_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_unfollowed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_not_interested",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_muted",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_notifications_enabled",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_notifications_disabled",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_profile_viewed",
      "canonicalOwner": "creator_profile",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "creator_profile_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_profile_link_clicked",
      "canonicalOwner": "creator_profile",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "creator_profile_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_profile_link_missing",
      "canonicalOwner": "creator_profile",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "creator_profile_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_rail_impression",
      "canonicalOwner": "creator_profile",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "creator_profile_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_dashboard_settings_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_settings_section_opened",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_broadcast_manager_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "broadcasts"
      ],
      "materializerLane": "broadcast_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_broadcast_created",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "broadcasts"
      ],
      "materializerLane": "broadcast_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_broadcast_creation_failed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "broadcasts"
      ],
      "materializerLane": "broadcast_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_broadcast_detail_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "broadcasts"
      ],
      "materializerLane": "broadcast_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_broadcast_empty_state_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "broadcasts"
      ],
      "materializerLane": "broadcast_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_settings_migrated_redirect_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_settings_updated",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_setting_updated",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_settings_control_plane_saved",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_drop_submitted",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_drop_manager"
      ],
      "materializerLane": "creator_drop_manager_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_drop_updated",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_drop_manager"
      ],
      "materializerLane": "creator_drop_manager_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_drop_reviewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_drop_manager"
      ],
      "materializerLane": "creator_drop_manager_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_broadcast_opened",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "broadcasts"
      ],
      "materializerLane": "broadcast_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_experience_lane_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_experience_lane_closed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_experience_cta_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_experience_insufficient_balance",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_experience_request_category_selected",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_experience_booking_type_selected",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_surface_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_thread_list_loaded",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_thread_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_compose_sheet_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_creator_selected",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_new_message_sheet_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_new_message_sheet_creator_selected",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_list_search_focused",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_no_followed_creators_prompt_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_no_followed_creators_cta_clicked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_thread_auto_created_or_resolved",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_paid_gd_gate_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_paid_gd_gate_primary_clicked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_paid_gd_gate_secondary_clicked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_gating_checked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_send_blocked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_insufficient_paid_gd_viewed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_purchase_cta_clicked",
      "canonicalOwner": "wallet",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "purchase_integrity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_media_upload_blocked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_moderation_blocked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_fan_pass_bypass_applied",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_creator_reply_bypass_applied",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_low_paid_gd_reminder_sent",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_low_paid_gd_reminder_reset",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_realtime_listener_attached",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_realtime_listener_detached",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_realtime_listener_error",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_send_attempted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_api_accepted",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_optimistic_rendered",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_listener_observed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_reconciled",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_reconcile_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_blocked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_send_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_message_sent",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_attachment_upload_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_attachment_upload_failed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_unread_updated",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_read_marked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_thread_unread_updated",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_thread_read_marked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_typing_started",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_typing_stopped",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_presence_connected",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_presence_disconnected",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_presence_error",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_ios_pwa_shell_applied",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_bottom_anchor_restored",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_media_file_rejected_size",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_media_file_allowed_fan_pass",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_icebreaker_inserted",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "chat_empty_state_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_message_sent",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_media_sent",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "support"
      ],
      "materializerLane": "support_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_private_chat_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_custom_request_created",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_custom_request_accepted",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_custom_request_declined",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_call_booking_created",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_live_time_booked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_call_booking_completed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_fan_pass_viewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_fan_pass_started",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_subscription_started",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_subscription_renewed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_subscription_failed",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_subscription_canceled",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "fan_pass"
      ],
      "materializerLane": "fan_pass_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_drop_unwrapped",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_drop_manager"
      ],
      "materializerLane": "creator_drop_manager_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_ledger_accrual_created",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_cashout_requested",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_cashout_honored",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notifications_dropdown_opened",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_opened",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_read",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_action_clicked",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_mark_all_read",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_cleared",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_notifications_enabled",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_prompt_eligible",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_prompt_viewed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_prompt_dismissed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_permission_requested",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_permission_granted",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_permission_denied",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_permission_failed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_prompt_snoozed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_prompt_blocked",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_prompt_install_help_opened",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "push_token_registration_started",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "push_token_registered",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "push_token_registration_failed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "push_token_refreshed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "push_token_revoked",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "push_device_scope_resolved",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_service_worker_registration_started",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_service_worker_registered",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_service_worker_registration_failed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_update_available",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_update_applied",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_offline_seen",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_install_prompt_seen",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_install_prompt_accepted",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "pwa_install_prompt_dismissed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_intent_evaluated",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_targeting_blocked",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_targeting_dry_run_eligible",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_sent",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "notification_duplicate_prevented",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "queued_drop_returned_live",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_deadline_in_app_reminder_shown",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_deadline_in_app_reminder_opened",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_deadline_in_app_reminder_dismissed",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "feedback_modal_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "feedback_submitted",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "feature_flag_exposed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "experiment_variant_exposed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "identity_linked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "cookie_consent_privacy",
        "auth_identity"
      ],
      "materializerLane": "identity_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "system_job_ran",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "navigation_click",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "beta_badge_clicked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "beta_changelog_opened",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "beta_changelog_closed",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "beta_changelog_entry_clicked",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "session_started",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "session_activity_tick",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking",
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "watch_session_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "session_meaningful_interaction",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "session_closed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "session_bounced",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "session_engaged",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "semantic_page_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "semantic_page_engaged",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "semantic_page_passive",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "semantic_page_exited",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "semantic_page_bounced",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "semantic_target_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "recent_activity_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "library"
      ],
      "materializerLane": "library_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "recent_activity_toggled",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "library"
      ],
      "materializerLane": "library_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_tasks_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_surface_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_card_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_guidance_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_action_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_action_attempted",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_guidance_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_guidance_dismissed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_guidance_tapped",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_guidance_completed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_card_expanded",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_help_opened",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_assigned",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_started",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "task_completed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_reward_granted",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_failed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_abandoned",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_reset_locked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_next_eligible_viewed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_task_deadline_reminder_sent",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "daily_checkin"
      ],
      "materializerLane": "retention_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "daily_deadline_browser_notification_shown",
      "canonicalOwner": "notifications",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [],
      "materializerLane": "notification_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "promo_card_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "collection_filter_changed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "owned_drop_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "cookie_consent_updated",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "insufficient_balance_modal_closed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "insufficient_balance_get_more_clicked",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "analytics_telemetry",
        "cookie_consent_privacy",
        "behavior_tracking"
      ],
      "materializerLane": "behavior_signal_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "featured_slide_viewed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "featured_slide_clicked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_chart_view_changed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_action_performed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_upload_started",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_upload_queued",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_batch_selected",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_batch_queue_started",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_batch_progress_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_batch_completed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_batch_failed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_batch_retry_failed_clicked",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_batch_submit_blocked_uploads_in_progress",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_upload_progress_checkpoint",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_upload_success",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_upload_failed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_upload_retry_clicked",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "asset_upload_canceled",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_dashboard_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_overview_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_analytics_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_revenue_range_changed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_top_drops_page_changed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_top_drops_search",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_moderation_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_moderation_alert_selected",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_moderation_risk_action_clicked",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_moderation_alert_reviewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_moderation_alert_dismissed_false_positive",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_moderation_alert_escalated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_moderation_data_failed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_debug_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_support_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_users_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_content_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_drops_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_privacy_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_queue_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_roster_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_roster_tab_changed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_record_opened",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_primary_action_clicked",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_section_expanded",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_audit_trail_opened",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_audit_event_expanded",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_action_executed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_account_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_email_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_password_reset_sent",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_temporary_password_set",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_role_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_status_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_experience_settings_opened",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_experience_settings_saved",
      "canonicalOwner": "creator_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "creator_settings"
      ],
      "materializerLane": "creator_settings_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_experience_lane_toggled",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_experience_pricing_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_experience_restriction_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_agreement_template_created",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_agreement_template_activated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_agreement_sent",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_agreement_update_sent",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_agreement_countersigned",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_synthetic_creator_created",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_synthetic_creator_marked",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_view_as_creator_started",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_view_as_creator_ended",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_projection_write_blocked",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_user_detail_viewed",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_cover_toggle_updated",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_cover_generate_succeeded",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_cover_generate_failed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_cover_generation_liked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_cover_generation_disliked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_cover_generation_accepted",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_cover_history_cleared",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_toggle_updated",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_generate_succeeded",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_generate_failed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_generation_liked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_generation_disliked",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_generation_accepted",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_prompt_policy_updated",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_ai_description_history_cleared",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "admin_creator_created_directly",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "creator_application_review_saved",
      "canonicalOwner": "admin_debug",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes"
      ],
      "materializerLane": "admin_debug_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "heuristic_screenshot_shortcut_mac",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "heuristic_screenshot_shortcut_windows",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "heuristic_screen_record_shortcut",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "heuristic_devtools_shortcut",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "heuristic_rapid_visibility_capture",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "heuristic_rip_pattern",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "heuristic_unknown_threat",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "confirmed_print_attempt",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "confirmed_save_attempt",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "confirmed_copy_attempt",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "confirmed_cut_attempt",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "confirmed_selection_attempt",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "confirmed_drag_attempt",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "confirmed_context_menu_attempt",
      "canonicalOwner": "analytics_telemetry",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "runtime_smoke_substitutes",
        "security"
      ],
      "materializerLane": "security_diagnostics_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "library_search",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "library"
      ],
      "materializerLane": "library_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drops_category_selected",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "drops_searched",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "search_discovery"
      ],
      "materializerLane": "search_discovery_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "recent_activity_page_changed",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "library"
      ],
      "materializerLane": "library_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "recent_activity_searched",
      "canonicalOwner": "user_dashboard",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "library"
      ],
      "materializerLane": "library_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    },
    {
      "eventName": "unlock_drop_failed",
      "canonicalOwner": "drops",
      "ownerKind": "feature",
      "duplicateOwnersCollapsed": [
        "behavior_tracking"
      ],
      "materializerLane": "drop_behavior_materializer",
      "eventEnvelopeMapped": true,
      "debugVisible": true
    }
  ],
  "featureTelemetryRows": [
    {
      "featureId": "wallet",
      "routes": [
        "src/app/api/wallet",
        "src/app/api/paypal",
        "src/app/api/checkout"
      ],
      "telemetryEvents": [
        "wallet_opened",
        "wallet_closed_incomplete",
        "purchase_package_selected",
        "begin_checkout",
        "purchase",
        "gumdrops_purchase_completed",
        "gumdrops_purchase_failed",
        "server_purchase_verified",
        "chat_purchase_cta_clicked"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "purchase_integrity_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "runtimeHealth",
        "evidenceCompleteness",
        "costRisk"
      ]
    },
    {
      "featureId": "user_dashboard",
      "routes": [
        "src/app/dashboard/page.tsx",
        "src/app/account/page.tsx",
        "src/app/dashboard/profile",
        "src/app/dashboard/settings",
        "src/app/profile/settings",
        "src/app/settings",
        "src/app/api/user/activity",
        "src/app/api/user/data",
        "src/app/api/user/profile",
        "src/app/api/user/check-username",
        "src/app/api/user/complete-onboarding",
        "src/app/api/user/onboarding-progress"
      ],
      "telemetryEvents": [
        "page_viewed",
        "home_page_viewed",
        "hero_cta_clicked",
        "creator_apply_viewed",
        "creator_waitlist_viewed",
        "privacy_page_viewed",
        "terms_page_viewed",
        "faq_page_viewed",
        "faq_question_toggled",
        "dashboard_viewed",
        "library_viewed",
        "setting_toggle_changed",
        "setting_action_clicked",
        "setting_save_succeeded",
        "data_export_requested",
        "experience_hub_viewed",
        "daily_checkin_claimed",
        "daily_task_window_assigned",
        "daily_task_window_repaired",
        "daily_task_progressed",
        "daily_task_completed",
        "daily_task_claimed",
        "daily_task_claim_duplicate_prevented",
        "daily_task_expired",
        "daily_task_reward_normalized",
        "daily_task_state_repair_required",
        "drop_preview_open_library_clicked",
        "creator_unfollowed",
        "creator_not_interested",
        "creator_muted",
        "creator_setting_updated",
        "creator_experience_lane_opened",
        "creator_experience_lane_closed",
        "creator_experience_cta_clicked",
        "creator_experience_insufficient_balance",
        "creator_experience_booking_type_selected",
        "chat_thread_opened",
        "chat_compose_sheet_opened",
        "chat_new_message_sheet_opened",
        "chat_ios_pwa_shell_applied",
        "chat_bottom_anchor_restored",
        "chat_icebreaker_inserted",
        "chat_empty_state_viewed",
        "creator_private_chat_opened",
        "creator_custom_request_created",
        "creator_custom_request_accepted",
        "creator_custom_request_declined",
        "creator_call_booking_created",
        "creator_live_time_booked",
        "creator_call_booking_completed",
        "creator_ledger_accrual_created",
        "creator_cashout_requested",
        "creator_cashout_honored",
        "feedback_modal_opened",
        "feedback_submitted",
        "navigation_click",
        "session_started",
        "session_meaningful_interaction",
        "session_closed",
        "session_bounced",
        "session_engaged",
        "semantic_page_viewed",
        "semantic_page_engaged",
        "semantic_page_passive",
        "semantic_page_exited",
        "semantic_page_bounced",
        "semantic_target_clicked",
        "recent_activity_viewed",
        "recent_activity_toggled",
        "daily_tasks_viewed",
        "daily_task_surface_viewed",
        "daily_task_card_viewed",
        "daily_task_guidance_opened",
        "daily_task_action_clicked",
        "daily_task_action_attempted",
        "task_guidance_viewed",
        "task_guidance_dismissed",
        "task_guidance_tapped",
        "task_guidance_completed",
        "task_card_expanded",
        "task_help_opened",
        "daily_task_assigned",
        "daily_task_started",
        "task_completed",
        "daily_task_reward_granted",
        "daily_task_failed",
        "daily_task_abandoned",
        "daily_task_reset_locked",
        "daily_task_next_eligible_viewed",
        "daily_task_deadline_reminder_sent",
        "promo_card_clicked",
        "cookie_consent_updated",
        "insufficient_balance_modal_closed",
        "insufficient_balance_get_more_clicked",
        "library_search",
        "recent_activity_page_changed",
        "recent_activity_searched"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "behavior_signal_materializer",
        "library_materializer",
        "retention_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "drops",
      "routes": [
        "src/app/drops",
        "src/app/experiences",
        "src/app/api/drops"
      ],
      "telemetryEvents": [
        "drops_page_viewed",
        "faq_search_used",
        "faq_category_selected",
        "spend_virtual_currency",
        "drop_card_impression",
        "search_query_submitted",
        "filter_selected",
        "sort_changed",
        "category_clicked",
        "view_drop_details",
        "drop_clicked",
        "drop_preview_opened",
        "drop_preview_page_viewed",
        "drop_preview_creator_cover_viewed",
        "drop_preview_creator_share_clicked",
        "drop_preview_guest_signup_cta_viewed",
        "drop_preview_guest_signup_cta_clicked",
        "drop_preview_topup_cta_viewed",
        "drop_preview_topup_cta_clicked",
        "drop_preview_unwrap_cta_viewed",
        "drop_preview_unwrap_cta_clicked",
        "drop_preview_owned_view_clicked",
        "drop_preview_cta_viewed",
        "drop_preview_cta_clicked",
        "drop_preview_feedback_reacted",
        "drop_preview_idle_reached",
        "drop_preview_closed_incomplete",
        "drop_preview_unlock_success_state_viewed",
        "drop_preview_keep_unwrapping_clicked",
        "content_satisfaction_positive",
        "content_satisfaction_negative",
        "content_satisfaction_skipped",
        "recommendation_reason_helpful",
        "recommendation_reason_not_helpful",
        "drop_not_interested",
        "category_not_interested",
        "recommendation_dismissed",
        "drop_unwrap_intent_blocked_by_funds",
        "drop_unlock_attempted",
        "drop_unwrapped",
        "unlock_drop_success",
        "entitlement_granted",
        "drop_share_copied",
        "viewer_opened",
        "viewer_session_started",
        "viewer_session_completed",
        "watch_session_started",
        "watch_session_visible_tick",
        "watch_session_progress",
        "watch_session_paused",
        "watch_session_resumed",
        "watch_session_hidden",
        "watch_session_ended",
        "drop_watch_started",
        "drop_watch_progress",
        "drop_watch_completed",
        "drop_watch_abandoned",
        "drop_watch_hidden",
        "drop_watch_replayed",
        "drop_watch_duration_unavailable",
        "watch_score_computed",
        "file_viewed",
        "viewer_asset_completed",
        "viewer_asset_consumed",
        "video_played",
        "viewer_watch_checkpoint",
        "viewer_content_loaded",
        "viewer_source_downloaded",
        "viewer_related_drop_clicked",
        "viewer_backgrounded",
        "creator_experience_request_category_selected",
        "chat_list_search_focused",
        "queued_drop_returned_live",
        "collection_filter_changed",
        "owned_drop_clicked",
        "featured_slide_viewed",
        "featured_slide_clicked",
        "admin_top_drops_search",
        "admin_ai_cover_generate_succeeded",
        "admin_ai_cover_generate_failed",
        "admin_ai_cover_generation_liked",
        "admin_ai_cover_generation_disliked",
        "admin_ai_cover_generation_accepted",
        "admin_ai_cover_history_cleared",
        "admin_ai_description_toggle_updated",
        "admin_ai_description_generate_succeeded",
        "admin_ai_description_generate_failed",
        "admin_ai_description_generation_liked",
        "admin_ai_description_generation_disliked",
        "admin_ai_description_generation_accepted",
        "admin_ai_description_prompt_policy_updated",
        "admin_ai_description_history_cleared",
        "drops_category_selected",
        "drops_searched",
        "unlock_drop_failed"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "drop_behavior_materializer",
        "search_discovery_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "runtimeHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "library",
      "routes": [
        "src/app/dashboard/library"
      ],
      "telemetryEvents": [
        "library_viewed",
        "drop_preview_open_library_clicked",
        "recent_activity_viewed",
        "recent_activity_toggled",
        "library_search",
        "recent_activity_page_changed",
        "recent_activity_searched"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "library_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "creator_dashboard",
      "routes": [
        "src/app/creator/page.tsx",
        "src/app/dashboard/creator/page.tsx",
        "src/app/creators/dashboard/page.tsx",
        "src/app/api/creator/payouts"
      ],
      "telemetryEvents": [
        "user_settings_viewed",
        "user_settings_creator_tools_cta_clicked",
        "profile_settings_viewed",
        "settings_surface_viewed",
        "creator_dashboard_settings_viewed",
        "creator_settings_section_opened",
        "creator_broadcast_manager_viewed",
        "creator_broadcast_created",
        "creator_broadcast_creation_failed",
        "creator_broadcast_detail_viewed",
        "creator_broadcast_empty_state_viewed",
        "creator_settings_migrated_redirect_viewed",
        "creator_settings_updated",
        "creator_settings_control_plane_saved",
        "creator_drop_submitted",
        "creator_drop_updated",
        "admin_creator_drop_reviewed",
        "creator_broadcast_opened",
        "chat_fan_pass_bypass_applied",
        "chat_media_file_allowed_fan_pass",
        "creator_fan_pass_viewed",
        "creator_fan_pass_started",
        "creator_subscription_started",
        "creator_subscription_renewed",
        "creator_subscription_failed",
        "creator_subscription_canceled",
        "creator_drop_unwrapped",
        "admin_creator_experience_settings_opened",
        "admin_creator_experience_settings_saved"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "creator_settings_materializer",
        "broadcast_materializer",
        "creator_drop_manager_materializer",
        "fan_pass_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "creator_settings",
      "routes": [
        "src/app/dashboard/creator/settings",
        "src/app/api/creator/settings",
        "src/app/api/settings/landing"
      ],
      "telemetryEvents": [
        "user_settings_viewed",
        "user_settings_creator_tools_cta_clicked",
        "profile_settings_viewed",
        "settings_surface_viewed",
        "creator_dashboard_settings_viewed",
        "creator_settings_section_opened",
        "creator_settings_migrated_redirect_viewed",
        "creator_settings_updated",
        "creator_settings_control_plane_saved",
        "admin_creator_experience_settings_opened",
        "admin_creator_experience_settings_saved"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "creator_settings_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "creator_drop_manager",
      "routes": [
        "src/app/dashboard/creator/drops",
        "src/app/api/creator/drops",
        "src/app/api/admin/drops"
      ],
      "telemetryEvents": [
        "creator_drop_submitted",
        "creator_drop_updated",
        "admin_creator_drop_reviewed",
        "creator_drop_unwrapped"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "creator_drop_manager_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "creator_profile",
      "routes": [
        "src/app/creators/[username]",
        "src/app/dashboard/profile/creator",
        "src/app/api/creators/[username]",
        "src/app/api/creator/discovery",
        "src/app/api/user/follow"
      ],
      "telemetryEvents": [
        "creator_search_selected",
        "creator_followed",
        "creator_profile_viewed",
        "creator_profile_link_clicked",
        "creator_profile_link_missing",
        "creator_rail_impression"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "creator_profile_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "broadcasts",
      "routes": [
        "src/app/dashboard/creator/page.tsx",
        "src/app/api/creator/broadcasts"
      ],
      "telemetryEvents": [
        "creator_broadcast_manager_viewed",
        "creator_broadcast_created",
        "creator_broadcast_creation_failed",
        "creator_broadcast_detail_viewed",
        "creator_broadcast_empty_state_viewed",
        "creator_broadcast_opened"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "broadcast_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "fan_pass",
      "routes": [
        "src/app/creators/[username]",
        "src/app/api/creator/subscriptions",
        "src/app/api/creator/bookings",
        "src/app/api/creator/relationships",
        "src/app/api/creator/requests"
      ],
      "telemetryEvents": [
        "chat_fan_pass_bypass_applied",
        "chat_media_file_allowed_fan_pass",
        "creator_fan_pass_viewed",
        "creator_fan_pass_started",
        "creator_subscription_started",
        "creator_subscription_renewed",
        "creator_subscription_failed",
        "creator_subscription_canceled"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "fan_pass_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "runtimeHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "admin_debug",
      "routes": [
        "src/app/admin",
        "src/app/api/admin",
        "src/app/admin/debug"
      ],
      "telemetryEvents": [
        "creator_agreement_signed",
        "creator_onboarding_submitted",
        "creator_intro_acknowledged",
        "creator_legally_cleared_override",
        "creator_admin_queue_materialized",
        "creator_id_requested",
        "creator_id_document_uploaded",
        "creator_id_submitted",
        "creator_id_submission_failed",
        "creator_id_verified",
        "creator_id_rejected",
        "creator_legal_sent",
        "creator_contract_signed",
        "creator_legal_signed",
        "creator_segment_assigned",
        "creator_approved",
        "creator_rejected",
        "creator_needs_changes",
        "creator_role_activated",
        "creator_role_activation_blocked",
        "owner_override_applied",
        "owner_override_cleared",
        "admin_chart_view_changed",
        "admin_action_performed",
        "asset_upload_started",
        "asset_upload_queued",
        "asset_batch_selected",
        "asset_batch_queue_started",
        "asset_batch_progress_updated",
        "asset_batch_completed",
        "asset_batch_failed",
        "asset_batch_retry_failed_clicked",
        "asset_batch_submit_blocked_uploads_in_progress",
        "asset_upload_progress_checkpoint",
        "asset_upload_success",
        "asset_upload_failed",
        "asset_upload_retry_clicked",
        "asset_upload_canceled",
        "admin_dashboard_viewed",
        "admin_overview_viewed",
        "admin_analytics_viewed",
        "admin_revenue_range_changed",
        "admin_top_drops_page_changed",
        "admin_ai_viewed",
        "admin_moderation_viewed",
        "admin_moderation_alert_selected",
        "admin_moderation_risk_action_clicked",
        "admin_moderation_alert_reviewed",
        "admin_moderation_alert_dismissed_false_positive",
        "admin_moderation_alert_escalated",
        "admin_moderation_data_failed",
        "admin_debug_viewed",
        "admin_support_viewed",
        "admin_users_viewed",
        "admin_content_viewed",
        "admin_drops_viewed",
        "admin_privacy_viewed",
        "admin_queue_viewed",
        "admin_roster_viewed",
        "admin_roster_tab_changed",
        "admin_creator_record_opened",
        "admin_creator_primary_action_clicked",
        "admin_creator_section_expanded",
        "admin_creator_audit_trail_opened",
        "admin_creator_audit_event_expanded",
        "admin_creator_action_executed",
        "admin_creator_account_updated",
        "admin_creator_email_updated",
        "admin_creator_password_reset_sent",
        "admin_creator_temporary_password_set",
        "admin_creator_role_updated",
        "admin_creator_status_updated",
        "admin_creator_experience_lane_toggled",
        "admin_creator_experience_pricing_updated",
        "admin_creator_experience_restriction_updated",
        "admin_creator_agreement_template_created",
        "admin_creator_agreement_template_activated",
        "admin_creator_agreement_sent",
        "admin_creator_agreement_update_sent",
        "admin_creator_agreement_countersigned",
        "admin_synthetic_creator_created",
        "admin_synthetic_creator_marked",
        "admin_view_as_creator_started",
        "admin_view_as_creator_ended",
        "admin_projection_write_blocked",
        "admin_user_detail_viewed",
        "admin_ai_cover_toggle_updated",
        "admin_creator_created_directly",
        "creator_application_review_saved"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "admin_debug_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "runtimeHealth",
        "evidenceCompleteness",
        "freshness"
      ]
    },
    {
      "featureId": "analytics_telemetry",
      "routes": [
        "src/app/api/analytics",
        "src/app/api/telemetry",
        "src/app/%5F%5F/firebase"
      ],
      "telemetryEvents": [
        "auth_modal_opened",
        "auth_surface_viewed",
        "auth_modal_closed_incomplete",
        "auth_mode_switched",
        "auth_google_started",
        "auth_google_completed",
        "auth_google_failed",
        "auth_email_login_started",
        "auth_email_login_completed",
        "auth_email_login_failed",
        "auth_email_signup_started",
        "auth_email_signup_completed",
        "auth_email_signup_failed",
        "auth_google_sign_in_attempted",
        "auth_google_sign_in_success",
        "auth_google_sign_in_failed",
        "auth_sign_in_attempted",
        "auth_sign_in_success",
        "auth_sign_in_failed",
        "auth_sign_up_attempted",
        "auth_sign_up_success",
        "auth_sign_up_failed",
        "auth_attempt_started",
        "auth_attempt_succeeded",
        "auth_attempt_failed",
        "auth_attempt_unfinished",
        "auth_session_established",
        "auth_registration_started",
        "auth_registration_completed",
        "auth_navigation_session_started",
        "auth_navigation_session_completed",
        "auth_navigation_session_failed",
        "auth_provider_conflict_detected",
        "auth_provider_conflict_resolution_shown",
        "auth_provider_conflict_cta_clicked",
        "auth_email_sign_in_failed",
        "auth_email_sign_up_failed",
        "auth_persistence_established",
        "auth_state_changed",
        "auth_unexpected_session_drop",
        "auth_logout_started",
        "auth_logout_completed",
        "auth_navigation_session_deleted",
        "auth_profile_bootstrap_started",
        "auth_profile_bootstrap_completed",
        "auth_profile_bootstrap_failed",
        "auth_profile_snapshot_reconnect",
        "auth_profile_snapshot_failed",
        "user_registered",
        "auth_session_restored",
        "auth_logout",
        "auth_password_reset_requested",
        "auth_password_reset_failed",
        "password_reset_requested",
        "password_reset_sent",
        "password_reset_failed",
        "guided_onboarding_started",
        "guided_onboarding_completed",
        "guided_onboarding_step_started",
        "guided_onboarding_step_completed",
        "onboarding_step_viewed",
        "avatar_uploaded",
        "page_viewed",
        "home_page_viewed",
        "hero_cta_clicked",
        "creator_apply_viewed",
        "creator_waitlist_viewed",
        "creator_agreement_viewed",
        "creator_agreement_section_opened",
        "creator_agreement_acknowledgement_checked",
        "creator_intake_started",
        "creator_intake_step_completed",
        "creator_intake_goal_selected",
        "creator_intake_recommended_setup_shown",
        "creator_intake_submitted",
        "creator_application_updated",
        "privacy_page_viewed",
        "terms_page_viewed",
        "faq_page_viewed",
        "faq_question_toggled",
        "dashboard_viewed",
        "setting_toggle_changed",
        "setting_action_clicked",
        "setting_save_succeeded",
        "setting_save_failed",
        "data_export_requested",
        "account_delete_clicked",
        "account_delete_confirm_opened",
        "account_delete_confirmed",
        "account_delete_cancelled",
        "account_delete_request_submitted",
        "account_delete_failed",
        "account_delete_completed",
        "support_inbox_viewed",
        "support_ticket_created",
        "support_thread_opened",
        "support_reply_viewed",
        "support_reply_sent",
        "support_thread_reply_failed",
        "bug_report_submitted",
        "creator_unfollowed",
        "creator_not_interested",
        "creator_muted",
        "creator_setting_updated",
        "creator_experience_lane_opened",
        "creator_experience_lane_closed",
        "creator_experience_cta_clicked",
        "creator_experience_insufficient_balance",
        "creator_experience_booking_type_selected",
        "chat_surface_viewed",
        "chat_thread_list_loaded",
        "chat_thread_opened",
        "chat_compose_sheet_opened",
        "chat_creator_selected",
        "chat_new_message_sheet_opened",
        "chat_new_message_sheet_creator_selected",
        "chat_no_followed_creators_prompt_viewed",
        "chat_no_followed_creators_cta_clicked",
        "chat_thread_auto_created_or_resolved",
        "chat_paid_gd_gate_viewed",
        "chat_paid_gd_gate_primary_clicked",
        "chat_paid_gd_gate_secondary_clicked",
        "chat_gating_checked",
        "chat_send_blocked",
        "chat_insufficient_paid_gd_viewed",
        "chat_media_upload_blocked",
        "chat_moderation_blocked",
        "chat_creator_reply_bypass_applied",
        "chat_realtime_listener_attached",
        "chat_realtime_listener_detached",
        "chat_realtime_listener_error",
        "chat_message_send_attempted",
        "chat_message_api_accepted",
        "chat_message_optimistic_rendered",
        "chat_message_listener_observed",
        "chat_message_reconciled",
        "chat_message_reconcile_failed",
        "chat_message_failed",
        "chat_message_blocked",
        "chat_message_send_failed",
        "chat_message_sent",
        "chat_attachment_upload_started",
        "chat_attachment_upload_failed",
        "chat_unread_updated",
        "chat_read_marked",
        "chat_thread_unread_updated",
        "chat_thread_read_marked",
        "chat_typing_started",
        "chat_typing_stopped",
        "chat_presence_connected",
        "chat_presence_disconnected",
        "chat_presence_error",
        "chat_ios_pwa_shell_applied",
        "chat_bottom_anchor_restored",
        "chat_media_file_rejected_size",
        "chat_icebreaker_inserted",
        "chat_empty_state_viewed",
        "creator_message_sent",
        "creator_media_sent",
        "creator_private_chat_opened",
        "creator_custom_request_created",
        "creator_custom_request_accepted",
        "creator_custom_request_declined",
        "creator_call_booking_created",
        "creator_live_time_booked",
        "creator_call_booking_completed",
        "creator_ledger_accrual_created",
        "creator_cashout_requested",
        "creator_cashout_honored",
        "feature_flag_exposed",
        "experiment_variant_exposed",
        "identity_linked",
        "system_job_ran",
        "navigation_click",
        "beta_badge_clicked",
        "beta_changelog_opened",
        "beta_changelog_closed",
        "beta_changelog_entry_clicked",
        "session_started",
        "session_activity_tick",
        "session_meaningful_interaction",
        "session_closed",
        "session_bounced",
        "session_engaged",
        "semantic_page_viewed",
        "semantic_page_engaged",
        "semantic_page_passive",
        "semantic_page_exited",
        "semantic_page_bounced",
        "semantic_target_clicked",
        "promo_card_clicked",
        "cookie_consent_updated",
        "insufficient_balance_modal_closed",
        "insufficient_balance_get_more_clicked",
        "heuristic_screenshot_shortcut_mac",
        "heuristic_screenshot_shortcut_windows",
        "heuristic_screen_record_shortcut",
        "heuristic_devtools_shortcut",
        "heuristic_rapid_visibility_capture",
        "heuristic_rip_pattern",
        "heuristic_unknown_threat",
        "confirmed_print_attempt",
        "confirmed_save_attempt",
        "confirmed_copy_attempt",
        "confirmed_cut_attempt",
        "confirmed_selection_attempt",
        "confirmed_drag_attempt",
        "confirmed_context_menu_attempt"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "identity_materializer",
        "behavior_signal_materializer",
        "watch_session_materializer",
        "support_materializer",
        "security_diagnostics_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "runtimeHealth",
        "evidenceCompleteness",
        "freshness"
      ]
    },
    {
      "featureId": "cookie_consent_privacy",
      "routes": [
        "src/app/(legal)/privacy",
        "src/app/admin/privacy",
        "src/app/api/privacy",
        "src/app/api/consent"
      ],
      "telemetryEvents": [
        "auth_modal_opened",
        "auth_surface_viewed",
        "auth_modal_closed_incomplete",
        "auth_mode_switched",
        "auth_google_started",
        "auth_google_completed",
        "auth_google_failed",
        "auth_email_login_started",
        "auth_email_login_completed",
        "auth_email_login_failed",
        "auth_email_signup_started",
        "auth_email_signup_completed",
        "auth_email_signup_failed",
        "auth_google_sign_in_attempted",
        "auth_google_sign_in_success",
        "auth_google_sign_in_failed",
        "auth_sign_in_attempted",
        "auth_sign_in_success",
        "auth_sign_in_failed",
        "auth_sign_up_attempted",
        "auth_sign_up_success",
        "auth_sign_up_failed",
        "auth_attempt_started",
        "auth_attempt_succeeded",
        "auth_attempt_failed",
        "auth_attempt_unfinished",
        "auth_session_established",
        "auth_registration_started",
        "auth_registration_completed",
        "auth_navigation_session_started",
        "auth_navigation_session_completed",
        "auth_navigation_session_failed",
        "auth_provider_conflict_detected",
        "auth_provider_conflict_resolution_shown",
        "auth_provider_conflict_cta_clicked",
        "auth_email_sign_in_failed",
        "auth_email_sign_up_failed",
        "auth_persistence_established",
        "auth_state_changed",
        "auth_unexpected_session_drop",
        "auth_logout_started",
        "auth_logout_completed",
        "auth_navigation_session_deleted",
        "auth_profile_bootstrap_started",
        "auth_profile_bootstrap_completed",
        "auth_profile_bootstrap_failed",
        "auth_profile_snapshot_reconnect",
        "auth_profile_snapshot_failed",
        "user_registered",
        "auth_session_restored",
        "auth_logout",
        "auth_password_reset_requested",
        "auth_password_reset_failed",
        "password_reset_requested",
        "password_reset_sent",
        "password_reset_failed",
        "guided_onboarding_started",
        "guided_onboarding_completed",
        "guided_onboarding_step_started",
        "guided_onboarding_step_completed",
        "onboarding_step_viewed",
        "avatar_uploaded",
        "page_viewed",
        "home_page_viewed",
        "hero_cta_clicked",
        "creator_apply_viewed",
        "creator_waitlist_viewed",
        "creator_agreement_viewed",
        "creator_agreement_section_opened",
        "creator_agreement_acknowledgement_checked",
        "creator_intake_started",
        "creator_intake_step_completed",
        "creator_intake_goal_selected",
        "creator_intake_recommended_setup_shown",
        "creator_intake_submitted",
        "creator_application_updated",
        "privacy_page_viewed",
        "terms_page_viewed",
        "faq_page_viewed",
        "faq_question_toggled",
        "dashboard_viewed",
        "setting_toggle_changed",
        "setting_action_clicked",
        "setting_save_succeeded",
        "data_export_requested",
        "account_delete_clicked",
        "account_delete_confirm_opened",
        "account_delete_confirmed",
        "account_delete_cancelled",
        "account_delete_request_submitted",
        "account_delete_failed",
        "account_delete_completed",
        "creator_unfollowed",
        "creator_not_interested",
        "creator_muted",
        "creator_setting_updated",
        "creator_experience_lane_opened",
        "creator_experience_lane_closed",
        "creator_experience_cta_clicked",
        "creator_experience_insufficient_balance",
        "creator_experience_booking_type_selected",
        "chat_thread_opened",
        "chat_compose_sheet_opened",
        "chat_new_message_sheet_opened",
        "chat_ios_pwa_shell_applied",
        "chat_bottom_anchor_restored",
        "chat_icebreaker_inserted",
        "chat_empty_state_viewed",
        "creator_private_chat_opened",
        "creator_custom_request_created",
        "creator_custom_request_accepted",
        "creator_custom_request_declined",
        "creator_call_booking_created",
        "creator_live_time_booked",
        "creator_call_booking_completed",
        "creator_ledger_accrual_created",
        "creator_cashout_requested",
        "creator_cashout_honored",
        "identity_linked",
        "navigation_click",
        "session_started",
        "session_meaningful_interaction",
        "session_closed",
        "session_bounced",
        "session_engaged",
        "semantic_page_viewed",
        "semantic_page_engaged",
        "semantic_page_passive",
        "semantic_page_exited",
        "semantic_page_bounced",
        "semantic_target_clicked",
        "promo_card_clicked",
        "cookie_consent_updated",
        "insufficient_balance_modal_closed",
        "insufficient_balance_get_more_clicked"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "identity_materializer",
        "behavior_signal_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "evidenceCompleteness",
        "regressionRisk"
      ]
    },
    {
      "featureId": "behavior_tracking",
      "routes": [
        "src/app/api/behavior",
        "src/app/api/analytics/identity-link",
        "src/app/dashboard/viewer",
        "src/app/api/viewer/watch-session"
      ],
      "telemetryEvents": [
        "page_viewed",
        "home_page_viewed",
        "hero_cta_clicked",
        "creator_apply_viewed",
        "creator_waitlist_viewed",
        "privacy_page_viewed",
        "terms_page_viewed",
        "drops_page_viewed",
        "faq_page_viewed",
        "faq_question_toggled",
        "dashboard_viewed",
        "setting_toggle_changed",
        "setting_action_clicked",
        "setting_save_succeeded",
        "setting_save_failed",
        "data_export_requested",
        "spend_virtual_currency",
        "drop_card_impression",
        "creator_search_selected",
        "view_drop_details",
        "drop_clicked",
        "drop_preview_opened",
        "drop_preview_page_viewed",
        "drop_preview_creator_cover_viewed",
        "drop_preview_creator_share_clicked",
        "drop_preview_guest_signup_cta_viewed",
        "drop_preview_guest_signup_cta_clicked",
        "drop_preview_topup_cta_viewed",
        "drop_preview_topup_cta_clicked",
        "drop_preview_unwrap_cta_viewed",
        "drop_preview_unwrap_cta_clicked",
        "drop_preview_owned_view_clicked",
        "drop_preview_cta_viewed",
        "drop_preview_cta_clicked",
        "drop_preview_feedback_reacted",
        "drop_preview_idle_reached",
        "drop_preview_closed_incomplete",
        "drop_preview_unlock_success_state_viewed",
        "drop_preview_keep_unwrapping_clicked",
        "content_satisfaction_positive",
        "content_satisfaction_negative",
        "content_satisfaction_skipped",
        "recommendation_reason_helpful",
        "recommendation_reason_not_helpful",
        "drop_not_interested",
        "recommendation_dismissed",
        "drop_unwrap_intent_blocked_by_funds",
        "drop_unlock_attempted",
        "drop_unwrapped",
        "unlock_drop_success",
        "entitlement_granted",
        "drop_share_copied",
        "viewer_opened",
        "viewer_session_started",
        "viewer_session_completed",
        "watch_session_started",
        "watch_session_visible_tick",
        "watch_session_progress",
        "watch_session_paused",
        "watch_session_resumed",
        "watch_session_hidden",
        "watch_session_ended",
        "drop_watch_started",
        "drop_watch_progress",
        "drop_watch_completed",
        "drop_watch_abandoned",
        "drop_watch_hidden",
        "drop_watch_replayed",
        "drop_watch_duration_unavailable",
        "watch_score_computed",
        "file_viewed",
        "viewer_asset_completed",
        "viewer_asset_consumed",
        "video_played",
        "viewer_watch_checkpoint",
        "viewer_content_loaded",
        "viewer_source_downloaded",
        "viewer_related_drop_clicked",
        "viewer_backgrounded",
        "creator_followed",
        "creator_unfollowed",
        "creator_not_interested",
        "creator_muted",
        "creator_profile_viewed",
        "creator_profile_link_clicked",
        "creator_profile_link_missing",
        "creator_rail_impression",
        "creator_setting_updated",
        "creator_experience_lane_opened",
        "creator_experience_lane_closed",
        "creator_experience_cta_clicked",
        "creator_experience_insufficient_balance",
        "creator_experience_booking_type_selected",
        "chat_thread_opened",
        "chat_compose_sheet_opened",
        "chat_new_message_sheet_opened",
        "chat_ios_pwa_shell_applied",
        "chat_bottom_anchor_restored",
        "chat_icebreaker_inserted",
        "chat_empty_state_viewed",
        "creator_private_chat_opened",
        "creator_custom_request_created",
        "creator_custom_request_accepted",
        "creator_custom_request_declined",
        "creator_call_booking_created",
        "creator_live_time_booked",
        "creator_call_booking_completed",
        "creator_ledger_accrual_created",
        "creator_cashout_requested",
        "creator_cashout_honored",
        "queued_drop_returned_live",
        "feature_flag_exposed",
        "experiment_variant_exposed",
        "system_job_ran",
        "navigation_click",
        "beta_badge_clicked",
        "beta_changelog_opened",
        "beta_changelog_closed",
        "beta_changelog_entry_clicked",
        "session_started",
        "session_activity_tick",
        "session_meaningful_interaction",
        "session_closed",
        "session_bounced",
        "session_engaged",
        "semantic_page_viewed",
        "semantic_page_engaged",
        "semantic_page_passive",
        "semantic_page_exited",
        "semantic_page_bounced",
        "semantic_target_clicked",
        "promo_card_clicked",
        "owned_drop_clicked",
        "cookie_consent_updated",
        "insufficient_balance_modal_closed",
        "insufficient_balance_get_more_clicked",
        "featured_slide_viewed",
        "featured_slide_clicked",
        "admin_ai_cover_generate_succeeded",
        "admin_ai_cover_generate_failed",
        "admin_ai_cover_generation_liked",
        "admin_ai_cover_generation_disliked",
        "admin_ai_cover_generation_accepted",
        "admin_ai_cover_history_cleared",
        "admin_ai_description_toggle_updated",
        "admin_ai_description_generate_succeeded",
        "admin_ai_description_generate_failed",
        "admin_ai_description_generation_liked",
        "admin_ai_description_generation_disliked",
        "admin_ai_description_generation_accepted",
        "admin_ai_description_prompt_policy_updated",
        "admin_ai_description_history_cleared",
        "unlock_drop_failed"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "behavior_signal_materializer",
        "drop_behavior_materializer",
        "watch_session_materializer",
        "creator_profile_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "sourceHealth",
        "runtimeHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "runtime_smoke_substitutes",
      "routes": [
        "src/app/api/runtime",
        "src/app/banned",
        "src/app/offline",
        "src/app/%5F%5F/auth",
        "src/app/api/health",
        "src/app/api/cron",
        "src/app/api/debug/evidence"
      ],
      "telemetryEvents": [
        "creator_agreement_signed",
        "creator_onboarding_submitted",
        "creator_intro_acknowledged",
        "creator_legally_cleared_override",
        "creator_admin_queue_materialized",
        "creator_id_requested",
        "creator_id_document_uploaded",
        "creator_id_submitted",
        "creator_id_submission_failed",
        "creator_id_verified",
        "creator_id_rejected",
        "creator_legal_sent",
        "creator_contract_signed",
        "creator_legal_signed",
        "creator_segment_assigned",
        "creator_approved",
        "creator_rejected",
        "creator_needs_changes",
        "creator_role_activated",
        "creator_role_activation_blocked",
        "owner_override_applied",
        "owner_override_cleared",
        "setting_save_failed",
        "chat_gating_checked",
        "chat_send_blocked",
        "chat_media_upload_blocked",
        "chat_moderation_blocked",
        "chat_message_blocked",
        "feature_flag_exposed",
        "experiment_variant_exposed",
        "system_job_ran",
        "beta_badge_clicked",
        "beta_changelog_opened",
        "beta_changelog_closed",
        "beta_changelog_entry_clicked",
        "session_activity_tick",
        "admin_chart_view_changed",
        "admin_action_performed",
        "asset_upload_started",
        "asset_upload_queued",
        "asset_batch_selected",
        "asset_batch_queue_started",
        "asset_batch_progress_updated",
        "asset_batch_completed",
        "asset_batch_failed",
        "asset_batch_retry_failed_clicked",
        "asset_batch_submit_blocked_uploads_in_progress",
        "asset_upload_progress_checkpoint",
        "asset_upload_success",
        "asset_upload_failed",
        "asset_upload_retry_clicked",
        "asset_upload_canceled",
        "admin_dashboard_viewed",
        "admin_overview_viewed",
        "admin_analytics_viewed",
        "admin_revenue_range_changed",
        "admin_top_drops_page_changed",
        "admin_ai_viewed",
        "admin_moderation_viewed",
        "admin_moderation_alert_selected",
        "admin_moderation_risk_action_clicked",
        "admin_moderation_alert_reviewed",
        "admin_moderation_alert_dismissed_false_positive",
        "admin_moderation_alert_escalated",
        "admin_moderation_data_failed",
        "admin_debug_viewed",
        "admin_support_viewed",
        "admin_users_viewed",
        "admin_content_viewed",
        "admin_drops_viewed",
        "admin_privacy_viewed",
        "admin_queue_viewed",
        "admin_roster_viewed",
        "admin_roster_tab_changed",
        "admin_creator_record_opened",
        "admin_creator_primary_action_clicked",
        "admin_creator_section_expanded",
        "admin_creator_audit_trail_opened",
        "admin_creator_audit_event_expanded",
        "admin_creator_action_executed",
        "admin_creator_account_updated",
        "admin_creator_email_updated",
        "admin_creator_password_reset_sent",
        "admin_creator_temporary_password_set",
        "admin_creator_role_updated",
        "admin_creator_status_updated",
        "admin_creator_experience_lane_toggled",
        "admin_creator_experience_pricing_updated",
        "admin_creator_experience_restriction_updated",
        "admin_creator_agreement_template_created",
        "admin_creator_agreement_template_activated",
        "admin_creator_agreement_sent",
        "admin_creator_agreement_update_sent",
        "admin_creator_agreement_countersigned",
        "admin_synthetic_creator_created",
        "admin_synthetic_creator_marked",
        "admin_view_as_creator_started",
        "admin_view_as_creator_ended",
        "admin_projection_write_blocked",
        "admin_user_detail_viewed",
        "admin_ai_cover_toggle_updated",
        "admin_creator_created_directly",
        "creator_application_review_saved",
        "heuristic_screenshot_shortcut_mac",
        "heuristic_screenshot_shortcut_windows",
        "heuristic_screen_record_shortcut",
        "heuristic_devtools_shortcut",
        "heuristic_rapid_visibility_capture",
        "heuristic_rip_pattern",
        "heuristic_unknown_threat",
        "confirmed_print_attempt",
        "confirmed_save_attempt",
        "confirmed_copy_attempt",
        "confirmed_cut_attempt",
        "confirmed_selection_attempt",
        "confirmed_drag_attempt",
        "confirmed_context_menu_attempt"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "admin_debug_materializer",
        "watch_session_materializer",
        "security_diagnostics_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "runtimeHealth",
        "evidenceCompleteness",
        "regressionRisk"
      ]
    },
    {
      "featureId": "daily_checkin",
      "routes": [
        "src/app/experiences",
        "src/app/api/checkin",
        "src/app/api/tasks"
      ],
      "telemetryEvents": [
        "experience_hub_viewed",
        "daily_checkin_claimed",
        "daily_task_window_assigned",
        "daily_task_window_repaired",
        "daily_task_progressed",
        "daily_task_completed",
        "daily_task_claimed",
        "daily_task_claim_duplicate_prevented",
        "daily_task_expired",
        "daily_task_reward_normalized",
        "daily_task_state_repair_required",
        "feedback_modal_opened",
        "feedback_submitted",
        "daily_tasks_viewed",
        "daily_task_surface_viewed",
        "daily_task_card_viewed",
        "daily_task_guidance_opened",
        "daily_task_action_clicked",
        "daily_task_action_attempted",
        "task_guidance_viewed",
        "task_guidance_dismissed",
        "task_guidance_tapped",
        "task_guidance_completed",
        "task_card_expanded",
        "task_help_opened",
        "daily_task_assigned",
        "daily_task_started",
        "task_completed",
        "daily_task_reward_granted",
        "daily_task_failed",
        "daily_task_abandoned",
        "daily_task_reset_locked",
        "daily_task_next_eligible_viewed",
        "daily_task_deadline_reminder_sent"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "retention_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "notifications",
      "routes": [
        "src/app/api/notifications"
      ],
      "telemetryEvents": [
        "creator_notifications_enabled",
        "creator_notifications_disabled",
        "chat_low_paid_gd_reminder_sent",
        "chat_low_paid_gd_reminder_reset",
        "notifications_dropdown_opened",
        "notification_opened",
        "notification_read",
        "notification_action_clicked",
        "notification_mark_all_read",
        "notification_cleared",
        "task_notifications_enabled",
        "notification_prompt_eligible",
        "notification_prompt_viewed",
        "notification_prompt_dismissed",
        "notification_permission_requested",
        "notification_permission_granted",
        "notification_permission_denied",
        "notification_permission_failed",
        "notification_prompt_snoozed",
        "notification_prompt_blocked",
        "notification_prompt_install_help_opened",
        "push_token_registration_started",
        "push_token_registered",
        "push_token_registration_failed",
        "push_token_refreshed",
        "push_token_revoked",
        "push_device_scope_resolved",
        "pwa_service_worker_registration_started",
        "pwa_service_worker_registered",
        "pwa_service_worker_registration_failed",
        "pwa_update_available",
        "pwa_update_applied",
        "pwa_offline_seen",
        "pwa_install_prompt_seen",
        "pwa_install_prompt_accepted",
        "pwa_install_prompt_dismissed",
        "notification_intent_evaluated",
        "notification_targeting_blocked",
        "notification_targeting_dry_run_eligible",
        "notification_sent",
        "notification_duplicate_prevented",
        "daily_deadline_in_app_reminder_shown",
        "daily_deadline_in_app_reminder_opened",
        "daily_deadline_in_app_reminder_dismissed",
        "daily_deadline_browser_notification_shown"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "notification_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "runtimeHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "auth_identity",
      "routes": [
        "src/app/api/auth",
        "src/app/creators/apply",
        "src/app/creators/waitlist",
        "src/app/api/user/register",
        "src/app/api/user/delete",
        "src/app/api/user/revoke-sessions",
        "src/app/api/creator/onboarding"
      ],
      "telemetryEvents": [
        "auth_modal_opened",
        "auth_surface_viewed",
        "auth_modal_closed_incomplete",
        "auth_mode_switched",
        "auth_google_started",
        "auth_google_completed",
        "auth_google_failed",
        "auth_email_login_started",
        "auth_email_login_completed",
        "auth_email_login_failed",
        "auth_email_signup_started",
        "auth_email_signup_completed",
        "auth_email_signup_failed",
        "auth_google_sign_in_attempted",
        "auth_google_sign_in_success",
        "auth_google_sign_in_failed",
        "auth_sign_in_attempted",
        "auth_sign_in_success",
        "auth_sign_in_failed",
        "auth_sign_up_attempted",
        "auth_sign_up_success",
        "auth_sign_up_failed",
        "auth_attempt_started",
        "auth_attempt_succeeded",
        "auth_attempt_failed",
        "auth_attempt_unfinished",
        "auth_session_established",
        "auth_registration_started",
        "auth_registration_completed",
        "auth_navigation_session_started",
        "auth_navigation_session_completed",
        "auth_navigation_session_failed",
        "auth_provider_conflict_detected",
        "auth_provider_conflict_resolution_shown",
        "auth_provider_conflict_cta_clicked",
        "auth_email_sign_in_failed",
        "auth_email_sign_up_failed",
        "auth_persistence_established",
        "auth_state_changed",
        "auth_unexpected_session_drop",
        "auth_logout_started",
        "auth_logout_completed",
        "auth_navigation_session_deleted",
        "auth_profile_bootstrap_started",
        "auth_profile_bootstrap_completed",
        "auth_profile_bootstrap_failed",
        "auth_profile_snapshot_reconnect",
        "auth_profile_snapshot_failed",
        "user_registered",
        "auth_session_restored",
        "auth_logout",
        "auth_password_reset_requested",
        "auth_password_reset_failed",
        "password_reset_requested",
        "password_reset_sent",
        "password_reset_failed",
        "guided_onboarding_started",
        "guided_onboarding_completed",
        "guided_onboarding_step_started",
        "guided_onboarding_step_completed",
        "onboarding_step_viewed",
        "avatar_uploaded",
        "creator_agreement_viewed",
        "creator_agreement_section_opened",
        "creator_agreement_acknowledgement_checked",
        "creator_intake_started",
        "creator_intake_step_completed",
        "creator_intake_goal_selected",
        "creator_intake_recommended_setup_shown",
        "creator_intake_submitted",
        "creator_application_updated",
        "account_delete_clicked",
        "account_delete_confirm_opened",
        "account_delete_confirmed",
        "account_delete_cancelled",
        "account_delete_request_submitted",
        "account_delete_failed",
        "account_delete_completed",
        "identity_linked"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "identity_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "runtimeHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "support",
      "routes": [
        "src/app/dashboard/support",
        "src/app/api/support",
        "src/app/faq",
        "src/app/(legal)/privacy",
        "src/app/api/user/data",
        "src/app/api/bug-reports"
      ],
      "telemetryEvents": [
        "support_inbox_viewed",
        "support_ticket_created",
        "support_thread_opened",
        "support_reply_viewed",
        "support_reply_sent",
        "support_thread_reply_failed",
        "bug_report_submitted",
        "chat_surface_viewed",
        "chat_thread_list_loaded",
        "chat_creator_selected",
        "chat_new_message_sheet_creator_selected",
        "chat_no_followed_creators_prompt_viewed",
        "chat_no_followed_creators_cta_clicked",
        "chat_thread_auto_created_or_resolved",
        "chat_paid_gd_gate_viewed",
        "chat_paid_gd_gate_primary_clicked",
        "chat_paid_gd_gate_secondary_clicked",
        "chat_insufficient_paid_gd_viewed",
        "chat_creator_reply_bypass_applied",
        "chat_realtime_listener_attached",
        "chat_realtime_listener_detached",
        "chat_realtime_listener_error",
        "chat_message_send_attempted",
        "chat_message_api_accepted",
        "chat_message_optimistic_rendered",
        "chat_message_listener_observed",
        "chat_message_reconciled",
        "chat_message_reconcile_failed",
        "chat_message_failed",
        "chat_message_send_failed",
        "chat_message_sent",
        "chat_attachment_upload_started",
        "chat_attachment_upload_failed",
        "chat_unread_updated",
        "chat_read_marked",
        "chat_thread_unread_updated",
        "chat_thread_read_marked",
        "chat_typing_started",
        "chat_typing_stopped",
        "chat_presence_connected",
        "chat_presence_disconnected",
        "chat_presence_error",
        "chat_media_file_rejected_size",
        "creator_message_sent",
        "creator_media_sent"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "support_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "runtimeHealth",
        "evidenceCompleteness"
      ]
    },
    {
      "featureId": "security",
      "routes": [
        "src/app/api/security",
        "src/app/banned"
      ],
      "telemetryEvents": [
        "chat_gating_checked",
        "chat_send_blocked",
        "chat_media_upload_blocked",
        "chat_moderation_blocked",
        "chat_message_blocked",
        "heuristic_screenshot_shortcut_mac",
        "heuristic_screenshot_shortcut_windows",
        "heuristic_screen_record_shortcut",
        "heuristic_devtools_shortcut",
        "heuristic_rapid_visibility_capture",
        "heuristic_rip_pattern",
        "heuristic_unknown_threat",
        "confirmed_print_attempt",
        "confirmed_save_attempt",
        "confirmed_copy_attempt",
        "confirmed_cut_attempt",
        "confirmed_selection_attempt",
        "confirmed_drag_attempt",
        "confirmed_context_menu_attempt"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "security_diagnostics_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "regressionRisk",
        "runtimeHealth"
      ]
    },
    {
      "featureId": "search_discovery",
      "routes": [
        "src/app/drops",
        "src/app/faq"
      ],
      "telemetryEvents": [
        "faq_search_used",
        "faq_category_selected",
        "search_query_submitted",
        "filter_selected",
        "sort_changed",
        "category_clicked",
        "category_not_interested",
        "creator_experience_request_category_selected",
        "chat_list_search_focused",
        "collection_filter_changed",
        "admin_top_drops_search",
        "drops_category_selected",
        "drops_searched"
      ],
      "noTelemetryReason": null,
      "materializerArchiveLanes": [
        "search_discovery_materializer"
      ],
      "debugVisibility": true,
      "scoreDimensions": [
        "evidenceCompleteness"
      ]
    }
  ],
  "debugLane": {
    "label": "Feature telemetry coverage",
    "status": "mapped",
    "missingFeatureEventLinks": 0,
    "rawDetailsDefaultOpen": false
  },
  "validationFailures": []
}
```

## Validation Failures

- none
