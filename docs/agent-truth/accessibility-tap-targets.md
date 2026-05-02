# Accessibility And Tap-Target Launch Gate

KandyDrops launch-critical controls must be usable by touch, keyboard, and assistive technology. Visual style is not enough: every interactive state needs a semantic control and a readable state.

## Doctrine

- Use native `button` or `a` controls for actions and navigation.
- Icon-only controls need an accessible name through `aria-label`, visible text, or a labelled wrapper.
- Active navigation uses `aria-current="page"` or an equivalent route state.
- Toggle-like controls use `aria-pressed`, selected tabs use `aria-pressed` or an equivalent tab pattern, and expandable controls use `aria-expanded`.
- Modals either use a library focus trap, such as Radix Dialog, or implement/document focus containment and Escape/back behavior.
- Countdown timers must expose a useful title/label but must not stream every second to screen readers. Use `aria-live="off"` for visible ticking text unless a specific alert is required.
- Errors tied to an action should use direct field association where forms are involved, or `role="alert"` for compact action-level failures.
- Disabled launch-critical actions must keep visible context explaining why the action is unavailable.
- Mobile tap targets should be 44 CSS pixels when possible. Compact controls may be 40 CSS pixels only when the label is visible and surrounding spacing prevents accidental taps.

## Launch Surfaces

Covered surfaces are top nav, bottom nav, drops page, drop cards, wallet/purchase modal, unlock modal, viewer, chat/messages, notifications, auth/onboarding, creator profile, Admin Overview, Admin Analytics, Admin Debug, 404/not-found, and shared modals/drawers/tabs/filters/icon buttons.

## Current Fixes

- Mobile bottom navigation exposes a navigation label and `aria-current` on active links.
- Admin menu links expose `aria-current`, and icon-only top-nav/profile controls have explicit names.
- Drop card preview buttons have explicit preview labels.
- Drop countdown text uses title/aria labels without live-region ticking.
- Wallet package selections expose pressed state, and the wallet modal has dialog semantics, initial focus, Tab containment, Escape close, and alert errors.
- Drop preview confirmation exposes pressed state and keeps the Radix Dialog focus behavior.
- Viewer thumbnail controls have labels and active/current state.
- Admin Analytics and Debug tab controls expose pressed state.

## Future Agent Rules

- Do not add clickable `div` or `span` elements unless native controls cannot be used; if unavoidable, add role, `tabIndex`, Enter/Space keyboard support, and a documented reason.
- Do not add mystery icon buttons. Name them.
- Do not add visual-only active states for nav, tabs, filters, or toggles.
- Do not make countdowns or refresh timers `aria-live` by default.
- Do not shrink mobile controls below the documented compact target without recording the exception in the audit.
- Run `npm run check:accessibility-tap-targets` after touching launch-critical controls.
