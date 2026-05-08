# Chat Shell Stability

## Scope contract

- Chat shell stability changes must not mutate shared iOS/browser sizing behavior.
- Android PWA standalone mode may apply isolated overrides when chat viewport physics diverge.
- iOS installed PWA/standalone mode may apply isolated shell overrides when viewport/nav physics diverge.
- Shared chat constants remain canonical unless an override is explicitly Android PWA scoped.

## Android PWA stabilization lane

- Detection: Android user agent + standalone display mode.
- Chat shell applies Android PWA-specific viewport/bottom-nav variables.
- Transcript/composer/list controls stay above mobile bottom navigation.
- Android browser branch must not receive Android PWA class/marker/padding behavior.

## iOS PWA stabilization lane

- Detection: iOS user agent/platform + standalone display mode.
- iOS PWA-only variables:
  - `--kd-ios-pwa-visual-height`
  - `--kd-ios-pwa-bottom-nav-y`
  - `--kd-ios-pwa-bottom-nav-height`
  - `--kd-ios-pwa-safe-bottom`
  - `--kd-ios-pwa-chat-bottom-gap`
  - `--kd-ios-pwa-shell-lift`
- Markers:
  - `data-platform-shell="ios-pwa"`
  - `data-chat-shell-platform="ios-pwa"`
  - `data-new-message-sheet-platform="ios-pwa"`
  - `data-new-message-sheet-safe="above-bottom-nav"`
- Thread transcript bottom anchoring is restored on thread open and media load without forcing scroll after manual upward user scroll.
