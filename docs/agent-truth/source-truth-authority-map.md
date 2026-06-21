# Source Truth Authority Map

Artifact: `agent/state/source-truth-authority-map.generated.json`
Validator: `npm run check:source-truth-authority-map`

Generated: 2026-06-21T14:02:46.213Z
Current source head: `509cd079fa3645d45dd57bddfbdb7cd7b9a4ae43`

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
- agent/state/debug-cockpit-batch1-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch3-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch4-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch5-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch6-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch7-control-tower-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch8-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch9-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch10-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch11-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch12-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch13-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch15-false-positive-cleanup.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch16-ai-debug-orchestration.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch17-route-runtime.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch18-route-hotspots.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch19-product-routes.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch20-stale-route-sweep.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch22-commerce-truth.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch24-drop-metadata.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch26-dependency-inventory.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch27-ai-repair-workbench.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch28-bug-validation.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch29-analytics-source-hierarchy.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch30-telemetry-parity.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch31-task-guidance-parity.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch32-commerce-parity.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch33-unlock-watch-parity.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch34-module-coverage.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.
- agent/state/debug-cockpit-batch35-behavior-stack.generated.json: `archive_only` - Debug Cockpit batch reports are historical cleanup snapshots; current Admin Debug and beta readiness use Control Tower/source evidence reports. Superseded by agent/state/current-beta-exit-status.generated.json.

The legacy launch readiness reports are retired from current beta score freshness gates. They remain historical evidence and must not be deleted unless a future validator proves archive-safe deletion.

## Cost Readiness Source Truth

- Cloud Run cost readiness: `cost_review_required`. Repo config/source inventory is distinct from provider evidence.
- Cloud SQL cost readiness: `owner_review_external_billing_required`. Source-only not-detected status is not a provider pass.
- Gemini / Cloud Assist cost readiness: `cost_review_required`. AI cost lanes remain owner-review unless source proves active usage and risk level.
- Route 4xx readiness: `cost_review_required`. Expected product 4xx states are separate from unexpected route errors.

None of these cost lanes should be marked pass without evidence. P0/P1 cost or 4xx findings can block beta exit; P2 inventory remains owner review.

## Memory Rules Checked

- Paid bundle bonus GumDrops are paid/purchased bonus credits, not reward/free GumDrops.
- Creator booking UX should use generated available slots, not arbitrary fan-selected date/time.
- Beta badge / patch notes should ship in the same commit as the accepted release bundle or accepted patch slice. Release-note automation validates only and must not create separate follow-up loop commits.
- Cloud Run, Cloud SQL, Gemini/Cloud Assist, and 4xx cost checks are evidence/inventory lanes unless source code proves active usage or P0/P1 risk.
- Creator booking UX uses generated availability slots, not arbitrary fan date/time.

## Current Head Inventory

