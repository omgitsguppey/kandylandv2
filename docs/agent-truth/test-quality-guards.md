# Test Quality Guards

Generated: 2026-05-27T00:00:00.000Z
Current head: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa
Files audited: 1812
Focused tests found: 0
Skipped tests found: 6
Unsafe unknowns: 0

## Guardrails

- Provider calls are forbidden in source/unit harnesses.
- Production reads are forbidden in source/unit harnesses.
- Documented provider_call / production_read exceptions are source hygiene signals only and cannot clear release/proof gates.
- New deterministic tests must use stable clocks and IDs.
