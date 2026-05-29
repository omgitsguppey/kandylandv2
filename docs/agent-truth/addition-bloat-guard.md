# Addition Bloat Guard

This guardrail limits additive bloat, parallel implementations, oversized generated reports, and undocumented testing/validator additions.

## Rules Enforced
- **Additions Classification**: Every patch resulting in net additions > deletions must supply a clean justification explaining the architectural necessity.
- **Artifact Size Budgets**: Any generated JSON/markdown report exceeding 500 lines must supply a summary/drilldown justification.
- **No Parallel Resolvers**: Adding a new resolver, hook, registry, or service requires proof that no existing canonical owner exists.
- **Validator Compliance**: New validators must possess:
  1. Safe owner assignment
  2. Package script in `package.json`
  3. A dedicated Vitest spec file
  4. Explicit retirement/deprecation rules
- **Specific Memory Rules**: Every new memory rule must map directly to a documented developer/agent mistake pattern.
- **Gut/Consolidation Discipline**: If a task is flagged as a gut/consolidation pass, net additions must not exceed deletions unless flagged as safely overridden.
