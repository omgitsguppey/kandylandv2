# Creator Dashboard Error And Cost Inventory

Artifact: `agent/state/creator-dashboard-error-cost-inventory.generated.json`
Validator: `npm run check:creator-dashboard-error-cost-inventory`

Generated: 2026-05-17T05:46:04.764Z
Current source head: `3d21baa7736d837bb79915fd7cdb99816e88d3b2`

## Summary

- Creator dashboard errors found/fixed: 2/2.
- Expected 4xx groups: 2.
- Unexpected 4xx groups found/fixed: 1/1.
- Cloud Run cost findings: 2.
- Cloud SQL cost findings: 1.
- Gemini/Cloud Assist/Vertex cost findings: 1.

## Creator Dashboard

- plain-admin-dashboard-fetch [fixed]: Plain admin accounts no longer load /api/creator/settings unless they are in creator view-as projection.
- broadcast-refresh-loading-guard [fixed]: Broadcast refresh is disabled while broadcast history is already loading.
- creator-manager-state-coverage [verified]: Requests, bookings, Fan Pass, and broadcasts expose loading, empty, error, disabled, and read-only or pending states.

Creator Dashboard managers remain lazy-mounted by active section. Requests, bookings, Fan Pass, and broadcasts keep loading, empty, error, disabled, and read-only or pending states. Plain admin accounts no longer call creator settings unless admin view-as projection is active.

## 4xx Classification

- expected-auth-and-role-4xx [verified]: Creator routes intentionally return 401/403 for auth, role, and read-only projection boundaries.
- expected-validation-and-conflict-4xx [verified]: Creator requests, bookings, and subscriptions return typed 400/402/409/413 responses for invalid input, paid-GD shortfall, unavailable features, slot conflicts, and bounded body failures.
- unexpected-admin-self-load-4xx [fixed]: The creator dashboard previously treated role=admin as load-eligible without projection, which could surface creator settings 4xx as a page error.

Expected 4xx states include auth required, invalid input, insufficient paid GumDrops, unavailable creator features, slot unavailable, read-only projection, and disabled creator settings. Unexpected frontend-caused 4xx from plain admin self-load was fixed.

## Cost Inventory

### Cloud Run / App Hosting

- apphosting-run-config-present [verified]: Source config includes App Hosting concurrency, minInstances, and maxInstances. This pass did not change deployment config.
- creator-dashboard-duplicate-read-reduction [fixed]: Creator dashboard duplicate read risk was reduced by blocking admin self-loads and refresh clicks during active broadcast loading.

### Cloud SQL

- cloud-sql-agent-mirror-only [deferred]: Source doctrine and Data Connect config classify Cloud SQL as an agent-context mirror; no creator dashboard runtime SQL path was found in this pass.

### Gemini / Cloud Assist / Vertex

- admin-ai-cost-surface-out-of-scope [owner_review]: Vertex/Gemini and AI cover/description surfaces are admin/provider cost lanes and were inventoried source-only; no creator dashboard AI call path was found.

## Next Fix Order

1. Confirm Cloud SQL/Data Connect provider billing and active connection state outside this source-only pass.
2. Review App Hosting request/error metrics before any Cloud Run/App Hosting capacity change.
3. Run the admin AI cost lane before changing Gemini, Cloud Assist, Vertex, or AI cover generation behavior.
