# Test Quality Guards

Generated: 2026-05-27T00:00:00.000Z
Current head: eb93068b1c0df79e92c921213b08923327907189
Files audited: 1595
Focused tests found: 0
Skipped tests found: 4
Unsafe unknowns: 0

## Guardrails

- Provider calls are forbidden in source/unit harnesses.
- Production reads are forbidden in source/unit harnesses.
- New deterministic tests must use stable clocks and IDs.
