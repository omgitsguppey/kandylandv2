# Mobile Surface Organization

Generated: 2026-05-20T00:35:19.414Z
Current code version: 11097e4a39af135396c4ad6795dc2c875ce12215

## Doctrine

### Admin

- Default mobile admin is summary first, drilldowns second.
- Tables become compact rows/cards when a phone is the primary viewport.
- Debug and evidence details stay hidden behind sections by default.
- No all-domain admin loads by default.

### Creator

- Dashboard means overview, quick actions, and active work.
- Settings and workspace surfaces own operations panels.
- Drop manager owns submit/review inventory.
- User dashboard modules must not leak into creator tools.

### User

- Dashboard keeps daily check-in, wallet/status, owned or locked KandyDrops, and recent activity.
- Drops and library routes remain user-owned.
- Admin and creator controls stay out of user routes.

## Summary

- Protected nav/chat untouched: yes
- Admin summary first: yes
- Admin raw details drilldown: yes
- Creator workflows separated: yes
- User dashboard preserved: yes
- Desktop flow collapsed: yes

## Fixes Applied

- fixed: Desktop-heavy flows are marked collapsed or organized for mobile.
- fixed: Touched surfaces expose summary-first mobile organization markers.
- fixed: Secondary content exposes a drilldown path.

## Next Fix Order

1. Continue converting admin-only tables and raw evidence into summary rows plus explicit drilldowns when those files are touched.
2. Keep creator operations grouped by job: overview, active work, settings, and drop submissions.
3. Keep user dashboard modules user-owned and avoid admin/creator controls on user routes.
