# Overnight Wiring Integrity

Generated: 2026-05-20T05:35:44.098Z
Current code version: 44556013b9dba08ec65eee7ed0e9549762f1ca8b

## Summary

- Lanes wired: 11
- Lanes stale: 1
- Lanes partial: 0
- Missing dependencies: 0
- Broken/orphaned lanes: 0
- Creator drop route separated from My KandyDrops: yes
- Creator settings setup mapped to controls: yes
- Telemetry events covered by graph/contract: yes
- Shared marquee preserved: yes
- Protected chat untouched: yes
- Beta exit marked ready: no
- Findings: P0=0, P1=0, P2=1

## Lane Map

### creator_settings_control_plane

- Status: wired
- Expected UI: src/components/Creators/CreatorDashboardSettingsHub.tsx
- Expected route: src/app/api/creator/settings/route.ts
- Expected contract: src/lib/creator-settings/creator-settings-contract.ts
- Expected validator: scripts/agent/validate-creator-settings-control-plane.ts
- Expected telemetry: creator_settings_updated
- Expected artifact: agent/state/creator-settings-control-plane.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### creator_pricing_wiring

- Status: wired
- Expected UI: src/components/Creators/CreatorExperiencesPanel.tsx
- Expected route: src/app/api/creator/subscriptions/route.ts; src/app/api/creator/requests/route.ts; src/app/api/creator/bookings/route.ts
- Expected contract: src/lib/creator-settings/creator-pricing-resolver.ts
- Expected validator: scripts/agent/validate-creator-pricing-wiring.ts
- Expected telemetry: creator_subscription and creator_experience lanes
- Expected artifact: agent/state/creator-pricing-wiring.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### creator_broadcast_notifications

- Status: wired
- Expected UI: src/components/Creators/CreatorBroadcastManager.tsx
- Expected route: src/app/api/creator/broadcasts/route.ts
- Expected contract: src/lib/creator-broadcasts/broadcast-contract.ts; src/lib/notifications/creator-broadcast-notifications.ts
- Expected validator: scripts/agent/validate-creator-broadcast-timeline-prep.ts
- Expected telemetry: creator_broadcast_created
- Expected artifact: agent/state/creator-broadcast-timeline-prep.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### creator_profile_timeline

- Status: wired
- Expected UI: src/components/Creators/CreatorProfileTimelineFeed.tsx
- Expected route: src/app/creators/[username]/page.tsx
- Expected contract: src/lib/creator-profile/timeline-contract.ts
- Expected validator: scripts/agent/validate-creator-profile-mobile-timeline.ts
- Expected telemetry: creator profile and timeline source markers
- Expected artifact: agent/state/creator-profile-mobile-timeline.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### global_marquee_titles

- Status: wired
- Expected UI: src/components/ui/MarqueeText.tsx; src/components/ui/TitleMarquee.tsx
- Expected route: not applicable
- Expected contract: shared title marquee component contract
- Expected validator: scripts/agent/validate-global-marquee-truncated-titles.ts
- Expected telemetry: none
- Expected artifact: agent/state/global-marquee-truncated-titles.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### creator_drop_management

- Status: wired
- Expected UI: src/app/dashboard/creator/drops/page.tsx; src/components/Creators/CreatorDropManager.tsx
- Expected route: src/app/api/creator/drops/route.ts
- Expected contract: src/lib/drops/drop-form-contract.ts; src/lib/drops/drop-submission-contract.ts
- Expected validator: scripts/agent/validate-creator-drop-management-approval.ts
- Expected telemetry: creator_drop_submitted; creator_drop_updated
- Expected artifact: agent/state/creator-drop-management-approval.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### creator_drop_manager_mobile

- Status: wired
- Expected UI: src/components/Creators/CreatorDropManager.tsx
- Expected route: src/app/dashboard/creator/drops/page.tsx
- Expected contract: src/lib/drops/drop-form-contract.ts
- Expected validator: scripts/agent/validate-creator-drop-manager-mobile-refinement.ts
- Expected telemetry: creator_drop_manager_opened; creator_drop_submission_started
- Expected artifact: agent/state/creator-drop-manager-mobile-refinement.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### mobile_ui_final_lock

- Status: wired
- Expected UI: admin/user/creator source-readiness artifacts
- Expected route: not applicable
- Expected contract: docs/agent-truth/mobile-ui-final-lock.md
- Expected validator: scripts/agent/validate-mobile-ui-final-lock.ts
- Expected telemetry: not applicable
- Expected artifact: agent/state/mobile-ui-final-lock.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### telemetry_final_lock

