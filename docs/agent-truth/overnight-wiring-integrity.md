# Overnight Wiring Integrity

Generated: 2026-06-03T02:39:48.261Z
Current code version: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

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
- Findings: P0=1, P1=0, P2=1

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

- agent/state/activity-verification-engine.generated.json: current_generated_artifact_to_commit
- agent/state/algorithmic-evidence-policy.generated.json: current_generated_artifact_to_commit
- agent/state/analytics-hydration-consolidation-audit.generated.json: current_generated_artifact_to_commit
- agent/state/analytics-hydration-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/analytics-panel-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/beta-evidence-gap-map.generated.json: current_generated_artifact_to_commit
- agent/state/beta-freshness-language.generated.json: current_generated_artifact_to_commit
- agent/state/creator-dashboard-error-cost-inventory.generated.json: current_generated_artifact_to_commit
- agent/state/creator-drop-status-metrics.generated.json: current_generated_artifact_to_commit
- agent/state/creator-experience-simplification.generated.json: current_generated_artifact_to_commit
- agent/state/creator-settings-control-plane.generated.json: current_generated_artifact_to_commit
- agent/state/debug-panel-output-triage.generated.json: current_generated_artifact_to_commit
- agent/state/debug-runtime-evidence.generated.json: current_generated_artifact_to_commit
- agent/state/debug-score-impact-triage.generated.json: current_generated_artifact_to_commit
- agent/state/evidence-capture-status.generated.json: current_generated_artifact_to_commit
- agent/state/final-telemetry-closure-lock.generated.json: current_generated_artifact_to_commit
- agent/state/formal-evidence-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/gumdrop-economy-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/mobile-loading-hydration-stability.generated.json: current_generated_artifact_to_commit
- agent/state/mobile-ui-final-lock.generated.json: current_generated_artifact_to_commit
- agent/state/operator-revenue-smoke.generated.json: current_generated_artifact_to_commit
- agent/state/post-economy-creator-flow-qa.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/runtime-smoke-substitute-matrix.generated.json: current_generated_artifact_to_commit
- agent/state/runtime-watch-time-v2.generated.json: current_generated_artifact_to_commit
- agent/state/score-80-reconciliation-lock.generated.json: current_generated_artifact_to_commit
- agent/state/score-80-refresh-pass.generated.json: current_generated_artifact_to_commit
- agent/state/source-backed-runtime-confidence.generated.json: current_generated_artifact_to_commit
- agent/state/source-truth-authority-map.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-admin-debug-truth.generated.json: current_generated_artifact_to_commit
- agent/state/user-facing-feature-connection-audit.generated.json: current_generated_artifact_to_commit
- agent/state/user-loading-wallet-mobile-refinement.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/algorithmic-evidence-policy.md: current_generated_artifact_to_commit
- docs/agent-truth/analytics-hydration-consolidation-audit.md: current_generated_artifact_to_commit
- docs/agent-truth/analytics-hydration-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/analytics-panel-hydration.md: current_generated_artifact_to_commit
- docs/agent-truth/beta-evidence-gap-map.md: current_generated_artifact_to_commit
- docs/agent-truth/beta-freshness-language.md: current_generated_artifact_to_commit
- docs/agent-truth/creator-dashboard-error-cost-inventory.md: current_generated_artifact_to_commit
- docs/agent-truth/creator-drop-status-metrics.md: current_generated_artifact_to_commit
- docs/agent-truth/creator-settings-control-plane.md: current_generated_artifact_to_commit
- docs/agent-truth/debug-runtime-evidence.md: current_generated_artifact_to_commit
- docs/agent-truth/debug-score-impact-triage.md: current_generated_artifact_to_commit
- docs/agent-truth/evidence-capture-status.md: current_generated_artifact_to_commit
- docs/agent-truth/final-telemetry-closure-lock.md: current_generated_artifact_to_commit
- docs/agent-truth/formal-evidence-bridge.md: current_generated_artifact_to_commit
- docs/agent-truth/mobile-loading-hydration-stability.md: current_generated_artifact_to_commit
- docs/agent-truth/mobile-ui-final-lock.md: current_generated_artifact_to_commit
- docs/agent-truth/operator-revenue-smoke.md: current_generated_artifact_to_commit
- docs/agent-truth/runtime-smoke-substitute-matrix.md: current_generated_artifact_to_commit
- docs/agent-truth/runtime-watch-time-v2.md: current_generated_artifact_to_commit
- docs/agent-truth/score-80-reconciliation-lock.md: current_generated_artifact_to_commit
- docs/agent-truth/score-80-refresh-pass.md: current_generated_artifact_to_commit
- docs/agent-truth/source-backed-runtime-confidence.md: current_generated_artifact_to_commit
- docs/agent-truth/source-truth-authority-map.md: current_generated_artifact_to_commit
- docs/agent-truth/telemetry-admin-debug-truth.md: current_generated_artifact_to_commit
- docs/agent-truth/user-loading-wallet-mobile-refinement.md: current_generated_artifact_to_commit
- scripts/agent/validate-analytics-hydration-consolidation.ts: real_source_change_needs_review
- scripts/agent/validate-analytics-panel-hydration.ts: real_source_change_needs_review
- scripts/agent/validate-public-beta-score.ts: real_source_change_needs_review
- scripts/agent/validate-score-80-reconciliation-lock.ts: real_source_change_needs_review
- scripts/agent/validate-score-80-refresh-pass.ts: real_source_change_needs_review
- src/lib/agent-score/algorithmic-evidence-policy.ts: unsafe_unknown
- src/lib/agent-score/core.ts: unsafe_unknown
- src/lib/agent-score/evidence-quality.ts: unsafe_unknown
- src/lib/agent-score/formal-evidence-bridge.ts: unsafe_unknown
- tests/unit/public-beta-score.spec.ts: real_source_change_needs_review

## PR Cleanup Actions

- No open PRs were present at start/end for overnight wiring integrity.

## Next Fix Order

- beta_health_scoring: Regenerate beta score/status in the beta health lane; this pass does not mark beta exit ready.
- Keep future telemetry claims tied to TELEMETRY_DEPENDENCY_GRAPH or analytics-event-contract before UI labels say tracked.
