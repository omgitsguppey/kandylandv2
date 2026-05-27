# Schema Validation Ownership

Generated: 2026-05-27T05:01:43.416Z
Validators audited: 1700
Schemas audited: 64
Manual validators audited: 242

## Rules

- Runtime validation belongs near the route/service owner.
- Shared report validation belongs near the canonical report contract.
- Test validators should import schema or canonical type, not duplicate shape.
- Zod-like schemas, if present, must be canonical or adapter-only.
- JSON artifacts should validate against one report schema.
