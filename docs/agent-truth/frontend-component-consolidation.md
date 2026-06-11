# Frontend Component Consolidation

Generated: 2026-06-11T15:10:48.556Z
Current head: 4e947b3a8945

## Summary

- Components audited: 271
- Bloated components found: 10
- Duplicate local state risks classified: 16
- Direct telemetry calls routed to owner review: 261
- Hydration race risks classified: 12

## Top Gaps

- src/components/Chat/ChatExperience.tsx: split_component
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx: split_component
- src/app/admin/users/page.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx: split_component
- src/app/admin/roster/page.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx: split_component
- src/components/Auth/AuthModal.tsx: split_component
- src/app/creators/[username]/CreatorProfileClient.tsx: split_component
- src/components/Admin/AssetUploader.tsx: split_component

## Dirty File Classification

- agent/context/doctrine.cards.jsonl: generated_context_noise_leave_unstaged
- agent/context/doctrine.index.json: generated_context_noise_leave_unstaged
- agent/context/file-size-budget.json: generated_context_noise_leave_unstaged
- agent/context/legacy-registry.json: generated_context_noise_leave_unstaged
- agent/context/optimized-task-context.generated.json: generated_context_noise_leave_unstaged
- agent/context/surface-contracts.jsonl: generated_context_noise_leave_unstaged
- agent/context/task-pack.generated.json: generated_context_noise_leave_unstaged
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
- agent/state/config-env-contract.generated.json: generated_report_noise_leave_unstaged
- agent/state/final-pr-stale-cleanup.generated.json: generated_report_noise_leave_unstaged
- agent/state/frontend-component-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-gut-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-telemetry-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/global-cost-surfaces.generated.json: generated_report_noise_leave_unstaged
- agent/state/identity-handoff-spine.generated.json: generated_report_noise_leave_unstaged
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/score-80-reconciliation-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/score-dimension-80-lock.generated.json: generated_report_noise_leave_unstaged
- agent/state/score-impact-stale-artifact-sweep.generated.json: generated_report_noise_leave_unstaged
- agent/state/settings-creator-dashboard-split.generated.json: generated_report_noise_leave_unstaged
- agent/state/sql-mirror-status.generated.json: generated_report_noise_leave_unstaged
- agent/state/sql-sync.payload.generated.json: generated_report_noise_leave_unstaged
- agent/state/support-policy-surface-cleanup.generated.json: generated_report_noise_leave_unstaged
- agent/state/task-context.generated.json: generated_report_noise_leave_unstaged
- agent/state/treasury-reconciliation-engine.generated.json: generated_report_noise_leave_unstaged
- agent/state/treasury-structure-contract.generated.json: generated_report_noise_leave_unstaged
- agent/state/user-management-status-truth.generated.json: generated_report_noise_leave_unstaged
- agent/state/user-profile-api-contract.generated.json: generated_report_noise_leave_unstaged
- docs/agent-truth/config-env-contract.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/final-pr-stale-cleanup.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/frontend-component-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/frontend-gut-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/frontend-telemetry-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/identity-handoff-spine.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/person-metrics-hydration.md: current_generated_artifact_to_commit
- docs/agent-truth/score-80-reconciliation-lock.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/score-dimension-80-lock.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/score-impact-stale-artifact-sweep.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/support-policy-surface-cleanup.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/treasury-reconciliation-engine.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/treasury-structure-contract.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/user-management-status-truth.md: generated_report_doc_noise_leave_unstaged
- docs/agent-truth/user-profile-api-contract.md: generated_report_doc_noise_leave_unstaged
- scripts/agent/build-agent-indexes.ts: tooling_change_needs_separate_review
- scripts/agent/validate-freshness-window-repair.ts: tooling_change_needs_separate_review
- scripts/agent/validate-frontend-component-consolidation.ts: real_source_change_needs_review
- scripts/agent/validate-frontend-telemetry-consolidation.ts: real_source_change_needs_review
- scripts/repo-inventory.ts: tooling_change_needs_separate_review
- agent/state/debug-evidence-staleness-queue.generated.json: generated_report_noise_leave_unstaged
