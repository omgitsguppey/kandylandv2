# Refresh Safeguards

Generated: 2026-05-20T23:30:09.430Z

## Summary

Generated beta, evidence, telemetry, mobile, and creator reports now have an exact refresh command registry. Stale reports must say what to run next and must not clear formal evidence gates.

## Stale Artifacts

- agent/state/evidence-capture-status.generated.json: Evidence capture status was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:evidence-capture-status`
- agent/state/overnight-final-integration-lock.generated.json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:overnight-final-integration-lock`
- agent/state/creator-drop-status-metrics.generated.json: Creator drop status metrics was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:creator-drop-status-metrics`
- agent/state/operator-revenue-smoke.generated.json: Operator revenue smoke was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:operator-revenue-smoke`
- agent/state/beta-evidence-lane-prep.generated.json: Beta evidence lane prep was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:beta-evidence-lane-prep`
- agent/state/final-pr-stale-cleanup.generated.json: Final PR stale cleanup was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:final-pr-stale-cleanup`

## Refresh Commands

- `npm run score:beta && npm run check:beta-score`
- `npm run check:current-beta-exit-status`
- `npm run check:evidence-capture-status`
- `npm run check:source-truth-authority-map`
- `npm run check:final-telemetry-closure-lock`
- `npm run check:mobile-ui-final-lock`
- `npm run check:overnight-final-integration-lock`
- `npm run check:creator-settings-control-plane`
- `npm run check:creator-drop-status-metrics`
- `npm run check:operator-revenue-smoke`
- `npm run check:beta-evidence-gap-map`
- `npm run check:beta-evidence-lane-prep`
- `npm run check:beta-freshness-language`
- `npm run check:final-pr-stale-cleanup`
- `npm run check:overnight-wiring-integrity`
- `npm run check:existing-algorithm-refinement`
- `npm run check:user-loading-wallet-mobile-refinement`
- `npm run check:global-marquee-truncated-titles`

## Rules

- Refresh this report from the latest code version when the source version or freshness window does not match.
- Do not treat stale evidence as formal proof.
- Do not mark beta exit ready from generated artifacts alone.
- Keep operator-facing freshness messages plain and actionable.
