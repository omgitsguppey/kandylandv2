# Creator Pricing Wiring

Generated: 2026-06-19T18:02:28.291Z
Head: 79598a740b349732332b6e1751ca9d8f5b3933dc

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

- Run deterministic UI source coverage for Fan Pass/request/booking price surfaces; use browser reproduction only for concrete source-reported issues.
