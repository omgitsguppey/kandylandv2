# Route Hotspot Targeted Fixes

Summary-first policies: admin/overview:GET, admin/analytics/historical:GET, admin/debug:GET, admin/debug/control-tower:GET, admin/debug/assistant:GET
Expected 4xx mappings: wallet/packages:GET, notifications:GET, user/onboarding-progress:POST, creator/relationships:GET, creator/relationships:POST
Unsafe broad refactor performed: false

## Targeted Fixes
- analytics/ingest-identified:POST invalid payloads now return non-retryable typed 4xx.
- analytics/ingest-identified:POST deferred timeline/materializer failures no longer fail persisted event fact writes.
- wallet/packages:GET exposes active public catalog success and typed rate-limit classification.

## Follow-ups
- Review admin/analytics/historical summary cache window before changing source reads.
- Review creator relationships client batching separately if current latency remains high.
- Monitor wallet/packages for residual 4xx after the active public catalog response is deployed.
