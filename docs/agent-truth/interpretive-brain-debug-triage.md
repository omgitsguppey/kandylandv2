# Interpretive Brain Debug Triage

Generated: 2026-06-21T19:42:57.976Z
Current head: a1efe12aa1c08a98310f32d2dd997d73b689c1a7
Status: pass

## Scope

This source-only pass adds the Product brain triage layer above normalized signals. It interprets product health, journey meaning, root cause, score impact, cost risk, formal gates, stale artifacts, and exact next actions. It does not mutate production data, call providers, clear formal gates, alter payment runtime, change GumDrop math, or touch navigation.

## Product Brain Summary

- default view: product_brain_summary
- raw lanes default open: false
- top actions: 10
- findings: 11
- duplicate findings collapsed: 1
- critical findings hidden: 0
- formal gates: 4
- cost risks: 1
- stale artifacts: 1

## Top Actions

- p1 drops_unwrap_watch source_ready: Attach external billing review artifact if needed; keep source cost guards visible separately.
- p1 admin_debug_ops admin_truth_sample_missing: Produce redacted admin source activity sample evidence before clearing this gate.
- p1 drops_unwrap_watch formal_evidence_missing: Produce a redacted admin source activity sample before clearing the admin evidence gate.
- p1 drops_unwrap_watch formal_evidence_missing: Produce provider-backed site activity and deployed route evidence before clearing the beta gate.
- p1 drops_unwrap_watch runtime_sample_missing: Produce deployed route evidence outside source-only validation.
- p2 admin_debug_ops stale_evidence: Run npm run score:beta and npm run check:beta-score when source changes settle.
- p3 drops_unwrap_watch source_ready: Keep score impact mapped to a body system and exact next action before beta gates are interpreted.
- p3 drops_unwrap_watch source_ready: Keep score impact mapped to a body system and exact next action before beta gates are interpreted.
- info drops_unwrap_watch cost_guard_ready: Hot path writes only essential normalized summaries and raw event facts.
- info drops_unwrap_watch source_ready: Keep journey meaning derived from normalized facts instead of raw debug noise.

## Open PR Classification

- none

## Dirty Files

- agent/state/debug-cockpit-batch7-control-tower-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/launch-blocker-evidence-closure.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch7-control-tower-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/launch-blocker-evidence-closure.md: stale_generated_artifact_to_regenerate

## Validation Failures

- none
