# Homepage Mobile Density

## Scope

- Applies only to homepage sections after hero:
  - secondary section (`CreatorDiscoveryRail` wrapper)
  - third section (`HowItWorks` wrapper)
- Hero surface is intentionally unchanged.
- No dashboard, creator, admin, chat, drops, wallet, or nav shell changes.

## Mobile density contract

- Marker: `data-home-density="compact-mobile-v1"`
- Marker: `data-home-section="secondary"` and `data-home-section="third"`
- Mobile-only refinements:
  - section vertical spacing reduced
  - card/module padding reduced
  - heading/body scale slightly reduced
  - desktop/tablet layout behavior preserved

## Validation

- Run `npm run check:homepage-mobile-density`.
- Validator fails if hero or non-homepage surfaces are touched.