- agent/state/source-truth-authority-map.generated.json: `current` (509cd079fa3645d45dd57bddfbdb7cd7b9a4ae43) - Artifact currentHead matches git HEAD.
- agent/state/public-beta-score.generated.json: `stale` (fdd95181543a028b61f1ced9d9f8b81282d3516c) - Refresh through the lane validator before treating as current evidence.
- agent/state/current-beta-exit-status.generated.json: `stale` (0d37de032350c8cf27a328de002c5e96f9c06f82) - Refresh through the lane validator before treating as current evidence.
- agent/state/final-phase-cleanup-lock.generated.json: `stale` (2b747fc36bb2c0d8e1e2fa4b3fd517b56d457aa0) - Refresh through the lane validator before treating as current evidence.
- agent/state/evidence-capture-status.generated.json: `stale` (0d37de032350c8cf27a328de002c5e96f9c06f82) - Refresh through the lane validator before treating as current evidence.
- agent/state/user-creator-ui-parity.generated.json: `stale` (6e903936b9ba164bd883dff1e698504e51a4aed0) - Refresh through the lane validator before treating as current evidence.
- agent/state/gumdrop-economy-accuracy.generated.json: `stale` (9b25961f85707ab4e0f5d8346b10b667ae0b75a4) - Refresh through the lane validator before treating as current evidence.
- agent/state/creator-experience-simplification.generated.json: `stale` (6e903936b9ba164bd883dff1e698504e51a4aed0) - Refresh through the lane validator before treating as current evidence.
- agent/state/post-economy-creator-flow-qa.generated.json: `stale` (225f9e53f18b60edc7399c1ea258c0b9bacfae84) - Refresh through the lane validator before treating as current evidence.
- agent/state/creator-dashboard-error-cost-inventory.generated.json: `stale` (225f9e53f18b60edc7399c1ea258c0b9bacfae84) - Refresh through the lane validator before treating as current evidence.
- agent/state/speed-security-hardening.generated.json: `missing_head`  - Active artifact must record currentHead.
- agent/state/product-surface-integrity.generated.json: `stale` (09bb153c99aeec141c2a4f2d2c8867e0fdf7e801) - Refresh through the lane validator before treating as current evidence.
- public/kandydrops-release-notes.json: `missing_head`  - Active artifact must record currentHead.
- agent/state/beta-score-cleanup.generated.json: `stale` (e947d82891dfc7957cb4b9b9972d6378605a927d) - Refresh through the lane validator before treating as current evidence.
- agent/state/final-launch-readiness-report.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/launch-readiness-report.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/launch-pr-triage.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/repo-spring-cleaning-rewire.generated.json: `not_required` (8aa6201b66ffda8c5ad9e9150e56615990547f6d) - Retired/archive artifact does not block beta score.
- agent/state/debug-panel-output-triage.generated.json: `not_required` (26a73ad4b9b1ed2d2aed8d0b9f4f1d3f28ce05a9) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch1-cleanup.generated.json: `not_required` (48d8c64ecce16f4ae346e49f5607099e0d686d26) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch3-cleanup.generated.json: `not_required` (883bdc0e91e5494f3b6b3e6449d5ea722b898077) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch4-cleanup.generated.json: `not_required` (3198b27d8499d675aa8e3ee98fe4e3368f2c77e0) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch5-cleanup.generated.json: `not_required` (d02b8b2da859d47d880182fe2169db1ad6a40ad6) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch6-cleanup.generated.json: `not_required` (a62f0177ba3e5bc7e86d8b5ec2c643258797c09a) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch7-control-tower-cleanup.generated.json: `not_required` (5c126a7df36e39be20ab55b40ce5d14c04779fb5) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch8-cleanup.generated.json: `not_required` (6d038e7f7d9b7cef83d276f39bd968df83bb988d) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch9-cleanup.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch10-cleanup.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch11-cleanup.generated.json: `not_required` (3dc628da2d495b5bcec621a5ac52726e76dd05aa) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch12-cleanup.generated.json: `not_required` (145ff4fcf1feb61d371938dde42927b29268850a) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch13-cleanup.generated.json: `not_required` (afdc394d07b0dd0ea93aae14ae32bc47886165d9) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch15-false-positive-cleanup.generated.json: `not_required` (6959286c146525ea4679f724865f865dccb0b627) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch16-ai-debug-orchestration.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch17-route-runtime.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch18-route-hotspots.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch19-product-routes.generated.json: `not_required` (bcd7aad7d363fc377e5b123eb4c06f78678f42f5) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch20-stale-route-sweep.generated.json: `not_required` (bcd7aad7d363fc377e5b123eb4c06f78678f42f5) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch22-commerce-truth.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch24-drop-metadata.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch26-dependency-inventory.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch27-ai-repair-workbench.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch28-bug-validation.generated.json: `not_required` (343fe21c2f5c75dd383d43532c80f64322c9b58f) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch29-analytics-source-hierarchy.generated.json: `not_required` (12db31fcfac9c3aaa78c38cdce0635fc66abfa38) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch30-telemetry-parity.generated.json: `not_required` (9dc79a00f40df751841c8d8f10d98de636336397) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch31-task-guidance-parity.generated.json: `not_required` (ccf36528805f2d72bc84b1b1aeb1e9b6358a6970) - Retired/archive artifact does not block beta score.
- agent/state/debug-cockpit-batch32-commerce-parity.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch33-unlock-watch-parity.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch34-module-coverage.generated.json: `not_required`  - Retired artifact has no required currentHead.
- agent/state/debug-cockpit-batch35-behavior-stack.generated.json: `not_required`  - Retired artifact has no required currentHead.

## Next Exact Steps

1. Use npm run check:source-truth-authority-map before treating source-truth lane changes as accepted.
2. Refresh beta score and current beta exit status only through their active validators.
3. Attach deterministic UI source coverage, provider-backed site activity, deployed route, and admin source sample evidence before clearing beta-exit evidence gates.
