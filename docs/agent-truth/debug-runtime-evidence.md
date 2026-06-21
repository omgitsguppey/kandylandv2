# Debug Runtime Evidence

Generated: 2026-06-21T19:16:51.544Z

Latest code version: cbf48ed3419f240b49c9a2a17772476af2efd36c

## Summary

- Status: `partial_debug_runtime_evidence`
- Passed: false
- Checked sources: 5
- Critical runtime issues: 0
- Unresolved warnings: 0
- Unknown evidence count: 0
- Source-backed runtime confidence: 100
- Launch gate impact: `does_not_clear_deployed_runtime_smoke`

## Source Status

- Debug panel source snapshot: stale
- Route diagnostics: source_ready
- Runtime warning store: source_ready
- Telemetry admin debug truth: stale
- Admin Debug Control Tower: source_ready
- Pre-catch runtime issue scan: source_ready
- Error dictionary mapping: source_ready

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:debug-panel-output-triage | stale_snapshot | agent/state/debug-panel-output-triage.generated.json | Artifact is a stale source snapshot; rerun the owning local validator before using it as current evidence. |
| npm run check:telemetry-admin-debug-truth | stale_snapshot | agent/state/telemetry-admin-debug-truth.generated.json | Artifact is a stale source snapshot; rerun the owning local validator before using it as current evidence. |

## Evidence Boundary

This is source-backed debug/runtime evidence. It does not clear deployed route evidence, provider-backed site activity, or admin source activity sample evidence.
