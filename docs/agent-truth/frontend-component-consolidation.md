# Frontend Component Consolidation

Generated: 2026-07-16T04:29:13.287Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214

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

- Total dirty files classified: 110
- Detailed entries retained: 40
- Detailed entries omitted after summary: 70
- current_generated_artifact_to_commit: 4
- generated_index_noise_leave_unstaged: 1
- generated_report_doc_noise_leave_unstaged: 51
- generated_report_noise_leave_unstaged: 54

### Retained Detail

- agent/index/ui-surface-coverage.json: generated_index_noise_leave_unstaged
- agent/state/account-settings-delete-flow.generated.json: generated_report_noise_leave_unstaged
- agent/state/activity-verification-engine.generated.json: generated_report_noise_leave_unstaged
- agent/state/analytics-panel-hydration.generated.json: generated_report_noise_leave_unstaged
- agent/state/auth-persistence-stability.generated.json: generated_report_noise_leave_unstaged
- agent/state/auth-provider-conflict-resolution.generated.json: generated_report_noise_leave_unstaged
- agent/state/auth-readiness-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/auth-runtime-telemetry.generated.json: generated_report_noise_leave_unstaged
- agent/state/bug-report-truth-terminal-state.generated.json: generated_report_noise_leave_unstaged
- agent/state/chat-functionality-score-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/chat-gating-moderation.generated.json: generated_report_noise_leave_unstaged
- agent/state/chat-presence-typing.generated.json: generated_report_noise_leave_unstaged
- agent/state/chat-realtime-cost-control.generated.json: generated_report_noise_leave_unstaged
- agent/state/chat-telemetry-admin-truth.generated.json: generated_report_noise_leave_unstaged
- agent/state/creator-discovery-relationship-funnel.generated.json: generated_report_noise_leave_unstaged
- agent/state/creator-monetization-readiness-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/daily-task-debug-score-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/daily-task-guidance-route-audit.generated.json: generated_report_noise_leave_unstaged
- agent/state/daily-task-lifecycle-telemetry.generated.json: generated_report_noise_leave_unstaged
- agent/state/daily-task-reset-truth.generated.json: generated_report_noise_leave_unstaged
- agent/state/daily-task-reward-ledger.generated.json: generated_report_noise_leave_unstaged
- agent/state/debug-tracking-simplification.generated.json: generated_report_noise_leave_unstaged
- agent/state/email-password-auth-refactor.generated.json: generated_report_noise_leave_unstaged
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: generated_report_noise_leave_unstaged
- agent/state/final-parity-telemetry-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/final-testing-tracking-telemetry-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/generated-report-authority.generated.json: generated_report_noise_leave_unstaged
- agent/state/launch-analytics-recovery.generated.json: generated_report_noise_leave_unstaged
- agent/state/media-discovery-score-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/media-upload-lifecycle.generated.json: generated_report_noise_leave_unstaged
- agent/state/monolith-orphan-metric-registry.generated.json: generated_report_noise_leave_unstaged
- agent/state/notification-permission-lifecycle.generated.json: generated_report_noise_leave_unstaged
- agent/state/notification-pwa-score-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/notification-return-loop-audit.generated.json: generated_report_noise_leave_unstaged
- agent/state/notification-targeting-intent.generated.json: generated_report_noise_leave_unstaged
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/private-media-access.generated.json: generated_report_noise_leave_unstaged
- agent/state/push-token-registration.generated.json: generated_report_noise_leave_unstaged
- agent/state/pwa-service-worker-safety.generated.json: generated_report_noise_leave_unstaged
