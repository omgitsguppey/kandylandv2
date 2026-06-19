# Debug Recovery Playbooks

Status: source-only executable recovery map for high-impact debug categories. These playbooks do not authorize production reads, deploys, payment/GumDrop math changes, chat/nav edits, or formal gate clearance without artifacts.

## Summary

- Playbooks: 12
- Formal gates: remain separate from source-only recovery.
- Default forbidden actions: no production reads, no deploy, no payment/GumDrop math changes, no chat/nav edits.

## Playbooks

### Stale Artifact Recovery

- ID: `stale_artifact_recovery`
- Trigger patterns: `debug backlog item contains stale artifact`, `refreshPlan.needsRefresh=true`, `AI critic no_patch_on_top_of_stale_logic finding`
- Source files: `src/lib/agent-score/refresh-safeguards.ts`, `src/lib/agent-score/refresh-registry.ts`, `agent/state/public-beta-score.generated.json`

Commands:
- `npm run score:beta`
- `npm run check:beta-score`
- `npm run check:debug-backlog-engine`

Validators:
- `npm run check:debug-backlog-engine`
- `npm run check:ai-debug-critic`
- `npm run check:beta-score`

Fixes:
- Read the stale artifact entry and run only its registered refresh command.
- If no refresh command exists, add the artifact to refresh-registry before relying on it.
- If the artifact is no longer consumed, mark it stale_retired in the debug backlog output with the retire reason.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact
- no_new_duplicate_system

Evidence outcome: Produces current generated evidence or stale_retired backlog state; does not clear formal provider/runtime/manual/admin gates.
Scoring impact: freshness, regressionRisk; estimated 2 point(s); formal gates clear=false

### Debug Runtime Unknown Recovery

- ID: `debug_runtime_unknown_recovery`
- Trigger patterns: `debug runtime evidence unknown`, `runtimeHealth low with runtime_unverified`, `source-ready runtime confidence but deployed runtime smoke missing`
- Source files: `src/lib/debug/debug-backlog-builder.ts`, `src/lib/debug/debug-backlog-contract.ts`, `agent/state/debug-runtime-evidence.generated.json`, `agent/state/source-backed-runtime-confidence.generated.json`

Commands:
- `npm run check:debug-runtime-evidence`
- `npm run check:source-backed-runtime-confidence`
- `npm run score:beta`

Validators:
- `npm run check:debug-runtime-evidence`
- `npm run check:beta-score`

Fixes:
- Classify unknown runtime evidence as source_ready, runtime_unverified, blocked_external, or formal_missing.
- Connect source-ready runtime confidence to the runtime/provider smoke evidence text only as partial confidence.
- Leave deployed runtime smoke blocked until a formal runtime-smoke artifact exists.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Runtime debug item becomes classified with exact next action; does not clear formal deployed runtime evidence.
Scoring impact: runtimeHealth, evidenceCompleteness; estimated 3 point(s); formal gates clear=false

### Admin Truth Unknown Recovery

- ID: `admin_truth_unknown_recovery`
- Trigger patterns: `admin truth/sample evidence unknown`, `Admin Debug shows missing or unavailable source truth`, `beta cap formal admin truth sample required`
- Source files: `src/lib/admin-debug-control-tower.ts`, `src/lib/admin-debug-summary-cards.ts`, `scripts/agent/validate-admin-truth-source-sample.ts`, `agent/state/admin-truth-source-sample.generated.json`

Commands:
- `npm run check:admin-truth-source-sample`
- `npm run check:admin-debug-control-tower`
- `npm run check:beta-score`

Validators:
- `npm run check:admin-truth-source-sample`
- `npm run check:admin-debug-control-tower`
- `npm run check:beta-score`

Fixes:
- Keep unavailable admin truth labeled unavailable, stale, or formal_missing.
- Wire source-truth sample evidence into Admin Debug summary only when the generated artifact is current.
- Do not mark admin truth/sample evidence Ready unless a formal sample artifact is attached.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Admin truth issue receives current source sample or formal_missing classification; does not clear formal admin truth gate.
Scoring impact: evidenceCompleteness, freshness; estimated 2 point(s); formal gates clear=false

### Route 500 Recovery

- ID: `route_500_recovery`
- Trigger patterns: `route diagnostic severity error`, `HTTP 500 in admin/debug route`, `human error key internal_server_error`
- Source files: `src/lib/server/route-diagnostics.ts`, `src/lib/errors/error-dictionary.ts`, `src/lib/errors/resolve-human-error.ts`, `agent/state/route-diagnostics-error-map.generated.json`

Commands:
- `npm run check:route-diagnostics-error-map`
- `npm run check:debug-panel-output-triage`
- `npm run check:beta-score`

Validators:
- `npm run check:route-diagnostics-error-map`
- `npm run check:debug-panel-output-triage`

