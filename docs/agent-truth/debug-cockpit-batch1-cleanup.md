# Debug Cockpit Batch 1 Cleanup

Status: typed evidence gates are separate from source-fix work. Source/debug failures remain fix-first; provider-backed site activity, deployed route, admin source sample, and owner-review lanes stay visible in collapsed drilldown.

- Current HEAD: 4594cdeb043d558e6ccf2fcfdb2c66d3ac44b400
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
- agent/state/admin-truth-sample-evidence.generated.json: formal_gate_only_not_source_fix; replacement=agent/state/admin-truth-source-sample.generated.json + redacted admin source activity sample

## Remaining Typed Evidence Gates

- provider-backed site activity evidence required
- deployed route evidence required
- redacted admin source activity sample required for typed evidence gate
- external billing/provider review remains owner-supplied
