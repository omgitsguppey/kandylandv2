# Admin Shell Spacing Truth

The spacing issue is the gap between the global KandyDrops top site nav and the Admin Console nav panel. It is not a page title, analytics explainer, or hero-card issue.

The Admin Console nav panel must move up by fixing the shared shell spacing contract. Future fixes must not move only the page hero, title, or explainer card upward to hide the problem.

The admin shell owns this vertical rhythm:

1. global top nav
2. compact shared gap
3. Admin Console nav panel
4. compact shared gap
5. current admin page content

The same compact gap token must be used above and below the Admin Console panel. Individual admin pages must not add random top padding, large top margins, or negative margins to compensate for shell spacing.

Safe-area top padding is applied once by the global navbar. Admin shell spacing may reference safe-area values for sticky positioning, but nested admin page wrappers must not stack extra safe-area top padding.

Admin pages that use the Admin Console nav inherit the shared shell rhythm from `src/app/admin/layout.tsx`, `src/components/CoreLayoutWrapper.tsx`, `src/app/layout.tsx`, and `src/lib/admin-shell-spacing.ts`.

Future agents must not fix this by moving only page hero/title/explainer cards.
