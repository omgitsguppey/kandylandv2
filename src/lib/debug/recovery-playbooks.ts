import type { AiDebugCriticCheckId } from "./ai-debug-critic-contract";
import type { ScoreDimensionImpact } from "./debug-backlog-contract";

export const DEBUG_RECOVERY_PLAYBOOK_IDS = [
  "stale_artifact_recovery",
  "debug_runtime_unknown_recovery",
  "admin_truth_unknown_recovery",
  "route_500_recovery",
  "telemetry_orphan_recovery",
  "behavior_math_unknown_recovery",
  "mobile_scale_residual_recovery",
  "cost_owner_review_recovery",
  "monolith_growth_recovery",
  "fake_evidence_recovery",
  "creator_settings_unwired_recovery",
  "creator_drop_status_unwired_recovery",
] as const;

export type DebugRecoveryPlaybookId = typeof DEBUG_RECOVERY_PLAYBOOK_IDS[number];

export type DebugRecoveryForbiddenAction =
  | "no_production_reads"
  | "no_deploy"
  | "no_payment_gumdrop_math_changes"
  | "no_chat_nav_edits"
  | "no_formal_gate_clear_without_artifact"
  | "no_new_duplicate_system"
  | "no_broad_refactor";

export interface DebugRecoveryScoringImpactEstimate {
  dimensions: ScoreDimensionImpact[];
  estimatedPointImpact: number;
  doesNotClearFormalGates: boolean;
}

export interface DebugRecoveryPlaybook {
  id: DebugRecoveryPlaybookId;
  title: string;
  triggerPatterns: string[];
  sourceFiles: string[];
  commands: string[];
  validators: string[];
  fixes: string[];
  forbiddenActions: DebugRecoveryForbiddenAction[];
  evidenceOutcome: string;
  scoringImpactEstimate: DebugRecoveryScoringImpactEstimate;
  criticChecks: AiDebugCriticCheckId[];
}

const BASE_FORBIDDEN: DebugRecoveryForbiddenAction[] = [
  "no_production_reads",
  "no_deploy",
  "no_payment_gumdrop_math_changes",
  "no_chat_nav_edits",
  "no_formal_gate_clear_without_artifact",
];

function playbook(input: Omit<DebugRecoveryPlaybook, "forbiddenActions"> & {
  forbiddenActions?: DebugRecoveryForbiddenAction[];
}): DebugRecoveryPlaybook {
  return {
    ...input,
    forbiddenActions: Array.from(new Set([...BASE_FORBIDDEN, ...(input.forbiddenActions ?? [])])),
  };
}

