# Canonical Math Ledger

Generated: 2026-06-20T18:25:34.793Z
Current head: 0aef25736e1f14e8f5949bea69e72c424001ee68
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

- Missing hydration gaps: 37
- Debug lane gaps: 74
- Evidence score reason: 74 person metric hydration gap(s) still need source or bridge repair.

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

- Count: 0
- Drilldown truncated: false
- Protected manual review count: 0
- none

## Open PR Classification

- none

## Validation Failures

- none
