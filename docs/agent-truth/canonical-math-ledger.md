# Canonical Math Ledger

Generated: 2026-07-14T08:15:48.663Z
Current head: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa
Status: pass

## Score Freeze

- Weights: {"sourceHealth":18,"runtimeHealth":30,"evidenceCompleteness":25,"freshness":10,"costRisk":7,"regressionRisk":10}
- Prompt known raw score: 78.26899999999999
- Prompt known rounded score: 78.27

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

- beta_score: Synchronizes the ledger to the implemented site-activity-weighted score dimensions. Accuracy: Prevents later score drift from undocumented weight changes.
- identity_confidence: Adds a canonical numeric confidence map without changing event ingestion. Accuracy: Makes confidence comparisons deterministic across metrics, debug, and legacy recovery.
- legacy_recovery_confidence: Documents maximum confidence and required evidence; no legacy data is mutated. Accuracy: Blocks unsupported exact promotion for legacy events.
- person_metrics: Fixes fake zero gap count to real missing hydration gap count. Accuracy: Evidence completeness reflects actual missing metric source/bridge gaps.
- duration_math: No runtime duration formula change; this ledger freezes the already-normalized duration doctrine. Accuracy: Prevents page-open time from being reused as watch time.
- source_of_funds: Documents paid bonus as its own paid-source bucket without changing payment, wallet, PayPal, package, or GumDrop runtime math. Accuracy: Prevents future metric formulas from blending paid, reward, and bonus GumDrops.

## Dirty Files

- Count: 575
- Drilldown truncated: true
- Protected manual review count: 8
- canonical_owner_creator_accruals: 3
- canonical_owner_platform_economy_treasury_reconciliation: 2
- canonical_owner_reward_grants: 6
- canonical_owner_unlock_spend_and_entitlement: 12
- current_generated_artifact_to_commit: 5
- failed_validator_to_repair: 1
- protected_manual_review_paypal_callback_or_provider_payment: 5
- protected_manual_review_wallet_payment_truth: 3
- real_source_change_needs_review: 51
- release_artifact_expected: 1
- stale_generated_artifact_to_regenerate: 162
- unrelated_agent_context_file_to_ignore: 1
- unrelated_dirty_outside_canonical_math_ledger: 323
- .env.example: unrelated_dirty_outside_canonical_math_ledger
- FULL_SCALE_CODEBASE_AUDIT.md: unrelated_dirty_outside_canonical_math_ledger
- README.md: unrelated_dirty_outside_canonical_math_ledger
- REPO_MEMORY_LEDGER.md: unrelated_dirty_outside_canonical_math_ledger
- agent/context/doctrine-cards.jsonl: unrelated_dirty_outside_canonical_math_ledger
- agent/context/doctrine-conflicts.generated.json: unrelated_dirty_outside_canonical_math_ledger
- agent/context/doctrine-registry.json: unrelated_dirty_outside_canonical_math_ledger
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
- agent/prompts/task-prompt.deep.md: unrelated_dirty_outside_canonical_math_ledger
- agent/prompts/task-prompt.standard.md: unrelated_dirty_outside_canonical_math_ledger
- agent/state/4xx-cost-guardrails.generated.json: stale_generated_artifact_to_regenerate
- agent/state/account-settings-delete-flow.generated.json: stale_generated_artifact_to_regenerate
- agent/state/account-settings-mobile-padding.generated.json: stale_generated_artifact_to_regenerate
- agent/state/admin-truth-replacement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-cost-runtime-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-ingest-firestore-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-rewire-phase-one.generated.json: stale_generated_artifact_to_regenerate
- agent/state/backend-route-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/backend-service-ownership.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavior-math-verification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-math-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/chat-composer-modal-lift.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-presence-typing.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cloudrun-sql-bigquery-guardrails.generated.json: stale_generated_artifact_to_regenerate
- agent/state/codebase-hardening.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-env-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-infra-gut-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-infra-memory-writeback.generated.json: stale_generated_artifact_to_regenerate
- agent/state/consent-tracking-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/content-protection-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cookie-banner-settings-sync.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-4xx-reduction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-data-connect-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-broadcast-timeline-prep.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-4xx-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-management-approval.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-manager-mobile-refinement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-submit-repair.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-workflow-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-experience-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-fan-pass-crm-broadcast.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-landing-dashboard-mobile.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-lane-debug-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-lane-legacy-truth-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-monetization-gates-lock.generated.json: canonical_owner_creator_accruals
- agent/state/creator-nav-role-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-profile-mobile-timeline.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-settings-source-health.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-surface-routing.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/current-head-release-reconciliation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: canonical_owner_reward_grants
- agent/state/daily-task-reward-ledger.generated.json: canonical_owner_reward_grants
- agent/state/data-connect-mirror-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch10-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-evidence-index.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-evidence-precacher-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/deeptracker-telemetry-volume-reduction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/dependency-toolchain-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/device-layout-score.generated.json: stale_generated_artifact_to_regenerate

## Open PR Classification

- none

## Validation Failures

- none
