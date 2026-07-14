# Backend Service Ownership

Generated: 2026-07-14T16:07:20.012Z
Current head: dc4dad82c

## Canonical Services

- auth/session/profile service: cost=bounded_auth; debug=route runtime health; validator=check:backend-service-ownership
- wallet/payment/GumDrop ledger service: cost=commerce_cost_sensitive; debug=payment route diagnostics; validator=check:backend-service-ownership
- drop/unlock/watch service: cost=bounded_runtime; debug=viewer route diagnostics; validator=check:backend-service-ownership
- chat/message/attachment service: cost=bounded_runtime; debug=chat route cohort runtime; validator=check:backend-service-ownership
- creator/profile/discovery/relationship service: cost=bounded_firestore; debug=creator lane diagnostics; validator=check:backend-service-ownership
- creator monetization/Fan Pass/entitlement service: cost=commerce_cost_sensitive; debug=creator monetization admin debug; validator=check:backend-service-ownership
- task/checkin/reward service: cost=bounded_runtime; debug=task route diagnostics; validator=check:backend-service-ownership
- notification/PWA service: cost=bounded_runtime; debug=notification lifecycle diagnostics; validator=check:backend-service-ownership
- media storage/access service: cost=storage_cost_sensitive; debug=media access diagnostics; validator=check:backend-service-ownership
- support/account safety service: cost=bounded_runtime; debug=support recovery diagnostics; validator=check:backend-service-ownership
- analytics ingest/event fact service: cost=analytics_ingest_or_summary; debug=analytics route diagnostics; validator=check:backend-service-ownership
- admin analytics summary service: cost=admin_bounded; debug=admin control tower; validator=check:backend-service-ownership
- debug/control tower service: cost=debug_summary_or_drilldown; debug=admin debug control tower; validator=check:backend-service-ownership
- cost/runtime evidence service: cost=cost_guardrail; debug=cost runtime evidence; validator=check:backend-service-ownership

## Rules

- Routes call services.
- Services call canonical math/normalizer/ledger helpers.
- Routes should not duplicate business math.
- Admin/debug routes are summary-first and drilldown second.
- Provider/payment routes remain isolated unless wrappers/tests are the only change.

## Gaps

- Routes missing owner: 0
- Routes missing validator: 0
