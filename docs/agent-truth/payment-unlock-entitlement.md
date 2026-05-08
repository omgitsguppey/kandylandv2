# Payment Unlock Entitlement

Unlock truth is server-side entitlement logic.

- Route: `src/app/api/drops/unlock/route.ts`
- Existing entitlement check remains primary.
- Fan Pass eligible path: `usedSubscriptionAccess === true`.
- Response marker: `dataFanPassUnlockState` and `fanPassUnlockState`.
- Fan Pass does not mint paid GumDrops and does not bypass paid-GD creator chat.

Doctrine:
Fan Pass may unlock eligible drops through server entitlement evaluation, but paid-only creator monetization/chat policies remain paid-source gated.
