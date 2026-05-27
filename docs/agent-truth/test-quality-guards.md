# Test Quality Guards

Generated: 2026-05-27T00:00:00.000Z
Current head: 73bb5a8b1aa989f93c2580e04b7c1e22ff62db93
Files audited: 1595
Focused tests found: 0
Skipped tests found: 4
Unsafe unknowns: 0

## Guardrails

- Provider calls are forbidden in source/unit harnesses.
- Production reads are forbidden in source/unit harnesses.
- New deterministic tests must use stable clocks and IDs.
