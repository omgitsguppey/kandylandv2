# Creator Landing Dashboard Mobile

Generated source: `agent/state/creator-landing-dashboard-mobile.generated.json`

## Route Result

- `/dashboard/creator` remains the Creator Dashboard landing surface.
- No creator create-drop route exists in the current source tree.
- The landing CTA therefore uses `Manage drops`, points to `/dashboard/library`, and marks `data-create-drop-route-state="manage_only"`.
- `/dashboard/drops` must not be used unless that route exists and renders a real create/manage surface.

## Mobile Density

- The landing dashboard exposes `data-creator-landing-mobile-density="compact_v2"`.
- Creator stats render inside one compact Creator Overview module with `data-creator-overview-module="compact_v1"`, compact rows, `data-creator-dashboard-overview-density="mobile_compact"`, and `data-creator-dashboard-overview-grid-density="mobile_4x4_compact"`.
- The overview module uses `data-creator-dashboard-content-scope="creator_owned_or_assigned"` so creator-owned content counts remain separate from public drop discovery.
- Quick actions use compact pill sizing and stay horizontally scrollable without forcing tall layout.
- Quick Broadcast is deferred while creator stats are unavailable through `data-creator-broadcast-mobile-priority`.

## Safe Spacing

- The landing route uses top padding so the shell header does not cover the first row.
- The landing route keeps `pb-[calc(env(safe-area-inset-bottom)+9rem)]` and `data-report-issue-safe-offset="bottom-nav"` so bottom navigation and report issue affordances do not crowd lower cards.

## Error Language

- Creator landing module failures use human fallback copy.
- Settings source failures use `HumanErrorNotice` and `dashboard_source_unavailable`.
- Raw module warning strings, `creator settings: Internal server error`, and raw `Internal server error` copy are blocked from creator-facing UI.

## Validation

Run:

```bash
npm run check:creator-landing-dashboard-mobile
```

The validator fails if the landing CTA points to a missing create-drop route, compact_v2 markers are missing, the compact overview regresses back into standalone stat cards, raw module errors can render, or bottom-nav/report issue spacing markers are absent.
