# Creator Surface Routing

Generated source: `agent/state/creator-surface-routing.generated.json`

## Route Doctrine

- `/dashboard/creator` is the Creator Dashboard landing surface. It shows the creator's inbox shortcut, create drop action, compact metric cards, and a direct Creator settings pill.
- `/dashboard/creator/settings` is Creator Settings / Creator Workspace. It owns broadcasts, requests, bookings, Fan Pass visibility, availability, earnings, and creator manager panels.
- `/dashboard/settings` is user account settings only.
- `/dashboard/profile` is profile and account identity only.

Creator operations must not detour through user settings or profile pages. User settings may show a creator migration card, but its CTA must point to Creator Settings.

## Navigation

- Sidebar and profile dropdown label `/dashboard/creator` as `Creator Dashboard`.
- Sidebar and profile dropdown label `/dashboard/creator/settings` as `Creator Settings`.
- The landing dashboard `Creator settings` pill points to `/dashboard/creator/settings`.
- Legacy profile creator settings copy says `Creator settings now live in Creator Settings` and points to `/dashboard/creator/settings`.

## Mobile And Error Rules

- Both creator surfaces expose compact mobile density markers and bottom-nav-safe spacing.
- The Creator Dashboard landing cards keep mobile values capped at compact card sizing and use `data-creator-dashboard-card-density="mobile_compact"`.
- The floating report issue entry must be offset from lower dashboard cards through the `data-report-issue-safe-offset="bottom-nav"` marker.
- Creator settings load failures must render translated `HumanErrorNotice` copy with a bug CTA when eligible. Raw strings such as `creator settings: Internal server error` are blocked from creator-facing UI.

## Validation

Run:

```bash
npm run check:creator-surface-routing
```

The validator fails if the Creator Dashboard route renders the operations hub, no Creator Settings route exists, creator navigation points operations to user settings/profile, raw creator settings errors can render, compact mobile markers are missing, or remaining P0/P1 routing blockers are present.
