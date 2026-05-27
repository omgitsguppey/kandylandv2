# Frontend Component Consolidation

Generated: 2026-05-27T04:20:32.945Z
Current head: e6ca1352

## Summary

- Components audited: 270
- Bloated components found: 10
- Duplicate local state risks classified: 15
- Direct telemetry calls routed to owner review: 256
- Hydration race risks classified: 12

## Top Gaps

- src/components/Chat/ChatExperience.tsx: split_component
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx: split_component
- src/app/admin/users/page.tsx: split_component
- src/app/admin/roster/page.tsx: split_component
- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx: split_component
- src/components/Auth/AuthModal.tsx: split_component
- src/app/creators/[username]/CreatorProfileClient.tsx: split_component
- src/components/Admin/AssetUploader.tsx: split_component
- src/app/dashboard/profile/hooks/useProfileState.tsx: split_component
- src/app/admin/user/[userId]/page.tsx: split_component

## Dirty File Classification

- AGENTS.md: memory_update_expected
- CHANGELOG.md: release_artifact_expected
- REPO_MEMORY_LEDGER.md: memory_update_expected
- agent/index/known-pitfalls.json: memory_update_expected
- agent/state/client-state-ownership.generated.json: current_generated_artifact_to_commit
- agent/state/codex-frontend-memory-writeback.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-component-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-gut-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-telemetry-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/hydration-race-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/client-state-ownership.md: current_generated_artifact_to_commit
- docs/agent-truth/codex-frontend-memory-writeback.md: current_generated_artifact_to_commit
- docs/agent-truth/event-translation-bridge.md: current_generated_artifact_to_commit
- docs/agent-truth/frontend-component-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/frontend-gut-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/frontend-telemetry-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/hydration-race-cleanup.md: current_generated_artifact_to_commit
- docs/agent-truth/person-metrics-hydration.md: current_generated_artifact_to_commit
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-client-state-ownership.ts: real_source_change_needs_review
- scripts/agent/validate-codex-frontend-memory-writeback.ts: real_source_change_needs_review
- scripts/agent/validate-frontend-component-consolidation.ts: real_source_change_needs_review
- scripts/agent/validate-frontend-telemetry-consolidation.ts: real_source_change_needs_review
- scripts/agent/validate-hydration-race-cleanup.ts: real_source_change_needs_review
- src/components/Support/SupportInbox.tsx: hydration_race_logic_to_fix
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/frontend-hardening/client-state-ownership.ts: real_source_change_needs_review
- src/lib/frontend-hardening/component-bloat-audit.ts: real_source_change_needs_review
- src/lib/frontend-hardening/frontend-surface-inventory.ts: real_source_change_needs_review
- src/lib/frontend-hardening/frontend-telemetry-usage.ts: real_source_change_needs_review
- src/lib/frontend-hardening/hydration-race-guard.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/client-state-ownership.spec.ts: real_source_change_needs_review
- tests/unit/codex-frontend-memory-writeback.spec.ts: real_source_change_needs_review
- tests/unit/frontend-component-consolidation.spec.ts: real_source_change_needs_review
- tests/unit/frontend-telemetry-consolidation.spec.ts: real_source_change_needs_review
- tests/unit/hydration-race-cleanup.spec.ts: real_source_change_needs_review
