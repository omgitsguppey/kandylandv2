# Debug Score Impact Triage

Generated: 2026-06-03T22:38:02.518Z

Latest code version: 815177718fc1610590762fdae5d76b3ae390a2ae

## Summary

- Issues classified: 55
- Source-fixable: 5
- Evidence-fixable: 38
- Stale artifact-fixable: 40
- P0/P1/P2: 0/20/35

## Score-Impact Queue

| Issue | Severity | Dimension | Est. point impact | Current status | Fix plan |
| --- | --- | --- | ---: | --- | --- |
| runtime-provider-smoke-source-confidence-gap | P1 | runtimeHealth | 5.6 | runtime_unverified | Keep formal runtime/provider gates blocked; only source-backed confidence can be refreshed without deployed/runtime proof. |
| debug-panel-admin-truth-samples | P1 | freshness | 4 | formal_proof_required | Attach a fresh first-party admin truth sample before upgrading this gate. |
| debug-panel-report-precatch-runtime | P1 | freshness | 4 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-targeted-behavior-evidence | P1 | freshness | 4 | stale | Use targeted behavior as one gate only; keep visual, provider, runtime, and admin sample caps separate. |
| stale-artifact-beta-evidence-gap-map-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:beta-evidence-gap-map. |
| stale-artifact-beta-evidence-lane-prep-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:beta-evidence-lane-prep. |
| stale-artifact-beta-freshness-language-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:beta-freshness-language. |
| stale-artifact-creator-drop-status-metrics-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:creator-drop-status-metrics. |
| stale-artifact-creator-settings-control-plane-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:creator-settings-control-plane. |
| stale-artifact-evidence-capture-status-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:evidence-capture-status. |
| stale-artifact-existing-algorithm-refinement-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:existing-algorithm-refinement. |
| stale-artifact-final-pr-stale-cleanup-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:final-pr-stale-cleanup. |
| stale-artifact-final-telemetry-closure-lock-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:final-telemetry-closure-lock. |
| stale-artifact-global-marquee-truncated-titles-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:global-marquee-truncated-titles. |
| stale-artifact-mobile-ui-final-lock-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:mobile-ui-final-lock. |
| stale-artifact-operator-revenue-smoke-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:operator-revenue-smoke. |
| stale-artifact-overnight-final-integration-lock-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:overnight-final-integration-lock. |
| stale-artifact-overnight-wiring-integrity-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:overnight-wiring-integrity. |
| stale-artifact-source-truth-authority-map-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:source-truth-authority-map. |
| stale-artifact-user-loading-wallet-mobile-refinement-generated-json | P1 | freshness | 1 | stale_refreshable | Refresh with npm run check:user-loading-wallet-mobile-refinement. |
| debug-runtime-evidence-unknown-empty | P2 | runtimeHealth | 0.01 | source_ready_debug_runtime_evidence | Debug/runtime evidence has source-backed checked-clean status; deployed runtime smoke remains separate. |
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

- runtime-provider-smoke-source-confidence-gap: Formal deployed runtime/provider smoke requires external proof. Next: Keep formal runtime/provider gates blocked; only source-backed confidence can be refreshed without deployed/runtime proof.

## Next Exact Steps

- Run npm run check:debug-runtime-evidence.
- Attach deployed runtime smoke before clearing runtime evidence gates.
- Attach formal provider proof before clearing provider smoke.
- Attach a redacted production admin truth sample before clearing the admin truth sample gate.
