# Device UI Doctrine

Authority level: 4

Owner: device UI/layout

## Must

- Use shared device layout and mobile shell helpers.
- Respect Google-style structure and Apple-style cohesion.
- Run deterministic device UI audits before broad browser audits.
- Keep chat, preview, wallet, nav, and modal spacing shell-aware.

## Must Not

- Freestyle viewport math.
- Use raw mobile `100vh` in shell-critical views.
- Guess safe-area offsets per screen.

## Source Truth

- Device layout contract, user mobile shell, device UI dry audit.

## Validators

- `check:device-layout-contract`
- `check:device-ui`
- `score:device-ui`
