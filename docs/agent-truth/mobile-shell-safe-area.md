# Mobile Shell Safe-Area Doctrine

Status: Active launch layout doctrine  
Last updated: 2026-05-01

## Core Rule

Mobile bottom navigation space is reserved once by the shared app shell. Page components can add local breathing room, but they must not add a second full bottom-nav or `safe-area-inset-bottom` reservation unless they own a fixed overlay, drawer, or modal footer outside normal document flow.

## Shared Tokens

`src/lib/user-mobile-shell.ts` owns the user mobile shell constants:

- `USER_MOBILE_BOTTOM_NAV_HEIGHT`
- `USER_MOBILE_BOTTOM_NAV_SAFE_GAP`
- `USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET`
- `USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT`
- `USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET`
- `USER_MOBILE_CHAT_TOP_RESERVED_HEIGHT`
- `USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT`
- `USER_MOBILE_CHAT_VIEWPORT_HEIGHT`
- `CHAT_LIST_SCROLL_PADDING_BOTTOM`
- `CHAT_THREAD_COMPOSER_PADDING_BOTTOM`

`src/app/layout.tsx` reads `--user-mobile-bottom-nav-reserved-height` for root mobile bottom padding. `src/components/CoreLayoutWrapper.tsx` sets that variable to the shared reserved height only when the public mobile bottom nav is present. Admin and legal routes set it to `0px`; chat marks the route as `chat-owned`, applies a chat-specific top offset, and reserves mobile bottom-nav space through chat shell tokens so the internal composer does not create a large blank chin.

`src/lib/device-layout-contract.ts` owns the broader device layout contract. Google owns structural language: breakpoints, adaptive layout, PWA display mode, viewport units. Apple owns style/cohesion: safe areas, floating tab bars, sidebars on larger screens, glass hierarchy, stable top-level navigation. KandyDrops agents must use contract tokens and validators, not freestyle layout physics.

## Surface Rules

Fixed overlays own their own safe-area padding. Normal route surfaces use the shared app shell reservation.

- Dashboard, Drops, Experiences, Creator Profile, 404, and public pages use the shell reservation instead of duplicating `env(safe-area-inset-bottom)` in page-level padding.
- DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared.
- The guest home hero is shell-centered on mobile. It must center within available visual height between fixed top nav and mobile bottom nav/browser/PWA chrome using shell-aware viewport math, not a fixed vh-plus-nav estimate.
- Chat/messages use `ChatRouteShell` plus chat-specific tokens because the chat route locks the viewport and owns its internal scroll containers.
- The chat route bypasses normal page bottom reservation and owns its own stable mobile viewport shell. Chat list and thread views must remain anchored below the navbar across browser, standalone PWA, keyboard focus, and blur. Composer height must be compact and bottom-nav-safe. Diagnostics must not block tap/focus paths.
- Wallet remains a fixed overlay. Its modal footer may apply safe-area padding because it sits outside normal page flow.
- Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet. It keeps the global app shell and bottom nav visible, uses safe preview fields only, never exposes internal content thumbnails before unlock, adapts urgency by timer state, collects lightweight feedback, and after successful unwrap hands users to My KandyDrops with the new Drop targeted while also offering Keep Unwrapping.
- Admin overview, analytics, and debug use the admin shell spacing contract. Admin mobile does not reserve user bottom-nav space.
- Notification panels bound their height with viewport and safe-area terms because they are floating overlays.

## Forbidden Fixes

- Do not use negative margins, translate hacks, or guessed viewport constants to dodge the bottom nav.
- Do not add page-level `pb-[calc(...env(safe-area-inset-bottom)...)]` to routes already covered by the shared shell reservation.
- Do not add a second bottom-nav spacer inside Dashboard, Drops, Experiences, Creator Profile, or 404.
- Do not use `100vh`, `h-screen`, or unbounded nested scroll containers for chat.

## Validation

Run `npm run check:mobile-shell-safe-area` after mobile shell or launch-critical surface changes. Run `npm run check:device-layout-contract` after changing responsive breakpoints, display-mode detection, shell tokens, chat/drop-preview viewport ownership, or critical mobile touch sizing. For UI changes, also run the existing user chat shell, Drops mobile, admin shell spacing, mobile doctrine, not-found, and UI runtime/visual lanes as appropriate.
