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
- `USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT`
- `CHAT_LIST_SCROLL_PADDING_BOTTOM`
- `CHAT_THREAD_COMPOSER_PADDING_BOTTOM`

`src/app/layout.tsx` reads `--user-mobile-bottom-nav-reserved-height` for root mobile bottom padding. `src/components/CoreLayoutWrapper.tsx` sets that variable to the shared reserved height only when the public mobile bottom nav is present. Admin, legal, and chat routes set it to `0px` because those surfaces either do not show the bottom nav or own a bounded chat shell.

## Surface Rules

Fixed overlays own their own safe-area padding. Normal route surfaces use the shared app shell reservation.

- Dashboard, Drops, Experiences, Creator Profile, 404, and public pages use the shell reservation instead of duplicating `env(safe-area-inset-bottom)` in page-level padding.
- Chat/messages use `ChatRouteShell` plus chat-specific tokens because the chat route locks the viewport and owns its internal scroll containers.
- Wallet and Drop preview are fixed overlays. Their modal footers may apply safe-area padding because they sit outside normal page flow.
- Admin overview, analytics, and debug use the admin shell spacing contract. Admin mobile does not reserve user bottom-nav space.
- Notification panels bound their height with viewport and safe-area terms because they are floating overlays.

## Forbidden Fixes

- Do not use negative margins, translate hacks, or guessed viewport constants to dodge the bottom nav.
- Do not add page-level `pb-[calc(...env(safe-area-inset-bottom)...)]` to routes already covered by the shared shell reservation.
- Do not add a second bottom-nav spacer inside Dashboard, Drops, Experiences, Creator Profile, or 404.
- Do not use `100vh`, `h-screen`, or unbounded nested scroll containers for chat.

## Validation

Run `npm run check:mobile-shell-safe-area` after mobile shell or launch-critical surface changes. For UI changes, also run the existing user chat shell, Drops mobile, admin shell spacing, mobile doctrine, not-found, and UI runtime/visual lanes as appropriate.
