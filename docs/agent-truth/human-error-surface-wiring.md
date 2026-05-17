# Human Error Surface Wiring

Generated: 2026-05-17T16:06:58.3640899Z  
Report key: `human-error-surface-wiring`  
Source head: `87d86b710eb9452ea9a26f1c3848345c16479fa4`

## Summary

Phase 3 wires the existing human error contract and bug report reward flow into the highest-impact local user and creator surfaces that own their own visible error state.

Wired surfaces:

- `src/components/Creators/CreatorExperiencesPanel.tsx`
- `src/components/Creators/CreatorRequestsManager.tsx`
- `src/components/Creators/CreatorBookingsManager.tsx`
- `src/components/Creators/CreatorFanPassManager.tsx`
- `src/components/Creators/CreatorBroadcastManager.tsx`
- `src/components/PurchaseModal.tsx`

The new client adapter resolves route payloads, thrown errors, and HTTP status into `HumanErrorNotice` descriptors. Bug reports use sanitized context and safe internal previous routes. Reward copy remains reward GumDrops only.

## Fixed

- Creator dashboard load and mutation failures no longer render raw route errors.
- Wallet purchase create/capture/render UI failures use translated user copy.
- Eligible platform failures show a Send bug CTA through the Phase 2 hook.
- `CreatorExperiencesPanel` can render translated action failures supplied by its owner.

## Deferred

- `src/app/creators/[username]/CreatorProfileClient.tsx`: owns the current async creator action callbacks and toast handling but was outside the allowed file list.
- `src/components/Drops/**` and `src/app/drops/**`: locked preview unlock copy should be replaced in a focused drop-surface pass without touching entitlement logic.
- `src/components/Chat/ChatExperience.tsx`: chat shell and composer errors should be migrated in a chat-only pass because persistence/realtime behavior is high blast radius.

## Validation

Run:

```bash
npm run check:human-error-surface-wiring
```

The validator fails if wired surfaces drop `HumanErrorNotice` or the resolver adapter, visible UI can show raw `error.message`/`String(error)`, bug reward copy says purchased GumDrops, forbidden admin/payment/economy files changed, or deferred surfaces are hidden from this report.
