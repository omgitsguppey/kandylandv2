# Drop Watch Unlock Math

Generated: 2026-07-14T03:42:10.433Z
Current head: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa
Status: fail

## Contract

- drop_opened means a detail, card, or content surface opened.
- drop_unlocked means entitlement/access was granted.
- drop_unwrapped means the payload was revealed or consumed after access.
- activeWatchMs excludes page duration, locked previews, hidden tabs, background time, and idle time.
- normalizedWatchPercent is a 0..1 ratio and replay is classified separately.
- Static drops cap continuous exposure at 30 seconds unless the user interacts.

## Metrics

- Global opens/unlocks/unwraps separated: true
- User opens/unlocks/unwraps separated: true
- Creator active watch seconds source: watch_session_rollup.activeWatchMs

## Dirty Files

- FULL_SCALE_CODEBASE_AUDIT.md: unsafe_unknown
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/index/ui-surface-coverage.json: unsafe_unknown
- agent/state/codebase-hardening.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-4xx-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-manager-mobile-refinement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-submit-repair.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-workflow-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/device-layout-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/device-ui-dry-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/drop-watch-unlock-math.generated.json: current_generated_artifact_to_commit
- agent/state/event-catalog-telemetry-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/evidence-freshness-index.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-release-exit-readiness-packet.generated.json: stale_generated_artifact_to_regenerate
- agent/state/frontend-component-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/frontend-gut-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/guest-user-analytics-cutover.generated.json: stale_generated_artifact_to_regenerate
- agent/state/release-rollback-incident-readiness.generated.json: stale_generated_artifact_to_regenerate
- agent/state/speed-security-hardening.generated.json: stale_generated_artifact_to_regenerate
- agent/state/unlock-transaction-source-metadata.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-drop-4xx-policy.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-drop-submit-repair.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-drop-workflow-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/drop-watch-unlock-math.md: current_generated_artifact_to_commit
- docs/agent-truth/evidence-freshness-index.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-release-exit-readiness-packet.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/frontend-component-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/frontend-gut-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/release-rollback-incident-readiness.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/unlock-transaction-source-metadata.md: stale_generated_artifact_to_regenerate
- scripts/agent/score-codebase-hardening.ts: unsafe_unknown
- scripts/agent/score-speed-security-hardening.ts: unsafe_unknown
- scripts/agent/validate-admin-user-behavior-truth.ts: unsafe_unknown
- scripts/agent/validate-event-fact-truth.ts: unsafe_unknown
- scripts/agent/validate-guest-user-analytics-cutover.ts: unsafe_unknown
- scripts/agent/validate-server-unlock-telemetry-emission.ts: unsafe_unknown
- scripts/agent/validate-unlock-telemetry-truth.ts: validator_artifact_expected
- scripts/local-exe/KandyDropsLauncher.cs: unsafe_unknown
- scripts/local-exe/build-local-exes.ps1: unsafe_unknown
- src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx: unsafe_unknown
- src/app/admin/user/[userId]/page.tsx: unsafe_unknown
- src/app/api/admin/creator-account-controls/route.ts: unsafe_unknown
- src/app/api/analytics/ingest-identified/route.ts: unsafe_unknown
- src/app/api/analytics/ingest/route.ts: unsafe_unknown
- src/app/api/drops/unlock/route.ts: unlock_route_event_separation_expected
- src/app/api/paypal/capture/route.ts: unsafe_unknown
- src/app/api/paypal/create/route.ts: unsafe_unknown
- src/components/Analytics/DeepTracker.tsx: unsafe_unknown
- src/components/Drops/LockedDropPreviewView.tsx: unsafe_unknown
- src/lib/admin-analytics-region-demand.ts: unsafe_unknown
- src/lib/analytics/ingest-contract.ts: unsafe_unknown
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/server/paypal.ts: unsafe_unknown
- src/lib/telemetry.ts: unsafe_unknown
- tests/unit/admin-analytics-region-demand.spec.ts: unsafe_unknown
- tests/unit/analytics-ingest-identified-route.spec.ts: unsafe_unknown
- tests/unit/analytics-ingest-route.spec.ts: unsafe_unknown
- tests/unit/content-protection-truth.spec.ts: unsafe_unknown
- tests/unit/drops-unlock-route.spec.ts: unsafe_unknown
- tests/unit/event-fact-truth.spec.ts: unsafe_unknown
- tests/unit/local-exe-launcher.spec.ts: unsafe_unknown
- tests/unit/paypal-capture-route.spec.ts: unsafe_unknown
- tests/unit/server-unlock-telemetry-emission.spec.ts: unsafe_unknown
- tests/unit/speed-security-hardening.spec.ts: unsafe_unknown
- tests/unit/telemetry.spec.ts: unsafe_unknown

## Open PR Classification

- none

## Validation Failures

- dirty files are unclassified.
