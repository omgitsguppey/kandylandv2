# Debug Cockpit Batch 18 Route Hotspots

Ingest identified: current_server_error -> fixed_current
Wallet packages: current_client_error -> expected_typed_client_error
Current server failures: 1 -> 0
Current client errors: 1 -> 0
Current slow routes: admin/overview:GET, admin/debug/control-tower:GET
Historical latency review: admin/debug/assistant:GET, admin/debug:GET, admin/analytics/historical:GET, creator/relationships:GET, user/onboarding-progress:POST

## Targeted Fixes
- analytics/ingest-identified:POST invalid payloads now return non-retryable typed 4xx.
- analytics/ingest-identified:POST deferred timeline/materializer failures no longer fail persisted event fact writes.
- wallet/packages:GET exposes active public catalog success and typed rate-limit classification.

## Remaining Gaps
- Admin historical and debug summary routes still need separate cache/window review before broad refactors.
- Route runtime counters require post-deploy sample refresh to prove production error volume drops.
