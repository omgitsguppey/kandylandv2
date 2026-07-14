# Frontend Component Consolidation

Generated: 2026-07-14T17:06:51.674Z
Current head: dc962dbed9b4

## Summary

- Components audited: 271
- Bloated components found: 10
- Duplicate local state risks classified: 16
- Direct telemetry calls routed to owner review: 257
- Hydration race risks classified: 13

## Top Gaps

- src/components/Chat/ChatExperience.tsx: split_component
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx: split_component
- src/app/admin/users/page.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx: split_component
- src/app/creators/[username]/CreatorProfileClient.tsx: split_component
- src/app/admin/roster/page.tsx: split_component
- src/components/Admin/CreateDropModal.tsx: split_component
- src/app/admin/user/[userId]/page.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx: split_component

## Dirty File Classification

- Total dirty files classified: 18
- Detailed entries retained: 18
- Detailed entries omitted after summary: 0
- current_generated_artifact_to_commit: 4
- documentation_change_needs_separate_review: 1
- generated_report_doc_noise_leave_unstaged: 1
- generated_report_noise_leave_unstaged: 2
- real_source_change_needs_review: 4
- test_change_needs_review: 4
- tooling_change_needs_separate_review: 2

### Retained Detail

- agent/state/creator-drop-status-metrics.generated.json: generated_report_noise_leave_unstaged
- agent/state/frontend-component-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-gut-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/user-tracking-index-cutover.generated.json: generated_report_noise_leave_unstaged
- docs/agent-truth/creator-drop-status-metrics.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/frontend-component-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/frontend-gut-consolidation.md: current_generated_artifact_to_commit
- FULL_SCALE_CODEBASE_AUDIT.md: documentation_change_needs_separate_review
- scripts/agent/score-user-tracking-indexes.ts: tooling_change_needs_separate_review
- scripts/agent/validate-creator-drop-status-metrics.ts: tooling_change_needs_separate_review
- src/app/api/admin/users/route.ts: real_source_change_needs_review
- src/components/Creators/CreatorDropManager.tsx: real_source_change_needs_review
- src/lib/server/admin-panel-system-logs.ts: real_source_change_needs_review
- src/lib/user-indexes/user-index-normalizer.ts: real_source_change_needs_review
- tests/unit/creator-drop-manager-grouping.spec.tsx: test_change_needs_review
- tests/unit/creator-drop-status-metrics.spec.ts: test_change_needs_review
- tests/unit/user-index-materializer-schedule.spec.ts: test_change_needs_review
- tests/unit/user-index-normalizer.spec.ts: test_change_needs_review
