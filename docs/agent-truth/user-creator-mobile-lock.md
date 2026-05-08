# User + Creator Mobile Lock

## Android PWA chat shell scope

- Android PWA chat shell overrides are isolated to `src/components/Chat/ChatRouteShell.tsx` and `src/components/Chat/ChatExperience.tsx`.
- Android browser, iOS Safari, iOS PWA, tablet, and desktop keep the shared shell contract.
- Android PWA-only variables:
  - `--kd-android-pwa-visual-height`
  - `--kd-android-pwa-bottom-nav-height`
  - `--kd-android-pwa-bottom-safe-padding`
- Android PWA marker: `data-platform-shell="android-pwa"` only on the chat surface branch.

## iOS PWA chat shell scope

- iOS PWA chat shell overrides are isolated to chat shell and bottom-nav variable branches.
- iPhone Safari browser, Android browser, Android PWA, tablet, and desktop preserve existing shell behavior.
- iOS PWA-only variables:
  - `--kd-ios-pwa-visual-height`
  - `--kd-ios-pwa-bottom-nav-y`
  - `--kd-ios-pwa-bottom-nav-height`
  - `--kd-ios-pwa-safe-bottom`
  - `--kd-ios-pwa-chat-bottom-gap`
  - `--kd-ios-pwa-shell-lift`

## Build freshness UX policy

- User-facing stale-build banners are suppressed in public UI.
- Build freshness checks stay silent and singleton-scoped.
- Manifest freshness checks use `fetch(..., { cache: "no-store" })`.
