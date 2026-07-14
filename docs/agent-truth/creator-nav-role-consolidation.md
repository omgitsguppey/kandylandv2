# Creator Navigation Role Consolidation

Generated evidence: `agent/state/creator-nav-role-consolidation.generated.json`
Validator: `npm run check:creator-nav-role-consolidation`

## Canonical Route Matrix

| Route or constant | Canonical surface | Rule |
| --- | --- | --- |
| `/dashboard` | User dashboard surface | Normal users see Daily Check-In, Creator Spotlight, Recent Activity, My KandyDrops, and library modules. Creator-role accounts redirect to `/dashboard/creator` instead of stacking both dashboards. |
| `/dashboard/creator` | Creator dashboard landing | Creator operations landing only. It must not render user reward, discovery, activity, shop, library, Owned/Locked, or locked drop modules below the creator body. |
| `CREATOR_SETTINGS_ROUTE` | Creator settings/workspace | Canonical value is `/dashboard/creator/settings`; it owns creator operations settings, Fan Pass visibility, broadcasts, requests, bookings, availability, and earnings controls. |
| `/settings` | Account Settings | User/account settings surface only. It is distinct from Creator Settings and must be labeled `Account Settings` in account menus. |
| `/dashboard/settings`, `/dashboard/profile`, `/profile/settings`, `/account` | Account Settings redirects | Compatibility aliases only; visible account links should use `/settings`. |
| `/dashboard/library` | User library/manage drops surface | Explicit user/library route for creators who need to manage or inspect their own KandyDrops. It is not embedded below Creator Dashboard. |
| `/drops` | Public/user drop discovery | Fan-facing discovery and unlock surface. It does not define creator dashboard content ownership. |

Creator accounts can access creator operations and user/shop/drop/library surfaces, but only through explicit routes. A creator route must not accidentally render a full user dashboard below it.

## Navigation Rules

- Creator Dashboard nav points to `CREATOR_DASHBOARD_ROUTE` and labels that route `Creator Dashboard`.
- Creator Settings nav points to `CREATOR_SETTINGS_ROUTE` and labels that route `Creator Settings`.
- Account Settings nav points to `USER_SETTINGS_ROUTE` (`/settings`) and labels that route `Account Settings`.
- Plain `Settings` is ambiguous and blocked for account or creator menu items.
- Old aliases may redirect for compatibility, but visible nav should not show duplicate settings destinations.
- Bottom nav Dashboard for creator-role accounts points to `/dashboard/creator`; normal user Dashboard remains `/dashboard`.

## CRM And Broadcast Rules

- Fan Pass CRM rows use `FanPassSubscriberRow` or equivalent readable identity display.
- Normal creator UI must not use `subscription.userId || subscription.id` as a primary subscriber label.
- Full raw user IDs are debug/admin details only.
- Creator-facing broadcast copy uses the exact supported audience: `Followers` for the relationship-backed follower lane and `Fan Pass subscribers` for the paid subscriber lane.
- Broadcast surfaces expose an explicit audience marker such as `data-broadcast-audience="followers"`; legacy `all_fans` input is normalized at the broadcast contract boundary and is not a product-facing audience.

## Dashboard Boundary Rules

- `/dashboard/creator` exposes `data-dashboard-surface="creator_dashboard"`, `data-creator-dashboard-content-boundary="creator_only"`, and `data-user-dashboard-modules-rendered="false"`.
- `/dashboard` exposes `data-dashboard-surface="user_dashboard"` for the normal user dashboard body.
- Creator Dashboard renders one compact Creator Overview module and must not revive the old standalone mobile metric-card grid.
- Public discovery visibility and creator dashboard ownership/content counts remain separate source truths.

## Validation

Run:

```bash
npm run check:creator-nav-role-consolidation
```

The validator fails if nav routes cross creator/account settings, creator and user dashboards stack, Fan Pass CRM regresses to raw IDs, creator-facing broadcast copy revives legacy `all_fans` semantics, the supported audience marker is missing, or conflicting doctrine remains.
