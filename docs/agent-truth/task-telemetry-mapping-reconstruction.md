# Task Telemetry Mapping Reconstruction

Batch 35 reconstructs task telemetry mapping around trigger events, lifecycle events, supporting telemetry, shared events, aliases, event facts, and rollup mapping.

The mapping lane now flags contradictions such as tracked events zero while the telemetry catalog has task events, lifecycle events zero while task activity samples exist, and unscanned aliases. Shared events must carry criteria/distinct-key/count-threshold evidence before they can be treated as clean task mappings.

Task telemetry mapping 0/0 is source missing or no sample, not healthy.
