# Surface Doctrine Cards

Authority level: 4

This folder contains the short canonical doctrine card for each product or engineering surface. Each card is intentionally compact and points to validators rather than repeating long historical reports.

## Surfaces

Surface routing docs:

- `../03-surface-hierarchy.md`
- `user-ui-doctrine.md`
- `creator-ui-doctrine.md`
- `admin-ui-doctrine.md`
- `server-truth-doctrine.md`
- `shared-brand-primitives.md`

Feature doctrine cards:

- `wallet.md`
- `drops.md`
- `viewer.md`
- `watch-time.md`
- `telemetry.md`
- `user-management.md`
- `behavioral-intelligence.md`
- `creator-profile.md`
- `creator-dashboard.md`
- `support.md`
- `moderation.md`
- `admin-debug.md`
- `admin-ai.md`
- `device-ui.md`
- `image-loading.md`
- `security-cost.md`
- `cloud-sql-bigquery.md`

Use `agent/context/surface-doctrine-map.json` before choosing a surface doc. User, creator, admin, server, shared primitive, and cross-surface contract rules decide which feature doctrine applies.

Run `npm run score:doctrine` to regenerate `agent/context/doctrine-registry.json`, `agent/context/doctrine-cards.jsonl`, and `agent/context/doctrine-conflicts.generated.json`.
