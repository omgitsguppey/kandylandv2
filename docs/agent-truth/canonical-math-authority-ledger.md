# Canonical Math Authority Ledger

Generated: 2026-05-26T05:55:28.215Z
Current head: daf1dc1ea1fbf28039ab19b0f6e0c17ac62393cd
Status: pass

## Scope

This source-only ledger inventories the current formula authorities for scores, metrics, rates, counts, durations, confidence, revenue, GumDrops, creator monetization, and legacy recovery. It does not change payment, wallet, PayPal, GumDrop, or production data math.

## Status Counts

- canonical: 40
- needs_operator_decision: 9
- duplicate: 0
- stale: 0
- in_flight: 0
- missing_definition: 0

## Canonical Formula Inventory

| Formula | Domain | Status | Owner | Source truth |
| --- | --- | --- | --- | --- |
| beta_score.scanner_penalty | beta_score | canonical | public_beta_score | source scanner findings from buildPublicBetaFinding/dedupePublicBetaFindings |
| beta_score.domain_score | beta_score | canonical | public_beta_score | PUBLIC_BETA_DOMAIN_WEIGHTS and deduped scanner findings |
| beta_score.source_health | source_health | canonical | public_beta_score | scanner score and source-ready evidence gates |
| beta_score.runtime_health | runtime_health | canonical | public_beta_score | runtime/provider/debug/admin evidence artifacts |
| beta_score.evidence_completeness | evidence_completeness | canonical | public_beta_score | formal/source evidence artifacts supplied to buildPublicBetaScoreReport |
| beta_score.freshness_score | freshness | canonical | public_beta_score | generated report timestamps and currentHead comparisons |
| beta_score.cost_risk | cost_risk | canonical | public_beta_score | cost readiness artifacts and source guards |
| beta_score.regression_risk | regression_risk | canonical | public_beta_score | requiredReports, open PR triage, runtime code change flags, high-blast refresh evidence |
| beta_score.overall_health | beta_score | canonical | public_beta_score | source, runtime, evidence, freshness, cost, and regression scores |
| person_metrics.hydrated_event_count | user_metrics | canonical | analytics_person_metrics | canonical event envelope and person metric definitions |
| global_metrics.event_fact_count | global_metrics | canonical | analytics_global_user_dedupe | normalized behavioral event fact global dedupe decision |
| user_metrics.event_fact_count | user_metrics | canonical | analytics_global_user_dedupe | normalized behavioral event fact user dedupe decision |
| count_dedupe.page_session_count | session_metrics | canonical | analytics_count_dedupe | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.signup_login_count | user_metrics | canonical | auth_analytics | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.drop_open_count | global_metrics | canonical | drops_analytics | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.unwrap_count | global_metrics | canonical | commerce_server_truth | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.watch_session_count | watch_time | canonical | analytics_watch_time | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.wallet_open_count | user_metrics | canonical | wallet_analytics | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.checkout_start_count | user_metrics | canonical | commerce_funnel | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.payment_approved_count | revenue | canonical | commerce_server_truth | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.daily_task_count | daily_tasks | canonical | daily_tasks | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.chat_event_count | chat | canonical | chat | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.creator_profile_count | discovery | canonical | creator_discovery | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.creator_relationship_count | discovery | canonical | creator_relationships | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.fan_pass_count | fan_pass | canonical | fan_pass | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.notification_count | notifications | canonical | notifications | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.media_count | media | canonical | media | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.support_account_count | user_metrics | canonical | support_account | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.legacy_bucket_count | legacy_recovery | canonical | legacy_recovery | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.global_count | global_metrics | canonical | analytics_count_dedupe | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.user_count | user_metrics | canonical | analytics_count_dedupe | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.creator_count | creator_monetization | canonical | analytics_count_dedupe | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| count_dedupe.retry_replay_suppression | global_metrics | canonical | analytics_count_dedupe | canonical count deduplication normalizer and upstream event envelope/event fact truth |
| behavioral_event_fact.deduped_count | global_metrics | canonical | behavioral_event_fact | normalizeBehavioralEventFactWithDiagnostics |
| session_metrics.active_session_time | session_metrics | canonical | analytics_session_metrics | session metrics engine activity updates |
| bounce.session_bounce_status | bounce | canonical | analytics_session_metrics | classifyBounce and classifyEngagedSession |
| watch_time.active_watch_ms | watch_time | canonical | analytics_watch_time | drop watch time session progress events |
| watch_time.normalized_watch_percent | watch_time | canonical | analytics_watch_time | drop watch time session with contentDurationMs |
| sql_parity.summary_count_delta | global_metrics | canonical | analytics_sql_parity | normalized_event_fact |
| revenue.server_verified_revenue | revenue | needs_operator_decision | commerce_server_truth | server transaction truth only; client checkout is funnel context, not revenue |
| gumdrop.source_of_funds_balance | gumdrop | needs_operator_decision | gumdrop_ledger | GumDrop ledger and transaction source-of-funds contract |
| creator_monetization.entitlement_metric | creator_monetization | needs_operator_decision | creator_monetization | creator entitlement ledger contract when present |
| fan_pass.access_lifecycle_metric | fan_pass | needs_operator_decision | fan_pass | fan pass lifecycle/access resolver when present |
| discovery.search_result_rate | discovery | needs_operator_decision | discovery | search telemetry contract |
| chat.message_outcome_count | chat | needs_operator_decision | chat | chat telemetry/admin truth contract |
| daily_tasks.reward_and_completion_count | daily_tasks | needs_operator_decision | daily_tasks | daily task lifecycle and reward ledger contracts |
| notifications.permission_outcome_rate | notifications | needs_operator_decision | notifications | notification permission contract |
| media.upload_lifecycle_count | media | needs_operator_decision | media | media upload lifecycle contract |
| legacy_recovery.legacy_event_recovered_count | legacy_recovery | canonical | legacy_recovery | legacy recovery candidate dry-run report |

