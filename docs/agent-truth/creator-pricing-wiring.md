# Creator Pricing Wiring

Generated: 2026-05-20T23:36:45.143Z
Head: 2774c5f6508dc005acde87cf4a3a0ce37f61bd51

## Summary

- Control-plane dependency present: true
- Pricing resolver created: true
- Fan Pass route uses resolver: true
- Request route uses resolver: true
- Booking route uses resolver: true
- Public panel uses resolver: true
- Dashboard price source visible: true
- Paid-only policy preserved: true

## Fixes Applied

- Added a shared creator pricing resolver for Fan Pass, request, booking, and broadcast lanes.
- Wired subscription, request, and booking routes through resolver-backed creator settings prices.
- Updated the public creator experiences panel to display resolver-backed price and source markers.
- Marked creator dashboard pricing as custom/default while preserving paid-GumDrop-only spend helpers.

## Next Fix Order

- Capture manual user-facing Fan Pass/request/booking price screenshots before visual beta signoff.
