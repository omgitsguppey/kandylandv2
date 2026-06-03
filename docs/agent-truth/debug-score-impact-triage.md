# Debug Score Impact Triage

Generated: 2026-06-03T04:59:07.231Z

Latest code version: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

## Summary

- Issues classified: 38
- Source-fixable: 7
- Evidence-fixable: 38
- Stale artifact-fixable: 22
- P0/P1/P2: 0/6/32

## Score-Impact Queue

| Issue | Severity | Dimension | Est. point impact | Current status | Fix plan |
| --- | --- | --- | ---: | --- | --- |
| debug-runtime-evidence-unknown-empty | P1 | runtimeHealth | 8.6 | unknown_empty | Generate source-backed debug runtime evidence from checked debug sources; do not clear deployed runtime smoke. |
| admin-truth-sample-missing | P1 | evidenceCompleteness | 8.6 | missing_or_unknown | Create a source-only admin truth sample showing admin models are wired while keeping formal production admin truth sample missing. |
| runtime-provider-smoke-source-confidence-gap | P1 | runtimeHealth | 8.6 | runtime_unverified | Keep formal runtime/provider gates blocked; only source-backed confidence can be refreshed without deployed/runtime proof. |
| debug-panel-admin-truth-samples | P1 | freshness | 4 | stale | Attach a fresh first-party admin truth sample before upgrading this gate. |
| debug-panel-report-precatch-runtime | P1 | freshness | 4 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-targeted-behavior-evidence | P1 | freshness | 4 | stale | Use targeted behavior as one gate only; keep visual, provider, runtime, and admin sample caps separate. |
| telemetry-lane-admin-snapshots | P2 | runtimeHealth | 2 | unavailable | Run the admin analytics refresh lane before treating this as current. |
| telemetry-lane-bigquery-export | P2 | runtimeHealth | 2 | config_missing | Configure export only in an owner-approved cloud pipeline pass. |
| telemetry-lane-ingest | P2 | runtimeHealth | 2 | runtime_unproven | Open the route runtime drilldown or wait for runtime samples before treating ingest as proven. |
| telemetry-lane-materializers | P2 | runtimeHealth | 2 | runtime_unproven | Use snapshot metadata before raw collections. |
| telemetry-lane-user-events | P2 | runtimeHealth | 2 | runtime_unproven | Refresh admin analytics snapshots before reading user-event health. |
| telemetry-lane-watch-time | P2 | runtimeHealth | 2 | runtime_unproven | Attach or verify deployed runtime watch-session evidence before treating watch time as proven. |
| debug-panel-analytics-rewire | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-creator-connection-audit | P2 | freshness | 1 | stale | Run npm run check:user-facing-feature-connection-audit when this stale warning must be refreshed. |
| debug-panel-final-launch-readiness | P2 | freshness | 1 | stale | Run npm run check:final-launch-readiness-report when this stale warning must be refreshed. |
| debug-panel-launch-pr-triage | P2 | freshness | 1 | stale | Run npm run check:launch-pr-triage when this stale warning must be refreshed. |
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
| debug-panel-report-google-cost | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-gumdrop-economy | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-report-hydration | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-orphaned-logic | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-sitewide-image | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-speed-security | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-sql-mirror | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-support-recovery | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-report-telemetry-parity | P2 | freshness | 1 | stale | Leave the item labeled as evidence or archive until a focused refresh command exists. |
| debug-panel-report-watch-time-truth | P2 | evidenceCompleteness | 1 | missing | Keep missing state visible until an owning generator is identified. |
| debug-panel-system-health | P2 | evidenceCompleteness | 1 | missing | Run npm run check:admin-truth if that command owns the missing artifact; otherwise keep the Debug state missing. |

## Deferred

- runtime-provider-smoke-source-confidence-gap: Formal deployed runtime/provider smoke requires external proof. Next: Keep formal runtime/provider gates blocked; only source-backed confidence can be refreshed without deployed/runtime proof.

## Next Exact Steps

- Run npm run check:debug-runtime-evidence.
- Attach deployed runtime smoke before clearing runtime evidence gates.
- Attach formal provider proof before clearing provider smoke.
- Attach a redacted production admin truth sample before clearing the admin truth sample gate.
