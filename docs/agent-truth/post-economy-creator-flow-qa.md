# Post-Economy Creator Flow QA

Wallet package bonuses use compact paid-GD promo labels; source-of-funds proof remains in ledger/server evidence. User-facing copy must not call paid bundle bonuses free or reward GumDrops.

Wallet package bonuses stay compact and do not reintroduce paid-bonus source subcopy. Purchase UI copy stays simple while source-of-funds truth remains in ledger/server evidence.

Creator experience CTAs use purchased GumDrops, not total balance. Reward/free GumDrops cannot make Fan Pass, requests, bookings, paid chat, or paid creator media appear eligible.

Creator attribution stays explicit. Creator experience transaction metadata must retain purchasedAmountSpent, rewardAmountSpent, creatorAccrualId, creatorExperienceRecordId, and creator attribution fields.

Booking remains generated-slot only. The fan booking UI must not render arbitrary date/time inputs, and slot unavailable errors should tell the fan to pick another available creator time slot.

Creator owners do not see fan purchase/request/booking/chat controls. Owner profile mode keeps public profile content visible and routes owners to Creator Dashboard.

Public drops remains public discovery. Creator-owned scopes must not leak into `/drops`.

Creator earnings visibility uses the existing creator settings stats source. The dashboard may show read-only earned GD and pending cashout only when `/api/creator/settings` provides `stats` and `statsEvidence`; it must keep `data-creator-earnings-attribution="creator_experience_paid_source"` and must not create a separate broad accrual read.
