# Creator Surface Routing

Generated source: `agent/state/creator-surface-routing.generated.json`

## Route Doctrine

- `/dashboard/creator` is the Creator Dashboard landing surface. It shows the creator's inbox shortcut, one compact Creator Overview module, a direct Creator settings pill, and a manage-only drops CTA until a real creator create-drop route exists.
- `/dashboard/creator/settings` is Creator Settings / Creator Workspace. It owns broadcasts, requests, bookings, Fan Pass visibility, availability, earnings, and creator manager panels.
- `/dashboard/library` is the current safe manage-only fallback for the landing dashboard drops CTA.
- `/dashboard/settings` is user account settings only.
- `/dashboard/profile` is profile and account identity only.

Creator operations must not detour through user settings or profile pages. User settings may show a creator migration card, but its CTA must point to Creator Settings.

## Navigation

- Sidebar and profile dropdown label `/dashboard/creator` as `Creator Dashboard`.
- Sidebar and profile dropdown label `/dashboard/creator/settings` as `Creator Settings`.
- The landing dashboard `Creator settings` pill points to `/dashboard/creator/settings`.
- The landing dashboard drops CTA is labeled `Manage drops`, uses `data-create-drop-route-state="manage_only"`, and points to `/dashboard/library` because `/dashboard/drops` is not present in this repo.
- Legacy profile creator settings copy says `Creator settings now live in Creator Settings` and points to `/dashboard/creator/settings`.

## Mobile And Error Rules

- Both creator surfaces expose compact mobile density markers and bottom-nav-safe spacing.
- The Creator Dashboard landing stats render inside one compact module with `data-creator-overview-module="compact_v1"` plus `data-creator-dashboard-overview-density="mobile_compact"`.
- Creator Dashboard content count uses `data-creator-dashboard-content-scope="creator_owned_or_assigned"` and stays separate from public discovery visibility.
- Creator Dashboard Fan Pass subscriber rows render as compact CRM rows with `data-fan-pass-crm="mobile_v1"` and readable fan identity. Raw user ids are debug/detail-only, never the primary creator-facing label.
- Creator broadcasts expose an explicit audience marker such as `data-broadcast-audience="all_fans"` and user-facing copy says Fans, not followers.
- Quick Broadcast is lower priority when creator stats are unavailable and marks that state with `data-creator-broadcast-mobile-priority`.
- The floating report issue entry must be offset from lower dashboard cards through the `data-report-issue-safe-offset="bottom-nav"` marker.
- Creator settings load failures must render translated `HumanErrorNotice` copy with a bug CTA when eligible. Raw strings such as `creator settings: Internal server error` are blocked from creator-facing UI.

## Validation

Run:

```bash
npm run check:creator-surface-routing
```

The validator fails if the Creator Dashboard route renders the operations hub, no Creator Settings route exists, creator navigation points operations to user settings/profile, the drops CTA points to `/dashboard/drops`, raw creator settings errors can render, compact overview markers are missing, or remaining P0/P1 routing blockers are present.
