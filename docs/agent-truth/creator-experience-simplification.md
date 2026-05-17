# Creator Experience Simplification

Slots generated from availability windows. Fan-facing Live Time booking slots come from creator availability windows, availability timezone, selected service type, duration, booking minimum, and existing booked/upcoming/in-progress bookings.

Fan booking no longer uses arbitrary date/time input. The profile booking UI must not render `datetime-local` or let fans type free-pick booking times. A booking CTA stays disabled until the selected start time matches a generated slot.

Backend booking validation rejects arbitrary starts. `/api/creator/bookings` validates submitted `bookingStartAt` against generated creator slots and returns `slot_unavailable` for non-slot starts without changing GumDrop spend or creator attribution behavior.

Creator owners viewing their own public profile do not see fan purchase/request/booking/chat controls. Owners see creator-safe copy and a route to `/dashboard/creator`; the public profile content remains visible.

Creator management/drop surfaces show own creator drops. Creator-owned management surfaces must filter or scope rendered drops to that creator. Public creator profiles can show that creator's drops.

Public /drops remains public discovery. The public drops route keeps `data-drop-visibility-scope="public_discovery"` and must not be globally filtered to creator-owned drops.

Phase 2 depends on the Phase 1 GumDrop economy contract. Paid bundle bonus math and purchased-only creator experience spend remain unchanged by this pass.
