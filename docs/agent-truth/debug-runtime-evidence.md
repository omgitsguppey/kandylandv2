# Debug Runtime Evidence

Generated: 2026-05-24T14:55:39.284Z

Latest code version: 48d8c64ecce16f4ae346e49f5607099e0d686d26

## Summary

- Status: `partial_debug_runtime_evidence`
- Passed: false
- Checked sources: 5
- Critical runtime issues: 0
- Unresolved warnings: 0
- Unknown evidence count: 0
- Source-backed runtime confidence: 0
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
| npm run check:debug-panel-output-triage | fail | agent/state/debug-panel-output-triage.generated.json | Artifact is not current for the latest code version. |
| npm run check:telemetry-admin-debug-truth | fail | agent/state/telemetry-admin-debug-truth.generated.json | Artifact is not current for the latest code version. |

## Evidence Boundary

This is source-backed debug/runtime evidence. It does not clear deployed runtime smoke, provider smoke, manual screenshot evidence, or admin truth sample evidence.
