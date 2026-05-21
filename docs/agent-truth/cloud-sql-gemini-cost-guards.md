# Cloud SQL and Gemini Cost Guards

Generated: 2026-05-21T00:15:50.758Z
Current head: 080ebb115fc9d917f52b2e38108634821a2712ce

This report is source-only. It does not run SQL/Data Connect sync, production reads, Gemini, Vertex, Cloud Assist, or provider billing calls.

## Summary

- Cloud SQL runtime detected: false
- Cloud SQL external billing observed: true
- SQL mirror scripts guarded: true
- SQL mirror explicit approval required: true
- Data Connect runtime detected: false
- Gemini/Vertex runtime detected: true
- Gemini external billing observed: true
- AI calls require explicit action: true
- AI calls have rate/cache guard: true
- P0/P1/P2: 0/0/0

## Findings

| Id | Severity | Status | Next action |
| --- | --- | --- | --- |
| cloud_sql_runtime_detection | P2 | cloud_sql_runtime_not_detected | Keep Cloud SQL as owner-review until runtime source proves app usage. |
| cloud_sql_external_billing | P1 | cloud_sql_external_billing_observed_owner_review_required | Review GCP Cloud SQL instance/process externally; do not invent repo pooling code without runtime SQL source. |
| sql_mirror_manual_guard | P1 | sql_mirror_scripts_guarded_manual_only | Run SQL mirror sync only with explicit local/staging/manual approval and a reason. |
| dataconnect_agent_context_mirror | P2 | dataconnect_agent_context_mirror_runtime_not_detected | Keep Data Connect classified as repo intelligence mirror unless explicitly promoted with a runtime ApiCostContract. |
| dataconnect_doctrine_manual_only | P2 | dataconnect_doctrine_manual_only | Keep doctrine and package scripts aligned when SQL mirror tooling changes. |
| gemini_runtime_detection | P1 | gemini_vertex_admin_ai_runtime_detected | Keep runtime AI behind explicit admin action, settings, rate limit, timeout, and owner-review cost lanes. |
| gemini_explicit_action | P1 | gemini_vertex_calls_require_explicit_admin_action | Do not add background AI calls; GET/default views must use saved/deterministic output. |
| gemini_rate_cache_guard | P1 | gemini_vertex_calls_have_rate_timeout_budget_guard | Add cache/idempotency before any new repeated same-prompt AI lane. |
| gemini_external_billing | P1 | gemini_cloud_assist_external_billing_observed_owner_review_required | Review Google Cloud billing/Vertex usage externally and map service account/job owners. |

## Owner Review

- cloud_sql_external_billing_observed_owner_review_required: Review GCP Cloud SQL instance/process externally; do not invent repo pooling code without runtime SQL source.
- gemini_cloud_assist_external_billing_observed_owner_review_required: Review Google Cloud billing/Vertex usage externally and map service account/job owners.

## PR Cleanup Actions

- #271: not_relevant - Monolith responsibility PR is not a SQL/Data Connect/Gemini cost guard change.
- #272: not_relevant - Creator dashboard aria-expanded PR is UI accessibility work, outside this cost guard lane.
- #273: not_relevant - Admin Debug Map optimization is separate from SQL/Data Connect/Gemini provider cost guards.

## Next Fix Order

1. Owner-review Cloud SQL billing in GCP to identify whether Data Connect mirror, App Hosting, or another external process owns spend.
2. Owner-review Vertex/Gemini billing in GCP and map service accounts to the admin AI routes or Cloud Assist usage.
3. Keep SQL mirror sync manual-only; require approval env, reason, and dry-run for local verification.
4. Add cache/idempotency before any future repeated same-prompt Gemini or Vertex lane.
