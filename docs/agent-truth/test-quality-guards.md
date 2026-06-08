# Test Quality Guards

Generated: 2026-05-27T00:00:00.000Z
Current head: 4e8d5c7617760fe87af7663e2ff9bd7e965fa16e
Files audited: 1736
Focused tests found: 0
Skipped tests found: 4
Unsafe unknowns: 0

## Guardrails

- Provider calls are forbidden in source/unit harnesses.
- Production reads are forbidden in source/unit harnesses.
- Documented provider_call / production_read exceptions are source hygiene signals only and cannot clear release/proof gates.
- New deterministic tests must use stable clocks and IDs.
