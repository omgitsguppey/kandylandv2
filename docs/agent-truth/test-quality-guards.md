# Test Quality Guards

Generated: 2026-07-16T04:27:25.551Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214
Files audited: 1815
Focused tests found: 0
Skipped tests found: 6
Unsafe unknowns: 0

## Guardrails

- Provider calls are forbidden in source/unit harnesses.
- Production reads are forbidden in source/unit harnesses.
- Documented provider_call / production_read exceptions are source hygiene signals only and cannot clear release/proof gates.
- New deterministic tests must use stable clocks and IDs.
