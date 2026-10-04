# Compact Platform pulse

Status: source-truth compact refactor for Admin Overview.

The Platform pulse panel renders exactly six rolling 30-day stats: Users, Purchases, Revenue, Unwraps, GumDrops, and Support/Bugs. Each stat compares the current rolling 30-day window with the previous rolling 30-day window.

Compact cards show only the label, primary value, and delta. Success badges, source text, confidence text, and subtext are intentionally excluded from the card body. Issue badges remain visible when a source is stale, unavailable, blocked, under review, or has warnings.

The canonical builder emits `null` for missing primary and comparison values, including missing GumDrops and Support/Bugs summaries. Missing state takes precedence over review warnings. The shared `AdminMetricCard` displays **Unavailable** with no delta; a verified numeric zero remains zero with its valid comparison. Overview receipt time does not become a successful data-update timestamp when the snapshot is unavailable. Charts and empty transaction/activity panels require an available overview snapshot. Source detail is collapsed once below the cards; missing cache data is not source disagreement.

The Admin shell constrains grid items with `min-w-0` and an explicit single-column mobile track. Its navbar occupies normal flow, so the shell reserves no duplicate top height. The navigation row owns its horizontal scrolling; page content never inherits its intrinsic row width. Responsive/browser verification remains distinct from the source validator.

GumDrops combines reward GD, paid GD, and paid bonus GD for this compact display only. Backend/source metadata preserves the paid/reward split and does not change ledger math.

Support/Bugs combines user-reported bug reports and user support requests only. It excludes AI, debug, code, system, and internal diagnostics. The route uses bounded summary/count sources and does not read raw support or bug bodies for this card.
