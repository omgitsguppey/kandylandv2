# Canonical Math Ledger

Generated: 2026-05-26T08:58:56.299Z
Current head: 34f63bc34ed85473191110bc6084e1dbbead4d2a
Status: pass

## Score Freeze

- Weights: {"sourceHealth":25,"runtimeHealth":20,"evidenceCompleteness":20,"freshness":15,"costRisk":10,"regressionRisk":10}
- Prompt known raw score: 77.8295
- Prompt known rounded score: 77.83

## Confidence Freeze

- Identity confidence weights: {"exact":1,"linked":0.85,"inferred":0.6,"weak":0.35,"unknown":0}
- Legacy recovered data cannot exceed inferred without deterministic userId, sessionId, eventId, and source timestamp.
- Unknown legacy remains archive-only/unknown unless deterministic evidence exists.

## Proven Zero And Non-Events

- Proven zero requires a bounded source window and successful source query or summary.
- Missing data is not zero.
- Non-events and future-only events do not reduce score.
- Visible high-traffic events with no liveness source classify as source_missing or suspicious_idle.

## Person Metrics Gap Math

- Missing hydration gaps: 36
- Debug lane gaps: 36
- Evidence score reason: 36 person metric hydration gap(s) still need source or bridge repair.

## Formula Owners

- beta_score: canonical (agent_score)
- person_metrics: canonical (analytics_person_metrics)
- global_metrics: canonical (analytics_global_metrics)
- session_time: canonical (analytics_duration_math)
- bounce: canonical_documented (analytics_session_metrics)
- watch_time: canonical (analytics_watch_time)
- gumdrop_balances: canonical_documented (wallet_commerce)
- source_of_funds: canonical_documented (commerce_server_truth)
- revenue_entitlements: canonical_documented (creator_monetization)
- task_rewards: canonical (daily_tasks_rewards)
- chat_gating: canonical_documented (chat_messaging)
- notification_liveness: canonical_documented (notifications_pwa)
- sql_export_parity: canonical_documented (telemetry_behavioral_intelligence)
- legacy_recovery_confidence: canonical (analytics_legacy_recovery)

## Formula Comparison

- beta_score: No formula change; this ledger freezes the implemented score weights and known weighted calculation. Accuracy: Prevents later score drift from undocumented weight changes.
- identity_confidence: Adds a canonical numeric confidence map without changing event ingestion. Accuracy: Makes confidence comparisons deterministic across metrics, debug, and legacy recovery.
- legacy_recovery_confidence: Documents maximum confidence and required evidence; no legacy data is mutated. Accuracy: Blocks unsupported exact promotion for legacy events.
- person_metrics: Fixes fake zero gap count to real missing hydration gap count. Accuracy: Evidence completeness reflects actual missing metric source/bridge gaps.
- duration_math: No runtime duration formula change; this ledger freezes the already-normalized duration doctrine. Accuracy: Prevents page-open time from being reused as watch time.
- source_of_funds: Documents existing source-of-funds authority without changing payment, wallet, PayPal, or GumDrop math. Accuracy: Prevents future metric formulas from blending paid, reward, and bonus GumDrops.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/canonical-math-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/canonical-math-ledger.md: current_generated_artifact_to_commit
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-canonical-math-ledger.ts: failed_validator_to_repair
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/math/canonical-math-ledger.ts: real_source_change_needs_review
- src/lib/math/math-authority-map.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/canonical-math-ledger.spec.ts: current_generated_artifact_to_commit

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
