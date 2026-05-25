# Behavior Task Telemetry UI Cleanup

Batch 35 updates Advanced Debug UI panels to show source state on loaded zero shells.

Affected panels include behavior normalization internals, actor ownership and bleed risk, task catalog coverage, task parity/runtime sample, task telemetry mapping, telemetry coverage sample, behavioral intelligence, telemetry truth recovery, and experiment registry.

UI rules:
- Loaded zero panels show source state and next action.
- Formula missing rows are marked actionable.
- Generated unknown renders stale/unknown instead of loaded healthy.
- 0/0 ratios render unavailable/no-sample.
- Real zero requires a bounded source window.
- Raw details remain collapsed behind drilldown controls.
