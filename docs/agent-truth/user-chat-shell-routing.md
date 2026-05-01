# User Chat Shell And Routing

Messages list and chat thread views share one mobile shell contract. The chat route locks document scrolling, the chat surface owns the scroll, and the Messages list must reserve space for the fixed bottom navigation plus the browser safe area.

Messages list controls must remain visible above the bottom nav. Search and new-message controls can float inside the chat shell, but the shell must reserve bottom-nav height first and the list must use scroll padding so the last conversation, empty state, and action controls are not hidden.

The previous outer-padding-only fix failed because the Messages list still used the wrong full-page sizing model. The chat route shell must bound the route inside the visible viewport, include root top padding in the `100dvh` box, and remove root mobile bottom padding so chat internals own the bottom-nav reservation. The Messages list scroll area, search control, floating compose button, and chat-thread composer all read the shared bottom-nav contract from `src/lib/user-mobile-shell.ts`.

Do not fix bottom-nav overlap with negative margins, upward transforms, clipping, or duplicated safe-area padding. Shared bottom-nav spacing lives in `src/lib/user-mobile-shell.ts`, and `MobileBottomBar` plus `ChatExperience` must consume those values instead of unrelated magic numbers.

Floating compose/new-chat controls must be anchored above the user bottom nav and iOS safe area. Do not use random outer card padding, browser chrome height guesses, `min-h-screen`/`h-screen` dead zones, or a second safe-area-bottom padding layer to make the Messages list appear correct.

The chat thread creator header must use the canonical creator profile route: `/creators/[username]`. Build it through `buildCreatorProfileHref` from `src/lib/creator-public-pages.ts`. Do not use obsolete root username paths like `/${username}`. If a creator username is missing or invalid, render a non-link profile pill and expose the missing href in debug metadata instead of linking users into a 404.

Any other creator-profile affordance in user surfaces must use the same helper. Discovery rails and chat headers must not hand-build `/creators/${username}` links, use `#` placeholders, or make unavailable creator profiles look like working links.

The global not-found surface must not show the old KandyDrops icon/logo. Its return action must be a real `next/link` target to the canonical app route, currently `/dashboard`, with stable copy: `Return to App`. Do not rely on `router.back()` as the only return path.

Future agents must not reintroduce hidden Messages controls, root-level creator profile links, router-back-only 404 behavior, or dead profile pills that look tappable but do not route.