## Source Inventory

| Source | Status | Formula kinds |
| --- | --- | --- |
| src/lib/agent-score/core.ts | canonical | score, weight, average, cap, penalty, dedupe |
| src/lib/agent-score/weights.ts | canonical | weight, threshold, cap, penalty |
| src/lib/agent-score/reporting.ts | canonical | score, command_budget |
| src/lib/analytics/person-metrics-hydration.ts | canonical | count, confidence, legacy, global_user_divergence |
| src/lib/analytics/event-translation-bridge.ts | canonical | count, score_dimension, debug_gap |
| src/lib/analytics/session-metrics-engine.ts | canonical | duration, count, bounce, confidence |
| src/lib/analytics/drop-watch-time-engine.ts | canonical | duration, rate, percent, dedupe, replay |
| src/lib/analytics/sql-database-parity-engine.ts | canonical | count, dedupe, global_user_divergence, cost |
| src/lib/behavioral/event-fact-normalizer.ts | canonical | confidence, normalization, revenue_context, gumdrop_context |
| src/lib/behavioral/normalize-event-fact.ts | needs_operator_decision | dedupe, normalization, revenue, gumdrop, legacy |
| src/lib/debug/debug-panel-tracking-summary.ts | canonical | admin_metric, count, status |
| scripts/agent/score-code-organization.ts | needs_operator_decision | score, weight, penalty, risk |
| scripts/agent/validate-session-bounce-calculation.ts | canonical | validator, duration, bounce, score_dimension |
| scripts/agent/validate-drop-watch-time-accuracy.ts | canonical | validator, duration, rate, confidence |
| scripts/agent/validate-sql-database-parity-cost-lock.ts | canonical | validator, count, dedupe, cost |
| agent/state/public-beta-score.generated.json | stale | generated_report, score_snapshot |

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

- CHANGELOG.md: release_artifact_expected
- agent/state/canonical-math-authority-ledger.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/canonical-math-authority-ledger.md: release_artifact_expected
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-canonical-math-authority-ledger.ts: failed_validator_to_repair
- src/lib/math/canonical-math-authority-contract.ts: real_source_change_needs_review
- src/lib/math/canonical-math-authority-ledger.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/canonical-math-authority-ledger.spec.ts: current_generated_artifact_to_commit

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
