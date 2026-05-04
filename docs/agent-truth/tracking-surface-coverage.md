# Tracking Surface Coverage

KandyDrops behavioral tracking is only useful when every critical product surface emits canonical event facts with enough context to support admin metrics, user rollups, recommendations, moderation, watch time, and wallet economics.

## Doctrine

- Behavioral tracking is deterministic first.
- Money, unlock, and entitlement facts stay server-truth first.
- Client tracking may record intent, UI actions, and viewer interaction state.
- Materialized rollups are read models only.
- Legacy events are allowed only as labeled fallback input.
- Unsupported events must go to diagnostics, not production counts.
- Notification read is the canonical behavioral signal for notification scoring.
- Sensitive content URLs and raw prompt or message bodies must not be sent through generic telemetry.

## Coverage surfaces

- Home, auth, and onboarding
- Dashboard and daily tasks
- Drops grid, preview, and viewer
- Wallet and payments
- Creator profile and monetization
- Chat, notifications, and support
- Admin users and creator projection
- Moderation and security

## Critical payload rules

- Critical CTA and navigation events must carry `source_component`.
- Viewer/watch events must carry `drop_id`, `file_id` or `media_index`, and watch or viewer session identity when available.
- Wallet and payment events must carry transaction or order identity plus delivered GumDrops and USD value when available.
- Support, chat, and notification actions must carry their thread or notification identity.
- Failure and blocked paths should carry `reason_code`.

## Regression lane

- `npm run score:tracking-surface-coverage`
- `npm run check:tracking-surface-coverage`

The generated report is `agent/state/tracking-surface-coverage.generated.json`.
