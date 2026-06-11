# Canonical Math Authority Ledger

Generated: 2026-06-11T14:39:03.281Z
Current head: 9b25961f85707ab4e0f5d8346b10b667ae0b75a4
Status: pass

## Scope

This source-only ledger inventories the current formula authorities for scores, metrics, rates, counts, durations, confidence, revenue, GumDrops, creator monetization, and legacy recovery. It does not change payment, wallet, PayPal, GumDrop, or production data math.

## Status Counts

- canonical: 53
- needs_operator_decision: 9
- duplicate: 0
- stale: 0
- in_flight: 0
- missing_definition: 0

## Canonical Formula Inventory

Emitted rows: 10 of 62 (truncated)

| Formula | Domain | Status | Owner | Source truth | Freshness | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| chat.message_outcome_count | chat | needs_operator_decision | chat | source-owned | source-owned | source-owned |
| creator_monetization.entitlement_metric | creator_monetization | needs_operator_decision | creator_monetization | source-owned | source-owned | source-owned |
| daily_tasks.reward_and_completion_count | daily_tasks | needs_operator_decision | daily_tasks | source-owned | source-owned | source-owned |
| discovery.search_result_rate | discovery | needs_operator_decision | discovery | source-owned | source-owned | source-owned |
| fan_pass.access_lifecycle_metric | fan_pass | needs_operator_decision | fan_pass | source-owned | source-owned | source-owned |
| gumdrop.source_of_funds_balance | gumdrop | needs_operator_decision | gumdrop_ledger | source-owned | source-owned | source-owned |
| media.upload_lifecycle_count | media | needs_operator_decision | media | source-owned | source-owned | source-owned |
| notifications.permission_outcome_rate | notifications | needs_operator_decision | notifications | source-owned | source-owned | source-owned |
| revenue.server_verified_revenue | revenue | needs_operator_decision | commerce_server_truth | source-owned | source-owned | source-owned |
| behavioral_event_fact.deduped_count | global_metrics | canonical | behavioral_event_fact | source-owned | source-owned | source-owned |

## Source Inventory

Emitted rows: 10 of 17 (truncated)

| Source | Status | Formula kinds |
| --- | --- | --- |
| src/lib/agent-score/core.ts | canonical | score, weight, average, cap, penalty, dedupe |
| src/lib/agent-score/weights.ts | canonical | weight, threshold, cap, penalty |
| src/lib/agent-score/reporting.ts | canonical | score, command_budget |
| src/lib/analytics/person-metrics-hydration.ts | canonical | count, confidence, legacy, global_user_divergence |
| src/lib/analytics/event-translation-bridge.ts | canonical | count, score_dimension, debug_gap |
| src/lib/analytics/session-metrics-engine.ts | canonical | duration, count, bounce, confidence |
| src/lib/analytics/drop-watch-time-engine.ts | canonical | duration, rate, percent, dedupe, replay |
| src/lib/math/duration-math-normalizer.ts | canonical | duration, watch_time, flow, confidence, legacy |
| src/lib/analytics/sql-database-parity-engine.ts | canonical | count, dedupe, global_user_divergence, cost |
| src/lib/behavioral/event-fact-normalizer.ts | canonical | confidence, normalization, revenue_context, gumdrop_context |

## Needs Operator Decision

- revenue.server_verified_revenue: legacy/client purchase events cannot become exact revenue without server transaction linkage.
- gumdrop.source_of_funds_balance: legacy GumDrop balances cannot be promoted to exact paid/reward split without source ledger proof.
- creator_monetization.entitlement_metric: unknown legacy entitlement remains unknown_legacy until linked.
- fan_pass.access_lifecycle_metric: legacy subscription state cannot become active access without creator/user/source truth.
- discovery.search_result_rate: raw search strings or old filter events do not become canonical search metrics without redaction/hash policy.
- chat.message_outcome_count: raw transcript/body content is never metric truth.
- daily_tasks.reward_and_completion_count: legacy rewards cannot become exact reward truth until ledger-linked.
- notifications.permission_outcome_rate: legacy notification opens cannot become exact permission grant proof.
- media.upload_lifecycle_count: raw storage path/private URL is not metric or debug truth.

## Dirty Files

- agent/context/doctrine.cards.jsonl: manual_review_repo_governance_owner_blocker
- agent/context/doctrine.index.json: manual_review_repo_governance_owner_blocker
- agent/context/file-size-budget.json: manual_review_repo_governance_owner_blocker
- agent/context/legacy-registry.json: manual_review_repo_governance_owner_blocker
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/context/task-pack.generated.json: manual_review_repo_governance_owner_blocker
- agent/context/validator-map.json: manual_review_repo_governance_owner_blocker
- agent/index/blast-radius.json: manual_review_repo_governance_owner_blocker
- agent/index/canonical-helpers.json: manual_review_repo_governance_owner_blocker
- agent/index/dependency-graph.summary.json: manual_review_repo_governance_owner_blocker
- agent/index/governance-truth.json: manual_review_repo_governance_owner_blocker
- agent/index/known-pitfalls.json: manual_review_repo_governance_owner_blocker
- agent/index/package-manager-truth.json: manual_review_repo_governance_owner_blocker
- agent/index/recent-passes.json: manual_review_repo_governance_owner_blocker
- agent/index/repo-inventory.json: manual_review_repo_governance_owner_blocker
- agent/index/retrieval-index.json: manual_review_repo_governance_owner_blocker
- agent/index/runtime-observability.json: manual_review_repo_governance_owner_blocker
- agent/index/surface-map.json: manual_review_repo_governance_owner_blocker
- agent/index/ui-surface-coverage.json: manual_review_repo_governance_owner_blocker
- agent/index/verification-commands.json: manual_review_repo_governance_owner_blocker

## Open PR Classification

- none

## Validation Failures

- none
