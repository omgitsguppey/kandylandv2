# Chat Composer Modal Lift

Generated: 2026-05-22T23:53:34.527Z
Status: pass
Current head: 58929a769685124b73004b07f1795ec1dd0dd45f

## Contract

- The Chat tab New message creator picker remains the existing composer modal in `src/components/Chat/ChatExperience.tsx`.
- The modal is lifted above the mobile bottom navigation with the shared chat bottom-nav/safe-area token.
- The scrollable creator list keeps internal bottom padding so the final row remains visible.
- The panel uses a black frosted glass skin with readable text, subtle border, blur, and shadow.
- Chat routing, message sending, thread APIs, creator follow logic, notification logic, payment runtime, wallet runtime, and GumDrop math are untouched.

## Checks

- pass: modalComponentPresent
- pass: modalHasRequiredDataAttrs
- pass: modalUsesBottomNavSafeOffset
- pass: modalHasInternalBottomPadding
- pass: modalUsesBlackFrostedGlassSkin
- pass: modalAvoidsLightGrayPanel
- pass: mobileSafeAreaHandlingExists
- pass: bottomNavUntouched
- pass: topNavUntouched
- pass: chatFunctionsUntouched
- pass: creatorPickerLogicUntouched
- pass: paymentWalletGumdropUntouched
- pass: packageScriptPresent

## Changed Files

- CHANGELOG.md
- agent/state/chat-composer-modal-lift.generated.json
- docs/agent-truth/chat-composer-modal-lift.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-chat-composer-modal-lift.ts
- src/components/Chat/ChatExperience.tsx
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/chat-composer-modal-lift.spec.ts

## Validation Failures

- none
