# Debug Runtime Evidence

Generated: 2026-05-24T23:33:19.592Z

Latest code version: 7b0a0da430881d9f9c9443de922b6d483f9c8fff

## Summary

- Status: `source_ready_debug_runtime_evidence`
- Passed: true
- Checked sources: 7
- Critical runtime issues: 0
- Unresolved warnings: 0
- Unknown evidence count: 0
- Source-backed runtime confidence: 0
- Launch gate impact: `does_not_clear_deployed_runtime_smoke`

## Source Status

- Debug panel source snapshot: checked_clean
- Route diagnostics: source_ready
- Runtime warning store: source_ready
- Telemetry admin debug truth: checked_clean
- Admin Debug Control Tower: source_ready
- Pre-catch runtime issue scan: source_ready
- Error dictionary mapping: source_ready

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:debug-panel-output-triage | pass | agent/state/debug-panel-output-triage.generated.json | Artifact is current for the latest code version. |
| npm run check:telemetry-admin-debug-truth | pass | agent/state/telemetry-admin-debug-truth.generated.json | Artifact is current for the latest code version. |

## Evidence Boundary

This is source-backed debug/runtime evidence. It does not clear deployed runtime smoke, provider smoke, manual screenshot evidence, or admin truth sample evidence.