Fixes:
- Resolve the diagnostic context to a specific human error key and source file.
- Add typed fallback copy only through the error dictionary and route diagnostics helpers.
- Keep route output degraded until the exact validator confirms the mapping.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Route issue maps to typed diagnostic and validator evidence; does not clear formal runtime smoke.
Scoring impact: runtimeHealth, regressionRisk; estimated 2 point(s); formal gates clear=false

### Telemetry Orphan Recovery

- ID: `telemetry_orphan_recovery`
- Trigger patterns: `metric exists without producer`, `producer exists without consumer`, `orphaned telemetry or source_ready_evidence_gap`
- Source files: `src/lib/analytics/telemetry-dependency-graph.ts`, `src/lib/analytics/materialization-contract.ts`, `src/lib/debug/orphan-metric-registry.ts`, `agent/state/monolith-orphan-metric-registry.generated.json`

Commands:
- `npm run check:telemetry-dependency-graph`
- `npm run check:event-facts-materializer-closure`
- `npm run check:monolith-orphan-metric-registry`

Validators:
- `npm run check:telemetry-dependency-graph`
- `npm run check:event-facts-materializer-closure`
- `npm run check:monolith-orphan-metric-registry`

Fixes:
- Map the metric to producer, persistence source, materializer, API route, UI consumer, and evidence consumer.
- If no consumer exists, archive the producer lane with archive_only classification.
- If the lane is source-ready but runtime-unverified, keep debug output degraded instead of healthy.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Telemetry lane becomes linked, archived, or source_ready_evidence_gap; does not clear formal runtime evidence.
Scoring impact: sourceHealth, evidenceCompleteness; estimated 3 point(s); formal gates clear=false

### Behavior Math Unknown Recovery

- ID: `behavior_math_unknown_recovery`
- Trigger patterns: `behavior math confidence unknown`, `disabled tracking counted`, `legacy unknown counted as current user behavior`
- Source files: `src/lib/behavioral/behavior-math-contract.ts`, `src/lib/behavioral/behavior-math-engine.ts`, `src/lib/behavioral/legacy-behavior-recovery.ts`, `agent/state/behavior-math-verification.generated.json`

Commands:
- `npm run check:behavior-math-verification`
- `npm run check:behavioral-tracking-semantics-closure`
- `npm run check:identity-transfer-telemetry-closure`

Validators:
- `npm run check:behavior-math-verification`
- `npx vitest run tests/unit/behavior-math-verification.spec.ts`

Fixes:
- Classify disabled tracking, duplicate, linked guest/user, and unknown legacy events before aggregation.
- Use watch_session_rollup only for watch-time confidence; never page duration.
- Keep unknown legacy as excluded evidence until a dry-run recovery contract maps it.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Behavior metric gets exact/probable/weak/unknown confidence; does not clear formal manual or runtime gates.
Scoring impact: evidenceCompleteness, regressionRisk; estimated 2 point(s); formal gates clear=false

### Mobile Scale Residual Recovery

- ID: `mobile_scale_residual_recovery`
- Trigger patterns: `mobile residual`, `hardcoded UI scale`, `UI source coverage reports mobile residuals`
- Source files: `src/lib/device-layout-contract.ts`, `src/lib/user-mobile-shell.ts`, `agent/state/mobile-ui-final-lock.generated.json`, `scripts/agent/validate-mobile-ui-final-lock.ts`

Commands:
- `npm run check:mobile-ui-final-lock`
- `npm run check:mobile-hardcoded-css-cleanup`
- `npm run check:device-layout-contract`

Validators:
- `npm run check:mobile-ui-final-lock`
- `npm run check:device-layout-contract`

Fixes:
- Resolve the exact touched surface and replace hardcoded scale with existing device/layout helpers.
- Use density variants when a shared component spans admin, user, and creator surfaces.
- Use browser reproduction only after source coverage reports a concrete UI issue that needs confirmation.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Mobile source residual becomes source-ready or remains source_refresh_required; browser reproduction is optional and does not clear formal runtime/provider/admin truth gates.
Scoring impact: evidenceCompleteness, regressionRisk; estimated 2 point(s); formal gates clear=false

### Cost Owner Review Recovery

- ID: `cost_owner_review_recovery`
- Trigger patterns: `cost_review_required`, `owner_review cost lane`, `external billing proof missing`
- Source files: `src/lib/server/global-cost-surface-contract.ts`, `src/lib/server/api-cost-contract.ts`, `scripts/agent/validate-score-80-cost-readiness.ts`, `agent/state/score-80-cost-readiness.generated.json`

Commands:
- `npm run check:score-80-cost-readiness`
- `npm run score:global-cost`
- `npm run check:global-cost`

Validators:
- `npm run check:score-80-cost-readiness`
- `npm run check:beta-score`

Fixes:
- Confirm the source cost contract, budget guard, rate limit, and cache policy for the flagged lane.
- Keep external billing observation as owner_review until a human-owned billing artifact exists.
- Do not add cloud/provider calls to prove cost state.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Cost lane becomes source_inventory_complete or owner_review; does not clear formal external billing proof.
Scoring impact: costRisk, regressionRisk; estimated 4 point(s); formal gates clear=false

