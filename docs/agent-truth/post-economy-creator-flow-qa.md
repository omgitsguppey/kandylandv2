# Post-Economy Creator Flow QA

Paid bundle bonus GumDrops are purchased paid-bonus credits. User-facing copy must not call paid bundle bonuses free or reward GumDrops.

Creator experience CTAs use purchased GumDrops, not total balance. Reward/free GumDrops cannot make Fan Pass, requests, bookings, paid chat, or paid creator media appear eligible.

Creator attribution stays explicit. Creator experience transaction metadata must retain purchasedAmountSpent, rewardAmountSpent, creatorAccrualId, creatorExperienceRecordId, and creator attribution fields.

Booking remains generated-slot only. The fan booking UI must not render arbitrary date/time inputs, and slot unavailable errors should tell the fan to pick another available creator time slot.

Creator owners do not see fan purchase/request/booking/chat controls. Owner profile mode keeps public profile content visible and routes owners to Creator Dashboard.

Public drops remains public discovery. Creator-owned scopes must not leak into `/drops`.

Deferred follow-up: creator accrual IDs and attribution are present in backend transaction records, but this pass does not invent a new creator earnings dashboard panel.
