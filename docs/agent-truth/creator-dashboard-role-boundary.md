# Creator Dashboard Role Boundary

/dashboard/creator is a creator operations landing surface. `/dashboard` is the normal user rewards, discovery, activity, and library surface.

Creator accounts may have access to creator and user surfaces, but the surfaces must not render on top of each other. Creator Dashboard must not fall through into Daily Check-In, Creator Spotlight, Recent Activity, My KandyDrops, Owned/Locked drop library tabs, locked drop cards, or normal user reward modules.

Normal users must still see user dashboard modules on `/dashboard`. Creator-specific user access happens through explicit navigation routes such as `/dashboard/library`, `/drops`, `/experiences`, `/dashboard/chat`, and wallet actions, not through accidental user dashboard content below creator operations.

The bottom navigation is a shared shell and remains available on creator routes. The content body is route-scoped: `/dashboard/creator` renders creator modules only, while `/dashboard` redirects creator-role accounts to the creator route before the user dashboard stack renders.

Any doctrine or layout logic that says the Creator Dashboard can include the user dashboard below it is stale. Keep the route boundary explicit and validate it with `npm run check:creator-dashboard-role-boundary`.
