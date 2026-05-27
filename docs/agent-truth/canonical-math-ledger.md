# Canonical Math Ledger

Generated: 2026-05-27T05:21:28.753Z
Current head: eb93068b1c0df79e92c921213b08923327907189
Status: fail

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

- Missing hydration gaps: 37
- Debug lane gaps: 37
- Evidence score reason: 37 person metric hydration gap(s) still need source or bridge repair.

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
- source_of_funds: Documents paid bonus as its own paid-source bucket without changing payment, wallet, PayPal, package, or GumDrop runtime math. Accuracy: Prevents future metric formulas from blending paid, reward, and bonus GumDrops.

## Dirty Files

- AGENTS.md: unsafe_unknown
- REPO_MEMORY_LEDGER.md: unsafe_unknown
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/index/known-pitfalls.json: unsafe_unknown
- agent/state/generated-artifact-size-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/qa-harness-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-fixture-gut-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-fixture-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-fixture-memory-writeback.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-quality-guards.generated.json: stale_generated_artifact_to_regenerate
- agent/state/validator-ownership-map.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/generated-artifact-size-policy.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/qa-harness-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-fixture-gut-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-fixture-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-fixture-memory-writeback.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-quality-guards.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/validator-ownership-map.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- scripts/agent/validate-generated-artifact-size-policy.ts: unsafe_unknown
- scripts/agent/validate-qa-harness-consolidation.ts: unsafe_unknown
- scripts/agent/validate-test-fixture-gut-consolidation.ts: unsafe_unknown
- scripts/agent/validate-test-fixture-inventory.ts: unsafe_unknown
- scripts/agent/validate-test-fixture-memory-writeback.ts: unsafe_unknown
- scripts/agent/validate-test-quality-guards.ts: unsafe_unknown
- scripts/agent/validate-validator-ownership-map.ts: unsafe_unknown
- src/lib/test-hardening/generated-artifact-size-policy.ts: unsafe_unknown
- src/lib/test-hardening/qa-harness-map.ts: unsafe_unknown
- src/lib/test-hardening/test-fixture-gut-consolidation.ts: unsafe_unknown
- src/lib/test-hardening/test-fixture-inventory.ts: unsafe_unknown
- src/lib/test-hardening/test-fixture-memory-writeback.ts: unsafe_unknown
- src/lib/test-hardening/test-hardening-shared.ts: unsafe_unknown
- src/lib/test-hardening/test-quality-guards.ts: unsafe_unknown
- src/lib/test-hardening/validator-ownership-map.ts: unsafe_unknown
- src/lib/testing/canonical-test-factories.ts: unsafe_unknown
- src/lib/testing/mock-evidence-classifier.ts: unsafe_unknown
- tests/unit/generated-artifact-size-policy.spec.ts: unsafe_unknown
- tests/unit/qa-harness-consolidation.spec.ts: unsafe_unknown
- tests/unit/test-fixture-inventory.spec.ts: unsafe_unknown
- tests/unit/test-fixture-memory-writeback.spec.ts: unsafe_unknown
- tests/unit/test-quality-guards.spec.ts: unsafe_unknown
- tests/unit/validator-ownership-map.spec.ts: unsafe_unknown

## Open PR Classification

- none

## Validation Failures

- Dirty files unclassified: AGENTS.md, REPO_MEMORY_LEDGER.md, agent/index/known-pitfalls.json, scripts/agent/validate-generated-artifact-size-policy.ts, scripts/agent/validate-qa-harness-consolidation.ts, scripts/agent/validate-test-fixture-gut-consolidation.ts, scripts/agent/validate-test-fixture-inventory.ts, scripts/agent/validate-test-fixture-memory-writeback.ts, scripts/agent/validate-test-quality-guards.ts, scripts/agent/validate-validator-ownership-map.ts, src/lib/test-hardening/generated-artifact-size-policy.ts, src/lib/test-hardening/qa-harness-map.ts, src/lib/test-hardening/test-fixture-gut-consolidation.ts, src/lib/test-hardening/test-fixture-inventory.ts, src/lib/test-hardening/test-fixture-memory-writeback.ts, src/lib/test-hardening/test-hardening-shared.ts, src/lib/test-hardening/test-quality-guards.ts, src/lib/test-hardening/validator-ownership-map.ts, src/lib/testing/canonical-test-factories.ts, src/lib/testing/mock-evidence-classifier.ts, tests/unit/generated-artifact-size-policy.spec.ts, tests/unit/qa-harness-consolidation.spec.ts, tests/unit/test-fixture-inventory.spec.ts, tests/unit/test-fixture-memory-writeback.spec.ts, tests/unit/test-quality-guards.spec.ts, tests/unit/validator-ownership-map.spec.ts
