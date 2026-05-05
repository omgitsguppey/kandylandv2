# KandyDrops Source-Of-Truth Constitution

Authority level: 2

This constitution defines how KandyDrops decides which layer owns truth.

## Truth Order

The required doctrine order is:

`contract -> server truth -> client projection -> UI display -> telemetry -> validator -> docs`

## Rules

- Contracts define names, shapes, ids, sourceTruth, actors, targets, status labels, and ownership.
- Server truth owns authoritative payment, entitlement, account, support, creator monetization, and security facts.
- Client projection may stage UI state, but it cannot become canonical truth by itself.
- UI display must label source state honestly: live, cached, stale, fallback, partial, failed, or unknown.
- Telemetry records facts and context. It cannot make unsupported business facts canonical.
- Validators enforce doctrine. Docs explain doctrine but do not override code unless a validator enforces the rule.

## Metrics

- Metrics must not be calculated independently in multiple panels.
- Revenue reads transaction or server purchase facts first.
- Unlock metrics count server entitlement facts only.
- User behavior excludes admin, owner, local-only, synthetic, and projection activity.
- Behavioral facts normalize through canonical event-fact contracts before scoring.

## Admin Truth

- Admin cards cannot invent live/stale/error states.
- Missing source truth must be visible as missing, stale, partial, failed, or unknown.
- Generated reports are evidence snapshots. They are not canonical doctrine.

## Winning Rule

When a lower-authority doc says a client event, UI state, generated report, or admin projection owns truth, this constitution wins.
