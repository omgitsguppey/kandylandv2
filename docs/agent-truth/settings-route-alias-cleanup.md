# Settings Route Alias Cleanup

Generated: 2026-05-25T15:00:39.900Z
Status: pass
Head: 5cfb3fcdfea33f079e1320203d737e3d1333ba80

## Canonical Route Table

- Account Settings: `/settings`
- Creator Settings: `/dashboard/creator/settings`
- User profile basics: Account Settings profile section at `/settings`
- Creator Dashboard: `/dashboard/creator`
- Creator Drop Manager: `/dashboard/creator/drops`
- Public Creator Profile: `/creators/[username]`

## Redirect Aliases

- `/dashboard/settings`, `/dashboard/profile`, `/profile/settings`, and `/account` redirect to `/settings`.
- `/creator` and `/creators/dashboard` redirect to `/dashboard/creator`.
- `/dashboard/profile/creator` remains a migration notice that points to Creator Settings.

## Checks

- pass: packageScriptPresent
- pass: routeTableCanonical
- pass: routeConstantsCanonical
- pass: accountSettingsCanonicalOnly
- pass: accountAliasesRedirect
- pass: creatorAliasesStayCreator
- pass: creatorSettingsSeparated
- pass: legacyCreatorProfileSettingsExplained
- pass: labelsUnambiguous
- pass: featureRegistrationIncludesCanonicalAndAliases
- pass: splitValidatorUpdated
- pass: publicCreatorProfileRoutePresent
- pass: protectedSurfacesUntouched

## Validation Failures

- none
