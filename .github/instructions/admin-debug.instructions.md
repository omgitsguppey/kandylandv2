---
applyTo: "src/app/admin/**/*.tsx,src/app/api/admin/**/*.ts,src/lib/admin-*.ts,src/lib/server/admin-*.ts"
---

# Admin And Debug Surface Instructions

- Admin surfaces must remain truth-first. Never show healthy state when the source is stale, fallback, partial, failed, or unknown.
- Prefer the shared admin/debug helpers before introducing a new label or state calculation.
- Keep changes scoped to the touched surface and its canonical helper chain.

Fast verification:

- `npm run typecheck`
- `npm run agent:test -- <path>`
- `npm run check:ui:coverage`
- `npm run check:ui:runtime`

Signoff verification:

- `npm run check:ui:audits`
- `npm run check:continuity` when the selector marks the work as broad/shared

Only run `npm run check:ui:lighthouse` when the patch changes loading, rendering, or performance-sensitive behavior.
