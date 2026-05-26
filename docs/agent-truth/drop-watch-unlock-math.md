# Drop Watch Unlock Math

Generated: 2026-05-26T10:09:49.464Z
Current head: bc44577799249d76f1be41c6f1b94ba533d260f1
Status: pass

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

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/drop-watch-time-accuracy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/drop-watch-unlock-math.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/drop-watch-time-accuracy.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/drop-watch-unlock-math.md: current_generated_artifact_to_commit
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-unlock-math.ts: validator_artifact_expected
- scripts/agent/validate-unlock-telemetry-truth.ts: validator_artifact_expected
- src/app/api/drops/unlock/route.ts: unlock_route_event_separation_expected
- src/app/api/viewer/watch-session/route.ts: watch_session_route_guard_expected
- src/lib/analytics/drop-watch-time-engine.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/behavioral/event-fact-contract.ts: real_source_change_needs_review
- src/lib/behavioral/event-fact-normalizer.ts: real_source_change_needs_review
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/commerce/unlock-watch-parity-contract.ts: real_source_change_needs_review
- src/lib/math/drop-watch-unlock-math.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- tests/unit/drop-watch-time-accuracy.spec.ts: test_artifact_expected
- tests/unit/drop-watch-unlock-math.spec.ts: test_artifact_expected
- tests/unit/user-management-refactor.spec.ts: test_artifact_expected

## Open PR Classification

- #302 Improve onboarding friction visibility and technical rescue signals: onboarding_telemetry_external_review_required
- #301 Reduce doctrine drift and banned-pattern reintroduction: doctrine_governance_external_review_required
- #300 Reduce monolith file risk and clarify responsibility boundaries: architecture_refactor_external_review_required
- #299 chore(deps): bump the functions-npm-minor-patch group in /functions with 5 updates: dependency_update_external_review_required
- #298 chore(deps): bump npm-check-updates from 19.6.6 to 22.2.1: dependency_update_external_review_required
- #297 chore(deps): bump knip from 5.88.1 to 6.14.2: dependency_update_external_review_required
- #296 chore(deps): bump syncpack from 14.3.0 to 15.3.1: dependency_update_external_review_required
- #295 chore(deps): bump puppeteer from 24.40.0 to 25.0.4: dependency_update_external_review_required
- #294 chore(deps): bump the npm-minor-patch group across 1 directory with 48 updates: dependency_update_external_review_required
- #293 Sentinel: [High] Fix insecure Math.random() usage for ID generation: security_patch_external_review_required
- #292 Bolt: Replace array `.find()` with Map lookup in debug route: performance_patch_external_review_required
- #291 Palette: Add accessible loading states to Creator Experiences Panel buttons: accessibility_patch_external_review_required

## Validation Failures

- none
