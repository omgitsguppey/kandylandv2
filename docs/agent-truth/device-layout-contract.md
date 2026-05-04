# Device Layout Contract

Status: Active public beta layout doctrine  
Last updated: 2026-05-04  
Canonical code: `src/lib/device-layout-contract.ts`  
Validator: `npm run check:device-layout-contract`

## Doctrine

Google owns structural language: breakpoints, adaptive layout, PWA display mode, viewport units.

Apple owns style/cohesion: safe areas, floating tab bars, sidebars on larger screens, glass hierarchy, stable top-level navigation.

KandyDrops agents must use contract tokens and validators, not freestyle layout physics.

## Device Classes

The KandyDrops contract aligns with the Google/Material structural boundaries at 480, 600, 840, 960, 1280, 1440, and 1600 while adding product-safe phone lanes below 480.

| Class | Width range |
| --- | --- |
| `xs-phone` | 0-359px |
| `phone` | 360-479px |
| `large-phone` | 480-599px |
| `small-tablet` | 600-839px |
| `tablet` | 840-959px |
| `large-tablet` | 960-1279px |
| `desktop` | 1280-1439px |
| `wide-desktop` | 1440-1599px |
| `ultra-wide` | 1600px and above |

Do not add new breakpoint constants in feature code. If a public beta surface needs a new structural lane, update `src/lib/device-layout-contract.ts` first and then update the validator.

## Display Modes

Allowed display modes are:

- `browser`
- `standalone-pwa`
- `fullscreen`
- `unknown`

`CoreLayoutWrapper` exposes `data-display-mode` using the shared detector. Feature code may read the data attribute for debugging, but visual layout should prefer CSS, shared shell tokens, and dynamic viewport units over page-specific runtime branches.

## Shell Rules

`src/lib/user-mobile-shell.ts` owns the public mobile shell CSS math that feature surfaces consume.

- Top navigation is fixed/floating glass and safe-area-aware.
- Phone user shell keeps the mobile bottom navigation visible.
- Mobile bottom navigation is navigation only, not an action bar.
- Content must reserve bottom-nav height plus safe area plus 12px-16px breathing room.
- Floating controls must use shared shell tokens such as `USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET`.
- The chat route owns an internal viewport. It uses `100dvh` or `--chat-visual-viewport-height`, not document scroll, as the layout owner.
- The full-page locked drop preview keeps bottom nav visible and pins its sticky CTA above the reserved bottom-nav space.

## Sizing Constants

| Token | Contract |
| --- | --- |
| Minimum touch target | 44px |
| Bottom nav visual height | 56px |
| Bottom nav breathing room | 12px-16px |
| Chat input row | 48px-52px |
| Chat send button | 48px |
| Chat plus button | 44px-48px |
| Chat price line max height | 20px |
| Floating buttons | 44px-48px |

These values are exported from `DEVICE_LAYOUT_COMPONENT_SIZING`.

## Critical Surfaces

Critical shell surfaces must expose machine-readable markers so audits can verify ownership without browser automation:

- App shell route wrapper: `data-device-layout-contract`, `data-display-mode`, `data-user-mobile-shell-route`
- Top nav: `data-device-layout-surface="top-nav"`
- Mobile bottom nav: `data-device-layout-surface="mobile-bottom-nav"`
- Chat: `data-chat-shell-mode`, `data-chat-viewport-owner`
- Locked drop preview: `data-drop-preview-page`, `data-safe-preview-fields-only`

## Forbidden Patterns

- `100vh` in public mobile shell, chat, or drop preview layout code.
- Negative margins or translate hacks to move shell-critical content.
- Hardcoded mobile bottom offsets for global floating controls or chat controls.
- `CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"` for visible chat UI.
- Touch target classes below 44px in MobileBottomBar, chat composer controls, or preview CTAs.
- Client rendering of locked internal content URLs, content thumbnails, or scrapeable protected previews before unlock.

## Source Anchors

- Google/Material responsive layout boundaries: https://m1.material.io/layout/responsive-ui.html
- Web display-mode media feature: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode
- Apple Human Interface Guidelines layout/safe areas: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple minimum target guidance is reflected in the KandyDrops 44px minimum touch target rule.

## Validation

Run:

```bash
npm run check:device-layout-contract
```

This validator is deterministic and source-based. It does not run Playwright, Lighthouse, Cypress, or broad UI audits.

For score-based triage and safe repairs, use `npm run score:layout`, `npm run repair:layout`, and `npm run check:device-layout-score`.

KandyDrops layout scoring is deterministic. It detects violations of Google-style structure and Apple-style cohesion using hardcoded file/path/pattern rules. It can auto-fix exact safe token/string replacements only. It must escalate anything involving payments, auth, locked content exposure, keyboard runtime behavior, visual judgment, or product intent.
