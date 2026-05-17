# Human Error Surface Wiring

Generated: 2026-05-17T20:26:19.044Z  
Report key: `human-error-surface-wiring`  
Source head: `df4c879a6edd33286f7ee44e48d4eb4a31c014bc`

## Summary

Phase 3 now wires the existing human error contract and bug report reward flow into key user and creator surfaces that own visible error state, including the Creator Dashboard settings load path.

Wired surfaces:

- `src/components/Creators/CreatorDashboardSettingsHub.tsx`
- `src/components/Creators/CreatorExperiencesPanel.tsx`
- `src/components/Creators/CreatorRequestsManager.tsx`
- `src/components/Creators/CreatorBookingsManager.tsx`
- `src/components/Creators/CreatorFanPassManager.tsx`
- `src/components/Creators/CreatorBroadcastManager.tsx`
- `src/components/PurchaseModal.tsx`

The client adapter resolves route payloads, thrown errors, and HTTP status into `HumanErrorNotice` descriptors. Bug reports use sanitized context and safe internal previous routes. Reward copy remains reward GumDrops only.

## Fixed

- Creator Dashboard settings load failures no longer render raw `body.error` text such as internal server failures.
- Creator Dashboard settings failures show compact translated copy and a Send bug CTA with `/api/creator/settings` context.
- Creator Dashboard cards use compact mobile density and bottom-nav-safe spacing markers.
- Creator dashboard load and mutation failures no longer render raw route errors.
- Wallet purchase create/capture/render UI failures use translated user copy.
- Eligible platform failures show a Send bug CTA through the Phase 2 hook.

## Deferred

- `src/app/creators/[username]/CreatorProfileClient.tsx`: owns the current async creator action callbacks and toast handling but remains outside this targeted dashboard pass.
- `src/components/Drops/**` and `src/app/drops/**`: locked preview unlock copy should be replaced in a focused drop-surface pass without touching entitlement logic.
- `src/components/Chat/ChatExperience.tsx`: chat shell and composer errors should be migrated in a chat-only pass because persistence/realtime behavior is high blast radius.

## Validation

Run:

```bash
npm run check:human-error-surface-wiring
```

The validator fails if wired surfaces drop `HumanErrorNotice` or the resolver adapter, the settings hub can render raw `body.error`, mobile compact density markers are missing, visible UI can show raw `error.message`/`String(error)`, bug reward copy says purchased GumDrops, forbidden admin/payment/economy files changed, or deferred surfaces are hidden from this report.
