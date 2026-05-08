# User UI Doctrine

Authority: primary surface doctrine for public, fan, dashboard, library, support, notification, Drops, and viewer-facing user experiences.

## Priority

User UI prioritizes conversion, clarity, reward-loop momentum, trust, and emotional pacing. It is mobile/PWA-first.

## Rules

- Keep cards simple, readable, and action-oriented.
- Use compact density only when it improves scanning; compact must not become cramped.
- Do not use admin-style diagnostic density, source machinery, raw metrics, or debug terminology.
- Use user-facing copy only. Errors become human action copy with a clear next step.
- Top nav and bottom nav remain polished, stable, and shell-aware.
- Helpful states are allowed, but raw truth machinery stays behind the display layer.
- Tracking must be invisible, consent-aware, and compliant with telemetry contracts.
- Payment, unlock, entitlement, support, and account states must explain what the user can do next without inventing source truth.
- Global `/settings` owns user/account preferences only. Creator broadcasts, Fan Pass, bookings, requests, availability, earnings, and monetization tools must redirect to the Creator Dashboard.

## Must Not

- Do not force admin dense card grids onto user pages.
- Do not show `[live]`, `[cached]`, `[stale]`, debug ids, raw JSON, or confidence machinery unless a support/debug feature explicitly requires it.
- Do not count UI success state as payment, unlock, entitlement, or revenue truth.
- Do not expose internal content URLs or protected media before entitlement truth.

## Applies To

- `/`, `/drops`, `/experiences`, `/dashboard`, `/dashboard/library`, `/dashboard/viewer`, `/dashboard/support`, `/settings`, `/support`, `/notifications`, `/library`, `/faq`, `/offline`, and user-side components.

## Validators

- `check:surface-doctrine-split`
- Feature-specific validators selected from `agent/context/surface-doctrine-map.json`
