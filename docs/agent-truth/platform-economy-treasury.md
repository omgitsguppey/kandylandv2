# Platform Economy Treasury

Status: admin treasury truth  
Recorded: 2026-05-06

## Treasury Strip

The treasury strip exposes:

- Outstanding GD
- Paid GD
- Bonus paid-source GD
- Reward/free GD
- Paid-source average USD per 100 GD
- Floor state
- Warning count

These values are informative treasury truth. They do not authorize balance mutation by themselves.

## Wallet Drilldown

Wallet drilldown is a paginated admin review surface over source-aware user balances. It must show total, paid, reward/free, and source warnings. Missing or inconsistent source-aware splits must warn instead of rendering healthy.

## Drift Expectations

Platform Economy is the winner when treasury totals disagree with downstream admin overview, wallet display, revenue cards, or debug projections. Lower surfaces must mark drift rather than silently reconciling.

## Deterministic Value Basis

Treasury value basis uses `calculateGumdropValueBasis` from `src/lib/deterministic-admin-truth.ts`.

- Platform Economy is the ultimate GumDrops Treasury and Commerce Control Center.
- Paid-source GD = paidGd + paidBonusGd.
- Paid package bonus GD is paid-source bonus, not reward/free.
- Reward/free GD is tracked separately and is not allowed for creator-restricted paid spend.
- `$1 = 100 GD` is the base anchor.
- `$0.50 per 100 GD` is the warning floor. Below the floor is review/error depending severity.
