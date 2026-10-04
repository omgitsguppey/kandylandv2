# Frontend Component Consolidation

Generated: 2026-10-03T05:23:34.970Z
Current head: 1abcf3aef18991a17ef496dcbc2d0ec7cf3331e8

## Summary

- Components audited: 358
- Bloated components found: 10
- Duplicate local state risks classified: 16
- Direct telemetry calls routed to owner review: 255
- Hydration race risks classified: 13

## Top Gaps

- src/components/Chat/ChatExperience.tsx: split_component
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx: split_component
- src/app/creators/[username]/CreatorProfileClient.tsx: split_component
- src/app/admin/users/page.tsx: split_component
- src/app/admin/roster/page.tsx: split_component
- src/components/Admin/CreateDropModal.tsx: split_component
- src/app/admin/user/[userId]/page.tsx: split_component
- src/context/AuthContext.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx: split_component

## Dirty File Classification

- Total dirty files classified: 0
- Detailed entries retained: 0
- Detailed entries omitted after summary: 0

### Retained Detail

- none