### Monolith Growth Recovery

- ID: `monolith_growth_recovery`
- Trigger patterns: `high-risk monolith`, `file over module discipline threshold`, `AI critic monolith growth risk`
- Source files: `src/lib/debug/monolith-risk-registry.ts`, `scripts/agent/score-code-organization.ts`, `agent/state/monolith-orphan-metric-registry.generated.json`

Commands:
- `npm run score:code-organization`
- `npm run check:code-organization`
- `npm run check:monolith-orphan-metric-registry`

Validators:
- `npm run check:monolith-orphan-metric-registry`
- `npm run check:ai-debug-critic`

Fixes:
- Add a split recommendation and next action before expanding the large file.
- Extract one cohesive helper only when the selected debug issue requires edits in that file.
- Keep broad refactors out of the recovery pass unless the playbook explicitly scopes them.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact
- no_broad_refactor

Evidence outcome: Monolith risk gets owner, linked routes/metrics, and split plan; does not clear formal evidence.
Scoring impact: regressionRisk, sourceHealth; estimated 2 point(s); formal gates clear=false

### Fake Evidence Recovery

- ID: `fake_evidence_recovery`
- Trigger patterns: `source-only output claimed as runtime proof`, `formal gate marked passed without artifact`, `provider/runtime smoke claimed from local validator`
- Source files: `src/lib/debug/ai-debug-critic.ts`, `src/lib/agent-score/evidence-quality.ts`, `src/lib/agent-score/core.ts`, `agent/state/ai-debug-critic.generated.json`

Commands:
- `npm run check:ai-debug-critic`
- `npm run score:beta`
- `npm run check:beta-score`

Validators:
- `npm run check:ai-debug-critic`
- `npm run check:beta-score`

Fixes:
- Downgrade the claim to source-only, operator_reported, source_ready, blocked_manual, or formal_missing.
- Remove any language that says local/static/source validation passed deployed runtime, provider, or admin truth proof.
- Require a generated formal artifact path before any formal gate can move to Ready.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Evidence claim is corrected to source-only or formal_missing; does not clear formal provider/runtime/admin truth gates.
Scoring impact: evidenceCompleteness, runtimeHealth; estimated 5 point(s); formal gates clear=false

### Creator Settings Unwired Recovery

- ID: `creator_settings_unwired_recovery`
- Trigger patterns: `creator settings source health missing`, `creator settings control plane unwired`, `creator settings route unavailable`
- Source files: `src/lib/creator-settings/creator-settings-contract.ts`, `src/lib/creator/dashboard/creator-settings-contract.ts`, `src/app/dashboard/creator/settings/page.tsx`, `src/app/api/creator/settings/route.ts`, `agent/state/creator-settings-control-plane.generated.json`

Commands:
- `npm run check:creator-settings-source-health`
- `npm run check:creator-settings-control-plane`
- `npx vitest run tests/unit/creator-settings-control-plane.spec.ts`

Validators:
- `npm run check:creator-settings-source-health`
- `npm run check:creator-settings-control-plane`

Fixes:
- Trace the creator settings contract before adding fields or UI states.
- Connect route response, page state, and admin/debug evidence without changing payment or chat behavior.
- Keep missing settings unavailable instead of silently defaulting to live.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Creator settings lane becomes wired or unavailable with exact source reason; does not clear formal beta evidence.
Scoring impact: sourceHealth, evidenceCompleteness; estimated 2 point(s); formal gates clear=false

### Creator Drop Status Unwired Recovery

- ID: `creator_drop_status_unwired_recovery`
- Trigger patterns: `creator drop status metrics missing`, `creator drop manager metrics unavailable`, `drop metrics displayed as zero without source`
- Source files: `src/lib/drops/drop-status-resolver.ts`, `src/lib/drops/drop-metrics-resolver.ts`, `src/components/Creators/CreatorDropManager.tsx`, `agent/state/creator-drop-status-metrics.generated.json`

Commands:
- `npm run check:creator-drop-status-metrics`
- `npx vitest run tests/unit/creator-drop-status-metrics.spec.ts`
- `npm run check:monolith-orphan-metric-registry`

Validators:
- `npm run check:creator-drop-status-metrics`
- `npx vitest run tests/unit/creator-drop-status-metrics.spec.ts`

Fixes:
- Use the shared creator drop status resolver for lifecycle labels.
- Show missing metrics as collecting or unavailable, never proven zero without source evidence.
- Keep admin-only publish, approval, and rotation controls out of creator surfaces.

Forbidden actions:
- no_production_reads
- no_deploy
- no_payment_gumdrop_math_changes
- no_chat_nav_edits
- no_formal_gate_clear_without_artifact

Evidence outcome: Creator drop status/metrics become source-marked or unavailable; does not clear formal runtime/admin truth evidence.
Scoring impact: sourceHealth, evidenceCompleteness; estimated 2 point(s); formal gates clear=false
