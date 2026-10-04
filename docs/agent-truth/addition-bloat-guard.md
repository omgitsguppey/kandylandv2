# Addition Bloat Guard

This guardrail limits additive bloat, parallel implementations, oversized generated reports, and undocumented testing/validator additions.

The existing command now reads the bloat section of the [coordinated takeover record](agent-takeover-safety-check.md). Source additions/deletions are measured against exact retained copies from before the task, including changes to files that were already dirty. Inherited work is reported separately. Generated projections are excluded from source attribution and their line count is measured separately. New resolver/validator files fail closed without the existing ownership justifications. The historical independent bloat snapshot is retired.

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
