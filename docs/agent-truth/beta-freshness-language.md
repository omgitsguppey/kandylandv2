# Beta Freshness Language

Generated: 2026-06-21T19:36:24.249Z
Latest code version: 187d6964a50ddf5a4077b19e88471c7e23414b75

## Doctrine

- Internal freshness metadata remains available for validators.
- User and operator report copy uses plain language such as latest code version, refresh this report, evidence is current, and evidence is outdated.
- Beta exit source lanes remain strict. Plain language does not turn missing evidence into source evidence.

## Summary

- Internal metadata preserved: true
- User-facing technical language removed: true
- Plain freshness messages enabled: true
- Refresh actions mapped: true
- Validators still use internal metadata: true

## Refresh Command Map

- agent/state/public-beta-score.generated.json: npm run score:beta && npm run check:beta-score; Refresh report - Run npm run score:beta && npm run check:beta-score from the latest code version.
- agent/state/current-beta-exit-status.generated.json: npm run check:current-beta-exit-status; Refresh report - Run npm run check:current-beta-exit-status from the latest code version.
- agent/state/evidence-capture-status.generated.json: npm run check:evidence-capture-status; Refresh report - Run npm run check:evidence-capture-status from the latest code version.
- agent/state/source-truth-authority-map.generated.json: npm run check:source-truth-authority-map; Refresh report - Run npm run check:source-truth-authority-map from the latest code version.
- agent/state/final-cost-audit-lock.generated.json: npm run check:final-cost-audit-lock; Refresh report - Run npm run check:final-cost-audit-lock from the latest code version.
- agent/state/creator-dashboard-role-boundary.generated.json: npm run check:creator-dashboard-role-boundary; Refresh report - Run npm run check:creator-dashboard-role-boundary from the latest code version.
- agent/state/creator-fan-pass-crm-broadcast.generated.json: npm run check:creator-fan-pass-crm-broadcast; Refresh report - Run npm run check:creator-fan-pass-crm-broadcast from the latest code version.
- agent/state/creator-dashboard-overview-stats.generated.json: npm run check:creator-dashboard-overview-stats; Refresh report - Run npm run check:creator-dashboard-overview-stats from the latest code version.
- agent/state/beta-health-algorithm-v2.generated.json: npm run check:beta-health-algorithm-v2; Refresh report - Run npm run check:beta-health-algorithm-v2 from the latest code version.

## Replaced Messages

- Replaced Git shorthand with latest code version.
- Replaced source-version mismatch jargon with report was generated before the latest code changes.
- Replaced stale generated report phrasing with refresh outdated generated reports.
- Replaced runtime drift field names with new runtime code landed after this report.

## Remaining Findings

- None.

