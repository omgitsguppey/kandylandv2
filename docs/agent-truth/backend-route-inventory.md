# Backend Route Inventory

Generated: 2026-05-27T03:56:29.619Z
Current head: 360b1047

## Summary

- Routes/functions audited: 218
- Missing owner: 0
- Missing cost class: 0
- Unsafe unknowns: 0
- Raw internal-server-error routes reported: 0

## Top Consolidation Risks

- GET /api/admin/ai/drop-covers: consolidate; owner=drop/unlock/watch service; risk=no_direct_read
- PUT /api/admin/ai/drop-covers: consolidate; owner=drop/unlock/watch service; risk=no_direct_read
- GET /api/admin/analytics/historical: consolidate; owner=analytics ingest/event fact service; risk=bounded_read
- GET /api/admin/analytics/realtime: consolidate; owner=analytics ingest/event fact service; risk=bounded_read
- GET /api/admin/analytics/refresh: consolidate; owner=analytics ingest/event fact service; risk=no_direct_read
- POST /api/admin/analytics/refresh: consolidate; owner=analytics ingest/event fact service; risk=no_direct_read
- GET /api/admin/content: consolidate; owner=admin analytics summary service; risk=no_direct_read
- POST /api/admin/content: consolidate; owner=admin analytics summary service; risk=no_direct_read
- DELETE /api/admin/content: consolidate; owner=admin analytics summary service; risk=no_direct_read
- GET /api/admin/debug/assistant: consolidate; owner=debug/control tower service; risk=bounded_read
- POST /api/admin/debug/assistant: consolidate; owner=debug/control tower service; risk=bounded_read
- PUT /api/admin/debug/assistant: consolidate; owner=debug/control tower service; risk=bounded_read

## Source Truth

- Inventory is derived from `src/app/api/**/route.ts` and `functions/src/**/*.ts`.
- It is a guardrail and report lane only; runtime routes do not import generated artifacts.
