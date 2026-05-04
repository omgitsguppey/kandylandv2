# Device Layout Score

Status: Active public beta layout audit doctrine  
Last updated: 2026-05-04  
Scoring code: `src/lib/device-layout-score.ts`  
Read-only score: `npm run score:layout`  
Safe repair: `npm run repair:layout` and `npm run repair:layout -- --apply`  
Validator: `npm run check:device-layout-score`

## Doctrine

KandyDrops layout scoring is deterministic. It detects violations of Google-style structure and Apple-style cohesion using hardcoded file/path/pattern rules. It can auto-fix exact safe token/string replacements only. It must escalate anything involving payments, auth, locked content exposure, keyboard runtime behavior, visual judgment, or product intent.

Google owns structure: responsive breakpoints, PWA display modes, viewport units, INP/input-delay performance, and safe-area environment variables.

Apple owns cohesion: safe areas, floating tab bars, top-level navigation stability, sidebars only when space allows, and clear control/content separation.

KandyDrops owns product physics: browser converts, PWA retains, desktop manages, admin debugs.

## Score Model

Every run starts from 100 points. Findings subtract deterministic penalties:

| Severity | Impact |
| --- | --- |
| `info` | 0 |
| `minor` | -2 |
| `moderate` | -5 |
| `major` | -10 |
| `critical` | -25 and fail status |

Score bands:

| Score | Status |
| --- | --- |
| 95-100 | `clean` |
| 90-94 | `pass` |
| 80-89 | `warning` |
| 70-79 | `beta-risk` |
| 0-69 | `fail` |

Any critical finding forces `fail` regardless of numeric score.

## Capped Categories

The scorer caps category groups so duplicate patterns do not swamp the report:

- Breakpoint contract: max -15
- Display mode and viewport contract: max -20
- Safe area, top nav, bottom nav, floating controls: max -20
- Touch target and Apple nav cohesion: max -12
- Chat shell and input-delay: max -20
- Drop preview and content protection: max -15
- Telemetry/debug truth: max -10
- Orphaned/stale logic: max -10

## Hardcoded Checks

The scorer reads local source only. It checks for:

- `100vh` in public shell, chat, preview, modal, and mobile app shell files.
- hardcoded `bottom-[calc(env(safe-area-inset-bottom)+...)]` outside shared shell tokens.
- `CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"`.
- negative margin or translate positioning hacks in shell-critical files.
- fixed bottom CTAs without safe-area or bottom-nav token ownership.
- synchronous diagnostic/reporting calls inside direct chat tap/focus handlers.
- non-whitelisted recurring timers in shell-critical UI.
- locked preview references to internal content URLs/thumbnails before unlock.
- missing shell markers such as `data-display-mode`, `data-chat-viewport-owner`, `data-chat-input-focus-stable`, `data-drop-preview-page`, and `data-safe-preview-fields-only`.
- critical touch targets below the 44px contract.
- unsupported raw breakpoint constants or arbitrary breakpoint strings outside `src/lib/device-layout-contract.ts`.

## Safe Autofix Rules

`repair:layout` is dry-run by default. `repair:layout -- --apply` applies only exact high-confidence fixes.

Autofix is allowed only when:

- `canAutofix` is true.
- `autofixConfidence >= 0.95`.
- the exact target file and exact old text match the expected occurrence count.
- the change does not touch payment, auth, unlock, economy, creator eligibility, or content access enforcement.
- the score does not get worse after repair.
- no new critical finding appears.

Initial safe repairs are limited to:

- exact `100vh` to `100dvh` in approved shell/preview files.
- exact zero chat floating-control bottom offset to the shared chat token.
- exact hardcoded floating-control bottom offset to the shared floating-control CSS variable when the shared token already exists.

Everything else escalates with a human-readable warning.

## Commands

```bash
npm run score:layout
npm run repair:layout
npm run repair:layout -- --apply
npm run check:device-layout-score
```

Generated report:

```text
agent/state/device-layout-score.generated.json
```

Do not run browser automation for the default score path. Runtime visual verification is a separate escalation, not an automatic step.
