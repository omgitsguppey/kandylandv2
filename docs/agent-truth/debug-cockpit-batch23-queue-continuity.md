# debug-cockpit-batch23-queue-continuity

Generated: 2026-05-24T23:29:51.282Z

Status: pass

## Summary
- Queue runtime continuity separates scheduler heartbeat evidence from dispatch outcome readability.
- Outcomes-only evidence is degraded_missing_heartbeat, not live scheduler continuity.
- Legacy adapter usage and missing dispatch outcomes remain blocking drift until migration evidence is loaded.

## Validation Failures
- none
