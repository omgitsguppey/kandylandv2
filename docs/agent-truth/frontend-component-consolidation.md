# Frontend Component Consolidation

Generated: 2026-07-14T16:06:06.335Z
Current head: dc4dad82c4ee

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

- Total dirty files classified: 682
- Detailed entries retained: 40
- Detailed entries omitted after summary: 642
- configuration_change_needs_separate_review: 4
- current_generated_artifact_to_commit: 10
- documentation_change_needs_separate_review: 2
- function_source_change_needs_separate_review: 9
- generated_context_noise_leave_unstaged: 15
- generated_index_noise_leave_unstaged: 13
- generated_report_doc_noise_leave_unstaged: 79
- generated_report_noise_leave_unstaged: 120
- memory_update_expected: 2
- real_source_change_needs_review: 178
- release_artifact_expected: 1
- test_change_needs_review: 179
- tooling_change_needs_separate_review: 70

### Retained Detail

- .env.example: configuration_change_needs_separate_review
- agent/context/doctrine-cards.jsonl: generated_context_noise_leave_unstaged
- agent/context/doctrine-conflicts.generated.json: generated_context_noise_leave_unstaged
- agent/context/doctrine-registry.json: generated_context_noise_leave_unstaged
- agent/context/doctrine.cards.jsonl: generated_context_noise_leave_unstaged
- agent/context/doctrine.index.json: generated_context_noise_leave_unstaged
- agent/context/file-size-budget.json: generated_context_noise_leave_unstaged
- agent/context/legacy-registry.json: generated_context_noise_leave_unstaged
- agent/context/optimized-task-context.generated.json: generated_context_noise_leave_unstaged
- agent/context/surface-contracts.jsonl: generated_context_noise_leave_unstaged
- agent/context/task-pack.generated.json: generated_context_noise_leave_unstaged
- agent/context/validator-authority.json: generated_context_noise_leave_unstaged
- agent/context/validator-map.json: generated_context_noise_leave_unstaged
- agent/index/blast-radius.json: generated_index_noise_leave_unstaged
- agent/index/canonical-helpers.json: generated_index_noise_leave_unstaged
- agent/index/dependency-graph.summary.json: generated_index_noise_leave_unstaged
- agent/index/governance-truth.json: generated_index_noise_leave_unstaged
- agent/index/known-pitfalls.json: memory_update_expected
- agent/index/package-manager-truth.json: generated_index_noise_leave_unstaged
- agent/index/recent-passes.json: generated_index_noise_leave_unstaged
- agent/index/repo-inventory.json: generated_index_noise_leave_unstaged
- agent/index/retrieval-index.json: generated_index_noise_leave_unstaged
- agent/index/runtime-observability.json: generated_index_noise_leave_unstaged
- agent/index/surface-map.json: generated_index_noise_leave_unstaged
- agent/index/ui-surface-coverage.json: generated_index_noise_leave_unstaged
- agent/index/verification-commands.json: generated_index_noise_leave_unstaged
- agent/index/workflow-guidance.json: generated_index_noise_leave_unstaged
- agent/prompts/task-prompt.deep.md: generated_context_noise_leave_unstaged
- agent/prompts/task-prompt.short.md: generated_context_noise_leave_unstaged
- agent/prompts/task-prompt.standard.md: generated_context_noise_leave_unstaged
- agent/schemas/blast-radius.schema.json: tooling_change_needs_separate_review
- agent/state/frontend-component-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-gut-consolidation.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/frontend-component-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/frontend-gut-consolidation.md: current_generated_artifact_to_commit
- scripts/agent/validate-frontend-component-consolidation.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/frontend-hardening/frontend-surface-inventory.ts: real_source_change_needs_review
- tests/unit/frontend-component-consolidation.spec.ts: real_source_change_needs_review
