# Admin Shell Spacing Truth

The spacing and overlap issue is between the global KandyDrops top site nav, the Admin Console nav panel, and the first page content. It is not a page title, analytics explainer, or hero-card issue.

The Admin Console nav panel must reserve layout space in normal document flow. Page content must never slide under the Admin Console panel. Future fixes must not move only the page hero, title, or explainer card upward to hide the problem.

The admin shell owns this vertical rhythm:

1. global top nav
2. compact shared gap
3. Admin Console nav panel
4. compact shared gap
5. current admin page content

The same compact gap token must be used above and below the Admin Console panel. The root app shell reserves the global nav height only. The admin shell applies `ADMIN_TOP_TO_CONSOLE_GAP_CLASS` to the Admin Console wrapper and `ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS` to the page-content wrapper.

Individual admin pages must not add random top padding, large top margins, negative margins, or upward `translate-y` classes to compensate for shell spacing.

Safe-area top padding is applied once by the global navbar. Nested admin page wrappers must not stack extra safe-area top padding.

Admin pages that use the Admin Console nav inherit the shared shell rhythm from `src/app/admin/layout.tsx`, `src/components/CoreLayoutWrapper.tsx`, `src/app/layout.tsx`, and `src/lib/admin-shell-spacing.ts`.

Future agents must not fix this by moving only page hero/title/explainer cards.

Future agents must not use z-index, clipping, transforms, sticky positioning, or fixed/absolute positioning as the primary spacing fix. Z-index changes can change what appears on top, but they do not reserve vertical layout space.
