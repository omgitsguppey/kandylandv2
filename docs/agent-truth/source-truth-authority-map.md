# Source Truth Authority Map

Artifact: `agent/state/source-truth-authority-map.generated.json`
Validator: `npm run check:source-truth-authority-map`

Generated: 2026-05-21T00:17:56.845Z
Current source head: `080ebb115fc9d917f52b2e38108634821a2712ce`

## Summary

- Active lanes: 12.
- Supporting lanes: 6.
- Retired launch artifacts: 3.
- Beta-blocking lanes: 8.
- Cost-readiness lanes: 4.
- Same-commit release notes required: yes.
- P0/P1/P2: 0/0/4.

Generated reports remain evidence snapshots. Active source truth must come from the authority document, generated artifact, and validator listed for each lane.

## Authority Lanes

| Lane | Status | Authority doc | Generated artifact | Validator | Beta blocking |
| --- | --- | --- | --- | --- | --- |
| current-operator-doctrine | active | docs/agent-truth/current-operator-doctrine.md | agent/state/source-truth-authority-map.generated.json | npm run check:source-truth-authority-map | no |
| memory-durable-rules | active | memory.md | agent/state/source-truth-authority-map.generated.json | npm run check:source-truth-authority-map | no |
| beta-score | active | docs/agent-truth/public-beta-score.md | agent/state/public-beta-score.generated.json | npm run check:beta-score | yes |
| current-beta-exit-status | active | docs/agent-truth/current-beta-exit-status.md | agent/state/current-beta-exit-status.generated.json | npm run check:current-beta-exit-status | yes |
| final-phase-cleanup-lock | supporting | docs/agent-truth/final-phase-cleanup-lock.md | agent/state/final-phase-cleanup-lock.generated.json | npm run check:final-phase-cleanup-lock | no |
| evidence-capture-status | active | docs/agent-truth/evidence-capture-status.md | agent/state/evidence-capture-status.generated.json | npm run check:evidence-capture-status | yes |
| user-creator-parity | active | docs/agent-truth/user-creator-ui-parity.md | agent/state/user-creator-ui-parity.generated.json | npm run check:user-creator-ui-parity | yes |
| gumdrop-economy | active | docs/agent-truth/gumdrop-economy-accuracy.md | agent/state/gumdrop-economy-accuracy.generated.json | npm run check:gumdrop-economy-accuracy | yes |
| creator-experience-simplification | active | docs/agent-truth/creator-experience-simplification.md | agent/state/creator-experience-simplification.generated.json | npm run check:creator-experience-simplification | yes |
| post-economy-flow-qa | active | docs/agent-truth/post-economy-creator-flow-qa.md | agent/state/post-economy-creator-flow-qa.generated.json | npm run check:post-economy-creator-flow-qa | yes |
| creator-dashboard-error-cost-inventory | active | docs/agent-truth/creator-dashboard-error-cost-inventory.md | agent/state/creator-dashboard-error-cost-inventory.generated.json | npm run check:creator-dashboard-error-cost-inventory | no |
| speed-security | active | docs/agent-truth/speed-security-hardening.md | agent/state/speed-security-hardening.generated.json | npm run check:speed-security | no |
| product-surface-integrity | supporting | docs/agent-truth/product-surface-integrity.md | agent/state/product-surface-integrity.generated.json | npm run check:product-surface-integrity | no |
| release-notes-same-commit | active | docs/agent-truth/public-beta-release-notes.md | public/kandydrops-release-notes.json | npm run check:release-notes | yes |
| cloud-run-cost-readiness | supporting | docs/agent-truth/beta-score-cleanup.md | agent/state/beta-score-cleanup.generated.json | npm run check:beta-score-cleanup | no |
| cloud-sql-cost-readiness | supporting | docs/agent-truth/beta-score-cleanup.md | agent/state/beta-score-cleanup.generated.json | npm run check:beta-score-cleanup | no |
| gemini-cloud-assist-cost-readiness | supporting | docs/agent-truth/beta-score-cleanup.md | agent/state/beta-score-cleanup.generated.json | npm run check:beta-score-cleanup | no |
| route-4xx-readiness | supporting | docs/agent-truth/beta-score-cleanup.md | agent/state/beta-score-cleanup.generated.json | npm run check:beta-score-cleanup | no |

## Retired And Archive-Only Artifacts

- agent/state/final-launch-readiness-report.generated.json: `retired` - Legacy launch report is superseded by evidence capture status and current beta exit status. Superseded by agent/state/evidence-capture-status.generated.json.
- agent/state/launch-readiness-report.generated.json: `retired` - Legacy launch readiness is no longer the active beta score freshness source. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/launch-pr-triage.generated.json: `retired` - Legacy PR triage is historical evidence and must not cap current readiness. Superseded by docs/agent-truth/source-truth-authority-map.md.
- agent/state/repo-spring-cleaning-rewire.generated.json: `archive_only` - Repo spring-cleaning rewire remains governance backlog evidence, not beta-exit truth. Superseded by docs/agent-truth/source-truth-authority-map.md.
- agent/state/debug-panel-output-triage.generated.json: `archive_only` - Debug panel output triage is historical source evidence until refreshed by its owner lane. Superseded by agent/state/current-beta-exit-status.generated.json.

