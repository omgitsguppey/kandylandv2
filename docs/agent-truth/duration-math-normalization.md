# Duration Math Normalization

Generated: 2026-05-26T06:17:28.054Z
Current head: c84694d7f546c25f68639db1ed4680dab9abaccb
Status: pass

## Scope

This source-only pass normalizes duration semantics across sessions, drop watch time, task duration, checkout/auth/chat/media/notification flows, and legacy unknown duration. It does not mutate production data and does not change payment, wallet, PayPal, GumDrop, or navigation behavior.

## Canonical Rules

- Active time requires foreground visibility and recent user/action/media activity.
- Hidden/background and idle time are excluded from active time.
- Passive visible time remains separate from active time.
- Watch time is media/content exposure only, not page-open duration.
- Unknown and unsupported legacy duration remains unavailable, not zero.

## Debug Lane

- exact: 2
- estimated: 1
- unavailable: 2
- suspicious page-time fallback: 1
- background excluded: 1

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/canonical-math-authority-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/drop-watch-time-accuracy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/duration-math-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/session-bounce-calculation.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-math-authority-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/drop-watch-time-accuracy.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/duration-math-normalization.md: release_artifact_expected
- docs/agent-truth/session-bounce-calculation.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-canonical-math-authority-ledger.ts: failed_validator_to_repair
- scripts/agent/validate-drop-watch-time-accuracy.ts: failed_validator_to_repair
- scripts/agent/validate-duration-math-normalization.ts: failed_validator_to_repair
- scripts/agent/validate-session-bounce-calculation.ts: failed_validator_to_repair
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/math/canonical-math-authority-contract.ts: real_source_change_needs_review
- src/lib/math/canonical-math-authority-ledger.ts: real_source_change_needs_review
- src/lib/math/duration-math-normalizer.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/duration-math-normalization.spec.ts: current_generated_artifact_to_commit

## Open PR Classification

- #302 🧭 Improve onboarding friction visibility and technical rescue signals: onboarding_telemetry_external_review_required
- #301 📚 Reduce doctrine drift and banned-pattern reintroduction: doctrine_governance_external_review_required
- #300 🧱 Reduce monolith file risk and clarify responsibility boundaries: architecture_refactor_external_review_required
- #299 chore(deps): bump the functions-npm-minor-patch group in /functions with 5 updates: dependency_update_external_review_required
- #298 chore(deps): bump npm-check-updates from 19.6.6 to 22.2.1: dependency_update_external_review_required
- #297 chore(deps): bump knip from 5.88.1 to 6.14.2: dependency_update_external_review_required
- #296 chore(deps): bump syncpack from 14.3.0 to 15.3.1: dependency_update_external_review_required
- #295 chore(deps): bump puppeteer from 24.40.0 to 25.0.4: dependency_update_external_review_required
- #294 chore(deps): bump the npm-minor-patch group across 1 directory with 48 updates: dependency_update_external_review_required
- #293 🛡️ Sentinel: [High] Fix insecure Math.random() usage for ID generation: security_patch_external_review_required
- #292 ⚡ Bolt: Replace array `.find()` with Map lookup in debug route: performance_patch_external_review_required
- #291 🎨 Palette: Add accessible loading states to Creator Experiences Panel buttons: accessibility_patch_external_review_required

## Validation Failures

- none
