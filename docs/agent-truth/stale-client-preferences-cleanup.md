# Stale Client Preferences Cleanup

Generated: 2026-07-16T04:27:43.366Z
Status: pass
Head: 621afada2aea0ef269a02c7ac68d4424bfce5214

## Result

- Account and privacy settings remain backend-backed through `/api/user/profile`.
- Creator settings remain backend-backed through `/api/creator/settings` and `src/lib/creator-settings/creator-settings-contract.ts`.
- Local storage is limited to consent mirroring, telemetry duplicate prevention, and UI-only dismissal/draft state.
- Derived admin/browser snapshot caches must be session-only and deploy-version guarded before hydration.
- No persisted localStorage setting bypasses backend truth.
- Debug visibility stays in the `Settings health` lane and can surface stale client preference bypass counts.

## Inventory

- guest_privacy_consent_snapshot: canonical_backend_backed, localStorage, consent_mirror; truth=Guest consent is mirrored locally and signed-in consent is sourced from users/{uid}.privacySettings.
- account_settings_form_state: canonical_backend_backed, memory, ui_draft; truth=users/{uid} via AuthContext userProfile and /api/user/profile.
- creator_settings_draft_state: canonical_backend_backed, memory, ui_draft; truth=users/{uid}.creatorSettings via /api/creator/settings.
- notification_prompt_dismissal: local_ui_only_display_state, localStorage, ui_dismissal; truth=users/{uid}.notificationSettings controls actual notification preference truth.
- task_guidance_pending_action: local_ui_only_display_state, sessionStorage, ui_draft; truth=Daily task completion and account state remain server/catalog truth.
- telemetry_identity_link_dedupe: local_ui_only_display_state, localStorage, telemetry_dedupe; truth=Identity links are submitted to /api/analytics/identity-link when consent permits.
- admin_analytics_overview_snapshot_cache: deploy_version_guarded_snapshot, sessionStorage, derived_snapshot_cache; truth=Admin Analytics display truth remains the verified backend route/hot-cache snapshot; browser storage may only seed a deploy-version-matched last validated snapshot while the route refreshes.

## Checks

- pass: packageScriptPresent
- pass: clientPreferenceContractPresent
- pass: derivedSnapshotCachesDeployVersionGuarded
- pass: noContractedStaleBypasses
- pass: noPersistedLocalStorageSettingsBypass
- pass: noBackendTruthStoredInBrowser
- pass: privacyTogglesUseConsentPolicy
- pass: creatorSettingsUseControlPlane
- pass: clientDefaultCannotSilentlyOverrideServer
- pass: noStaleSettingsHelperImports
- pass: debugPanelFlagsStaleBypasses
- pass: featureRegistrationCovered
- pass: protectedSurfacesUntouched

## Validator Failure Rules

- persisted localStorage setting bypasses backend truth
- privacy/tracking setting bypasses consent policy
- creator setting bypasses creator settings contract
- client default can override server value silently
- derived snapshot cache lacks deploy-version guard
- stale settings helper remains imported
- debug panel cannot flag stale bypasses

## Validation Failures

- none