export function buildDebugRecoveryPlaybooks(): DebugRecoveryPlaybook[] {
  return [
    playbook({
      id: "stale_artifact_recovery",
      title: "Stale Artifact Recovery",
      triggerPatterns: [
        "debug backlog item contains stale artifact",
        "refreshPlan.needsRefresh=true",
        "AI critic no_patch_on_top_of_stale_logic finding",
      ],
      sourceFiles: [
        "src/lib/agent-score/refresh-safeguards.ts",
        "src/lib/agent-score/refresh-registry.ts",
        "agent/state/public-beta-score.generated.json",
      ],
      commands: [
        "npm run score:beta",
        "npm run check:beta-score",
        "npm run check:debug-backlog-engine",
      ],
      validators: [
        "npm run check:debug-backlog-engine",
        "npm run check:ai-debug-critic",
        "npm run check:beta-score",
      ],
      fixes: [
        "Read the stale artifact entry and run only its registered refresh command.",
        "If no refresh command exists, add the artifact to refresh-registry before relying on it.",
        "If the artifact is no longer consumed, mark it stale_retired in the debug backlog output with the retire reason.",
      ],
      forbiddenActions: ["no_new_duplicate_system"],
      evidenceOutcome: "Produces current generated evidence or stale_retired backlog state; does not clear formal provider/runtime/manual/admin gates.",
      scoringImpactEstimate: {
        dimensions: ["freshness", "regressionRisk"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_patch_on_top_of_stale_logic", "no_duplicate_systems"],
    }),
    playbook({
      id: "debug_runtime_unknown_recovery",
      title: "Debug Runtime Unknown Recovery",
      triggerPatterns: [
        "debug runtime evidence unknown",
        "runtimeHealth low with runtime_unverified",
        "source-ready runtime confidence but deployed runtime smoke missing",
      ],
      sourceFiles: [
        "src/lib/debug/debug-backlog-builder.ts",
        "src/lib/debug/debug-backlog-contract.ts",
        "agent/state/debug-runtime-evidence.generated.json",
        "agent/state/source-backed-runtime-confidence.generated.json",
      ],
      commands: [
        "npm run check:debug-runtime-evidence",
        "npm run check:source-backed-runtime-confidence",
        "npm run score:beta",
      ],
      validators: [
        "npm run check:debug-runtime-evidence",
        "npm run check:beta-score",
      ],
      fixes: [
        "Classify unknown runtime evidence as source_ready, runtime_unverified, blocked_external, or formal_missing.",
        "Connect source-ready runtime confidence to the runtime/provider smoke evidence text only as partial confidence.",
        "Leave deployed runtime smoke blocked until a formal runtime-smoke artifact exists.",
      ],
      evidenceOutcome: "Runtime debug item becomes classified with exact next action; does not clear formal deployed runtime evidence.",
      scoringImpactEstimate: {
        dimensions: ["runtimeHealth", "evidenceCompleteness"],
        estimatedPointImpact: 3,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_source_ready_as_runtime_proof", "no_fake_evidence"],
    }),
    playbook({
      id: "admin_truth_unknown_recovery",
      title: "Admin Truth Unknown Recovery",
      triggerPatterns: [
        "admin truth/sample evidence unknown",
        "Admin Debug shows missing or unavailable source truth",
        "beta cap formal admin truth sample required",
      ],
      sourceFiles: [
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/admin-debug-summary-cards.ts",
        "scripts/agent/validate-admin-truth-source-sample.ts",
        "agent/state/admin-truth-source-sample.generated.json",
      ],
      commands: [
        "npm run check:admin-truth-source-sample",
        "npm run check:admin-debug-control-tower",
        "npm run check:beta-score",
      ],
      validators: [
        "npm run check:admin-truth-source-sample",
        "npm run check:admin-debug-control-tower",
        "npm run check:beta-score",
      ],
      fixes: [
        "Keep unavailable admin truth labeled unavailable, stale, or formal_missing.",
        "Wire source-truth sample evidence into Admin Debug summary only when the generated artifact is current.",
        "Do not mark admin truth/sample evidence Ready unless a formal sample artifact is attached.",
      ],
      evidenceOutcome: "Admin truth issue receives current source sample or formal_missing classification; does not clear formal admin truth gate.",
      scoringImpactEstimate: {
        dimensions: ["evidenceCompleteness", "freshness"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_formal_gate_cleared_without_artifact", "no_fake_evidence"],
    }),
    playbook({
      id: "route_500_recovery",
      title: "Route 500 Recovery",
      triggerPatterns: [
        "route diagnostic severity error",
        "HTTP 500 in admin/debug route",
        "human error key internal_server_error",
      ],
      sourceFiles: [
        "src/lib/server/route-diagnostics.ts",
        "src/lib/errors/error-dictionary.ts",
        "src/lib/errors/resolve-human-error.ts",
        "agent/state/route-diagnostics-error-map.generated.json",
      ],
      commands: [
        "npm run check:route-diagnostics-error-map",
        "npm run check:debug-panel-output-triage",
        "npm run check:beta-score",
      ],
      validators: [
        "npm run check:route-diagnostics-error-map",
        "npm run check:debug-panel-output-triage",
      ],
      fixes: [
        "Resolve the diagnostic context to a specific human error key and source file.",
        "Add typed fallback copy only through the error dictionary and route diagnostics helpers.",
        "Keep route output degraded until the exact validator confirms the mapping.",
      ],
      evidenceOutcome: "Route issue maps to typed diagnostic and validator evidence; does not clear formal runtime smoke.",
      scoringImpactEstimate: {
        dimensions: ["runtimeHealth", "regressionRisk"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_source_ready_as_runtime_proof", "no_unowned_debug_warning"],
    }),
    playbook({
      id: "telemetry_orphan_recovery",
      title: "Telemetry Orphan Recovery",
      triggerPatterns: [
        "metric exists without producer",
        "producer exists without consumer",
        "orphaned telemetry or source_ready_evidence_gap",
      ],
      sourceFiles: [
        "src/lib/analytics/telemetry-dependency-graph.ts",
        "src/lib/analytics/materialization-contract.ts",
        "src/lib/debug/orphan-metric-registry.ts",
        "agent/state/monolith-orphan-metric-registry.generated.json",
      ],
      commands: [
        "npm run check:telemetry-dependency-graph",
        "npm run check:event-facts-materializer-closure",
        "npm run check:monolith-orphan-metric-registry",
      ],
      validators: [
        "npm run check:telemetry-dependency-graph",
        "npm run check:event-facts-materializer-closure",
        "npm run check:monolith-orphan-metric-registry",
      ],
      fixes: [
        "Map the metric to producer, persistence source, materializer, API route, UI consumer, and evidence consumer.",
        "If no consumer exists, archive the producer lane with archive_only classification.",
        "If the lane is source-ready but runtime-unverified, keep debug output degraded instead of healthy.",
      ],
      evidenceOutcome: "Telemetry lane becomes linked, archived, or source_ready_evidence_gap; does not clear formal runtime evidence.",
      scoringImpactEstimate: {
        dimensions: ["sourceHealth", "evidenceCompleteness"],
        estimatedPointImpact: 3,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_orphaned_telemetry", "no_unowned_debug_warning"],
    }),
    playbook({
      id: "behavior_math_unknown_recovery",
      title: "Behavior Math Unknown Recovery",
      triggerPatterns: [
        "behavior math confidence unknown",
        "disabled tracking counted",
        "legacy unknown counted as current user behavior",
      ],
      sourceFiles: [
        "src/lib/behavioral/behavior-math-contract.ts",
        "src/lib/behavioral/behavior-math-engine.ts",
        "src/lib/behavioral/legacy-behavior-recovery.ts",
        "agent/state/behavior-math-verification.generated.json",
      ],
      commands: [
        "npm run check:behavior-math-verification",
        "npm run check:behavioral-tracking-semantics-closure",
        "npm run check:identity-transfer-telemetry-closure",
      ],
      validators: [
        "npm run check:behavior-math-verification",
        "npx vitest run tests/unit/behavior-math-verification.spec.ts",
      ],
      fixes: [
        "Classify disabled tracking, duplicate, linked guest/user, and unknown legacy events before aggregation.",
        "Use watch_session_rollup only for watch-time confidence; never page duration.",
        "Keep unknown legacy as excluded evidence until a dry-run recovery contract maps it.",
      ],
      evidenceOutcome: "Behavior metric gets exact/probable/weak/unknown confidence; does not clear formal manual or runtime gates.",
      scoringImpactEstimate: {
        dimensions: ["evidenceCompleteness", "regressionRisk"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_source_ready_as_runtime_proof", "no_orphaned_telemetry"],
    }),
    playbook({
      id: "mobile_scale_residual_recovery",
      title: "Mobile Scale Residual Recovery",
      triggerPatterns: [
        "mobile residual",
        "hardcoded UI scale",
        "UI source coverage reports mobile residuals",
      ],
      sourceFiles: [
        "src/lib/device-layout-contract.ts",
        "src/lib/user-mobile-shell.ts",
        "agent/state/mobile-ui-final-lock.generated.json",
        "scripts/agent/validate-mobile-ui-final-lock.ts",
      ],
      commands: [
        "npm run check:mobile-ui-final-lock",
        "npm run check:mobile-hardcoded-css-cleanup",
        "npm run check:device-layout-contract",
      ],
      validators: [
        "npm run check:mobile-ui-final-lock",
        "npm run check:device-layout-contract",
      ],
      fixes: [
        "Resolve the exact touched surface and replace hardcoded scale with existing device/layout helpers.",
        "Use density variants when a shared component spans admin, user, and creator surfaces.",
        "Use browser reproduction only after source coverage reports a concrete UI issue that needs confirmation.",
      ],
      evidenceOutcome: "Mobile source residual becomes source-ready or remains source_refresh_required; browser reproduction is optional and does not clear formal runtime/provider/admin truth gates.",
      scoringImpactEstimate: {
        dimensions: ["evidenceCompleteness", "regressionRisk"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_hardcoded_ui_scale_regression", "no_chat_nav_touch_without_explicit_request"],
    }),
    playbook({
      id: "cost_owner_review_recovery",
      title: "Cost Owner Review Recovery",
      triggerPatterns: [
        "cost_review_required",
        "owner_review cost lane",
        "external billing proof missing",
      ],
      sourceFiles: [
        "src/lib/server/global-cost-surface-contract.ts",
        "src/lib/server/api-cost-contract.ts",
        "scripts/agent/validate-score-80-cost-readiness.ts",
        "agent/state/score-80-cost-readiness.generated.json",
      ],
      commands: [
        "npm run check:score-80-cost-readiness",
        "npm run score:global-cost",
        "npm run check:global-cost",
      ],
      validators: [
        "npm run check:score-80-cost-readiness",
        "npm run check:beta-score",
      ],
      fixes: [
        "Confirm the source cost contract, budget guard, rate limit, and cache policy for the flagged lane.",
        "Keep external billing observation as owner_review until a human-owned billing artifact exists.",
        "Do not add cloud/provider calls to prove cost state.",
      ],
      evidenceOutcome: "Cost lane becomes source_inventory_complete or owner_review; does not clear formal external billing proof.",
      scoringImpactEstimate: {
        dimensions: ["costRisk", "regressionRisk"],
        estimatedPointImpact: 4,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_new_cost_path_without_guard", "no_fake_evidence"],
    }),
    playbook({
      id: "monolith_growth_recovery",
      title: "Monolith Growth Recovery",
      triggerPatterns: [
        "high-risk monolith",
        "file over module discipline threshold",
        "AI critic monolith growth risk",
      ],
      sourceFiles: [
        "src/lib/debug/monolith-risk-registry.ts",
        "scripts/agent/score-code-organization.ts",
        "agent/state/monolith-orphan-metric-registry.generated.json",
      ],
      commands: [
        "npm run score:code-organization",
        "npm run check:code-organization",
        "npm run check:monolith-orphan-metric-registry",
      ],
      validators: [
        "npm run check:monolith-orphan-metric-registry",
        "npm run check:ai-debug-critic",
      ],
      fixes: [
        "Add a split recommendation and next action before expanding the large file.",
        "Extract one cohesive helper only when the selected debug issue requires edits in that file.",
        "Keep broad refactors out of the recovery pass unless the playbook explicitly scopes them.",
      ],
      forbiddenActions: ["no_broad_refactor"],
      evidenceOutcome: "Monolith risk gets owner, linked routes/metrics, and split plan; does not clear formal evidence.",
      scoringImpactEstimate: {
        dimensions: ["regressionRisk", "sourceHealth"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_monolith_growth_without_split_plan", "no_duplicate_systems"],
    }),
    playbook({
      id: "fake_evidence_recovery",
      title: "Fake Evidence Recovery",
      triggerPatterns: [
        "source-only output claimed as runtime proof",
        "formal gate marked passed without artifact",
        "provider/runtime smoke claimed from local validator",
      ],
      sourceFiles: [
        "src/lib/debug/ai-debug-critic.ts",
        "src/lib/agent-score/evidence-quality.ts",
        "src/lib/agent-score/core.ts",
        "agent/state/ai-debug-critic.generated.json",
      ],
      commands: [
        "npm run check:ai-debug-critic",
        "npm run score:beta",
        "npm run check:beta-score",
      ],
      validators: [
        "npm run check:ai-debug-critic",
        "npm run check:beta-score",
      ],
      fixes: [
        "Downgrade the claim to source-only, operator_reported, source_ready, blocked_manual, or formal_missing.",
        "Remove any language that says local/static/source validation passed deployed runtime, provider, or admin truth proof.",
        "Require a generated formal artifact path before any formal gate can move to Ready.",
      ],
      evidenceOutcome: "Evidence claim is corrected to source-only or formal_missing; does not clear formal provider/runtime/admin truth gates.",
      scoringImpactEstimate: {
        dimensions: ["evidenceCompleteness", "runtimeHealth"],
        estimatedPointImpact: 5,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_fake_evidence", "no_formal_gate_cleared_without_artifact", "no_source_ready_as_runtime_proof"],
    }),
    playbook({
      id: "creator_settings_unwired_recovery",
      title: "Creator Settings Unwired Recovery",
      triggerPatterns: [
        "creator settings source health missing",
        "creator settings control plane unwired",
        "creator settings route unavailable",
      ],
      sourceFiles: [
        "src/lib/creator-settings/creator-settings-contract.ts",
        "src/lib/creator/dashboard/creator-settings-contract.ts",
        "src/app/dashboard/creator/settings/page.tsx",
        "src/app/api/creator/settings/route.ts",
        "agent/state/creator-settings-control-plane.generated.json",
      ],
      commands: [
        "npm run check:creator-settings-source-health",
        "npm run check:creator-settings-control-plane",
        "npx vitest run tests/unit/creator-settings-control-plane.spec.ts",
      ],
      validators: [
        "npm run check:creator-settings-source-health",
        "npm run check:creator-settings-control-plane",
      ],
      fixes: [
        "Trace the creator settings contract before adding fields or UI states.",
        "Connect route response, page state, and admin/debug evidence without changing payment or chat behavior.",
        "Keep missing settings unavailable instead of silently defaulting to live.",
      ],
      evidenceOutcome: "Creator settings lane becomes wired or unavailable with exact source reason; does not clear formal beta evidence.",
      scoringImpactEstimate: {
        dimensions: ["sourceHealth", "evidenceCompleteness"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_duplicate_systems", "no_unowned_debug_warning"],
    }),
    playbook({
      id: "creator_drop_status_unwired_recovery",
      title: "Creator Drop Status Unwired Recovery",
      triggerPatterns: [
        "creator drop status metrics missing",
        "creator drop manager metrics unavailable",
        "drop metrics displayed as zero without source",
      ],
      sourceFiles: [
        "src/lib/drops/drop-status-resolver.ts",
        "src/lib/drops/drop-metrics-resolver.ts",
        "src/components/Creators/CreatorDropManager.tsx",
        "agent/state/creator-drop-status-metrics.generated.json",
      ],
      commands: [
        "npm run check:creator-drop-status-metrics",
        "npx vitest run tests/unit/creator-drop-status-metrics.spec.ts",
        "npm run check:monolith-orphan-metric-registry",
      ],
      validators: [
        "npm run check:creator-drop-status-metrics",
        "npx vitest run tests/unit/creator-drop-status-metrics.spec.ts",
      ],
      fixes: [
        "Use the shared creator drop status resolver for lifecycle labels.",
        "Show missing metrics as collecting or unavailable, never proven zero without source evidence.",
        "Keep admin-only publish, approval, and rotation controls out of creator surfaces.",
      ],
      evidenceOutcome: "Creator drop status/metrics become source-marked or unavailable; does not clear formal runtime/admin truth evidence.",
      scoringImpactEstimate: {
        dimensions: ["sourceHealth", "evidenceCompleteness"],
        estimatedPointImpact: 2,
        doesNotClearFormalGates: true,
      },
      criticChecks: ["no_orphaned_telemetry", "no_unowned_debug_warning"],
    }),
  ];
}

const PROTECTED_SOURCE_PATTERN = /(^|\/)(chat|Navbar|BottomNav|TopNav)|paypal|wallet|gumdrop-economics|gumdrop-ledger/iu;

export function validateDebugRecoveryPlaybooks(playbooks: readonly DebugRecoveryPlaybook[]): string[] {
  const failures: string[] = [];
  const byId = new Map(playbooks.map((playbook) => [playbook.id, playbook]));

  for (const id of DEBUG_RECOVERY_PLAYBOOK_IDS) {
    if (!byId.has(id)) failures.push(`missing playbook: ${id}`);
  }

  for (const playbook of playbooks) {
    if (playbook.triggerPatterns.length === 0) failures.push(`${playbook.id} lacks trigger patterns.`);
    if (playbook.sourceFiles.length === 0) failures.push(`${playbook.id} lacks exact source files.`);
    if (playbook.commands.length === 0) failures.push(`${playbook.id} lacks exact commands.`);
    if (playbook.validators.length === 0) failures.push(`${playbook.id} lacks validators.`);
    if (playbook.fixes.length === 0) failures.push(`${playbook.id} lacks exact fixes.`);
    if (playbook.forbiddenActions.length === 0) failures.push(`${playbook.id} lacks forbidden actions.`);
    for (const required of BASE_FORBIDDEN) {
      if (!playbook.forbiddenActions.includes(required)) {
        failures.push(`${playbook.id} lacks forbidden action ${required}.`);
      }
    }
    if (playbook.sourceFiles.some((file) => PROTECTED_SOURCE_PATTERN.test(file))) {
      failures.push(`${playbook.id} touches protected default source file.`);
    }
    if (!playbook.scoringImpactEstimate.doesNotClearFormalGates) {
      failures.push(`${playbook.id} cannot clear formal evidence without artifact.`);
    }
    if (/(^|[.;]\s*)(clears formal|clear formal|provider gate passed|runtime smoke passed|manual smoke passed)/iu.test(playbook.evidenceOutcome)) {
      failures.push(`${playbook.id} cannot clear formal evidence without artifact.`);
    }
    if (!playbook.evidenceOutcome.includes("does not clear formal")) {
      failures.push(`${playbook.id} evidence outcome must state it does not clear formal gates.`);
    }
    if (playbook.commands.some((command) => /deploy|gcloud|firebase deploy|production read/iu.test(command))) {
      failures.push(`${playbook.id} includes forbidden deploy or production command.`);
    }
  }

  return failures;
}
