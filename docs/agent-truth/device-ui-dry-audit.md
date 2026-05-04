# Device UI Dry Audit

Doctrine note:
Device UI dry auditing is a deterministic source-level prediction system. It does not replace screenshots, but it catches known KandyDrops device physics violations before runtime: safe areas, bottom nav, top nav, chat focus, modal density, preview CTA placement, drop grid behavior, image loading, touch targets, and debug truth markers. Agents must run score:device-ui/check:device-ui before broad browser audits.

KandyDrops hardening is deterministic first. Agents must score and target the affected domain before broad verification. No full-suite terminal marathons by default. The repo must protect cost surfaces, source-of-truth layers, privacy/telemetry, payments, locked content, chat/support reliability, image/device performance, and legacy cleanup without rewriting stable business logic.

## Purpose

The dry audit turns KandyDrops device layout doctrine into hardcoded source rules. It predicts likely browser, standalone PWA, phone, tablet, and desktop failures from code structure, shared shell tokens, component class patterns, and data markers without opening a browser.

It is not a visual oracle. It is a fast pre-catcher for known failure modes:

- top nav collision
- bottom nav overlap
- Safari/PWA safe-area mistakes
- chat composer/input keyboard drift
- modal or wallet chin overflow
- CTA below fold
- card/grid sizing drift
- unsupported breakpoint physics
- touch-target violations
- raw viewport unit misuse
- oversized vertical sprawl
- missing debug truth markers
- disconnected shell/image tokens

## Commands

- `npm run score:device-ui` writes `agent/state/device-ui-dry-audit.generated.json`.
- `npm run check:device-ui` validates the generated report, package scripts, schema, command budget, and autofix confidence rules.

Do not use this lane to invoke Playwright, Lighthouse, Cypress, `npm run check`, or broad UI audits.

## Device Profiles

The audit uses the canonical device layout contract profiles:

- `xs-phone`: 320-359px, one-column, bottom nav required, strict density.
- `phone`: 360-479px, one-column, bottom nav required, strict safe-area rules.
- `large-phone`: 480-599px, iPhone Pro Max class, limited two-card grids allowed.
- `small-tablet`: 600-839px, touch-first, two-column allowed only when CTAs remain visible.
- `tablet`: 840-959px, two-pane allowed with documented nav adaptation.
- `large-tablet`: 960-1279px, sidebar/top-tab allowed, no stretched phone layout.
- `desktop`: 1280-1439px, wider grids with max-width discipline.
- `wide-desktop`: 1440-1599px, max-width caps required.
- `ultra-wide`: 1600px+, strict caps; no runaway full-width content.

Each profile is scored in both `browser` and `standalone-pwa` display modes where relevant.

## Scoring

Every device profile and every critical surface starts at 100.

Severity penalties:

- `info`: 0
- `minor`: -2
- `moderate`: -5
- `major`: -10
- `critical`: -25 and fail status

Status bands:

- 95-100: `clean`
- 90-94: `pass`
- 80-89: `warning`
- 70-79: `beta-risk`
- below 70: `fail`
- any critical finding: `fail`

## Surfaces

The report scores:

- `home_guest_hero`
- `dashboard`
- `drops_page`
- `featured_carousel`
- `drop_card_grid`
- `full_page_drop_preview`
- `wallet_modal`
- `experiences_page`
- `daily_checkin`
- `chat_inbox`
- `chat_thread`
- `creator_profile`
- `creator_experiences`
- `notifications_panel`
- `support_page`
- `settings_page`
- `my_kandydrops_library`

## Rule Families

The hardcoded scanner checks for:

- `100vh` in shell/chat/preview/wallet surfaces.
- fixed or sticky bottom controls without shared bottom-nav and safe-area tokens.
- hardcoded safe-area bottom math outside `src/lib/user-mobile-shell.ts`.
- missing shell, chat, preview, wallet, Experiences, drop-card, and image debug attributes.
- chat input focus stability, composer sizing, and deferred diagnostics markers.
- wallet compact density, split balance chip, purple bonus chip, and removed row subcopy markers.
- Experiences compact intro and compact DailyCheckIn variant.
- locked preview safe-fields-only route and CTA clearance markers.
- drop cover blur/CTA state data attributes and image policy usage.
- featured carousel timer/chip/CTA/social proof polish markers.
- mobile touch target patterns below the 44px contract.
- undocumented arbitrary breakpoints outside the device contract.
- fill Next Image instances without `sizes`.
- deprecated `priority` image prop.
- vertical sprawl heuristics for known compact mobile surfaces.

## Autofix Policy

The dry audit is read-only. It may mark a finding as autofixable only when the exact source change is deterministic and high confidence:

- exact `100vh` to `100dvh` in approved shell files
- exact missing data attribute on a known wrapper
- exact obsolete green wallet bonus chip classes
- exact `CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"` to a shared chat bottom token

Autofix confidence must be at least `0.95`.

Never autofix:

- payments
- auth
- unlock enforcement
- content access
- route migration
- keyboard runtime behavior
- visual design judgment
- copy/product strategy

## Agent Use

Use this lane before broad browser audits when a task touches mobile shell, chat, wallet, preview, drops, Experiences, image loading, or navigation. Treat findings as deterministic preflight evidence. Runtime screenshots can still be needed for visual judgment, but agents must not use heavy browser audits as the first line of defense.
