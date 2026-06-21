# Debug Score Impact Triage

Generated: 2026-06-21T18:27:50.957Z

Latest code version: 8ca57655865577c691fbcbc6c7e636acea2e9281

## Summary

- Issues classified: 45
- Source-fixable: 5
- Evidence-fixable: 38
- Stale artifact-fixable: 30
- P0/P1/P2: 0/10/35

## Score-Impact Queue

| Issue | Severity | Dimension | Est. point impact | Current status | Fix plan |
| --- | --- | --- | ---: | --- | --- |
| runtime-provider-smoke-source-confidence-gap | P1 | runtimeHealth | 8.89 | runtime_unverified | Keep provider-backed site activity + deployed route evidence gates blocked; only source-backed confidence can be refreshed without claiming provider or deployed-route truth. |
| debug-panel-admin-truth-samples | P1 | freshness | 4 | formal_proof_required | Attach a fresh first-party admin truth sample before upgrading this gate. |
| debug-panel-report-precatch-runtime | P1 | freshness | 4 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-targeted-behavior-evidence | P1 | freshness | 4 | stale | Use targeted behavior as one gate only; keep visual, provider, runtime, and admin sample caps separate. |
| stale-artifact-beta-evidence-gap-map-generated-json | P1 | freshness | 2.7083333333333335 | stale_refreshable | Refresh with npm run check:beta-evidence-gap-map. |
| stale-artifact-beta-evidence-lane-prep-generated-json | P1 | freshness | 2.7083333333333335 | stale_refreshable | Refresh with npm run check:beta-evidence-lane-prep. |
| stale-artifact-current-beta-exit-status-generated-json | P1 | freshness | 2.7083333333333335 | stale_refreshable | Refresh with npm run check:current-beta-exit-status. |
| stale-artifact-evidence-capture-status-generated-json | P1 | freshness | 2.7083333333333335 | stale_refreshable | Refresh with npm run check:evidence-capture-status. |
| stale-artifact-mobile-ui-final-lock-generated-json | P1 | freshness | 2.7083333333333335 | stale_refreshable | Refresh with npm run check:mobile-ui-final-lock. |
| stale-artifact-overnight-final-integration-lock-generated-json | P1 | freshness | 2.7083333333333335 | stale_refreshable | Refresh with npm run check:overnight-final-integration-lock. |
| debug-runtime-evidence-unknown-empty | P2 | runtimeHealth | 0.01 | partial_debug_runtime_evidence | Debug/runtime evidence has partial source-backed status; deployed route evidence remains separate. |
| telemetry-lane-admin-snapshots | P2 | runtimeHealth | 2 | unavailable | Run the admin analytics refresh lane before treating this as current. |
| telemetry-lane-bigquery-export | P2 | runtimeHealth | 2 | config_missing | Configure export only in an owner-approved cloud pipeline pass. |
| telemetry-lane-ingest | P2 | runtimeHealth | 2 | runtime_unproven | Open the route runtime drilldown or wait for runtime samples before treating ingest as proven. |
| telemetry-lane-materializers | P2 | runtimeHealth | 2 | runtime_unproven | Use snapshot metadata before raw collections. |
| telemetry-lane-user-events | P2 | runtimeHealth | 2 | runtime_unproven | Refresh admin analytics snapshots before reading user-event health. |
| telemetry-lane-watch-time | P2 | runtimeHealth | 2 | runtime_unproven | Attach or verify deployed runtime watch-session evidence before treating watch time as proven. |
| debug-panel-analytics-rewire | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-creator-connection-audit | P2 | freshness | 1 | stale | Run npm run check:user-facing-feature-connection-audit when this stale warning must be refreshed. |
| debug-panel-final-launch-readiness | P2 | freshness | 1 | archive | Keep this stale launch artifact as archive evidence; use the current beta score and formal proof gates for live launch clearance. |
| debug-panel-launch-pr-triage | P2 | freshness | 1 | archive | Keep this stale launch artifact as archive evidence; use the current beta score and formal proof gates for live launch clearance. |
| debug-panel-public-beta-score | P2 | freshness | 1 | stale | Use the canonical beta score and cap reasons as the primary Phase 1 queue. |
| debug-panel-recovery-evidence | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-repo-spring-cleaning | P2 | freshness | 1 | archive | Run npm run check:repo-spring-cleaning-rewire when this stale warning must be refreshed. |
| debug-panel-report-cloud-cost | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-codebase-hardening | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-content-protection | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-report-creator-lane | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-creator-lane-legacy | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-debug-evidence | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-report-device-layout | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-device-ui | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-event-catalog | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-report-gumdrop-economy | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-report-hydration | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-orphaned-logic | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-public-beta-score | P2 | freshness | 1 | stale | Run npm run score:beta when this stale warning must be refreshed. |
| debug-panel-report-sitewide-image | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-speed-security | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-sql-mirror | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-support-recovery | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-report-telemetry-parity | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-watch-time-truth | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-score-cap-reasons | P2 | freshness | 1 | stale | Work the visible cap reasons in order instead of hiding them in Debug. |
| debug-panel-system-health | P2 | evidenceCompleteness | 1 | missing | Run npm run check:admin-truth if that command owns the missing artifact; otherwise keep the Debug state missing. |

## Deferred

- runtime-provider-smoke-source-confidence-gap: Provider-backed site activity + deployed route evidence requires first-party/deployed evidence. Next: Keep provider-backed site activity + deployed route evidence gates blocked; only source-backed confidence can be refreshed without claiming provider or deployed-route truth.

## Next Exact Steps

- Run npm run check:debug-runtime-evidence.
- Attach deployed route evidence before clearing runtime evidence gates.
- Attach provider-backed site activity evidence before clearing provider evidence gates.
- Attach a redacted admin source activity sample before clearing the admin source sample gate.
