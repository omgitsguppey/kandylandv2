# Canonical Math Ledger

Generated: 2026-06-11T14:07:39.280Z
Current head: fca594c435f4a2418c6d96a10602a2ee422c014e
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

- Count: 147
- Drilldown truncated: true
- Protected manual review count: 0
- canonical_owner_platform_economy_treasury_reconciliation: 5
- canonical_owner_unlock_spend_and_entitlement: 2
- companion_gumdrop_math_artifact_expected: 2
- companion_gumdrop_math_validator_expected: 1
- current_generated_artifact_to_commit: 2
- failed_validator_to_repair: 1
- real_source_change_needs_review: 15
- stale_generated_artifact_to_regenerate: 48
- unrelated_agent_context_file_to_ignore: 1
- unrelated_dirty_outside_canonical_math_ledger: 70
- agent/context/doctrine.cards.jsonl: unrelated_dirty_outside_canonical_math_ledger
- agent/context/doctrine.index.json: unrelated_dirty_outside_canonical_math_ledger
- agent/context/file-size-budget.json: unrelated_dirty_outside_canonical_math_ledger
- agent/context/legacy-registry.json: unrelated_dirty_outside_canonical_math_ledger
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/context/task-pack.generated.json: unrelated_dirty_outside_canonical_math_ledger
- agent/context/validator-map.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/blast-radius.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/canonical-helpers.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/dependency-graph.summary.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/governance-truth.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/known-pitfalls.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/package-manager-truth.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/recent-passes.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/repo-inventory.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/retrieval-index.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/runtime-observability.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/surface-map.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/ui-surface-coverage.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/verification-commands.json: unrelated_dirty_outside_canonical_math_ledger
- agent/index/workflow-guidance.json: unrelated_dirty_outside_canonical_math_ledger
- agent/state/admin-cms-workflow-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-legacy-recovery-reconciliation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/background-job-idempotency-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/bug-report-truth-terminal-state.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-math-authority-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-math-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/config-env-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/content-media-pipeline-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cookie-banner-settings-sync.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-evidence-staleness-queue.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-cost-surfaces.generated.json: stale_generated_artifact_to_regenerate
- agent/state/gumdrop-ledger-math.generated.json: companion_gumdrop_math_artifact_expected
- agent/state/identity-handoff-spine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/media-upload-lifecycle.generated.json: stale_generated_artifact_to_regenerate
- agent/state/orphaned-logic-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/private-media-access.generated.json: stale_generated_artifact_to_regenerate
- agent/state/provider-smoke-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/route-sample-freshness-classifier.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-reconciliation-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-dimension-80-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-creator-dashboard-split.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-mirror-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-sync.payload.generated.json: stale_generated_artifact_to_regenerate
- agent/state/stale-route-sample-classification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/support-policy-surface-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-dependency-graph.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-identified-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/treasury-reconciliation-engine.generated.json: canonical_owner_platform_economy_treasury_reconciliation
- agent/state/treasury-structure-contract.generated.json: canonical_owner_platform_economy_treasury_reconciliation
- agent/state/user-management-status-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/admin-cms-drop-workflow.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-legacy-recovery-reconciliation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/background-jobs-idempotency.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/bug-report-truth-terminal-state.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-math-authority-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-math-ledger.md: current_generated_artifact_to_commit
- docs/agent-truth/config-env-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/content-media-pipeline.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cookie-banner-settings-sync.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/gumdrop-ledger-math.md: companion_gumdrop_math_artifact_expected
- docs/agent-truth/identity-handoff-spine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/media-upload-lifecycle.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/private-media-access.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/route-sample-freshness-classifier.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-reconciliation-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-dimension-80-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/stale-route-sample-classification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/support-policy-surface-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-dependency-graph.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/treasury-reconciliation-engine.md: canonical_owner_platform_economy_treasury_reconciliation
- docs/agent-truth/treasury-structure-contract.md: canonical_owner_platform_economy_treasury_reconciliation
- docs/agent-truth/user-management-status-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-profile-api-contract.md: stale_generated_artifact_to_regenerate
- scripts/agent/admin-status-lane-cleanup-shared.ts: unrelated_dirty_outside_canonical_math_ledger
- scripts/agent/build-agent-indexes.ts: unrelated_dirty_outside_canonical_math_ledger
- scripts/agent/chat-cost-status-cleanup-shared.ts: unrelated_dirty_outside_canonical_math_ledger

## Open PR Classification

- none

## Validation Failures

- none
