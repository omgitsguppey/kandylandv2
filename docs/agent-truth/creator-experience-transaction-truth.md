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

## Fan Pass Paid-Source Truth

Fan Pass is a paid-source GumDrops subscription. Daily/task/reward GumDrops cannot start or renew Fan Pass. Paid package bonus GumDrops count as paid-source only if credited to purchased balance by wallet capture truth. Expected Fan Pass failures must return typed safe errors, never generic internal server errors.

Fan Pass subscribe must:

- compute price server-side with minimum `CREATOR_SUBSCRIPTION_MIN_GD`
- spend through `spendCreatorExperienceGumdrops(balance, priceGd, "subscription")`
- require purchased/paid-source balance only
- write `purchasedOnly: true`
- write `status: "active"`, `startedAt`, `renewAt`, `renewedAt`, and `autoRenew: true`
- write `transactionDebug`, `userTransactionId`, `creatorAccrualId`, a completed user transaction, and a creator ledger accrual
- include paid/reward balance before/after debug fields and `source_policy: "creator_subscription_paid_only"`

Duplicate active subscribe attempts return success with `duplicatePrevented: true` and must not create a new transaction or accrual. Cancel sets `status: "canceled"`, `canceledAt`, and `autoRenew: false`, and it must not charge.

Renewal readiness fields are allowed on new active subscription records:

- `gracePeriodEndsAt: null`
- `renewalFailureCount: 0`
- `lastRenewalAttemptAt: null`
- `renewalState: "active"`

The actual renewal processor is a future task. Adding these fields does not start auto-renew execution.

Fan Pass typed failure codes:

- `creator_or_user_not_found`
- `creator_unavailable`
- `subscriptions_unavailable`
- `insufficient_paid_gumdrops`
- `invalid_subscription_request`
- `unauthorized`

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

## Creator Booking Error Copy

Creator booking expected failures must never surface as generic internal server errors. Availability, slot conflicts, paid-GD shortfalls, disabled bookings, and creator availability must return typed safe error codes with human-readable client copy. Only unexpected route failures should become internal server errors.

Live Time booking failures use these safe codes:

- `creator_or_user_not_found`
- `creator_unavailable`
- `bookings_unavailable`
- `creator_availability_not_configured`
- `slot_outside_availability`
- `slot_already_booked`
- `insufficient_paid_gumdrops`
- `invalid_booking_request`
- `unauthorized`

The booking route may abort a Firestore transaction with a typed booking problem to preserve atomicity, but the route response must serialize the code, safe message, service type, duration, creator id, start time, and paid-balance shortfall fields when relevant. The client maps codes through `getCreatorBookingProblemCopy(...)`; the user must never see `Internal server error` for configured availability, slot, disabled-lane, creator-unavailable, or paid-GD shortfall states.
