# Beta Evidence Gap Map

Generated: 2026-05-20T21:20:57.197Z
Latest code version: 2e202554ff3cfd0821fc9d120b689dac3f41e29b

## Summary

- Beta score/status: 41.92/Stale evidence
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

- agent/state/source-truth-authority-map.generated.json: Report was generated before the latest code changes.
- agent/state/final-cost-audit-lock.generated.json: Report was generated before the latest code changes.
- agent/state/beta-health-algorithm-v2.generated.json: Report was generated before the latest code changes.
- agent/state/analytics-semantics-final-lock.generated.json: Report was generated before the latest code changes.
- agent/state/runtime-watch-time-v2.generated.json: Report was generated before the latest code changes.
- agent/state/provider-smoke-evidence.generated.json: Report was generated before the latest code changes.
- agent/state/runtime-smoke-evidence.generated.json: Report was generated before the latest code changes.
- agent/state/admin-truth-sample-evidence.generated.json: Report was generated before the latest code changes.
- agent/state/targeted-behavior-evidence.generated.json: Report was generated before the latest code changes.

## Next Exact Steps

- 1. A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.
- 2. Optional formal provider/app artifact for the $50 GumDrop payment can be stored under agent/evidence/provider-smoke/; it is not required for acknowledging the sale.
- 3. Attach manual screenshot QA evidence for the already-tested user and creator surfaces under agent/evidence/manual-screenshot-qa/.
- 4. Attach deployed runtime smoke evidence for route loading and critical flows under agent/evidence/runtime-smoke/.
- 5. Attach a fresh redacted admin truth sample under agent/evidence/admin-truth-sample/.
- 6. Attach deployed runtime watch-time v2 playback proof under runtime smoke evidence.
- 7. Attach owner-reviewed Cloud SQL/Gemini/cost console evidence without treating source-only inventory as pass.
- 8. Keep speed/security P2 backlog visible for owner review.

