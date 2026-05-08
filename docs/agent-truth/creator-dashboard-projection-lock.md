# Creator Dashboard Projection Lock

This lock covers the creator dashboard surfaces that an admin can review through read-only projection without logging into the creator account.

## Locked Surface

- `src/context/AdminViewAsContext.tsx`
- `src/lib/server/admin-creator-projection.ts`
- `src/app/api/admin/view-as-creator/route.ts`
- `src/app/api/creator/settings/route.ts`
- `src/app/api/creator/requests/route.ts`
- `src/app/api/creator/bookings/route.ts`
- `src/app/api/creator/broadcasts/route.ts`
- `src/app/api/creator/subscriptions/route.ts`
- `src/app/api/chat/threads/route.ts`
- `src/app/dashboard/DashboardClient.tsx`
- `src/components/Dashboard/CreatorWorkspacePanel.tsx`
- `src/app/dashboard/profile/hooks/useProfileState.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/profile/components/Profile*.tsx`

## What The Lock Proves

- Admin projection is server-validated before creator data is read.
- Local simulation state is treated as a projection control, not as live creator ownership.
- The dashboard reads target creator data through projection-aware routes.
- Creator/payment/payout writes are blocked while projection is active.
- The dashboard and profile surfaces show compact read-only copy instead of debug language.
- Missing creator data is surfaced as unavailable or defaulted, not fake healthy.

## Required Checks

- `npm run check:creator-dashboard-projection-lock`
- `npm run typecheck`

## Broad Checks Not Used

- `npm run check`
- `playwright`
- `lighthouse`
- `cypress`
- `firebase deploy`

