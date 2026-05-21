# Identity Handoff Refinement

Generated: 2026-05-21T15:37:23.860Z
Status: pass
Consent tracking contract: present

## Contract

- Guest events carry `guestId`, `sessionId`, `consentMode`, and a guest identity state.
- Signup/login links use deterministic `identityLinkId` values and stay idempotent.
- Minimal, decline, and unknown consent cannot create person-level behavioral attribution.
- Full behavioral consent can link guest history to a logged-in person without double counting.
- Legacy unknown records stay excluded from known-user behavior.

## Checks

- pass: consentTrackingContractPresent
- pass: stateMachineHasSignupAndLogin
- pass: deterministicIdempotentLink
- pass: identityLinkConsentAware
- pass: identityRouteBlocksMinimalConsent
- pass: authContextPassesConsentMode
- pass: trackerCarriesConsentMode
- pass: linkedGuestNoDoubleCount
- pass: behaviorMathBlocksMinimalPersonBehavior
- pass: legacyUnknownNotKnownUser
- pass: consentTransitionsTested
- pass: noProtectedSurfacesTouched
- pass: fullBehaviorRequiresFullConsent
- pass: identityPersistenceRequiresAllowedConsent
- pass: trackerContextHasLinkId
- pass: legacyStateExists
- pass: noBroadReadOnLogin
- pass: sourceFilesUseExistingIdentityTransfer

## Next Actions

- Keep formal runtime/provider/manual evidence gates separate; this is source-only identity continuity proof.
