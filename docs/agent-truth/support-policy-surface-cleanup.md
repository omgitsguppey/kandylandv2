# Support Policy Surface Cleanup

Generated: 2026-06-16T01:28:11.435Z
Status: pass
Head: 3782e03c1f96a33b2ab0ad56f858dc90918da9e2

## Canonical Trust Surface Map

- FAQ: /faq; status=implemented; feature=support; fallback=/dashboard/support
- Support: /dashboard/support; status=implemented; feature=support; fallback=/faq
- Policies: /privacy; status=consolidated; feature=cookie_consent_privacy; fallback=/dashboard/support
- Privacy Policy: /privacy; status=implemented; feature=cookie_consent_privacy; fallback=/dashboard/support
- Download My Data: /settings; status=action_backed; feature=user_dashboard; fallback=/dashboard/support
- Account recovery support: /dashboard/support; status=support_fallback; feature=support; fallback=/faq

## Result

- Account Settings FAQ, Support, Policies, Privacy Policy, and Download My Data entries point to working canonical surfaces or authenticated actions.
- Policies are consolidated into the canonical Privacy Policy route instead of duplicated placeholder content.
- Download My Data remains an authenticated `/api/user/data` export action with support fallback copy.
- Support and account recovery remain in the support inbox and support thread routes.
- Debug visibility is registered through `support_policy_surface_health` and Admin Debug Control Tower generated reports.

## Validator Failure Rules

- FAQ/Support/Policies/Privacy links are dead
- duplicate policy/support route exists without redirect
- Download My Data links to broken action
- support fallback missing
- feature registration missing
- debug visibility missing

## Checks

- pass: packageScriptPresent
- pass: contractVersioned
- pass: routeMapCanonical
- pass: routeSourcesExist
- pass: faqSupportPoliciesPrivacyLinksNotDead
- pass: duplicatePolicySupportRoutesRedirected
- pass: downloadMyDataActionBacked
- pass: supportFallbackReady
- pass: featureRegistrationPresent
- pass: debugVisibilityPresent
- pass: noBrokenOrDishonestSurfaces
- pass: protectedSurfacesUntouched

## Validation Failures

- none