The legacy launch readiness reports are retired from current beta score freshness gates. They remain historical evidence and must not be deleted unless a future validator proves archive-safe deletion.

## Cost Readiness Source Truth

- Cloud Run cost readiness: `cost_review_required`. Repo config/source inventory is distinct from provider evidence.
- Cloud SQL cost readiness: `not_detected_in_repo`. Source-only not-detected status is not a provider pass.
- Gemini / Cloud Assist cost readiness: `cost_review_required`. AI cost lanes remain owner-review unless source proves active usage and risk level.
- Route 4xx readiness: `source_inventory_complete`. Expected product 4xx states are separate from unexpected route errors.

None of these cost lanes should be marked pass without evidence. P0/P1 cost or 4xx findings can block beta exit; P2 inventory remains owner review.

## Memory Rules Checked

- Paid bundle bonus GumDrops are paid/purchased bonus credits, not reward/free GumDrops.
- Creator booking UX should use generated available slots, not arbitrary fan-selected date/time.
- Beta badge / patch notes must be included in the same commit as the real patch. Release-note automation validates only and must not create separate follow-up commits.
- Cloud Run, Cloud SQL, Gemini/Cloud Assist, and 4xx cost checks are evidence/inventory lanes unless source code proves active usage or P0/P1 risk.
- Creator booking UX uses generated availability slots, not arbitrary fan date/time.

## Current Head Inventory

- agent/state/source-truth-authority-map.generated.json: `stale` (2774c5f6508dc005acde87cf4a3a0ce37f61bd51) - Refresh through the lane validator before treating as current evidence.
- agent/state/public-beta-score.generated.json: `current` (080ebb115fc9d917f52b2e38108634821a2712ce) - Artifact currentHead matches git HEAD.
- agent/state/current-beta-exit-status.generated.json: `stale` (d418e158af1454abfadc9433008439bee888c796) - Refresh through the lane validator before treating as current evidence.
- agent/state/final-phase-cleanup-lock.generated.json: `stale` (d0994c9ace05575a22d679cdfc37f8a5877f66d8) - Refresh through the lane validator before treating as current evidence.
- agent/state/evidence-capture-status.generated.json: `current` (080ebb115fc9d917f52b2e38108634821a2712ce) - Artifact currentHead matches git HEAD.
- agent/state/user-creator-ui-parity.generated.json: `current` (080ebb115fc9d917f52b2e38108634821a2712ce) - Artifact currentHead matches git HEAD.
- agent/state/gumdrop-economy-accuracy.generated.json: `stale` (2774c5f6508dc005acde87cf4a3a0ce37f61bd51) - Refresh through the lane validator before treating as current evidence.
- agent/state/creator-experience-simplification.generated.json: `stale` (d8cde44345b6f0a6f0dd8710ff063356d74a5791) - Refresh through the lane validator before treating as current evidence.
- agent/state/post-economy-creator-flow-qa.generated.json: `stale` (d8cde44345b6f0a6f0dd8710ff063356d74a5791) - Refresh through the lane validator before treating as current evidence.
- agent/state/creator-dashboard-error-cost-inventory.generated.json: `stale` (d8cde44345b6f0a6f0dd8710ff063356d74a5791) - Refresh through the lane validator before treating as current evidence.
- agent/state/speed-security-hardening.generated.json: `missing_head`  - Active artifact must record currentHead.
- agent/state/product-surface-integrity.generated.json: `stale` (09bb153c99aeec141c2a4f2d2c8867e0fdf7e801) - Refresh through the lane validator before treating as current evidence.
- public/kandydrops-release-notes.json: `missing_head`  - Active artifact must record currentHead.
- agent/state/beta-score-cleanup.generated.json: `stale` (70919f6be9129ce71ecc8b8f88eeafec9f866b5f) - Refresh through the lane validator before treating as current evidence.
- agent/state/final-launch-readiness-report.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/launch-readiness-report.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/launch-pr-triage.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/repo-spring-cleaning-rewire.generated.json: `not_required` (09bb153c99aeec141c2a4f2d2c8867e0fdf7e801) - Retired/archive artifact does not block beta score.
- agent/state/debug-panel-output-triage.generated.json: `not_required` (104e5c038d45fd2edc8f7925076e45e84f39e6d5) - Retired/archive artifact does not block beta score.

## Next Exact Steps

1. Use npm run check:source-truth-authority-map before treating source-truth lane changes as accepted.
2. Refresh beta score and current beta exit status only through their active validators.
3. Attach real visual/provider/runtime/admin evidence before clearing beta-exit evidence gates.
