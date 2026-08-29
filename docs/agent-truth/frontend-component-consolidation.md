# Frontend Component Consolidation

Generated: 2026-08-29T04:19:29.065Z
Current head: 740dc2b5fb2a41b2f9762c847679fa8db9a08912

## Summary

- Components audited: 361
- Bloated components found: 10
- Duplicate local state risks classified: 16
- Direct telemetry calls routed to owner review: 261
- Hydration race risks classified: 13

## Top Gaps

- src/components/Chat/ChatExperience.tsx: split_component
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx: split_component
- src/app/creators/[username]/CreatorProfileClient.tsx: split_component
- src/app/admin/users/page.tsx: split_component
- src/app/admin/roster/page.tsx: split_component
- src/components/Admin/CreateDropModal.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx: split_component
- src/app/admin/user/[userId]/page.tsx: split_component

## Dirty File Classification

- Total dirty files classified: 0
- Detailed entries retained: 0
- Detailed entries omitted after summary: 0

### Retained Detail

- none
