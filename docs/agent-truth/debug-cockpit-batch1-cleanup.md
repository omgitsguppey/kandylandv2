# Debug Cockpit Batch 1 Cleanup

Status: formal evidence gates are separate from source-fix work. Source/debug failures remain fix-first; formal and owner-review lanes stay visible in collapsed drilldown.

- Current HEAD: 48d8c64ecce16f4ae346e49f5607099e0d686d26
- Admin truth: degraded -> source_ready_formal_sample_required
- Telemetry parity: live -> clean_current
- AI critic: pass -> pass_with_formal_backlog_visible
- Cost display: collapsed_external_review_remaining
- Actionable source issues: 2
- Formal evidence items: 3
- Score-impacting stale artifacts: 0

## Retired From Active Cockpit Inputs

- agent/state/score-80-path-lock.generated.json: retired_from_active_cockpit_score_inputs; replacement=agent/state/public-beta-score.generated.json + agent/state/score-dimension-80-lock.generated.json
- agent/state/final-launch-readiness-report.generated.json: retired_from_active_cockpit_score_inputs; replacement=agent/state/current-beta-exit-status.generated.json + agent/state/public-beta-score.generated.json
- agent/state/admin-truth-sample-evidence.generated.json: formal_gate_only_not_source_fix; replacement=agent/state/admin-truth-source-sample.generated.json + redacted first-party admin sample

## Remaining Formal Gates

- formal provider smoke artifact required
- deployed runtime smoke artifact required
- redacted first-party admin sample required for formal gate
- external billing/provider review remains owner-supplied
