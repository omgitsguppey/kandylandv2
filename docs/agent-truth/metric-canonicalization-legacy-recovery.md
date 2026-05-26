# Metric Canonicalization Legacy Recovery

Generated: 2026-05-26T09:21:14.544Z
Current head: 1410a822acc04c6b26de7559d3bb71eeb9c4d4d0
Status: pass

## Contract

- Recovery starts at `2026-03-01`.
- This is dry-run only: no production reads, writes, mutations, or live backfill.
- Unknown legacy cannot become exact user truth.
- Exact legacy identity requires deterministic userId, eventId, timestamp, and source route.
- Exact source with incomplete identity is capped at inferred, partial route/event match is capped at weak, and unknown source/identity is archive-only.
- Payment/ledger dedupe uses idempotency or provider/order fingerprints only and does not change payment or GumDrop math.

## Alias Categories

- watch_page_duration
- unlock_drop_open
- wallet_payment
- signup_login
- daily_task_checkin
- chat_message
- notification
- creator_profile_follow
- search_discovery
- support_settings

## Dry-Run Summary

- Input records: 4
- Candidate count: 4
- Canonical metric count: 2
- Archive-only count: 1
- Manual review count: 1

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/metric-canonicalization-legacy-recovery.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/metric-canonicalization-legacy-recovery.md: current_generated_artifact_to_commit
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-metric-canonicalization-legacy-recovery.ts: failed_validator_to_repair
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/math/legacy-metric-canonicalization.ts: real_source_change_needs_review
- src/lib/math/legacy-recovery-dry-run-engine.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/metric-canonicalization-legacy-recovery.spec.ts: current_generated_artifact_to_commit

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
