# Beta Evidence Gap Map

Generated: 2026-06-03T02:39:37.034Z
Latest code version: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

## Summary

- Beta score/status: 77.25/Stale evidence
- Launch gate status: owner_review
- Beta exit review ready: false

## Evidence Lanes

- manual_screenshot_qa: missing; command: `EVIDENCE_STRICT=1 npm run check:manual-screenshot-evidence`; next: Attach dated manual screenshot QA evidence for user and creator surfaces.
- provider_smoke: missing; command: `EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence`; next: Attach redacted provider smoke proof with request/response or screenshot/log evidence.
- runtime_smoke: missing; command: `EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence`; next: Attach deployed runtime smoke proof for critical user and creator routes.
- admin_truth_sample: missing; command: `EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence`; next: Attach a fresh redacted admin truth sample artifact.
- runtime_watch_time_v2_deployed_proof: source_ready_runtime_proof_required; command: `EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence`; next: Attach deployed playback evidence showing runtime watch-time v2 on real media routes.
- revenue_provider_smoke: operator_confirmed_revenue_smoke; command: `EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence`; next: Optional: attach redacted formal proof for the $50 GumDrop payment under provider smoke evidence if the operator chooses.
- final_cost_owner_review: cloud_sql_runtime_not_detected; cloud_sql_external_billing_observed_owner_review_required; command: `npm run check:final-cost-audit-lock`; next: Attach owner-reviewed cost evidence for external Cloud SQL, Gemini/Cloud Assist, and hosted-runner lanes.
- speed_security_owner_review: owner_review_required; command: `npm run check:speed-security`; next: Keep speed/security P2 backlog visible and owner-review before beta exit.

## Source Ready Lanes

- runtime_watch_time_v2_deployed_proof

## Runtime Proof Missing

- manual_screenshot_qa
- provider_smoke
- runtime_smoke
- admin_truth_sample
- runtime_watch_time_v2_deployed_proof

## Owner Review Lanes

- final_cost_owner_review
- speed_security_owner_review

## Stale Artifacts

- agent/state/current-beta-exit-status.generated.json: Report was generated before the latest code changes.
- agent/state/overnight-final-integration-lock.generated.json: Report was generated before the latest code changes.
- agent/state/beta-evidence-gap-map.generated.json: Report was generated before the latest code changes.
- agent/state/beta-evidence-lane-prep.generated.json: Report was generated before the latest code changes.
- agent/state/beta-freshness-language.generated.json: Report was generated before the latest code changes.
- agent/state/final-pr-stale-cleanup.generated.json: Report was generated before the latest code changes.
- agent/state/overnight-wiring-integrity.generated.json: Report was generated before the latest code changes.
- agent/state/existing-algorithm-refinement.generated.json: Report was generated before the latest code changes.
- agent/state/global-marquee-truncated-titles.generated.json: Report was generated before the latest code changes.
- agent/state/current-beta-exit-status.generated.json: Current beta exit status was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:current-beta-exit-status
- agent/state/overnight-final-integration-lock.generated.json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock
- agent/state/beta-evidence-gap-map.generated.json: Beta evidence gap map was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:beta-evidence-gap-map
- agent/state/beta-evidence-lane-prep.generated.json: Beta evidence lane prep was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:beta-evidence-lane-prep
- agent/state/beta-freshness-language.generated.json: Beta freshness language was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:beta-freshness-language
- agent/state/final-pr-stale-cleanup.generated.json: Final PR stale cleanup was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:final-pr-stale-cleanup
- agent/state/overnight-wiring-integrity.generated.json: Overnight wiring integrity was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-wiring-integrity
- agent/state/existing-algorithm-refinement.generated.json: Existing algorithm refinement was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:existing-algorithm-refinement
- agent/state/global-marquee-truncated-titles.generated.json: Global marquee title rollout was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:global-marquee-truncated-titles

## Refresh Plan

- agent/state/public-beta-score.generated.json: Public beta score is current for the latest code version. Command: `npm run score:beta && npm run check:beta-score`.
- agent/state/current-beta-exit-status.generated.json: Current beta exit status was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:current-beta-exit-status`.
- agent/state/evidence-capture-status.generated.json: Evidence capture status is current for the latest code version. Command: `npm run check:evidence-capture-status`.
- agent/state/source-truth-authority-map.generated.json: Source truth authority map is current for the latest code version. Command: `npm run check:source-truth-authority-map`.
- agent/state/final-telemetry-closure-lock.generated.json: Telemetry closure lock is current for the latest code version. Command: `npm run check:final-telemetry-closure-lock`.
- agent/state/mobile-ui-final-lock.generated.json: Mobile UI final lock is current for the latest code version. Command: `npm run check:mobile-ui-final-lock`.
- agent/state/overnight-final-integration-lock.generated.json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:overnight-final-integration-lock`.
- agent/state/creator-settings-control-plane.generated.json: Creator settings control plane is current for the latest code version. Command: `npm run check:creator-settings-control-plane`.
- agent/state/creator-drop-status-metrics.generated.json: Creator drop status metrics is current for the latest code version. Command: `npm run check:creator-drop-status-metrics`.
- agent/state/operator-revenue-smoke.generated.json: Operator revenue smoke is current for the latest code version. Command: `npm run check:operator-revenue-smoke`.
- agent/state/beta-evidence-gap-map.generated.json: Beta evidence gap map was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:beta-evidence-gap-map`.
- agent/state/beta-evidence-lane-prep.generated.json: Beta evidence lane prep was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:beta-evidence-lane-prep`.
- agent/state/beta-freshness-language.generated.json: Beta freshness language was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:beta-freshness-language`.
- agent/state/final-pr-stale-cleanup.generated.json: Final PR stale cleanup was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:final-pr-stale-cleanup`.
- agent/state/overnight-wiring-integrity.generated.json: Overnight wiring integrity was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:overnight-wiring-integrity`.
- agent/state/existing-algorithm-refinement.generated.json: Existing algorithm refinement was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:existing-algorithm-refinement`.
- agent/state/user-loading-wallet-mobile-refinement.generated.json: User loading and wallet mobile refinement is current for the latest code version. Command: `npm run check:user-loading-wallet-mobile-refinement`.
- agent/state/global-marquee-truncated-titles.generated.json: Global marquee title rollout was generated from an older code version. Refresh this report from the latest code version. Command: `npm run check:global-marquee-truncated-titles`.

## Next Exact Steps

- 1. A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.
- 2. Optional formal provider/app artifact for the $50 GumDrop payment can be stored under agent/evidence/provider-smoke/; it is not required for acknowledging the sale.
- 3. Attach manual screenshot QA evidence for the already-tested user and creator surfaces under agent/evidence/manual-screenshot-qa/.
- 4. Attach deployed runtime smoke evidence for route loading and critical flows under agent/evidence/runtime-smoke/.
- 5. Attach a fresh redacted admin truth sample under agent/evidence/admin-truth-sample/.
- 6. Attach deployed runtime watch-time v2 playback proof under runtime smoke evidence.
- 7. Attach owner-reviewed Cloud SQL/Gemini/cost console evidence without treating source-only inventory as pass.
- 8. Keep speed/security P2 backlog visible for owner review.

