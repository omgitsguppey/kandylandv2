# Design System Drift Launch Gate

Status: Active launch UI drift doctrine.

This pass audits visual drift without redesigning pages. The launch rule is narrow: fix shared, repeated drift that makes KandyDrops look inconsistent or creates usability risk; document one-off or non-blocking drift for later cleanup.

## Launch Rules

- Shared badges and pills must fit their container. Use `LAUNCH_BADGE_CONTAINMENT_CLASSNAME`.
- Static labels must not look interactive. Use `LAUNCH_STATIC_BADGE_CLASSNAME` for non-clickable chips.
- Admin status badges use the shared `AdminStatusBadge` palette. Loading and cached states use brand purple; unavailable uses neutral gray; severity states may use emerald, amber, orange, yellow, or red.
- Drop timers inherit the site font. Do not add `font-mono`, terminal-style font classes, or fixed-width font stacks to countdown pills.
- Final-24-hour Drop timers show only `HH:MM:SS` as visible text. The accessible title may still say the full "Ends in ..." time.
- Admin chart colors come from `KANDYDROPS_CHART_COLORS`; do not hardcode chart accent, axis, legend, grid, or tooltip colors in each chart.
- Launch UI, PWA, manifest, and 404 surfaces must not reference obsolete starter icons or logos.
- Shell and launch route containers must not fix spacing with negative margins or duplicate safe-area padding. Use the shared mobile shell tokens.
- Featured drop CTAs and chips are cover-aware through deterministic metadata-based accent mapping, not runtime pixel sampling. Featured social proof shows unwraps only after total unwraps exceed 10; otherwise it shows views. Drop grid view counts remain unchanged. All truncated drop/card titles use the shared TitleMarquee animation, sped up by 50%, with reduced-motion respected. Video file chips use a 🎥 camera indicator for clarity.

## Allowed Drift During Launch

- Candy-coded urgency accents such as fuchsia/pink are allowed only when the surrounding component already uses them as explicit urgency states.
- Small local component edge-bleed spacing may remain when it is not part of the app shell and does not hide content behind navigation.
- One-off admin detail colors may remain when they are not shared primitives and do not undermine the main operator status language.

## Fixed In This Pass

- `AdminStatusBadge` no longer uses sky/cyan/slate as the central loading, cached, or unavailable palette.
- Drop grid badges, file-count chips, and timers use the shared badge containment helper.
- Drop preview modal file-count and timer badges use the same containment/static-chip helpers.
- Admin analytics chart colors now come from `KANDYDROPS_CHART_COLORS`.
- The validator locks the final-day countdown copy and inherited timer font contract.

## Future Agent Rule

Do not replace a repeated drift pattern with another one-off class string. If a style appears across launch surfaces, move the contract into a shared helper or shared component first, then patch the call sites.
