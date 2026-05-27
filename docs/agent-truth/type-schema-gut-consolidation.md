# Type Schema Gut Consolidation

Generated: 2026-05-27T05:04:18.145Z
Current head: af292363502db378c7a81b986134de42afdf2627
Types audited: 3200
Duplicate types found: 40
Aliases classified: 885
Generated report schemas typed: 455
Unsafe unknowns: 0

## Remaining Gaps

- Net additions exceed deletions because the request explicitly required new type-schema owner, validator, report, test, and memory writeback lanes; the new code is source-derived guardrail tooling and does not create runtime DTO truth.
- Runtime behavior was not changed; duplicate compatibility aliases remain where removing them would risk consumers.
- Future type edits must import canonical owners before adding local DTOs.

## Next Exact Steps

- When touching a duplicate family, replace local DTOs with canonical imports or explicit compatibility aliases.
- Keep generated report artifacts compact and validate them through check:generated-report-schema-contract.
- Search duplicate type/interface names at the end of every type/schema pass.