- Status: wired
- Expected UI: admin telemetry/source truth artifacts
- Expected route: telemetry ingest, identity, materializer, GA4, BigQuery lanes
- Expected contract: src/lib/analytics/telemetry-dependency-graph.ts
- Expected validator: scripts/agent/validate-final-telemetry-closure-lock.ts
- Expected telemetry: all priority telemetry lanes
- Expected artifact: agent/state/final-telemetry-closure-lock.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### ga4_external_truth

- Status: wired
- Expected UI: admin external analytics evidence status
- Expected route: explicit refresh only when configured
- Expected contract: src/lib/analytics/external-analytics-truth.ts
- Expected validator: scripts/agent/validate-external-analytics-truth-closure.ts
- Expected telemetry: external_ga4_evidence
- Expected artifact: agent/state/external-analytics-truth-closure.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### bigquery_pipeline

- Status: wired
- Expected UI: admin export evidence status
- Expected route: batch/window export contract only
- Expected contract: src/lib/analytics/bigquery-export-contract.ts
- Expected validator: scripts/agent/validate-bigquery-cloud-pipeline-closure.ts
- Expected telemetry: BigQuery export eligibility from event facts
- Expected artifact: agent/state/bigquery-cloud-pipeline-closure.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Keep validator coverage current with future changes.

### beta_health_scoring

- Status: stale
- Expected UI: public beta score and current beta exit status artifacts
- Expected route: scripts/agent/score-public-beta-readiness.ts
- Expected contract: beta score must keep missing evidence separate from zero and never mark beta exit ready here
- Expected validator: scripts/agent/validate-public-beta-score.ts; scripts/agent/validate-current-beta-exit-status.ts
- Expected telemetry: beta evidence only
- Expected artifact: agent/state/public-beta-score.generated.json; agent/state/current-beta-exit-status.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Regenerate beta score/status in the beta health lane; this pass does not mark beta exit ready.

## Findings

- P2 agent/state/public-beta-score.generated.json; agent/state/current-beta-exit-status.generated.json: beta_health_scoring artifact is stale relative to current HEAD but has an explicit next action.

## Dirty File Classifications

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/bug-report-reward-flow.generated.json: current_generated_artifact_to_commit
- agent/state/error-handling-final-readiness.generated.json: current_generated_artifact_to_commit
- agent/state/error-language-contract.generated.json: current_generated_artifact_to_commit
- agent/state/error-truth-debug-visibility.generated.json: current_generated_artifact_to_commit
- agent/state/final-telemetry-closure-lock.generated.json: current_generated_artifact_to_commit
- agent/state/mobile-ui-final-lock.generated.json: current_generated_artifact_to_commit
- agent/state/source-truth-authority-map.generated.json: current_generated_artifact_to_commit
- agent/state/user-creator-ui-parity.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/bug-report-reward-flow.md: current_generated_artifact_to_commit
- docs/agent-truth/error-handling-final-readiness.md: current_generated_artifact_to_commit
- docs/agent-truth/error-language-contract.md: current_generated_artifact_to_commit
- docs/agent-truth/error-truth-debug-visibility.md: current_generated_artifact_to_commit
- docs/agent-truth/final-telemetry-closure-lock.md: current_generated_artifact_to_commit
- docs/agent-truth/mobile-ui-final-lock.md: current_generated_artifact_to_commit
- docs/agent-truth/source-truth-authority-map.md: current_generated_artifact_to_commit
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-human-error-surface-wiring.ts: real_source_change_needs_review
- src/app/dashboard/viewer/ViewerClient.tsx: real_source_change_needs_review
- src/components/Dashboard/DailyTasksModule.tsx: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- agent/state/overnight-wiring-integrity.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/overnight-wiring-integrity.md: real_source_change_needs_review
- scripts/agent/validate-overnight-wiring-integrity.ts: real_source_change_needs_review
- tests/unit/overnight-wiring-integrity.spec.ts: real_source_change_needs_review

## PR Cleanup Actions

- PR #274 classified as preserved_broad_governance_doc_outside_overnight_allowed_files.

## Next Fix Order

- beta_health_scoring: Regenerate beta score/status in the beta health lane; this pass does not mark beta exit ready.
- Keep future telemetry claims tied to TELEMETRY_DEPENDENCY_GRAPH or analytics-event-contract before UI labels say tracked.
