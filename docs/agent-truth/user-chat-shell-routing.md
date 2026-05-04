# User Chat Shell And Routing

Messages list and chat thread views share one mobile shell contract. The chat route locks document scrolling, the chat surface owns the scroll, and the Messages list must reserve space for the fixed bottom navigation plus the browser safe area.

The chat route bypasses normal page bottom reservation and owns its own stable mobile viewport shell. Chat list and thread views must remain anchored below the navbar across browser, standalone PWA, keyboard focus, and blur. Composer height must be compact and bottom-nav-safe. Diagnostics must not block tap/focus paths.

Messages list controls must remain visible above the bottom nav. Search and new-message controls can float inside the chat shell, but the shell must reserve bottom-nav height first and the list must use scroll padding so the last conversation, empty state, and action controls are not hidden.

The chat route bypasses normal page bottom-nav reservation and owns its own mobile shell spacing. Inbox controls, floating compose controls, and thread composer must sit above the mobile bottom nav in Safari browser and standalone PWA modes using shared chat shell tokens, not per-screen hardcoded offsets.

Chat interaction handlers are INP-sensitive. Thread open, back-to-list, compose-open, search-focus, and send-start paths must keep visual state updates immediate while deferring viewport reads, layout diagnostics, recovery reports, and telemetry payload construction until after paint. Self-healing is allowed, but it must not run synchronous DOM recovery or diagnostic reporting inside tap/focus handlers.

The previous outer-padding-only fix failed because the Messages list still used the wrong full-page sizing model. The chat route shell must bound the route inside the visible viewport, align the shell top through the chat-specific root top spacing token, and reserve chat bottom-nav height through the chat-owned shell contract so the composer itself does not create a large blank chin. The shell reserves the mobile bottom-nav height once; the Messages search control, floating compose button, and chat-thread composer use only the compact 12-16px inner control gap above that reserved boundary. The Messages list scroll area, search control, floating compose button, and chat-thread composer all read the shared bottom-nav contract from `src/lib/user-mobile-shell.ts`.

Keyboard focus must not transfer scroll ownership to the outer document. `ChatRouteShell` may use `visualViewport` only to update a lightweight CSS height variable and restore the route-owned shell on resize, blur, transition, or unmount. Focus and tap handlers must keep visual state immediate and defer diagnostics, layout reads, and recovery reporting until after paint.

Do not fix bottom-nav overlap with negative margins, upward transforms, clipping, or duplicated safe-area padding. Shared bottom-nav spacing lives in `src/lib/user-mobile-shell.ts`, and `MobileBottomBar` plus `ChatExperience` must consume those values instead of unrelated magic numbers.

Floating compose/new-chat controls must be anchored above the user bottom nav and iOS safe area. Do not use random outer card padding, browser chrome height guesses, `min-h-screen`/`h-screen` dead zones, or a second safe-area-bottom padding layer to make the Messages list appear correct.

The chat thread creator header must use the canonical creator profile route: `/creators/[username]`. Build it through `buildCreatorPublicHref` from `src/lib/creator-profile-routing.ts`. Do not use obsolete root username paths like `/${username}`. If a creator username is missing or invalid, render a non-link profile pill, emit `creator_profile_link_missing`, and expose the missing href reason in debug metadata instead of linking users into a 404.

Any other creator-profile affordance in user surfaces must use the same helper. Discovery rails and chat headers must not hand-build `/creators/${username}` links, use `#` placeholders, or make unavailable creator profiles look like working links.

The global not-found surface must not show the old KandyDrops icon/logo. Its return action must be a real `next/link` target to the canonical app route, currently `/dashboard`, with stable copy: `Return to App`. Do not rely on `router.back()` as the only return path.

Future agents must not reintroduce hidden Messages controls, root-level creator profile links, router-back-only 404 behavior, or dead profile pills that look tappable but do not route.
