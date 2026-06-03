# Beta Evidence Lane Prep

Generated: 2026-06-03T02:58:51.998Z

## Summary

- Lane count: 8
- Formal-missing lanes: 4
- Source-ready lanes: operator_confirmed_revenue_smoke, runtime_watch_time_proof
- Operator-confirmed lanes: operator_confirmed_revenue_smoke
- Beta exit ready: false

A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.

## Lanes

- manual_screenshot_qa: formal_missing; folder: `agent/evidence/manual-screenshot-qa`; template: `agent/evidence/manual-screenshot-qa/evidence.template.json`; checklist: `docs/agent-truth/manual-screenshot-qa-checklist.md`; validator: `EVIDENCE_STRICT=1 npm run check:manual-screenshot-evidence`; next: Attach dated screenshot evidence using the manual screenshot QA template.
- provider_smoke: formal_missing; folder: `agent/evidence/provider-smoke`; template: `agent/evidence/provider-smoke/evidence.template.json`; checklist: `docs/agent-truth/provider-smoke-evidence-checklist.md`; validator: `EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence`; next: Attach redacted formal provider/app proof only if the operator chooses to clear provider smoke.
- operator_confirmed_revenue_smoke: operator_confirmed; folder: `agent/state`; template: `agent/state/operator-revenue-smoke.generated.json`; checklist: `docs/agent-truth/operator-revenue-smoke.md`; validator: `npm run check:operator-revenue-smoke`; next: Keep this acknowledged as real product signal; formal provider/app proof is optional for acknowledging the sale.
- runtime_smoke: formal_missing; folder: `agent/evidence/runtime-smoke`; template: `agent/evidence/runtime-smoke/evidence.template.json`; checklist: `docs/agent-truth/runtime-smoke-evidence-checklist.md`; validator: `EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence`; next: Attach deployed runtime smoke proof using the runtime smoke template.
- admin_truth_sample: formal_missing; folder: `agent/evidence/admin-truth-sample`; template: `agent/evidence/admin-truth-sample/evidence.template.json`; checklist: `docs/agent-truth/admin-truth-sample-evidence-checklist.md`; validator: `EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence`; next: Attach a redacted admin truth sample with source freshness and sample count.
- runtime_watch_time_proof: source_ready_runtime_proof_required; folder: `agent/evidence/runtime-smoke`; template: `agent/evidence/runtime-smoke/evidence.template.json`; checklist: `docs/agent-truth/runtime-smoke-evidence-checklist.md`; validator: `npm run check:runtime-watch-time-v2 && EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence`; next: Attach deployed playback evidence showing runtime watch-time v2 on real media routes.
- cost_owner_review: owner_review_required; folder: `agent/state`; template: `docs/agent-truth/final-cost-audit-lock.md`; checklist: `docs/agent-truth/final-cost-audit-lock.md`; validator: `npm run check:final-cost-audit-lock`; next: Attach owner-reviewed cost evidence when the operator chooses to formalize the lane.
- speed_security_owner_review: owner_review_required; folder: `agent/state`; template: `docs/agent-truth/speed-security-hardening.md`; checklist: `docs/agent-truth/speed-security-hardening.md`; validator: `npm run check:speed-security`; next: Keep owner-review backlog visible and refresh the speed/security report when needed.

## Stale Supporting Reports

- agent/state/current-beta-exit-status.generated.json: Current beta exit status was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:current-beta-exit-status
- agent/state/beta-evidence-lane-prep.generated.json: Beta evidence lane prep was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:beta-evidence-lane-prep
- agent/state/final-pr-stale-cleanup.generated.json: Final PR stale cleanup was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:final-pr-stale-cleanup

## Next Exact Steps

1. Use this lane map before attaching evidence so source-ready, operator-confirmed, formal-missing, and owner-review states stay separate.
2. Keep operator-confirmed revenue smoke acknowledged without requiring provider screenshots for that acknowledgement.
3. Attach formal provider/app proof only when the operator chooses to clear the provider smoke gate.
4. Refresh supporting report with npm run score:beta && npm run check:beta-score.
5. Refresh supporting report with npm run check:current-beta-exit-status.
6. Refresh supporting report with npm run check:evidence-capture-status.
7. Refresh supporting report with npm run check:source-truth-authority-map.
8. Refresh supporting report with npm run check:final-telemetry-closure-lock.
9. Refresh supporting report with npm run check:mobile-ui-final-lock.
10. Refresh supporting report with npm run check:overnight-final-integration-lock.
11. Refresh supporting report with npm run check:creator-settings-control-plane.
12. Refresh supporting report with npm run check:creator-drop-status-metrics.
13. Refresh supporting report with npm run check:operator-revenue-smoke.
14. Refresh supporting report with npm run check:beta-evidence-gap-map.
15. Refresh supporting report with npm run check:beta-evidence-lane-prep.
16. Refresh supporting report with npm run check:beta-freshness-language.
17. Refresh supporting report with npm run check:final-pr-stale-cleanup.
18. Refresh supporting report with npm run check:overnight-wiring-integrity.
19. Refresh supporting report with npm run check:existing-algorithm-refinement.
20. Refresh supporting report with npm run check:user-loading-wallet-mobile-refinement.
21. Refresh supporting report with npm run check:global-marquee-truncated-titles.
