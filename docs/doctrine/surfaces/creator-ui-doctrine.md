# Creator UI Doctrine

Authority: primary surface doctrine for creator profiles, creator dashboard tools, creator content operations, and creator monetization workflows.

## Priority

Creator UI prioritizes operational control, creator earnings, content visibility, fan visibility, fan pass state, requests, bookings, chat, profile tools, and timeline tools.

## Rules

- Creator dashboards may be denser than User UI, but must remain less dense than Admin UI.
- Show money, status, fan, booking, and content consequences clearly before a creator acts.
- Keep creator workflows mobile-first while supporting productive tablet and desktop dashboard use.
- Creator copy can be operational, but it must not use admin-only diagnostic language unless the surface is explicitly in creator debug mode.
- Creator projection mode must be read-only when an admin views it.
- Creator monetization display must defer to server truth for paid-source GumDrops, transactions, bookings, fan passes, payouts, and entitlement state.
- Creator actions must preserve actor/target telemetry separation.
- Creator settings belong in the Creator Dashboard and must be real, server-backed, and truth-labeled. Simulated creator controls are blocked.

## Must Not

- Do not expose admin-only diagnostics in normal creator tools.
- Do not let admin projection writes become live creator behavior.
- Do not use user conversion copy when the creator needs operational status or money consequences.
- Do not let reward GumDrops satisfy paid-source creator monetization requirements.

## Applies To

- `/creators/[username]`, `/creators/apply`, `/creators/waitlist`, creator dashboard sections, creator tools, creator content controls, creator booking/fan-pass flows, and creator profile components.

## Validators

- `check:surface-doctrine-split`
- `check:creator-experience-transaction-truth`
- `check:creator-booking-error-copy`
- `check:fan-pass-gumdrops-truth`
- `check:admin-projection-analytics-exclusion`
