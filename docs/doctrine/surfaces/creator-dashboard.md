# Creator Dashboard Doctrine

Authority level: 4

Owner: creator dashboard/monetization

## Must

- Spend paid-source GumDrops for paid-only creator experiences.
- Return typed safe errors for expected booking and Fan Pass failures.
- Keep admin projection local-only unless explicitly promoted by contract.
- Preserve creator transaction truth before UI projection.

## Must Not

- Use daily/task/reward GumDrops for Fan Pass start or renewal.
- Surface expected booking failures as generic internal server errors.
- Count admin projection as live creator behavior.

## Source Truth

- Creator experience server helpers, creator routes, transaction facts, actor/target telemetry.

## Validators

- `check:creator-experience-transaction-truth`
- `check:creator-booking-error-copy`
- `check:fan-pass-gumdrops-truth`
- `check:admin-projection-analytics-exclusion`
