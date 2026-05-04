# Creator Experience Transaction Truth

## Doctrine

Fan Pass, Private chat, Custom Requests, and Live Time are creator commerce actions. The client may show affordability hints, but the client is never authoritative for balance, price, deduction, accrual, entitlement, request, booking, or message truth.

No client-only balance deduction is allowed.

Paid package bonus GumDrops are paid-source GumDrops. They count toward `gumDropsPurchasedBalance` and can be used for paid-only creator monetization surfaces. Reward-source GumDrops are only non-purchase rewards such as check-ins, tasks, referrals, onboarding, or admin reward adjustments. Wallet UI may display total delivered package value, but backend source-of-funds truth must preserve paid vs reward source correctly.

## Canonical Write Pattern

Each paid creator experience must use the server route for that lane:

- Fan Pass: `src/app/api/creator/subscriptions/route.ts`
- Private chat: `src/lib/server/chat.ts` through `src/app/api/chat/threads/[threadId]/messages/route.ts`
- Custom Requests: `src/app/api/creator/requests/route.ts`
- Live Time: `src/app/api/creator/bookings/route.ts`

The route must:

- authenticate the fan or creator actor
- compute price server-side from `CreatorSettings`
- read source-aware GumDrop balance server-side
- spend through `spendCreatorExperienceGumdrops`
- require purchased/paid-source balance for creator paid actions, including paid-pack bonus GumDrops credited to `gumDropsPurchasedBalance`
- write a user transaction in `transactions`
- write the fan-facing record in the existing creator collection
- write creator accrual in `creator_ledger_accruals`
- include an idempotency key
- no-op duplicate retries without charging again
- emit actor-marked telemetry

## Existing Collections

Use `CREATOR_COLLECTIONS`; do not create a parallel transaction system.

- Fan Pass records: `creator_subscriptions`
- Private chat thread/message records: `creator_message_threads`, `creator_messages`
- Custom Requests: `creator_custom_requests`
- Live Time: `creator_call_bookings`
- Creator accruals: `creator_ledger_accruals`

## Idempotency

Every paid action uses `buildCreatorExperienceIdempotencyKey` and deterministic document IDs from `buildCreatorExperienceRecordIds`.

Duplicate retry behavior:

- If the user transaction or experience record already exists, return the existing result with `duplicatePrevented: true`.
- Do not run a second balance deduction.
- Do not create a second creator accrual.
- Do not create a second fan-facing request, booking, or message.

## Creator Share

Creator accruals use `CREATOR_REVENUE_SHARE` through `buildCreatorAccrual`. The debug payload must expose:

- `priceGd`
- `platformShareGd`
- `creatorShareGd`
- `creatorAccrualId`
- `userTransactionId`
- `creatorExperienceRecordId`
- `idempotencyKey`
- `duplicatePrevented`
- `sourceAwareBalanceBefore`
- `sourceAwareBalanceAfter`

## Telemetry

Required paid event names:

- `creator_fan_pass_started`
- `creator_private_chat_opened`
- `creator_custom_request_created`
- `creator_live_time_booked`
- `creator_experience_insufficient_balance`
- `creator_ledger_accrual_created`

Every server event must include actor marker fields, `creatorId`, `priceGd`, and the idempotency key. Admin/user behavior lanes must stay separated by actor marker classification.

## Insufficient Balance

Insufficient balance must stop before paid writes:

- no user transaction
- no creator accrual
- no fan-facing paid record
- no fake zero

The UI can route the fan to Wallet, but the server remains the source of truth.
