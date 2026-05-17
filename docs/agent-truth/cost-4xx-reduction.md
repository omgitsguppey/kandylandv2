# Cost And 4xx Reduction

Artifact: `agent/state/cost-4xx-reduction.generated.json`
Validator: `npm run check:cost-4xx-reduction`

Generated: 2026-05-17T06:28:34.492Z
Current source head: `70919f6be9129ce71ecc8b8f88eeafec9f866b5f`

## Summary

- Speed/security before: 51/beta-risk, findings 91.
- Speed/security after: 51/beta-risk, findings 89.
- P0/P1/P2 findings: 0/0/7.
- Payment, GumDrop math, Firebase rules, Cloud Functions, BigQuery, deployment config, and admin runtime were not changed.

## Safe Fixes

- user-route-body-limit-reduction [fixed]: User follow and onboarding-progress POST bodies now use the bounded JSON parser before zod validation or analytics work.
- unexpected-unbounded-user-body [fixed]: Plain request.json parsing in user follow/onboarding-progress could parse oversized or malformed bodies before typed bounded-body responses.
- user-route-bounded-json-body [fixed]: Bounded JSON body parsing was added to safe user mutation routes that had request.json parsing.

## 4xx Classification

- expected-user-auth-validation-4xx [expected, classified_no_auto_retry]: User routes intentionally return 401/400/404/409 for auth, invalid body, missing target, and unavailable creator states.
- expected-creator-business-4xx [expected, classified_requires_user_action]: Creator routes already classify auth, paid-GD shortfall, slot unavailable, disabled features, and bounded-body errors as typed expected 4xx states.
- unexpected-unbounded-user-body [unexpected, fixed_no_repeated_parse_work]: Plain request.json parsing in user follow/onboarding-progress could parse oversized or malformed bodies before typed bounded-body responses.

## Cloud Run / App Hosting

- cloud-run-app-hosting-source-config [source_inventory_complete]: App Hosting source config remains documented as a source-only Cloud Run/App Hosting cost lane; no infra deployment config changed.
- user-route-body-limit-reduction [fixed]: User follow and onboarding-progress POST bodies now use the bounded JSON parser before zod validation or analytics work.

## Cloud SQL

- cloud-sql-agent-context-mirror-only [deferred_owner_review]: Cloud SQL/Data Connect remains classified as an agent-context mirror; no user/creator product runtime SQL usage was fixed in this pass.

## Gemini / Cloud Assist / Vertex

- gemini-cloud-assist-admin-ai-only [deferred_owner_review]: Gemini/Cloud Assist/Vertex source references are admin/provider cost lanes; no user/creator route AI call path was found or changed.

## Deferred Owner Review

- cloud-run-app-hosting-source-config: Use provider metrics before changing min/max instances, concurrency, or CPU allocation.
- cloud-sql-agent-context-mirror-only: Owner should confirm provider billing and active connection state outside source-only validation.
- gemini-cloud-assist-admin-ai-only: Run the admin AI cost owner lane before changing model calls, token budgets, or provider behavior.

