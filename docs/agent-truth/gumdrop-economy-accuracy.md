# GumDrop Economy Accuracy

Paid bundle bonuses are purchased balance, not reward balance. PayPal/package purchases credit `paidBaseGd + paidBonusGd` into purchased GumDrops and record `rewardPromoGd: 0`.

Reward/free GumDrops are not usable for creator experiences. Daily, onboarding, referral, promo, and admin-granted free balances stay in reward/free source classes unless a separate paid capture proves purchase source.

Creator experiences require purchased-only source. Every fan request, booking, Fan Pass start/renewal, and paid creator chat message must record purchased spend, `rewardAmountSpent: 0`, and `source_policy: creator_experience_paid_only`.

Creator attribution fields required for every fan experience. Required fields are `creatorId`, `userId`, `sourceType`, `sourceId`, `grossSpendGd`, `creatorShareGd`, `cashoutValueUsd`, `userTransactionId`, `creatorAccrualId`, `creatorExperienceRecordId`, and `attributionTruth`.

Booking availability uses generated slots. Generated slots come from creator availability windows, service type, duration, timezone, and existing bookings. The fan UI must not render arbitrary datetime free-pick controls.

Creator owner mode hides fan controls on own profile. Owners see creator-safe dashboard management copy instead of fan purchase/request/booking/chat controls.

Creator management surfaces show own drops only. Public discovery remains public and route-scoped.
