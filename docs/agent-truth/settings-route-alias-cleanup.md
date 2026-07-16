# Settings Route Alias Cleanup

Generated: 2026-07-16T04:27:42.331Z
Status: pass
Head: 621afada2aea0ef269a02c7ac68d4424bfce5214

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
