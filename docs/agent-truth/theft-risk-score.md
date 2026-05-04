# Theft Risk Score

KandyDrops moderation uses evidence-weighted theft-risk scoring, not vague screenshot warnings.

## Core rule

Browser and PWA visibility events are heuristic only. They must never be shown as confirmed screenshot detection.

Use `possible capture/theft pattern` for viewer-only shortcut, visibility, pagehide, blur, or similar browser evidence.

Confirmed only if server/platform evidence exists.

Confirmed means server or platform evidence exists:

- blocked asset access without entitlement
- repeated 401/403 media attempts
- direct protected asset requests without a viewer session
- signed URL reuse across sessions, devices, or identities
- rapid sequential asset requests beyond viewer pace

## Score tiers

- `0-19` low
- `20-39` watch
- `40-59` review
- `60-79` high
- `80-100` critical

## Weighting

### Server confirmed

- entitlement blocked asset access: `+45`
- repeated `401/403` media attempts: `+30`
- direct asset request without viewer session: `+35`
- signed URL reuse across session/device/IP: `+40`
- rapid sequential media requests beyond UI pace: `+35`

### Behavioral

- many file opens in a short window: `+15` to `+35`
- many views with near-zero valid watch time: `+20`
- rapid file stepping: `+15`
- repeated open/close of the same content: `+10`

### Weak signals

- one visibility hidden/pagehide while content visible: `+3 max`
- repeated hidden immediately after reveal across files: `+10`
- contextmenu/drag/select/copy/print attempt: `+12` to `+20`

### Negative signals

- normal viewing pace: `-15`
- long valid watch time: `-10`
- one-off mobile Safari blur: `-20`
- returned and continued normal viewing: `-10`

## Caps and gates

- weak signals alone cannot exceed watch tier
- high risk requires repeated suspicious events or score `>= 60` with strong/server evidence
- no auto-restriction unless score `>= 80` and confidence strong/confirmed

No auto-restriction unless score >= 80 and confidence strong/confirmed.

## Admin UI doctrine

- cards must show what actually happened first
- recommended action is secondary
- `left_content_visible` alone is low risk
- entitlement violations rank high
