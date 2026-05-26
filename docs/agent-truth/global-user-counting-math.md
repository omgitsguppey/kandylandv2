# Global User Counting Math

Generated: 2026-05-26T09:47:29.898Z
Current head: f34a689d0212cb13f66e801d60c0c2022eb0bd10
Status: pass

## Contract

- Global metrics count unique real actions once per dedupe key.
- Guest metrics count pre-login guest actions only.
- Signed-in metrics count authenticated actions only.
- Linked-person metrics combine guest and signed-in events only when link evidence exists.
- Creator role metrics are signed-in metrics with role context and do not create another person.
- Admin projections and system events never count as user behavior.
- Unknown legacy can count only as safe global evidence and never as exact user truth.

## Exact Dedupe Windows

- surface viewed: eventName + surface + actor/session + 60s
- click/action: eventName + objectId + actor/session + 5s
- signup/login: authAttemptId or userId + method + 10m
- wallet checkout: idempotency key
- payment approval: provider/order fingerprint only
- drop unlock: dropId + user/linkedPerson + unlockId
- watch session: watchSessionId
- chat message: messageId/idempotency key
- task reward: taskId + resetWindowId + user
- notification: intentId + recipient + 1h

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/global-user-counting-math.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/global-user-counting-math.md: current_generated_artifact_to_commit
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-global-user-counting-math.ts: validator_artifact_expected
- scripts/agent/validate-global-user-dedupe-normalization.ts: real_source_change_needs_review
- scripts/agent/validate-person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-engine.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/math/global-user-counting-math.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/global-user-counting-math.spec.ts: test_artifact_expected
- tests/unit/person-metrics-hydration.spec.ts: test_artifact_expected

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
