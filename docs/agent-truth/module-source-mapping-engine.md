# Module Source Mapping Engine

The module source mapping engine builds module-specific evidence from actual source counts. Event facts only count for a module when the event names map to that module. Accepted substitute sources, such as task lifecycle or admin truth snapshots, prevent false empty states without faking samples.

Required parity uses this formula: required verified equals 1.0, required partial equals 0.5 unless a critical required source is missing then 0.35, and required empty equals 0. Optional modules are scored separately.
