# Overnight Wiring Integrity

Generated: 2026-05-20T23:36:59.456Z
Current code version: 2774c5f6508dc005acde87cf4a3a0ce37f61bd51

## Summary

- Lanes wired: 9
- Lanes stale: 3
- Lanes partial: 0
- Missing dependencies: 0
- Broken/orphaned lanes: 0
- Creator drop route separated from My KandyDrops: yes
- Creator settings setup mapped to controls: yes
- Telemetry events covered by graph/contract: yes
- Shared marquee preserved: yes
- Protected chat untouched: yes
- Beta exit marked ready: no
- Findings: P0=0, P1=0, P2=3

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

- Status: stale
- Expected UI: admin/user/creator source-readiness artifacts
- Expected route: not applicable
- Expected contract: docs/agent-truth/mobile-ui-final-lock.md
- Expected validator: scripts/agent/validate-mobile-ui-final-lock.ts
- Expected telemetry: not applicable
- Expected artifact: agent/state/mobile-ui-final-lock.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Regenerate mobile final lock during source-readiness signoff; do not mark visual evidence complete.

### telemetry_final_lock

- Status: stale
- Expected UI: admin telemetry/source truth artifacts
- Expected route: telemetry ingest, identity, materializer, GA4, BigQuery lanes
- Expected contract: src/lib/analytics/telemetry-dependency-graph.ts
- Expected validator: scripts/agent/validate-final-telemetry-closure-lock.ts
- Expected telemetry: all priority telemetry lanes
- Expected artifact: agent/state/final-telemetry-closure-lock.generated.json
- Fix applied: Validated existing source wiring; no duplicate system added.
- Next action: Regenerate telemetry final lock after focused telemetry checks; keep beta evidence separate from source readiness.

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

- P2 agent/state/mobile-ui-final-lock.generated.json: mobile_ui_final_lock artifact is stale relative to current HEAD but has an explicit next action.
- P2 agent/state/final-telemetry-closure-lock.generated.json: telemetry_final_lock artifact is stale relative to current HEAD but has an explicit next action.
- P2 agent/state/public-beta-score.generated.json; agent/state/current-beta-exit-status.generated.json: beta_health_scoring artifact is stale relative to current HEAD but has an explicit next action.

## Dirty File Classifications

- agent/state/creator-broadcast-timeline-prep.generated.json: current_generated_artifact_to_commit
- agent/state/creator-drop-status-metrics.generated.json: current_generated_artifact_to_commit
- agent/state/creator-pricing-wiring.generated.json: current_generated_artifact_to_commit
- agent/state/creator-profile-mobile-timeline.generated.json: current_generated_artifact_to_commit
- agent/state/creator-settings-control-plane.generated.json: current_generated_artifact_to_commit
- agent/state/existing-algorithm-refinement.generated.json: current_generated_artifact_to_commit
- agent/state/global-marquee-truncated-titles.generated.json: current_generated_artifact_to_commit
- agent/state/user-loading-wallet-mobile-refinement.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/creator-broadcast-timeline-prep.md: current_generated_artifact_to_commit
- docs/agent-truth/creator-drop-status-metrics.md: current_generated_artifact_to_commit
- docs/agent-truth/creator-pricing-wiring.md: current_generated_artifact_to_commit
- docs/agent-truth/creator-profile-mobile-timeline.md: current_generated_artifact_to_commit
- docs/agent-truth/creator-settings-control-plane.md: current_generated_artifact_to_commit
- docs/agent-truth/existing-algorithm-refinement.md: current_generated_artifact_to_commit
- docs/agent-truth/global-marquee-truncated-titles.md: current_generated_artifact_to_commit
- docs/agent-truth/user-loading-wallet-mobile-refinement.md: current_generated_artifact_to_commit
- scripts/agent/validate-targeted-behavior-evidence.ts: real_source_change_needs_review
- tests/unit/targeted-behavior-evidence.spec.ts: real_source_change_needs_review

## PR Cleanup Actions

- No open PRs were present at start/end for overnight wiring integrity.

## Next Fix Order

- mobile_ui_final_lock: Regenerate mobile final lock during source-readiness signoff; do not mark visual evidence complete.
- telemetry_final_lock: Regenerate telemetry final lock after focused telemetry checks; keep beta evidence separate from source readiness.
- beta_health_scoring: Regenerate beta score/status in the beta health lane; this pass does not mark beta exit ready.
- Keep future telemetry claims tied to TELEMETRY_DEPENDENCY_GRAPH or analytics-event-contract before UI labels say tracked.
