import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildAnalyticsPanelHydrationReport,
  validateAnalyticsPanelHydrationReport,
} from "@/lib/admin-analytics/panel-hydration-resolver";
import { classifyGeneratedArtifactFromGit } from "@/lib/agent-score/generated-artifact-version-policy";
import {
  LAUNCH_ANALYTICS_FIRST_DAY_KEY,
  buildSourceAgreementCoverageSummaryState,
  classifySourceAgreementCoverage,
} from "@/lib/analytics/source-agreement-detail";
import {
  ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
  LAUNCH_CRITICAL_EVENT_FAMILIES,
  RECOVERED_METRIC_METADATA_PROOF_BOUNDARY,
  RECOVERY_METRIC_DEDUPE_RULES,
  RECOVERY_METRIC_MODELING_POLICY,
  RECOVERY_METRIC_POLICY_PROOF_BOUNDARY,
  RECOVERY_METRIC_PRODUCT_TRUTH_POLICY,
  buildFormalLaunchRangeRecoveryState,
  buildLaunchCriticalActiveSourceCoverageReport,
  buildLaunchCriticalRecoveryCoverageFromEvidence,
  buildLaunchHistoryDisplaySummaryState,
  buildLaunchHistorySourceCoverageRowsState,
  buildLaunchHistoryCoverageSummaryState,
  buildLaunchHistoryRangeProofState,
  buildLaunchRecoverySourceGateState,
  classifyRecoveryMetricConfidenceBand,
  collapseLaunchRecoveryDayRanges,
  getLaunchCriticalActiveSourceEventNames,
  normalizeLaunchHistoryRangeProofKind,
  summarizeLaunchRecoveryDayEvidence,
  summarizeLaunchRecoveryFamilySourceStates,
  summarizeRecoveredMetricMetadataCompleteness,
} from "@/lib/analytics/recovery-timeline-spine";
import { buildLivePanelEvidenceReport } from "@/lib/release-readiness/live-panel-evidence-resolver";
import { buildLaunchSourceAgreementDetail } from "./debug-cockpit-batch29-analytics-source-hierarchy-shared";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/analytics-panel-hydration.generated.json";
const DOC_PATH = "docs/agent-truth/analytics-panel-hydration.md";
const LAUNCH_RECOVERY_REPORT_PATH = "agent/state/launch-analytics-recovery.generated.json";
const LAUNCH_RECOVERY_DOC_PATH = "docs/agent-truth/launch-analytics-recovery.md";

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string) {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => asRecord(entry)) : [];
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumberRecord(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function isActiveAnalyticsSourceFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (!/\.(ts|tsx|js)$/iu.test(normalized)) return false;
  if (!/^(src|functions\/src|shared)\//u.test(normalized)) return false;
  if (
    normalized.includes("telemetry-catalog")
    || normalized.includes("telemetry-event-manifest")
    || normalized.includes("recovery-timeline-spine")
    || normalized.includes("/testing/")
    || normalized.includes("__tests__")
  ) {
    return false;
  }
  return true;
}

function sourceContainsEventName(source: string, eventName: string) {
  const escaped = eventName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, "u").test(source);
}

function buildLaunchCriticalActiveSourceReferences() {
  const sourceReferencesByEventName: Record<string, string[]> = {};
  const materializerReferencesByEventName: Record<string, string[]> = {};
  const files = run("git", ["ls-files", "src", "functions/src", "shared"])
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter(isActiveAnalyticsSourceFile);
  const materializerHints = [
    "analytics_event_facts",
    "analytics_metric_facts",
    "analytics_watch_sessions",
    "materializer",
    "rollup",
    "hydrate",
    "normalizedAction",
  ];

  for (const path of files) {
    let source = "";
    try {
      source = readFileSync(join(ROOT, path), "utf8");
    } catch {
      continue;
    }
    const hasMaterializerHint = materializerHints.some((hint) => source.includes(hint));
    for (const family of LAUNCH_CRITICAL_EVENT_FAMILIES) {
      for (const eventName of getLaunchCriticalActiveSourceEventNames(family)) {
        if (!sourceContainsEventName(source, eventName)) continue;
        (sourceReferencesByEventName[eventName] ??= []).push(path);
        if (hasMaterializerHint || source.includes(family.materializerLane)) {
          (materializerReferencesByEventName[eventName] ??= []).push(path);
        }
      }
    }
  }

  return { sourceReferencesByEventName, materializerReferencesByEventName };
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized.startsWith("agent/context/")) return "unrelated_agent_context_file_to_ignore";
  if (normalized.startsWith("agent/index/")) return "unrelated_agent_index_file_to_ignore";
  if (normalized.startsWith("agent/prompts/")) return "unrelated_agent_prompt_file_to_ignore";
  if (
    normalized === "AGENTS.md"
    || /^\.agent\/skills\/[a-z0-9-]+\.md$/u.test(normalized)
    || /^\.agent\/workflows\/[a-z0-9-]+\.md$/u.test(normalized)
    || normalized === "EVERY_FILE_FUNCTION_CHECKLIST.md"
    || normalized === "FULL_SCALE_CODEBASE_AUDIT.md"
    || normalized === "REPO_MEMORY_LEDGER.md"
    || normalized === "memory.md"
    || normalized === "docs/agent-truth/current-operator-doctrine.md"
    || normalized === "control-tower/00-START-HERE.md"
    || normalized === "control-tower/04-EXECUTION-ORDER.md"
  ) {
    return "doctrine_memory_expected";
  }
  if (normalized === REPORT_PATH) return "analytics_panel_hydration_artifact_expected";
  if (normalized === DOC_PATH) return "analytics_panel_hydration_artifact_expected";
  if (normalized === "src/lib/admin-analytics/panel-hydration-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin-analytics/panel-hydration-registry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin-analytics/panel-hydration-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/release-readiness/live-panel-evidence-resolver.ts") return "real_source_change_needs_review";
  if (/^src\/lib\/release-readiness\/(live-evidence-gate-contract|live-evidence-resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/live-evidence-gate-replacement.spec.ts") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-current-beta-exit-status.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-overnight-beta-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-overnight-final-integration-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-beta-evidence-gap-map.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/current-beta-exit-status.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/overnight-final-integration-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/beta-evidence-gap-map.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/overnight-beta-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/overnight-final-integration-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/beta-evidence-gap-map.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/admin-truth-sample-evidence.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/evidence-capture-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/current-beta-exit-status.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/overnight-beta-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/overnight-final-integration-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/beta-evidence-gap-map.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/evidence-capture-status.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/live-evidence-gate-replacement.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/live-evidence-gate-replacement.md") return "documentation_artifact_expected";
  if (normalized === "src/app/admin/analytics/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/admin-analytics-display-state.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/admin-analytics-source-hierarchy.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/analytics/historical/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-historical-validation.ts") return "real_source_change_needs_review";
  if (normalized === "src/types/admin-analytics.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/admin-data-validation.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/admin-analytics-display-state.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/analytics-validation-semantics.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/chart-readiness-hierarchy-repair.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/data-validation-ui-semantic-cleanup.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/data-validation-copy-consistency.spec.ts") return "test_artifact_expected";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin-debug-control-tower.ts") return "admin_debug_truth_display_source_expected";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/release-readiness/automated-truth-reconciliation.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-data.ts") return "historical_analytics_source_reader_expected";
  if (normalized === "scripts/agent/validate-analytics-panel-hydration.ts") return "analytics_panel_hydration_artifact_expected";
  if (
    normalized === "scripts/agent/validate-recovery-timeline-spine.ts"
    || normalized === "src/lib/analytics/recovery-timeline-spine.ts"
    || normalized === "src/lib/admin-analytics-audience-snapshot.ts"
    || normalized === "src/lib/admin-analytics-guest-bounce-quality.ts"
    || normalized === "scripts/check-admin-analytics-audience-snapshot.ts"
    || normalized === "scripts/check-admin-analytics-guest-bounce-quality.ts"
    || normalized === "tests/unit/recovery-timeline-spine.spec.ts"
    || normalized === "tests/unit/admin-analytics-audience-snapshot.spec.ts"
    || normalized === "tests/unit/admin-analytics-guest-bounce-quality.spec.ts"
  ) {
    return "launch_analytics_recovery_source_expected";
  }
  if (
    normalized === "functions/src/analytics-semantics.ts"
    || normalized === "src/lib/analytics-semantics.ts"
    || normalized === "src/lib/server/analytics-semantics.ts"
  ) {
    return "analytics_semantics_source_expected";
  }
  if (
    normalized === "scripts/agent/validate-event-catalog-telemetry.ts"
    || normalized === "scripts/audit-telemetry.ts"
    || normalized === "shared/runtime/telemetry-event-manifest.ts"
  ) {
    return "telemetry_catalog_manifest_expected";
  }
  if (
    normalized === "scripts/agent/validate-admin-browser-surface-smoke.ts"
    || normalized === "src/lib/admin/admin-browser-surface-map.ts"
    || normalized === "src/lib/evidence/admin-browser-surface-smoke-contract.ts"
    || normalized === "tests/unit/admin-browser-surface-smoke.spec.ts"
  ) {
    return "admin_browser_source_smoke_expected";
  }
  if (
    normalized === "scripts/agent/validate-drops-mobile-refinement.ts"
    || normalized === "tests/unit/create-drop-modal-upload-block.spec.tsx"
    || normalized === "tests/unit/creator-drops-route.spec.ts"
  ) {
    return "creator_drop_workflow_expected";
  }
  if (normalized === "scripts/agent/validate-admin-truth-sample-evidence.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-evidence-capture-status.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-count-deduplication-normalization.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-metric-canonicalization-legacy-recovery.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/evidence-artifact-schemas.spec.ts") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-admin-debug-control-tower.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-actionability.ts") return "analytics_admin_reorg_validator_expected";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "analytics_admin_reorg_validator_expected";
  if (normalized === "src/app/admin/debug/components/DebugPanelStatusBySection.tsx") return "analytics_admin_reorg_source_expected";
  if (normalized === "scripts/agent/validate-event-liveness-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-global-user-dedupe-normalization.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/event-liveness-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/global-user-dedupe-normalization.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/event-liveness-audit.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/global-user-dedupe-normalization.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "tests/unit/event-liveness-audit.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/admin-analytics-data.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/analytics-panel-hydration.spec.ts") return "analytics_panel_hydration_artifact_expected";
  if (normalized === "agent/state/admin-surface-modal-replacement.generated.json") return "admin_surface_modal_replacement_artifact_expected";
  if (normalized === "docs/agent-truth/admin-surface-modal-replacement.md") return "admin_surface_modal_replacement_artifact_expected";
  if (normalized === "src/app/admin/debug/components/DebugControlTower.tsx") return "admin_debug_truth_display_source_expected";
  if (normalized === "src/app/admin/debug/components/DebugControlTowerCards.tsx") return "admin_debug_truth_display_source_expected";
  if (normalized === "src/app/admin/debug/components/DebugControlTowerEvidenceCopy.ts") return "admin_debug_truth_display_source_expected";
  if (normalized === "tests/unit/debug-control-tower-cards.spec.tsx") return "test_artifact_expected";
  if (normalized === "src/components/Admin/BalanceAdjustmentPanel.tsx") return "admin_surface_modal_replacement_source_expected";
  if (normalized === "src/components/Admin/CreateDropModal.tsx") return "admin_surface_modal_replacement_source_expected";
  if (normalized === "src/components/Admin/TransactionHistoryPanel.tsx") return "admin_surface_modal_replacement_source_expected";
  if (normalized === "src/components/Admin/AiDropCoverGeneratorPanel.tsx") return "admin_surface_modal_replacement_source_expected";
  if (normalized === "src/components/Admin/AiDropDescriptionGeneratorPanel.tsx") return "admin_surface_modal_replacement_source_expected";
  if (normalized === "src/lib/telemetry-catalog.ts") return "admin_surface_modal_replacement_source_expected";
  if (normalized === "src/app/admin/roster/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/validation-readiness-contract.ts") return "source_agreement_failure_classification_required";
  if (normalized === "scripts/agent/debug-cockpit-batch28-bug-validation-shared.ts") return "retired_duplicate_source_agreement_lane_expected";
  if (normalized === "src/lib/analytics/source-agreement-detail.ts") return "source_agreement_failure_classification_required";
  if (normalized === "src/lib/debug/debug-cockpit-batch29-analytics-source-hierarchy.ts") return "source_agreement_failure_classification_required";
  if (normalized === "scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared.ts") return "source_agreement_failure_classification_required";
  if (normalized === "src/lib/analytics/legacy-recovery-reconciler.ts") return "launch_analytics_recovery_source_expected";
  if (normalized === "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts") return "launch_analytics_recovery_validator_expected";
  if (normalized === "tests/unit/analytics-legacy-recovery-reconciliation.spec.ts") return "test_artifact_expected";
  if (normalized === "functions/src/analytics-truth-cli.ts" || normalized === "functions/src/analytics-truth-runtime.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/rebuild-analytics-truth.ts" || normalized === "scripts/rebuild-behavioral-intelligence.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/analytics/validate-canonical-import-export.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/source-agreement-failure-detail.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/evidence/admin-truth-sample/README.md") return "admin_truth_sample_launch_coverage_evidence_expected";
  if (normalized === "agent/evidence/admin-truth-sample/evidence.template.json") return "admin_truth_sample_launch_coverage_evidence_expected";
  if (normalized === "agent/evidence/launch-analytics/README.md") return "launch_analytics_recovery_artifact_expected";
  if (normalized === "agent/evidence/launch-analytics/launch-history-coverage.template.json") return "launch_analytics_recovery_artifact_expected";
  if (normalized === "tests/unit/debug-cockpit-batch29-analytics-source-hierarchy.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/admin-debug-control-tower.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/admin-debug-control-tower-component.spec.tsx") return "test_artifact_expected";
  if (normalized === "agent/state/source-agreement-failure-detail.generated.json") return "retired_duplicate_source_agreement_lane_expected";
  if (normalized === "scripts/agent/validate-source-agreement-failure-detail.ts") return "retired_duplicate_source_agreement_lane_expected";
  if (normalized === "agent/state/debug-cockpit-batch29-analytics-source-hierarchy.generated.json") return "source_agreement_failure_artifact_expected";
  if (normalized === "docs/agent-truth/source-agreement-failure-detail.md") return "retired_duplicate_source_agreement_lane_expected";
  if (normalized === "docs/agent-truth/debug-cockpit-batch29-analytics-source-hierarchy.md") return "documentation_artifact_expected";
  if (normalized === LAUNCH_RECOVERY_REPORT_PATH) return "launch_analytics_recovery_artifact_expected";
  if (normalized === LAUNCH_RECOVERY_DOC_PATH) return "launch_analytics_recovery_artifact_expected";
  if (normalized === "tests/unit/admin-analytics-page.spec.tsx") return "test_artifact_expected";
  if (normalized === "tests/unit/admin-analytics-source-hierarchy.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/agent-score\/(algorithmic-evidence-policy|core|evidence-quality|formal-evidence-bridge|regression-risk-refresh-plan)\.ts$/u.test(normalized)) {
    return "beta_studio_consolidation_source_expected";
  }
  if (normalized === "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-media-discovery-score-lock.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-post-economy-creator-flow-qa.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-regression-risk-high-blast-refresh.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-score-80-reconciliation-lock.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-score-80-refresh-pass.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "scripts/agent/validate-user-facing-feature-connection-audit.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "tests/unit/creator-dashboard-error-cost-inventory.spec.ts") return "beta_studio_consolidation_test_expected";
  if (normalized === "tests/unit/creator-experiences-panel.spec.tsx") return "beta_studio_consolidation_test_expected";
  if (normalized === "tests/unit/post-economy-creator-flow-qa.spec.ts") return "beta_studio_consolidation_test_expected";
  if (normalized === "tests/unit/purchase-modal.spec.tsx") return "beta_studio_consolidation_test_expected";
  if (normalized === "tests/unit/regression-risk-high-blast-refresh.spec.ts") return "beta_studio_consolidation_test_expected";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "beta_studio_consolidation_validator_expected";
  if (normalized === "tests/unit/public-beta-score.spec.ts") return "beta_studio_consolidation_test_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  return "unsafe_unknown";
}

function scoreDimensions() {
  const score = readJson("agent/state/public-beta-score.generated.json") ?? {};
  return {
    sourceHealth: Number(score.sourceHealthScore ?? 0),
    runtimeHealth: Number(score.runtimeHealthScore ?? 0),
    evidenceCompleteness: Number(score.evidenceCompletenessScore ?? 0),
    freshness: Number(score.freshnessScore ?? 0),
    costRisk: Number(score.costRiskScore ?? 0),
    regressionRisk: Number(score.regressionRiskScore ?? 0),
    overallHealthScore: Number(score.healthScore ?? 0),
  };
}

const LEGACY_RECOVERY_INPUTS = [
  "agent/state/analytics-legacy-history-reconciliation.generated.json",
  "agent/state/analytics-legacy-purgatory-queue.generated.json",
  "agent/state/analytics-legacy-recovery-reconciliation.generated.json",
  "agent/state/analytics-legacy-source-inventory.generated.json",
] as const;

function legacyRecoveryOwnedSourcePaths(path: (typeof LEGACY_RECOVERY_INPUTS)[number]) {
  if (
    path === "agent/state/analytics-legacy-history-reconciliation.generated.json"
    || path === "agent/state/analytics-legacy-purgatory-queue.generated.json"
  ) {
    return [
      "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
      "scripts/analytics/map-legacy-events.ts",
      "src/lib/analytics/legacy-event-mapping.ts",
      "src/lib/analytics/legacy-history-reconciler.ts",
      "src/lib/analytics/legacy-recovery-contract.ts",
      "agent/state/analytics-legacy-mapping-report.generated.json",
    ];
  }

  if (path === "agent/state/analytics-legacy-recovery-reconciliation.generated.json") {
    return [
      "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts",
      "scripts/analytics/inventory-legacy-sources.ts",
      "scripts/analytics/map-legacy-events.ts",
      "src/lib/analytics/legacy-event-mapping.ts",
      "src/lib/analytics/legacy-recovery-contract.ts",
      "src/lib/analytics/legacy-recovery-reconciler.ts",
      "agent/state/analytics-legacy-mapping-report.generated.json",
      "agent/state/analytics-legacy-source-inventory.generated.json",
    ];
  }

  return [
    "scripts/analytics/inventory-legacy-sources.ts",
    "src/lib/analytics/legacy-recovery-contract.ts",
  ];
}

function legacyRecoveryFreshnessState(input: {
  reportHead: string | null;
  artifactVersionStatus: string;
}) {
  if (input.reportHead === null) return "historical_evidence_only";
  if (input.artifactVersionStatus === "current_head") return "current";
  if (input.artifactVersionStatus === "same_commit_snapshot") return "same_commit_snapshot";
  if (input.artifactVersionStatus === "current_by_impact") return "current_by_impact";
  return "stale_source_version";
}

function legacyNumber(record: Record<string, unknown>, key: string, fallback = 0) {
  return asNumber(record[key], fallback);
}

function compactLegacyRecoverySummary() {
  const history = readJson("agent/state/analytics-legacy-history-reconciliation.generated.json");
  const purgatory = readJson("agent/state/analytics-legacy-purgatory-queue.generated.json");
  const recovery = readJson("agent/state/analytics-legacy-recovery-reconciliation.generated.json");
  const inventory = readJson("agent/state/analytics-legacy-source-inventory.generated.json");
  const historySummary = asRecord(history?.summary);
  const purgatorySummary = asRecord(purgatory?.summary);
  const recoverySummary = asRecord(recovery?.summary);
  const inventorySummary = asRecord(inventory?.summary);
  const queueRows = asRecordArray(purgatory?.queue);
  const reports = LEGACY_RECOVERY_INPUTS.map((path) => {
    const report = readJson(path);
    const reportHead = typeof report?.currentHead === "string" ? report.currentHead : null;
    const version = classifyGeneratedArtifactFromGit({
      cwd: ROOT,
      artifactPath: path,
      artifactHead: reportHead ?? undefined,
      ownedSourcePaths: legacyRecoveryOwnedSourcePaths(path),
    });
    const freshnessState = legacyRecoveryFreshnessState({
      reportHead,
      artifactVersionStatus: version.status,
    });
    return {
      path,
      reportKey: typeof report?.reportKey === "string" ? report.reportKey : path.replace(/^agent\/state\//u, "").replace(/\.generated\.json$/u, ""),
      generatedAtUtc: typeof report?.generatedAtUtc === "string" ? report.generatedAtUtc : typeof report?.generatedAt === "string" ? report.generatedAt : null,
      currentHead: reportHead,
      artifactVersionStatus: version.status,
      versionReason: version.reason,
      freshnessState,
      staleRelativeToCurrentHead: version.needsRefresh && freshnessState !== "historical_evidence_only",
    };
  });
  const manualReviewRequired = legacyNumber(purgatorySummary, "manualReviewRequired", queueRows.length);
  const productTruthEligibleCount = legacyNumber(purgatorySummary, "productTruthEligible");
  const currentTotalsEligibleCount = legacyNumber(historySummary, "currentTotalsEligibleCount");
  const overwritesCurrentTruth = historySummary.overwritesCurrentTruth === true || recoverySummary.overwritesCurrentTruth === true;
  const sampleQueue = queueRows.slice(0, 8).map((entry) => ({
    legacySource: typeof entry.legacySource === "string" ? entry.legacySource : "unknown",
    legacyId: typeof entry.legacyId === "string" ? entry.legacyId : "unknown",
    targetTruthLayer: typeof entry.targetTruthLayer === "string" ? entry.targetTruthLayer : "unknown",
    classification: typeof entry.purgatoryClassification === "string" ? entry.purgatoryClassification : "unknown",
    identityConfidence: typeof entry.identityConfidence === "string" ? entry.identityConfidence : "unknown",
    duplicateRisk: typeof entry.duplicateRisk === "string" ? entry.duplicateRisk : "unknown",
    currentTotalsEligible: entry.currentTotalsEligible === true,
    manualReviewRequired: entry.manualReviewRequired !== false,
    suggestedRecoveryAction: typeof entry.suggestedRecoveryAction === "string" ? entry.suggestedRecoveryAction : "manual_review",
  }));

  return {
    evidenceClass: "generated_snapshot",
    productTruthRole: "recovery_evidence_only",
    productionMutationAllowed: false,
    currentTotalsEligibleCount,
    productTruthEligibleCount,
    overwritesCurrentTruth,
    staleReportPaths: reports.filter((entry) => entry.staleRelativeToCurrentHead).map((entry) => entry.path),
    historicalEvidenceOnlyPaths: reports.filter((entry) => entry.freshnessState === "historical_evidence_only").map((entry) => entry.path),
    reports,
    sourceInventory: {
      sourceCount: legacyNumber(inventorySummary, "sourceCount"),
      backfillableCount: legacyNumber(inventorySummary, "backfillableCount"),
      directionalCount: legacyNumber(inventorySummary, "directionalCount"),
      debugOnlyCount: legacyNumber(inventorySummary, "debugOnlyCount"),
      unavailableCount: legacyNumber(inventorySummary, "unavailableCount"),
    },
    reconciliation: {
      candidateCount: legacyNumber(historySummary, "candidateCount", legacyNumber(recoverySummary, "candidateCount")),
      exactMatchCount: legacyNumber(historySummary, "exactMatchCount", legacyNumber(recoverySummary, "exactMatchCount")),
      probableMatchCount: legacyNumber(historySummary, "probableMatchCount"),
      weakMatchCount: legacyNumber(historySummary, "weakMatchCount"),
      unknownLegacyCount: legacyNumber(historySummary, "unknownLegacyCount"),
      highDuplicateRiskCount: legacyNumber(historySummary, "highDuplicateRiskCount", legacyNumber(recoverySummary, "duplicateRiskHighCount")),
      manualReviewRequired,
    },
    purgatoryQueue: {
      totalCount: queueRows.length,
      weakMatchCount: legacyNumber(purgatorySummary, "weakMatch"),
      unknownCount: legacyNumber(purgatorySummary, "unknown"),
      duplicateCandidateCount: legacyNumber(purgatorySummary, "duplicateCandidate"),
      manualReviewRequired,
      sample: sampleQueue,
      sampleTruncated: queueRows.length > sampleQueue.length,
    },
    productTruthBoundary: "Legacy, historical snapshot, and GA4 evidence can explain gaps or seed manual review only. They cannot overwrite analytics_event_facts, wallet, GumDrop, unlock, purchase, creator revenue, or person metric truth.",
    nextExactSteps: [
      "Refresh the legacy history reconciliation artifacts when legacy mapping files change.",
      "Review weak/unknown purgatory rows with identity bridge evidence before any dry-run import candidate is promoted.",
      "Keep currentTotalsEligibleCount and productTruthEligibleCount at 0 until strict first-party corroboration exists.",
    ],
  };
}

function renderDoc(report: ReturnType<typeof buildAnalyticsPanelHydrationReport>) {
  const failureRows = report.topPanelHydrationFailures.map((panel) =>
    `- ${panel.panelLabel}: ${panel.hydrationStatus}; next=${panel.nextExactAction}`,
  );
  const evidenceRows = [
    `- Contributes live evidence: ${report.liveEvidenceContribution.contributes.join(", ") || "none"}`,
    `- Collecting with source: ${report.liveEvidenceContribution.collecting.join(", ") || "none"}`,
    `- Blocked: ${report.liveEvidenceContribution.blocked.join(", ") || "none"}`,
    `- Runtime evidence required: ${report.liveEvidenceContribution.runtimeEvidenceRequired.join(", ") || "none"}`,
    `- Admin truth source required: ${report.liveEvidenceContribution.adminTruthSourceRequired.join(", ") || "none"}`,
    `- External required: ${report.liveEvidenceContribution.externalRequired.join(", ") || "none"}`,
  ];
  return [
    "# Analytics Panel Hydration",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Total panels: ${report.totalPanels}`,
    `- Hydrated: ${report.hydratedPanels}`,
    `- Collecting: ${report.collectingPanels}`,
    `- Source-ready waiting for activity: ${report.sourceReadyWaitingForActivityPanels}`,
    `- Not observed but expected: ${report.notObservedButExpectedPanels}`,
    `- Stale: ${report.stalePanels}`,
    `- Source missing: ${report.sourceMissingPanels}`,
    `- Materializer missing: ${report.materializerMissingPanels}`,
    `- Bridge missing: ${report.bridgeMissingPanels}`,
    `- Runtime evidence required: ${report.runtimeEvidenceRequiredPanels}`,
    `- Admin truth source required: ${report.adminTruthSourceRequiredPanels}`,
    `- Provider gated: ${report.providerGatedPanels}`,
    `- External required: ${report.externalRequiredPanels}`,
    `- Permission blocked: ${report.permissionBlockedPanels}`,
    `- Broken: ${report.brokenPanels}`,
    "",
    "## Contract",
    "",
    "- Missing panel data is collecting, source-missing, materializer-missing, bridge-missing, external-required, permission-blocked, or broken. It is not zero.",
    "- A panel may display zero only when a bounded source loaded and proved zero.",
    "- Hydrated panel evidence can reduce formal evidence scope; stale, collecting, source-only, runtime-required, admin-truth-required, or external-required panels cannot clear formal provider/runtime/billing gates.",
    "- The report uses local source and generated artifacts only. It performs no production reads or provider calls.",
    "",
    "## Live Evidence",
    "",
    ...evidenceRows,
    "",
    "## Top Hydration Failures",
    "",
    ...(failureRows.length ? failureRows : ["- none"]),
    "",
    "## Debug Lane",
    "",
    `- ${report.debugLane.label}: total=${report.debugLane.totalPanels}; hydrated=${report.debugLane.hydrated}; collecting=${report.debugLane.collecting}; sourceReady=${report.debugLane.sourceReadyWaitingForActivity}; notObservedButExpected=${report.debugLane.notObservedButExpected}; sourceMissing=${report.debugLane.sourceMissing}; materializerMissing=${report.debugLane.materializerMissing}; bridgeMissing=${report.debugLane.bridgeMissing}; runtimeEvidenceRequired=${report.debugLane.runtimeEvidenceRequired}; adminTruthSourceRequired=${report.debugLane.adminTruthSourceRequired}; providerGated=${report.debugLane.providerGated}; externalRequired=${report.debugLane.externalRequired}; broken=${report.debugLane.broken}`,
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function compactReport(
  report: ReturnType<typeof buildAnalyticsPanelHydrationReport>,
  livePanelEvidence: ReturnType<typeof buildLivePanelEvidenceReport>,
  validationFailures: string[],
) {
  const dirtyFilesByClassification = report.dirtyFiles.reduce<Record<string, number>>((counts, file) => {
    counts[file.classification] = (counts[file.classification] ?? 0) + 1;
    return counts;
  }, {});
  const unsafeDirtyFiles = report.dirtyFiles
    .filter((file) => file.classification === "unsafe_unknown")
    .map((file) => file.path);
  return {
    reportKey: report.reportKey,
    generatedAtUtc: report.generatedAtUtc,
    currentHead: report.currentHead,
    productionReadsPerformed: report.productionReadsPerformed,
    providerCallsPerformed: report.providerCallsPerformed,
    rawSensitiveDataAllowed: report.rawSensitiveDataAllowed,
    scoreDimensions: report.scoreDimensions,
    totalPanels: report.totalPanels,
    hydratedPanels: report.hydratedPanels,
    stalePanels: report.stalePanels,
    collectingPanels: report.collectingPanels,
    sourceReadyWaitingForActivityPanels: report.sourceReadyWaitingForActivityPanels,
    notObservedButExpectedPanels: report.notObservedButExpectedPanels,
    sourceMissingPanels: report.sourceMissingPanels,
    materializerMissingPanels: report.materializerMissingPanels,
    bridgeMissingPanels: report.bridgeMissingPanels,
    runtimeEvidenceRequiredPanels: report.runtimeEvidenceRequiredPanels,
    adminTruthSourceRequiredPanels: report.adminTruthSourceRequiredPanels,
    providerGatedPanels: report.providerGatedPanels,
    externalRequiredPanels: report.externalRequiredPanels,
    permissionBlockedPanels: report.permissionBlockedPanels,
    brokenPanels: report.brokenPanels,
    panelsByGroup: report.panelsByGroup,
    panelStatus: Object.fromEntries(Object.values(report.panelStatus).map((panel) => [panel.panelId, panel.hydrationStatus])),
    topPanelHydrationFailures: report.topPanelHydrationFailures.map((panel) => ({
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      hydrationStatus: panel.hydrationStatus,
      nextExactAction: panel.nextExactAction,
    })),
    liveEvidenceContribution: report.liveEvidenceContribution,
    livePanelEvidenceSummary: {
      liveEvidencePanelIds: livePanelEvidence.liveEvidencePanelIds,
      externalRequiredPanelIds: livePanelEvidence.externalRequiredPanelIds,
      blockedPanelIds: livePanelEvidence.blockedPanelIds.slice(0, 10),
      blockedPanelCount: livePanelEvidence.blockedPanelIds.length,
    },
    betaGateImpact: report.betaGateImpact,
    debugLane: report.debugLane,
    dirtyFileSummary: {
      total: report.dirtyFiles.length,
      byClassification: dirtyFilesByClassification,
      unsafeUnknown: unsafeDirtyFiles,
      sample: report.dirtyFiles.slice(0, 8),
      sampleTruncated: report.dirtyFiles.length > 8,
    },
    nextExactSteps: report.nextExactSteps,
    validationFailures,
  };
}

function compactDayCoverage<T extends { dayKey: string }>(days: T[]) {
  return {
    days: days.slice(0, 14),
    dayCount: days.length,
    daysTruncated: days.length > 14,
    omittedDayCount: Math.max(0, days.length - 14),
    dayCoverageSummary: summarizeLaunchRecoveryDayEvidence(days),
  };
}

function compactFileList(files: unknown, sampleLimit = 4) {
  const list = asStringArray(files);
  return {
    samples: list.slice(0, sampleLimit),
    count: list.length,
    truncated: list.length > sampleLimit,
  };
}

function compactSourceFamilyStates(states: unknown) {
  return asRecordArray(states).map((state) => {
    const { activeSourceFiles, materializerFiles, proofBoundary, ...rest } = state;
    const boundary = asRecord(proofBoundary);
    const activeSourceFileSummary = compactFileList(activeSourceFiles, 2);
    const materializerFileSummary = compactFileList(materializerFiles, 2);
    return {
      ...rest,
      proofBoundarySummary: {
        productTruthSource: typeof boundary.productTruthSource === "string" ? boundary.productTruthSource : "unknown",
        sourceRole: typeof boundary.sourceRole === "string" ? boundary.sourceRole : "unknown",
        externalEvidenceCanClearProductTruth: boundary.externalEvidenceCanClearProductTruth === true,
        missingCanRenderAsZero: boundary.missingCanRenderAsZero === true,
        requiresLedgerCorroboration: boundary.requiresLedgerCorroboration === true,
        requiresWatchSessionRollup: boundary.requiresWatchSessionRollup === true,
        requiresAdminAuditFact: boundary.requiresAdminAuditFact === true,
      },
      activeSourceFiles: activeSourceFileSummary.samples,
      activeSourceFileCount: activeSourceFileSummary.count,
      activeSourceFilesTruncated: activeSourceFileSummary.truncated,
      materializerFiles: materializerFileSummary.samples,
      materializerFileCount: materializerFileSummary.count,
      materializerFilesTruncated: materializerFileSummary.truncated,
    };
  });
}

function compactLaunchAnalyticsRecoveryReport(
  report: ReturnType<typeof buildLaunchAnalyticsRecoveryReport>,
) {
  const { dayCoverage: formalDayCoverage, ...formalLaunchRange } = report.formalLaunchRange;
  const { days: localDayCoverage, ...launchHistoryCoverage } = report.launchHistoryCoverage;
  const { activeSourceCoverage: _topLevelActiveSourceCoverage, ...reportWithoutDuplicatedActiveSourceCoverage } = report;
  const compactFormalDays = compactDayCoverage(formalDayCoverage);
  const compactLocalDays = compactDayCoverage(localDayCoverage);

  return {
    ...reportWithoutDuplicatedActiveSourceCoverage,
    formalLaunchRange: {
      ...formalLaunchRange,
      dayCoverage: compactFormalDays.days,
      dayCoverageCount: compactFormalDays.dayCount,
      dayCoverageTruncated: compactFormalDays.daysTruncated,
      omittedDayCoverageCount: compactFormalDays.omittedDayCount,
      dayCoverageSummary: compactFormalDays.dayCoverageSummary,
    },
    launchHistoryCoverage: {
      ...launchHistoryCoverage,
      eventFamilyCoverage: {
        ...launchHistoryCoverage.eventFamilyCoverage,
        familySourceStates: compactSourceFamilyStates(launchHistoryCoverage.eventFamilyCoverage.familySourceStates),
      },
      activeSourceCoverage: {
        ...launchHistoryCoverage.activeSourceCoverage,
        familySourceStates: compactSourceFamilyStates(launchHistoryCoverage.activeSourceCoverage.familySourceStates),
      },
      days: compactLocalDays.days,
      dayCount: compactLocalDays.dayCount,
      daysTruncated: compactLocalDays.daysTruncated,
      omittedDayCount: compactLocalDays.omittedDayCount,
      dayCoverageSummary: compactLocalDays.dayCoverageSummary,
    },
    compactArtifact: true,
  };
}

function mergeImportedLaunchEventFamilyCoverage(
  computed: ReturnType<typeof buildLaunchCriticalRecoveryCoverageFromEvidence>,
  importedValue: unknown,
) {
  const imported = asRecord(importedValue);
  const importedRows = asRecordArray(imported.familySourceStates);
  if (importedRows.length !== computed.familySourceStates.length) return computed;

  const familySourceStates = importedRows
    .map((row) => {
      const familyId = typeof row.familyId === "string" ? row.familyId : "";
      const fallback = computed.familySourceStates.find((family) => family.familyId === familyId);
      if (!fallback) return null;
      const canonicalEventNames = asStringArray(row.canonicalEventNames);
      const dedupeDimensions = asStringArray(row.dedupeDimensions);
      return {
        ...fallback,
        canonicalEventNames: canonicalEventNames.length > 0 ? canonicalEventNames : fallback.canonicalEventNames,
        observedFirstParty: typeof row.observedFirstParty === "boolean" ? row.observedFirstParty : fallback.observedFirstParty,
        sourceTruth: typeof row.sourceTruth === "string" ? row.sourceTruth as typeof fallback.sourceTruth : fallback.sourceTruth,
        freshnessState: typeof row.freshnessState === "string" ? row.freshnessState as typeof fallback.freshnessState : fallback.freshnessState,
        evidenceKind: typeof row.evidenceKind === "string" ? row.evidenceKind as typeof fallback.evidenceKind : fallback.evidenceKind,
        strongestSourceTruth: typeof row.strongestSourceTruth === "string"
          ? row.strongestSourceTruth as typeof fallback.strongestSourceTruth
          : typeof row.sourceTruth === "string"
            ? row.sourceTruth as typeof fallback.strongestSourceTruth
            : fallback.strongestSourceTruth,
        strongestEvidenceKind: typeof row.strongestEvidenceKind === "string"
          ? row.strongestEvidenceKind as typeof fallback.strongestEvidenceKind
          : typeof row.evidenceKind === "string"
            ? row.evidenceKind as typeof fallback.strongestEvidenceKind
            : fallback.strongestEvidenceKind,
        confidenceScore: asNumber(row.confidenceScore, fallback.confidenceScore),
        confidenceBand: typeof row.confidenceBand === "string" ? row.confidenceBand as typeof fallback.confidenceBand : fallback.confidenceBand,
        dedupeKey: typeof row.dedupeKey === "string" ? row.dedupeKey : fallback.dedupeKey,
        dedupeDimensions: dedupeDimensions.length > 0 ? dedupeDimensions as typeof fallback.dedupeDimensions : fallback.dedupeDimensions,
        lateArrivalWindowDays: asNumber(row.lateArrivalWindowDays, fallback.lateArrivalWindowDays) as typeof fallback.lateArrivalWindowDays,
        sourceRole: typeof row.sourceRole === "string" ? row.sourceRole as typeof fallback.sourceRole : fallback.sourceRole,
        sourceCoverageState: typeof row.sourceCoverageState === "string"
          ? row.sourceCoverageState as typeof fallback.sourceCoverageState
          : fallback.sourceCoverageState,
        productTruthEligible: typeof row.productTruthEligible === "boolean" ? row.productTruthEligible : fallback.productTruthEligible,
        mathReason: typeof row.mathReason === "string" ? row.mathReason : fallback.mathReason,
        nextAction: typeof row.nextAction === "string" ? row.nextAction : fallback.nextAction,
      };
    })
    .filter((row): row is typeof computed.familySourceStates[number] => row !== null);
  if (familySourceStates.length !== computed.familySourceStates.length) return computed;

  const observedFirstPartyFamilyCount = familySourceStates.filter((family) => family.observedFirstParty).length;
  const productTruthEligibleFamilyCount = familySourceStates.filter((family) => family.productTruthEligible).length;
  const observedFirstPartyCoveragePercent = Math.round((observedFirstPartyFamilyCount / familySourceStates.length) * 1000) / 10;
  const sourceCoverageStateCounts = familySourceStates.reduce<Record<string, number>>((counts, family) => {
    counts[family.sourceCoverageState] = (counts[family.sourceCoverageState] ?? 0) + 1;
    return counts;
  }, {});
  const sourceRoleCounts = familySourceStates.reduce<Record<string, number>>((counts, family) => {
    counts[family.sourceRole] = (counts[family.sourceRole] ?? 0) + 1;
    return counts;
  }, {});
  const evidenceKindCounts = familySourceStates.reduce<Record<string, number>>((counts, family) => {
    counts[family.strongestEvidenceKind] = (counts[family.strongestEvidenceKind] ?? 0) + 1;
    return counts;
  }, {});
  const requiredObservedFirstPartyFamilyCount = Math.ceil(
    (familySourceStates.length * LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT) / 100,
  );
  const observedFirstPartyFamilyGapCount = Math.max(0, requiredObservedFirstPartyFamilyCount - observedFirstPartyFamilyCount);
  const sourceCoverageStatus = observedFirstPartyFamilyGapCount === 0 ? "pass" : "blocked";

  return {
    ...computed,
    observedFirstPartyFamilyCount,
    observedFirstPartyCoveragePercent,
    productTruthEligibleFamilyCount,
    modeledCalibrationFamilyCount: sourceCoverageStateCounts.modeled_second_source ?? 0,
    inferredLegacyFamilyCount: sourceCoverageStateCounts.inferred_legacy ?? 0,
    cachedSnapshotFamilyCount: sourceCoverageStateCounts.cached_snapshot ?? 0,
    missingSourceFamilyCount: sourceCoverageStateCounts.source_missing ?? 0,
    sourceCoverageStateCounts: {
      observed_first_party: sourceCoverageStateCounts.observed_first_party ?? 0,
      modeled_second_source: sourceCoverageStateCounts.modeled_second_source ?? 0,
      inferred_legacy: sourceCoverageStateCounts.inferred_legacy ?? 0,
      cached_snapshot: sourceCoverageStateCounts.cached_snapshot ?? 0,
      source_missing: sourceCoverageStateCounts.source_missing ?? 0,
    },
    sourceRoleCounts: {
      product_truth: sourceRoleCounts.product_truth ?? 0,
      calibration_only: sourceRoleCounts.calibration_only ?? 0,
      legacy_review: sourceRoleCounts.legacy_review ?? 0,
      snapshot_review: sourceRoleCounts.snapshot_review ?? 0,
      missing_source: sourceRoleCounts.missing_source ?? 0,
    },
    evidenceKindCounts: {
      observed: evidenceKindCounts.observed ?? 0,
      modeled: evidenceKindCounts.modeled ?? 0,
      inferred: evidenceKindCounts.inferred ?? 0,
      cached: evidenceKindCounts.cached ?? 0,
      missing: evidenceKindCounts.missing ?? 0,
    },
    sourceCoverageStatus,
    missingFamilies: familySourceStates
      .filter((family) => family.sourceCoverageState === "source_missing")
      .map((family) => family.familyId),
    familySourceStates,
    holdbackValidation: {
      ...computed.holdbackValidation,
      ...asRecord(imported.holdbackValidation),
      requiredObservedFirstPartyFamilyCount,
      observedFirstPartyFamilyCount,
      observedFirstPartyCoveragePercent,
      observedFirstPartyFamilyGapCount,
      calibrationOnlyFamilyCount: sourceCoverageStateCounts.modeled_second_source ?? 0,
      inferredLegacyFamilyCount: sourceCoverageStateCounts.inferred_legacy ?? 0,
      cachedSnapshotFamilyCount: sourceCoverageStateCounts.cached_snapshot ?? 0,
      missingSourceFamilyCount: sourceCoverageStateCounts.source_missing ?? 0,
      productTruthEligibleFamilyCount,
      status: sourceCoverageStatus,
    },
  } satisfies typeof computed;
}

function buildLaunchAnalyticsRecoveryReport(input: {
  generatedAtUtc: string;
  currentHead: string;
  panelReport: ReturnType<typeof buildAnalyticsPanelHydrationReport>;
  sourceAgreementResult: ReturnType<typeof buildLaunchSourceAgreementDetail>;
}) {
  const legacyRecovery = compactLegacyRecoverySummary();
  const sourceAgreementDetail = asRecord(input.sourceAgreementResult.detail);
  const sourceAgreementEvidence = asRecord(input.sourceAgreementResult.launchCoverageEvidence);
  const sourceAgreementHead = typeof input.sourceAgreementResult.inputHead === "string"
    ? input.sourceAgreementResult.inputHead
    : sourceAgreementEvidence.inputHead;
  const coverageRows = Array.isArray(sourceAgreementDetail.perSourceCoverage)
    ? sourceAgreementDetail.perSourceCoverage.map((entry) => asRecord(entry))
    : [];
  const daysBySource = new Map<string, Set<string>>();
  for (const row of coverageRows) {
    const source = typeof row.source === "string" ? row.source : "unknown";
    daysBySource.set(source, new Set(asStringArray(row.days)));
  }

  const firstPartyDays = daysBySource.get("first_party") ?? new Set<string>();
  const ga4Days = daysBySource.get("ga4") ?? new Set<string>();
  const historicalSnapshotDays = daysBySource.get("historical_snapshot") ?? new Set<string>();
  const legacySupportDays = daysBySource.get("legacy_support") ?? new Set<string>();
  const perDaySourceCounts = asRecord(sourceAgreementDetail.perDaySourceCounts);
  const internalAdminExcludedCountByDay = asRecord(sourceAgreementDetail.internalAdminExcludedCountByDay);
  const sourceCountsByDay = Object.fromEntries(
    Object.entries(perDaySourceCounts).map(([dayKey, counts]) => {
      const record = asRecord(counts);
      return [dayKey, {
        first_party: typeof record.first_party === "number" ? record.first_party : undefined,
        ga4: typeof record.ga4 === "number" ? record.ga4 : undefined,
        historicalSnapshot: typeof record.historicalSnapshot === "number" ? record.historicalSnapshot : undefined,
        legacySupport: typeof record.legacySupport === "number" ? record.legacySupport : undefined,
      }];
    }),
  );
  const sourceCoverageRows = buildLaunchHistorySourceCoverageRowsState({
    firstPartyDayKeys: firstPartyDays,
    ga4DayKeys: ga4Days,
    historicalSnapshotDayKeys: historicalSnapshotDays,
    legacySupportDayKeys: legacySupportDays,
    sourceCountsByDay,
    internalAdminExcludedCountByDay: Object.fromEntries(
      Object.entries(internalAdminExcludedCountByDay).map(([dayKey, count]) => [
        dayKey,
        typeof count === "number" ? asNumber(count, 0) : null,
      ]),
    ),
  });
  const expectedDays = sourceCoverageRows.expectedDayKeys;
  const dayCoverage = sourceCoverageRows.dayCoverage;
  const { sourceDayCounts } = sourceCoverageRows;
  const computedMissingDaysBySource = sourceCoverageRows.missingDaysBySource;
  const firstPartyMissingDays = sourceCoverageRows.firstPartyMissingDayKeys;
  const sourceMissingDays = sourceCoverageRows.sourceMissingDayKeys;
  const duplicateDays = sourceCoverageRows.duplicateDayKeys;
  const computedLaunchEventFamilyCoverage = buildLaunchCriticalRecoveryCoverageFromEvidence({
    generatedAtUtc: input.generatedAtUtc,
    launchHistoryDays: dayCoverage,
  });
  const launchEventFamilyCoverage = mergeImportedLaunchEventFamilyCoverage(
    computedLaunchEventFamilyCoverage,
    sourceAgreementDetail.eventFamilyCoverage,
  );
  const sourceAgreementSummary = buildSourceAgreementCoverageSummaryState({
    expectedDays,
    coverageBySource: {
      first_party: firstPartyDays,
      ga4: ga4Days,
      historical_snapshot: historicalSnapshotDays,
      legacy_support: legacySupportDays,
    },
  });
  const rawSourceAgreementState = sourceAgreementDetail.sourceAgreementStatus;
  const sourceAgreementState = typeof rawSourceAgreementState === "string"
    ? rawSourceAgreementState
    : sourceAgreementSummary.sourceAgreementStatus;
  const hasLaunchCoverageInput = typeof input.sourceAgreementResult.inputPath === "string"
    && input.sourceAgreementResult.inputPath.trim().length > 0;
  const staleEvidence = hasLaunchCoverageInput
    ? typeof sourceAgreementHead !== "string" || sourceAgreementHead !== input.currentHead
    : false;
  const launchCoverageSummary = buildLaunchHistoryCoverageSummaryState({
    expectedDayKeys: expectedDays,
    dayCoverage,
    firstPartyMissingDayKeys: firstPartyMissingDays,
    sourceMissingDayKeys: sourceMissingDays,
    staleEvidence,
    sourceAgreementState,
  });
  const status = expectedDays.length === 0
    ? "source_evidence_missing"
    : staleEvidence
      ? "stale_evidence_review"
      : sourceAgreementState === "failed" || sourceAgreementState === "fail"
        ? "source_agreement_failed"
        : "review";
  const disagreementCount = typeof sourceAgreementDetail.disagreementCount === "number"
    ? sourceAgreementDetail.disagreementCount
    : sourceAgreementSummary.disagreementCount;
  const maxDeltaPct = typeof sourceAgreementDetail.maxDeltaPct === "number"
    ? sourceAgreementDetail.maxDeltaPct
    : sourceAgreementSummary.activeSourceCount > 1
      ? sourceAgreementSummary.maxDeltaPct
      : null;
  const sourceAgreementDisagreements = Array.isArray(sourceAgreementDetail.disagreements)
    ? sourceAgreementDetail.disagreements.map((entry) => asRecord(entry))
    : [];
  const sourceAgreementClassifications = [
    ...new Set([
      ...classifySourceAgreementCoverage({
        expectedDays,
        ga4Days,
        firstPartyDays,
        historicalSnapshotDays,
        legacySupportDays,
        staleEvidence,
        disagreementCount,
        maxDeltaPct,
      }),
      ...sourceAgreementDisagreements.flatMap((entry) => asStringArray(entry.classifications)),
    ]),
  ];
  const perDayMetricDeltas = asRecordArray(sourceAgreementDetail.perDayMetricDeltas).map((entry) => ({
    dayKey: typeof entry.dayKey === "string" ? entry.dayKey : "unknown",
    metric: typeof entry.metric === "string" ? entry.metric : "source_count_delta",
    sourceTruthState: typeof entry.sourceTruthState === "string" ? entry.sourceTruthState : "source_missing",
    sourceTruth: typeof entry.sourceTruth === "string" ? entry.sourceTruth : "source_missing",
    freshnessState: typeof entry.freshnessState === "string" ? entry.freshnessState : "source_missing",
    evidenceKind: typeof entry.evidenceKind === "string" ? entry.evidenceKind : "missing",
    confidenceScore: asNumber(entry.confidenceScore, 0),
    confidenceBand: typeof entry.confidenceBand === "string" ? entry.confidenceBand : "missing",
    dedupeKey: typeof entry.dedupeKey === "string" ? entry.dedupeKey : `source_agreement_delta|${typeof entry.dayKey === "string" ? entry.dayKey : "unknown"}`,
    dedupeDimensions: asStringArray(entry.dedupeDimensions),
    lateArrivalWindowDays: asNumber(entry.lateArrivalWindowDays, ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS),
    primarySource: typeof entry.primarySource === "string" ? entry.primarySource : "first_party",
    secondSource: typeof entry.secondSource === "string" ? entry.secondSource : "ga4",
    primaryCount: asNumber(entry.primaryCount, 0),
    secondSourceCount: asNumber(entry.secondSourceCount, 0),
    deltaPct: asNumber(entry.deltaPct, 0),
    classifications: asStringArray(entry.classifications),
    nextAction: typeof entry.nextAction === "string" ? entry.nextAction : "Review source count delta before treating charts as canonical.",
  }));
  const sourceInventory = [
    {
      sourceId: "first_party_events",
      contract: "first_party",
      owner: "analytics_event_facts and telemetry catalog",
      canonicalFiles: ["src/lib/telemetry-catalog.ts", "src/app/api/analytics/ingest-identified/route.ts"],
      productTruthRole: "primary_product_truth",
      promotionRule: "Promote only when first-party day buckets or analytics_event_facts cover the bounded launch window.",
      localState: sourceDayCounts.firstParty > 0 ? "partial" : "source_missing",
      coveredDayCount: sourceDayCounts.firstParty,
      missingRanges: collapseLaunchRecoveryDayRanges(computedMissingDaysBySource.first_party),
      primaryFor: ["identity", "purchases", "unlocks", "drops", "watch", "tasks", "creator/admin actions"],
      proofBoundary: "Primary product analytics only after first-party materialization; this generated report is not runtime/admin proof.",
    },
    {
      sourceId: "user_person_metrics",
      contract: "person_metrics",
      owner: "person metrics hydration",
      canonicalFiles: ["src/lib/analytics/person-metrics-hydration.ts", "src/lib/analytics/person-metrics-contract.ts"],
      productTruthRole: "primary_person_truth",
      promotionRule: "Promote only after linked person metrics hydrate; global activity cannot clear this lane.",
      localState: "validator_passed",
      coveredDayCount: null,
      missingRanges: [],
      primaryFor: ["linked person metrics", "guest-to-user attribution", "individual user analytics"],
      proofBoundary: "Global activity does not clear user/person parity; missing person metrics stay missing until hydrated.",
    },
    {
      sourceId: "guest_to_user_handoff",
      contract: "first_party",
      owner: "identity handoff and analytics identity link",
      canonicalFiles: ["src/lib/analytics/analytics-identity-link.ts", "src/context/AuthContext.tsx", "src/lib/client-session.ts"],
      productTruthRole: "journey_linking_truth",
      promotionRule: "Use only to connect guest and signed-in journeys without duplicating the same action.",
      localState: "source_mapped",
      coveredDayCount: null,
      missingRanges: [],
      primaryFor: ["pre-auth journey continuity", "linked guest attribution"],
      proofBoundary: "Handoff links journeys but must not double-count guest and signed-in actions.",
    },
    {
      sourceId: "event_envelope_translation",
      contract: "first_party",
      owner: "event translation bridge and analytics event contract",
      canonicalFiles: ["src/lib/analytics/event-translation-bridge.ts", "src/lib/analytics/analytics-event-contract.ts"],
      productTruthRole: "normalization_truth",
      promotionRule: "Use for source event normalization only; translation parity does not prove runtime/provider/admin truth.",
      localState: "validator_passed",
      coveredDayCount: null,
      missingRanges: [],
      primaryFor: ["event envelope normalization", "alias translation", "runtime fact classification"],
      proofBoundary: "Source translation parity does not prove provider/runtime/admin truth.",
    },
    {
      sourceId: "admin_panel_hydration",
      contract: "mixed",
      owner: "admin analytics panel hydration",
      canonicalFiles: ["src/lib/admin-analytics/panel-hydration-resolver.ts", "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"],
      productTruthRole: "display_readiness_only",
      promotionRule: "Use to decide panel display state; it does not promote product metrics without source truth.",
      localState: input.panelReport.hydratedPanels > 0 ? "partial" : "collecting",
      coveredDayCount: null,
      missingRanges: [],
      primaryFor: ["admin analytics display readiness", "panel source labels"],
      proofBoundary: "Panels may be source-ready without runtime/admin truth evidence.",
    },
    {
      sourceId: "historical_snapshots",
      contract: "historicalSnapshot",
      owner: "admin analytics historical snapshot",
      canonicalFiles: ["src/app/api/admin/analytics/historical/route.ts", "src/lib/server/admin-analytics-historical-validation.ts"],
      productTruthRole: "fallback_evidence_only",
      promotionRule: "Use as gap explanation and chart continuity only; never overwrite first-party product truth.",
      localState: historicalSnapshotDays.size > 0 ? "fallback" : "source_missing",
      coveredDayCount: historicalSnapshotDays.size,
      missingRanges: collapseLaunchRecoveryDayRanges(computedMissingDaysBySource.historical_snapshot),
      primaryFor: ["bounded historical chart continuity", "fallback source agreement evidence"],
      proofBoundary: "Historical snapshots explain gaps but do not overwrite first-party product truth.",
    },
    {
      sourceId: "legacy_support_snapshots",
      contract: "legacySupport",
      owner: "legacy recovery/support snapshot lane",
      canonicalFiles: ["src/lib/analytics/legacy-recovery-contract.ts", "src/lib/analytics/legacy-history-reconciler.ts"],
      productTruthRole: "fallback_evidence_only",
      promotionRule: "Use for recovery review only; weak legacy evidence cannot create current product truth.",
      localState: legacySupportDays.size > 0 ? "fallback" : "source_missing",
      coveredDayCount: legacySupportDays.size,
      missingRanges: collapseLaunchRecoveryDayRanges(computedMissingDaysBySource.legacy_support),
      primaryFor: ["legacy explanation", "manual recovery review"],
      proofBoundary: "Legacy support remains recovery evidence only and cannot create current product truth.",
    },
    {
      sourceId: "ga4_export_api",
      contract: "ga4",
      owner: "GA4/external analytics truth lane",
      canonicalFiles: ["src/lib/analytics/ga4-truth.ts", "src/lib/server/admin-analytics/ga4-evidence.ts"],
      productTruthRole: "second_source_evidence_only",
      promotionRule: "Use for sessions, views, device, region, top paths, and acquisition comparison only.",
      localState: ga4Days.size > 0 ? "second_source" : "external_proof_required",
      coveredDayCount: ga4Days.size,
      missingRanges: collapseLaunchRecoveryDayRanges(computedMissingDaysBySource.ga4),
      primaryFor: ["sessions", "views", "device mix", "region demand", "top paths", "acquisition-style comparison"],
      proofBoundary: "GA4 is second-source evidence and cannot replace identity, wallet, entitlement, purchase, or creator revenue truth.",
    },
    {
      sourceId: "known_missing_ranges",
      contract: "unknown",
      owner: "launch analytics recovery",
      canonicalFiles: ["agent/state/launch-analytics-recovery.generated.json"],
      productTruthRole: "gap_triage_only",
      promotionRule: "Use to route recovery work; missing ranges remain missing until bounded source proof exists.",
      localState: sourceMissingDays.length > 0 ? "source_missing" : sourceAgreementState === "failed" || sourceAgreementState === "fail" ? "source_disagreement" : "none_observed",
      coveredDayCount: null,
      missingRanges: collapseLaunchRecoveryDayRanges(sourceMissingDays),
      primaryFor: ["gap triage", "next recovery action"],
      proofBoundary: "Missing stays missing; zero is allowed only after a bounded source window proves zero.",
    },
  ];
  const activeSourceReferences = buildLaunchCriticalActiveSourceReferences();
  const activeSourceCoverage = buildLaunchCriticalActiveSourceCoverageReport({
    generatedAtUtc: input.generatedAtUtc,
    sourceReferencesByEventName: activeSourceReferences.sourceReferencesByEventName,
    materializerReferencesByEventName: activeSourceReferences.materializerReferencesByEventName,
  });
  const allLaunchRangeProven = sourceAgreementDetail.allLaunchRangeProven === true;
  const coverageWindowKind = typeof sourceAgreementDetail.coverageWindowKind === "string"
    ? sourceAgreementDetail.coverageWindowKind
    : "local_source_window";
  const formalLaunchRange = buildFormalLaunchRangeRecoveryState({
    launchStartDayKey: LAUNCH_ANALYTICS_FIRST_DAY_KEY,
    generatedAtUtc: input.generatedAtUtc,
    allLaunchRangeProven,
    expectedDayKeys: expectedDays,
    localEvidenceDays: dayCoverage,
  });
  const launchSourceGate = buildLaunchRecoverySourceGateState({
    localEvidenceDayCount: expectedDays.length,
    staleEvidence,
    allLaunchRangeProven,
    coverageWindowKind,
    launchCoverageState: launchCoverageSummary.launchCoverage.state,
    firstPartyCoverageState: launchCoverageSummary.firstPartyCoverage.state,
    launchCriticalSourceCoverageStatus: launchEventFamilyCoverage.sourceCoverageStatus,
    launchCriticalObservedFirstPartyCoveragePercent: launchEventFamilyCoverage.observedFirstPartyCoveragePercent,
    sourceAgreementState,
  });
  const sourceAgreementBlockedConsumerDetails = asRecordArray(sourceAgreementDetail.blockedConsumerDetails);
  const sourceAgreementDisplayStateCounts = sourceAgreementBlockedConsumerDetails.reduce<Record<string, number>>((counts, entry) => {
    const state = typeof entry.allowedDisplayState === "string" ? entry.allowedDisplayState : "review";
    counts[state] = (counts[state] ?? 0) + 1;
    return counts;
  }, {});

  return {
    reportKey: "launch-analytics-recovery",
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
    evidenceClass: "generated_snapshot",
    canClearSourceGate: launchSourceGate.canClearSourceGate,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    sourceGateReason: launchSourceGate.sourceGateReason,
    sourceGateBlockers: launchSourceGate.sourceGateBlockers,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    rawSensitiveDataAllowed: false,
    status,
    sourceMap: {
      primaryTruth: "first_party",
      secondSource: "ga4",
      fallbackSources: ["historicalSnapshot", "legacySupport"],
      firstPartyOwns: ["user identity", "person metrics", "purchases", "unlocks", "drops", "watch", "tasks", "creator/admin actions"],
      ga4Owns: ["sessions", "views", "device mix", "region demand", "top paths", "acquisition-style comparison"],
      ga4CannotClear: ["wallet", "GumDrop balance", "unlock entitlement", "creator revenue", "person-level product truth"],
      canonicalOwners: {
        first_party: "analytics_event_facts and telemetry catalog",
        person_metrics: "person metrics hydration",
        guestHandoff: "identity handoff and analytics identity link",
        eventEnvelopeTranslation: "event translation bridge and analytics event contract",
        ga4: "GA4/external evidence lane",
        historicalSnapshot: "admin analytics historical snapshot",
        legacySupport: "legacy support snapshot lane",
        adminPanelHydration: "admin analytics panel hydration",
      },
      canonicalSourceFiles: [
        "src/lib/telemetry-catalog.ts",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/server/admin-analytics-historical-validation.ts",
        "src/lib/admin-analytics/panel-hydration-resolver.ts",
      ],
      sourceInventory,
    },
    formalLaunchRange,
    activeSourceCoverage,
    evidenceProvenance: {
      launchCoverageInput: input.sourceAgreementResult.inputPath ?? "in_process_source_agreement_detail",
      panelHydrationInput: "agent/state/analytics-panel-hydration.generated.json",
      sourceAgreementInputHead: typeof sourceAgreementHead === "string" ? sourceAgreementHead : null,
      sourceAgreementInputMode: input.sourceAgreementResult.inputMode,
      sourceAgreementInputPath: input.sourceAgreementResult.inputPath,
      usableLaunchCoverageInputFound: sourceAgreementEvidence.usableInputFound === true,
      candidateLaunchCoverageInputPaths: asStringArray(sourceAgreementEvidence.candidateInputPaths),
      candidateLaunchCoverageInputStatuses: asRecordArray(sourceAgreementEvidence.candidateInputStatuses).map((entry) => ({
        path: typeof entry.path === "string" ? entry.path : "unknown",
        state: typeof entry.state === "string" ? entry.state : "unknown",
        proofMode: typeof entry.proofMode === "string" ? entry.proofMode : "none",
        nextAction: typeof entry.nextAction === "string" ? entry.nextAction : "Attach launch-history coverage before treating this as source proof.",
      })),
      ga4ReadMode: "generated/local evidence only; no provider call performed",
      firstPartyReadMode: "source-agreement day-bucket evidence only; no production read performed",
      limitation: "This generated snapshot cannot clear runtime, provider, or admin-truth gates; use the all-range historical route/admin truth sample for formal launch-history proof.",
    },
    launchHistoryCoverage: (() => {
      const coverage = {
        rangeProof: buildLaunchHistoryRangeProofState({
          expectedRangeSource: normalizeLaunchHistoryRangeProofKind(coverageWindowKind),
          coverageWindowKind,
          allLaunchRangeProven,
          formalLaunchRange,
          reason: launchSourceGate.allLaunchRangeProofReason,
        }),
        rangeStartDayKey: expectedDays[0] ?? null,
        rangeEndDayKey: expectedDays[expectedDays.length - 1] ?? null,
        firstRecoveredDayKey: launchCoverageSummary.firstRecoveredDayKey,
        lastRecoveredDayKey: launchCoverageSummary.lastRecoveredDayKey,
        expectedDayCount: expectedDays.length,
        recoveredDayCount: launchCoverageSummary.recoveredDayCount,
        evidenceObservedDayCount: launchCoverageSummary.evidenceObservedDayCount,
        productTruthRecoveredDayCount: launchCoverageSummary.productTruthRecoveredDayCount,
        secondSourceOnlyDayCount: launchCoverageSummary.secondSourceOnlyDayCount,
        fallbackOnlyDayCount: launchCoverageSummary.fallbackOnlyDayCount,
        preLaunchIgnoredDayCount: 0,
        sourceDayCounts,
        firstPartyCoverage: {
          state: launchCoverageSummary.firstPartyCoverage.state,
          coveredDayCount: sourceDayCounts.firstParty,
          missingRanges: collapseLaunchRecoveryDayRanges(firstPartyMissingDays),
          canPromoteProductTruth: launchCoverageSummary.firstPartyCoverage.canPromoteProductTruth,
          reason: launchCoverageSummary.firstPartyCoverage.reason,
        },
        eventFamilyCoverage: {
          canonicalMappedFamilyCount: launchEventFamilyCoverage.canonicalMappedFamilyCount,
          canonicalMappingCoveragePercent: launchEventFamilyCoverage.canonicalMappingCoveragePercent,
          observedFirstPartyFamilyCount: launchEventFamilyCoverage.observedFirstPartyFamilyCount,
          observedFirstPartyCoveragePercent: launchEventFamilyCoverage.observedFirstPartyCoveragePercent,
          sourceCoverageStatus: launchEventFamilyCoverage.sourceCoverageStatus,
          holdbackValidation: launchEventFamilyCoverage.holdbackValidation,
          familySourceStates: launchEventFamilyCoverage.familySourceStates,
        },
        sourceGateBlockers: launchSourceGate.sourceGateBlockers,
        activeSourceCoverage: {
          activeSourceFamilyCount: activeSourceCoverage.activeSourceFamilyCount,
          activeSourceCoveragePercent: activeSourceCoverage.activeSourceCoveragePercent,
          targetCoveragePercent: activeSourceCoverage.targetCoveragePercent,
          sourceCoverageStatus: activeSourceCoverage.sourceCoverageStatus,
          canClearHistoricalLaunchProof: activeSourceCoverage.canClearHistoricalLaunchProof,
          familySourceStates: activeSourceCoverage.familySourceStates,
          policy: activeSourceCoverage.policy,
        },
        days: dayCoverage,
        missingRanges: collapseLaunchRecoveryDayRanges(sourceMissingDays),
        missingRangesBySource: Object.fromEntries(
          Object.entries({ ...computedMissingDaysBySource, ...asRecord(sourceAgreementDetail.missingDaysBySource) })
            .map(([source, days]) => [source, collapseLaunchRecoveryDayRanges(asStringArray(days))]),
        ),
        missingDaysBySource: { ...computedMissingDaysBySource, ...asRecord(sourceAgreementDetail.missingDaysBySource) },
        duplicateRanges: collapseLaunchRecoveryDayRanges(duplicateDays),
        sourceOverlapRanges: collapseLaunchRecoveryDayRanges(duplicateDays),
        state: launchCoverageSummary.launchCoverage.state,
        reason: launchCoverageSummary.launchCoverage.reason,
        staleInputEvidence: staleEvidence,
        sourceAgreementEvidenceHead: sourceAgreementHead,
      };
      return {
        displaySummary: buildLaunchHistoryDisplaySummaryState({
          launchHistoryCoverage: coverage,
          sourceAgreementState,
        }),
        ...coverage,
      };
    })(),
    recoveredMetricMetadataCompleteness: {
      eventFamilySourceStates: summarizeRecoveredMetricMetadataCompleteness(launchEventFamilyCoverage.familySourceStates),
      activeSourceFamilyStates: summarizeRecoveredMetricMetadataCompleteness(activeSourceCoverage.familySourceStates),
      localEvidenceDays: summarizeRecoveredMetricMetadataCompleteness(dayCoverage),
      formalLaunchDayCoverage: summarizeRecoveredMetricMetadataCompleteness(formalLaunchRange.dayCoverage),
      sourceAgreementDisagreements: summarizeRecoveredMetricMetadataCompleteness(sourceAgreementDisagreements),
      sourceAgreementMetricDeltas: summarizeRecoveredMetricMetadataCompleteness(perDayMetricDeltas),
      proofBoundary: RECOVERED_METRIC_METADATA_PROOF_BOUNDARY,
    },
    recoveryPolicy: {
      dedupeRules: RECOVERY_METRIC_DEDUPE_RULES,
      productTruthPolicy: RECOVERY_METRIC_PRODUCT_TRUTH_POLICY,
      modelingPolicy: RECOVERY_METRIC_MODELING_POLICY,
      proofBoundary: RECOVERY_METRIC_POLICY_PROOF_BOUNDARY,
    },
    sourceAgreement: {
      comparedSources: asStringArray(sourceAgreementDetail.comparedSources),
      comparedMetrics: asStringArray(sourceAgreementDetail.comparedMetrics),
      tolerance: "10% day coverage delta triggers review; 25% day coverage delta or repeated disagreement fails.",
      disagreementCount,
      maxDeltaPct,
      state: sourceAgreementState,
      classifications: sourceAgreementClassifications,
      disagreements: sourceAgreementDisagreements.slice(0, 25),
      disagreementsTruncated: sourceAgreementDisagreements.length > 25,
      blockedConsumerDetails: asRecordArray(sourceAgreementDetail.blockedConsumerDetails).slice(0, 25),
      blockedConsumerDetailsTruncated: asRecordArray(sourceAgreementDetail.blockedConsumerDetails).length > 25,
      perDayMetricDeltas: perDayMetricDeltas.slice(0, 25),
      perDayMetricDeltasTruncated: perDayMetricDeltas.length > 25,
      nextExactSteps: asStringArray(sourceAgreementDetail.nextExactSteps),
      sourceTruthPolicy: asRecord(sourceAgreementDetail.sourceTruthPolicy),
      nextAction: typeof sourceAgreementDetail.nextAction === "string"
        ? sourceAgreementDetail.nextAction
        : "Run the all-time historical analytics source path and keep GA4 as second-source evidence.",
    },
    legacyRecovery,
    adminPanelConnection: {
      totalPanels: input.panelReport.totalPanels,
      hydratedPanels: input.panelReport.hydratedPanels,
      sourceMissingPanels: input.panelReport.sourceMissingPanels,
      materializerMissingPanels: input.panelReport.materializerMissingPanels,
      bridgeMissingPanels: input.panelReport.bridgeMissingPanels,
      runtimeEvidenceRequiredPanels: input.panelReport.runtimeEvidenceRequiredPanels,
      externalRequiredPanels: input.panelReport.externalRequiredPanels,
      sourceAgreementBlockedConsumers: sourceAgreementBlockedConsumerDetails.length,
      sourceAgreementSourceMissingConsumers: sourceAgreementDisplayStateCounts.source_missing ?? 0,
      sourceAgreementSecondSourceConsumers: sourceAgreementDisplayStateCounts.second_source_only ?? 0,
      sourceAgreementChartPromotionBlockedConsumers: sourceAgreementDisplayStateCounts.chart_promotion_blocked ?? 0,
      sourceAgreementConsumerMismatchConsumers: sourceAgreementDisplayStateCounts.consumer_source_mismatch ?? 0,
    },
    nextExactSteps: [
      "Use /api/admin/analytics/historical with range=all to hydrate launchHistoryCoverage from first-party day buckets before charts can be treated as canonical.",
      "Compare GA4 day buckets only as second-source evidence; do not average or overwrite first-party product metrics.",
      "Keep missing days labeled source missing until a bounded source window proves zero.",
      "Repair source agreement before treating admin charts as canonical launch-history truth.",
    ],
    validationFailures: [] as string[],
  };
}

function validateLaunchAnalyticsRecoveryReport(report: ReturnType<typeof buildLaunchAnalyticsRecoveryReport>) {
  const failures: string[] = [];
  const contractSources = new Set(Object.keys(report.sourceMap.canonicalOwners));
  for (const required of ["first_party", "person_metrics", "guestHandoff", "eventEnvelopeTranslation", "ga4", "historicalSnapshot", "legacySupport", "adminPanelHydration"]) {
    if (!contractSources.has(required)) {
      failures.push(`launch recovery source map missing ${required} canonical owner.`);
    }
  }
  const sourceInventoryIds = new Set(report.sourceMap.sourceInventory.map((entry) => entry.sourceId));
  for (const required of [
    "first_party_events",
    "user_person_metrics",
    "guest_to_user_handoff",
    "event_envelope_translation",
    "admin_panel_hydration",
    "historical_snapshots",
    "legacy_support_snapshots",
    "ga4_export_api",
    "known_missing_ranges",
  ]) {
    if (!sourceInventoryIds.has(required)) {
      failures.push(`launch recovery source inventory missing ${required}.`);
    }
  }
  if (report.sourceMap.sourceInventory.some((entry) => !entry.proofBoundary || !Array.isArray(entry.canonicalFiles) || entry.canonicalFiles.length === 0)) {
    failures.push("launch recovery source inventory entries require proof boundaries and canonical files.");
  }
  if (report.sourceMap.sourceInventory.some((entry) => typeof entry.productTruthRole !== "string" || typeof entry.promotionRule !== "string")) {
    failures.push("launch recovery source inventory entries require productTruthRole and promotionRule.");
  }
  const inventoryById = new Map(report.sourceMap.sourceInventory.map((entry) => [entry.sourceId, entry]));
  if (inventoryById.get("first_party_events")?.productTruthRole !== "primary_product_truth") {
    failures.push("first-party launch source must remain primary product truth.");
  }
  if (inventoryById.get("ga4_export_api")?.productTruthRole !== "second_source_evidence_only") {
    failures.push("GA4 launch source must remain second-source evidence only.");
  }
  for (const fallbackId of ["historical_snapshots", "legacy_support_snapshots"]) {
    if (inventoryById.get(fallbackId)?.productTruthRole !== "fallback_evidence_only") {
      failures.push(`${fallbackId} must remain fallback evidence only.`);
    }
  }
  if (report.sourceMap.primaryTruth !== "first_party" || report.sourceMap.secondSource !== "ga4") {
    failures.push("launch recovery must keep first_party primary and ga4 second-source.");
  }
  if (report.providerCallsPerformed || report.productionReadsPerformed) {
    failures.push("launch recovery generated report must not claim provider calls or production reads.");
  }
  if (report.canClearRuntimeGate || report.canClearProviderGate || report.canClearAdminTruthGate) {
    failures.push("launch recovery generated snapshot must not clear runtime, provider, or admin truth gates.");
  }
  if (report.canClearSourceGate && (
    report.launchHistoryCoverage.state !== "available"
    || report.launchHistoryCoverage.firstPartyCoverage.state !== "available"
    || report.launchHistoryCoverage.eventFamilyCoverage?.sourceCoverageStatus !== "pass"
    || report.launchHistoryCoverage.eventFamilyCoverage?.observedFirstPartyCoveragePercent < LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT
    || report.sourceAgreement.state !== "pass"
    || report.launchHistoryCoverage.rangeProof.allLaunchRangeProven !== true
    || report.formalLaunchRange.state !== "all_launch_range_proven"
    || report.launchHistoryCoverage.staleInputEvidence
  )) {
    failures.push("launch recovery cannot clear source gate until first-party day coverage and launch-critical family coverage are available, source agreement passes, all-launch range proof exists, and evidence is current.");
  }
  if (!report.canClearSourceGate && (!report.sourceGateReason || !report.sourceGateReason.trim())) {
    failures.push("blocked launch recovery source gate must explain the reason.");
  }
  if (report.canClearSourceGate && report.sourceGateBlockers.length > 0) {
    failures.push("cleared launch recovery source gate must not list blockers.");
  }
  if (!report.canClearSourceGate && report.sourceGateBlockers.length === 0) {
    failures.push("blocked launch recovery source gate must list typed blockers.");
  }
  if (report.sourceGateBlockers.some((entry) =>
    typeof entry.blocker !== "string"
    || typeof entry.reason !== "string"
    || typeof entry.nextAction !== "string"
    || !entry.reason.trim()
    || !entry.nextAction.trim()
  )) {
    failures.push("launch recovery source gate blockers must include blocker, reason, and nextAction.");
  }
  if (report.launchHistoryCoverage.staleInputEvidence && report.status !== "stale_evidence_review") {
    failures.push("stale launch source evidence must surface as stale_evidence_review.");
  }
  if (!report.launchHistoryCoverage.staleInputEvidence && report.sourceAgreement.state === "failed" && report.status !== "source_agreement_failed") {
    failures.push("current failed source agreement must surface as source_agreement_failed.");
  }
  if (!Array.isArray(report.launchHistoryCoverage.days) || report.launchHistoryCoverage.days.length !== report.launchHistoryCoverage.expectedDayCount) {
    failures.push("launch recovery must expose server-shaped launchHistoryCoverage.days.");
  }
  if (!Array.isArray(report.launchHistoryCoverage.missingRanges)) {
    failures.push("launch recovery missingRanges must use the existing launchHistoryCoverage array shape.");
  }
  if (!["available", "partial", "source_missing"].includes(report.launchHistoryCoverage.state)) {
    failures.push("launch recovery must expose launchHistoryCoverage.state.");
  }
  if (typeof report.launchHistoryCoverage.reason !== "string" || !report.launchHistoryCoverage.reason.trim()) {
    failures.push("launch recovery must explain launchHistoryCoverage.reason.");
  }
  if (report.launchHistoryCoverage.expectedDayCount > 0 && (!report.launchHistoryCoverage.rangeStartDayKey || !report.launchHistoryCoverage.rangeEndDayKey)) {
    failures.push("launch recovery expected days require rangeStartDayKey and rangeEndDayKey.");
  }
  if (!report.launchHistoryCoverage.rangeProof || typeof report.launchHistoryCoverage.rangeProof.allLaunchRangeProven !== "boolean") {
    failures.push("launch recovery must state whether source evidence proves the full all-launch range.");
  }
  if (!report.launchHistoryCoverage.displaySummary || typeof report.launchHistoryCoverage.displaySummary.coverageLabel !== "string") {
    failures.push("launch recovery must expose a canonical displaySummary from the recovery spine.");
  }
  const displaySummary = asRecord(report.launchHistoryCoverage.displaySummary);
  const firstRecoveredDayKey = typeof report.launchHistoryCoverage.firstRecoveredDayKey === "string"
    ? report.launchHistoryCoverage.firstRecoveredDayKey
    : "";
  if (firstRecoveredDayKey) {
    const sourceWindowLabel = typeof displaySummary.sourceWindowLabel === "string" ? displaySummary.sourceWindowLabel : "";
    const expectedWindowPrefix = report.launchHistoryCoverage.rangeProof.allLaunchRangeProven
      ? "Launch history"
      : "Launch evidence window since";
    if (!sourceWindowLabel.startsWith(expectedWindowPrefix) || !sourceWindowLabel.includes(firstRecoveredDayKey)) {
      failures.push("launch recovery displaySummary sourceWindowLabel must come from the recovery spine coverage window.");
    }
  } else if (displaySummary.sourceWindowLabel !== null && displaySummary.sourceWindowLabel !== undefined) {
    failures.push("launch recovery displaySummary sourceWindowLabel must stay null until a recovered source window exists.");
  }
  const metadataCompleteness = asRecord(report.recoveredMetricMetadataCompleteness);
  const metadataProofKeys = [
    "eventFamilySourceStates",
    "activeSourceFamilyStates",
    "localEvidenceDays",
    "formalLaunchDayCoverage",
    "sourceAgreementDisagreements",
    "sourceAgreementMetricDeltas",
  ];
  for (const key of metadataProofKeys) {
    const summary = asRecord(metadataCompleteness[key]);
    if (summary.status !== "complete") {
      failures.push(`launch recovery recoveredMetricMetadataCompleteness.${key} must be complete.`);
    }
    if (summary.expectedLateArrivalWindowDays !== ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS) {
      failures.push(`launch recovery recoveredMetricMetadataCompleteness.${key} must enforce the ${ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS}-day late-arrival window.`);
    }
    if (!Array.isArray(summary.requiredFields) || !summary.requiredFields.includes("dedupeKey")) {
      failures.push(`launch recovery recoveredMetricMetadataCompleteness.${key} must declare required metadata fields.`);
    }
  }
  if (metadataCompleteness.proofBoundary !== RECOVERED_METRIC_METADATA_PROOF_BOUNDARY) {
    failures.push("launch recovery metadata completeness must stay metadata-only and not clear source/runtime/provider/admin truth gates.");
  }
  const recoveryPolicy = asRecord(report.recoveryPolicy);
  const dedupeRules = asRecord(recoveryPolicy.dedupeRules);
  const productTruthPolicy = asRecord(recoveryPolicy.productTruthPolicy);
  const modelingPolicy = asRecord(recoveryPolicy.modelingPolicy);
  if (
    dedupeRules.includesEventId !== true
    || dedupeRules.includesSessionId !== true
    || dedupeRules.includesIdentityLinkId !== true
    || dedupeRules.includesUserIdOrGuestId !== true
    || dedupeRules.includesRoute !== true
    || dedupeRules.includesObjectId !== true
    || dedupeRules.includesTimestampWindow !== true
    || dedupeRules.includesSemanticAction !== true
    || dedupeRules.eventIdIsPrimaryWhenPresent !== true
    || dedupeRules.identityLinkPrecedesUserOrGuestWhenPresent !== true
    || dedupeRules.fallbackUsesSessionIdentityRouteObjectAndTimestampWindow !== true
  ) {
    failures.push("launch recovery must expose the central event-id-primary dedupe policy.");
  }
  if (
    productTruthPolicy.firstPartyPrimary !== true
    || productTruthPolicy.ga4EvidenceOnly !== true
    || productTruthPolicy.legacyEvidenceOnly !== true
    || productTruthPolicy.missingIsNotZero !== true
    || productTruthPolicy.noBalanceOrEntitlementMutation !== true
  ) {
    failures.push("launch recovery must expose the central product-truth recovery policy.");
  }
  if (
    modelingPolicy.canonicalModeledSpelling !== "modeled"
    || modelingPolicy.acceptsBritishModelledAlias !== true
    || modelingPolicy.modeledEvidenceCanCalibrateOnly !== true
    || modelingPolicy.observedFirstPartyHoldbackRequired !== true
    || modelingPolicy.consentModeLikeSignalsAreEvidenceOnly !== true
    || modelingPolicy.lateArrivalWindowDays !== ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    || modelingPolicy.visibilityCountingRequiresExplicitThreshold !== true
    || modelingPolicy.visibilityMinimumVisiblePercent !== 50
    || modelingPolicy.visibilityMinimumVisibleMs !== 1_000
    || modelingPolicy.missingSourceNeverBecomesZero !== true
    || modelingPolicy.productTruthRequiresFirstPartyOrLedgerCorroboration !== true
  ) {
    failures.push("launch recovery must expose the central modeled/visibility evidence policy.");
  }
  if (recoveryPolicy.proofBoundary !== RECOVERY_METRIC_POLICY_PROOF_BOUNDARY) {
    failures.push("launch recovery policy metadata must not clear runtime/provider/admin truth gates.");
  }
  if (
    report.launchHistoryCoverage.displaySummary &&
    report.launchHistoryCoverage.displaySummary.missingRangeCount !== (
      report.launchHistoryCoverage.firstPartyCoverage.missingRanges.length || report.launchHistoryCoverage.missingRanges.length
    )
  ) {
    failures.push("launch recovery displaySummary missingRangeCount must agree with first-party/source missing ranges.");
  }
  if (
    report.launchHistoryCoverage.rangeProof.allLaunchRangeProven === true
    && !["admin_truth_sample", "all_range_historical_export"].includes(report.launchHistoryCoverage.rangeProof.coverageWindowKind)
  ) {
    failures.push("launch recovery all-launch proof must come from a formal admin truth sample or approved all-range historical export.");
  }
  if (!report.launchHistoryCoverage.rangeProof.coverageWindowKind) {
    failures.push("launch recovery must label whether source agreement coverage is fixture/local/export evidence.");
  }
  if (report.launchHistoryCoverage.rangeProof.formalRangeStartDayKey !== report.formalLaunchRange.launchStartDayKey) {
    failures.push("launch range proof must expose the formal launch start day.");
  }
  if (report.launchHistoryCoverage.rangeProof.formalRangeEndDayKey !== report.formalLaunchRange.expectedThroughDayKey) {
    failures.push("launch range proof must expose the formal launch end day.");
  }
  if (report.launchHistoryCoverage.rangeProof.formalExpectedDayCount !== report.formalLaunchRange.expectedDayCount) {
    failures.push("launch range proof must expose the formal expected day count.");
  }
  if (report.launchHistoryCoverage.rangeProof.evidenceDayCount !== report.formalLaunchRange.localEvidenceDayCount) {
    failures.push("launch range proof must expose the bounded evidence day count.");
  }
  if (
    JSON.stringify(report.launchHistoryCoverage.rangeProof.unprovenRanges)
    !== JSON.stringify(report.formalLaunchRange.unprovenRanges)
  ) {
    failures.push("launch range proof unproven ranges must match formalLaunchRange.");
  }
  if (!report.formalLaunchRange || report.formalLaunchRange.launchStartDayKey !== LAUNCH_ANALYTICS_FIRST_DAY_KEY) {
    failures.push("launch recovery must expose formalLaunchRange from the canonical launch start day.");
  }
  if (report.formalLaunchRange.expectedDayCount < report.formalLaunchRange.localEvidenceDayCount) {
    failures.push("formal launch range expected days cannot be smaller than local evidence days.");
  }
  if (report.formalLaunchRange.state === "formal_proof_missing" && report.formalLaunchRange.unprovenRanges.length === 0) {
    failures.push("formal launch range must list unproven ranges when all-launch proof is missing.");
  }
  if (report.formalLaunchRange.state === "all_launch_range_proven" && report.formalLaunchRange.approvedCoverageDayCount !== report.formalLaunchRange.expectedDayCount) {
    failures.push("formal launch range proof must cover every expected launch day before clearing source truth.");
  }
  if (!Array.isArray(report.formalLaunchRange.dayCoverage) || report.formalLaunchRange.dayCoverage.length !== report.formalLaunchRange.expectedDayCount) {
    failures.push("formal launch range must expose one dayCoverage row for every launch day.");
  }
  const formalUnprovenDayCount = report.formalLaunchRange.dayCoverage.filter((day) => day.formalEvidenceState === "outside_evidence_window").length;
  if (formalUnprovenDayCount !== report.formalLaunchRange.unprovenDayCount) {
    failures.push("formal launch range unprovenDayCount must match outside_evidence_window day rows.");
  }
  for (const day of report.formalLaunchRange.dayCoverage) {
    if (day.formalEvidenceState === "outside_evidence_window") {
      if (day.recovered || day.confidence !== "unknown" || day.sourceCountsKnown !== false) {
        failures.push(`formal launch day ${day.dayKey} outside evidence window must stay unrecovered and unknown.`);
      }
      if (day.evidenceObserved !== false || day.productTruthRecovered !== false || day.sourceTruthState !== "source_missing") {
        failures.push(`formal launch day ${day.dayKey} outside evidence window must stay source_missing with no product truth recovery.`);
      }
      if (Object.values(day.sourceCounts).some((value) => value !== null)) {
        failures.push(`formal launch day ${day.dayKey} outside evidence window must use null source counts, not zero.`);
      }
    }
  }
  if (report.launchHistoryCoverage.rangeProof.allLaunchRangeProven !== (report.formalLaunchRange.state === "all_launch_range_proven")) {
    failures.push("formal launch range state must agree with launchHistoryCoverage range proof.");
  }
  if (report.launchHistoryCoverage.rangeProof.coverageWindowKind === "fixture_only_local_window" && report.evidenceProvenance.usableLaunchCoverageInputFound) {
    failures.push("fixture-only launch recovery cannot claim a usable local coverage input.");
  }
  if (!Array.isArray(report.evidenceProvenance.candidateLaunchCoverageInputPaths) || report.evidenceProvenance.candidateLaunchCoverageInputPaths.length === 0) {
    failures.push("launch recovery must list candidate local/export input paths.");
  }
  if (
    !Array.isArray(report.evidenceProvenance.candidateLaunchCoverageInputStatuses)
    || report.evidenceProvenance.candidateLaunchCoverageInputStatuses.length === 0
  ) {
    failures.push("launch recovery must classify candidate local/export input status.");
  }
  if (report.launchHistoryCoverage.rangeProof.coverageWindowKind === "fixture_only_local_window") {
    const candidateStates = new Set(report.evidenceProvenance.candidateLaunchCoverageInputStatuses.map((entry) => entry.state));
    if (!candidateStates.has("missing") || !candidateStates.has("present_without_launch_history_coverage")) {
      failures.push("fixture launch recovery must distinguish missing exports from present samples without launchHistoryCoverage.");
    }
  }
  if (!report.launchHistoryCoverage.firstPartyCoverage || !["available", "partial", "source_missing"].includes(report.launchHistoryCoverage.firstPartyCoverage.state)) {
    failures.push("launch recovery must expose firstPartyCoverage state.");
  }
  if (report.launchHistoryCoverage.firstPartyCoverage.state !== "available" && report.launchHistoryCoverage.firstPartyCoverage.canPromoteProductTruth) {
    failures.push("first-party product truth cannot be promoted when firstPartyCoverage is not available.");
  }
  if (!report.launchHistoryCoverage.eventFamilyCoverage) {
    failures.push("launch recovery must expose eventFamilyCoverage from the recovery spine.");
  } else {
    const eventFamilyCoverage = report.launchHistoryCoverage.eventFamilyCoverage;
    if (eventFamilyCoverage.canonicalMappingCoveragePercent !== 100 || eventFamilyCoverage.canonicalMappedFamilyCount <= 0) {
      failures.push("launch recovery eventFamilyCoverage must preserve 100% canonical launch-critical mapping.");
    }
    if (
      eventFamilyCoverage.sourceCoverageStatus === "pass"
      && eventFamilyCoverage.observedFirstPartyCoveragePercent < LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT
    ) {
      failures.push(`launch recovery eventFamilyCoverage cannot pass below the ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% first-party coverage floor.`);
    }
    if (eventFamilyCoverage.holdbackValidation?.modeledOrInferredCanCalibrateOnly !== true) {
      failures.push("launch recovery eventFamilyCoverage must keep modeled/inferred evidence calibration-only.");
    }
    if (!Array.isArray(eventFamilyCoverage.familySourceStates) || eventFamilyCoverage.familySourceStates.length !== 13) {
      failures.push("launch recovery eventFamilyCoverage must include one source state per launch-critical family.");
    }
    if (eventFamilyCoverage.familySourceStates?.some((entry) =>
      typeof entry.sourceTruth !== "string"
      || typeof entry.freshnessState !== "string"
      || typeof entry.confidenceScore !== "number"
      || typeof entry.evidenceKind !== "string"
      || typeof entry.dedupeKey !== "string"
      || entry.lateArrivalWindowDays !== ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    )) {
      failures.push("launch recovery eventFamilyCoverage rows must expose sourceTruth, freshnessState, confidenceScore, evidenceKind, dedupeKey, and lateArrivalWindowDays.");
    }
    if (eventFamilyCoverage.familySourceStates?.some((entry) => entry.observedFirstParty !== true && entry.productTruthEligible === true)) {
      failures.push("launch recovery eventFamilyCoverage cannot mark non-first-party families product-truth eligible.");
    }
    const expectedSourceRoleCounts = summarizeLaunchRecoveryFamilySourceStates(eventFamilyCoverage.familySourceStates).sourceRoleCounts;
    const actualSourceRoleCounts = stableNumberRecord(asRecord(displaySummary.sourceRoleCounts));
    if (JSON.stringify(actualSourceRoleCounts) !== JSON.stringify(stableNumberRecord(expectedSourceRoleCounts))) {
      failures.push("launch recovery displaySummary sourceRoleCounts must agree with eventFamilyCoverage family source roles.");
    }
    const mathReasonSamples = asRecordArray(displaySummary.mathReasonSamples);
    const missingOrUnpromotedFamilies = eventFamilyCoverage.familySourceStates.filter((entry) =>
      entry.observedFirstParty !== true || entry.productTruthEligible !== true,
    );
    if (missingOrUnpromotedFamilies.length > 0 && mathReasonSamples.length === 0) {
      failures.push("launch recovery displaySummary must expose mathReasonSamples when launch-critical families are missing product truth.");
    }
    if (mathReasonSamples.length > 4) {
      failures.push("launch recovery displaySummary mathReasonSamples must stay compact.");
    }
    if (mathReasonSamples.some((entry) =>
      typeof entry.familyId !== "string"
      || typeof entry.sourceRole !== "string"
      || typeof entry.mathReason !== "string"
      || typeof entry.nextAction !== "string"
    )) {
      failures.push("launch recovery displaySummary mathReasonSamples must include familyId, sourceRole, mathReason, and nextAction.");
    }
  }
  if (!report.launchHistoryCoverage.activeSourceCoverage) {
    failures.push("launch recovery must expose activeSourceCoverage for source-code launch-critical emitters/materializers.");
  } else {
    const activeSourceCoverage = report.launchHistoryCoverage.activeSourceCoverage;
    if (
      activeSourceCoverage.activeSourceCoveragePercent < LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT
      || activeSourceCoverage.sourceCoverageStatus !== "pass"
    ) {
      failures.push(`launch recovery activeSourceCoverage must reach the ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% active source coverage floor.`);
    }
    if (activeSourceCoverage.canClearHistoricalLaunchProof !== false) {
      failures.push("active source coverage must not clear historical launch proof.");
    }
    if (!Array.isArray(activeSourceCoverage.familySourceStates) || activeSourceCoverage.familySourceStates.length !== 13) {
      failures.push("active source coverage must include one source state per launch-critical family.");
    }
    if (activeSourceCoverage.familySourceStates?.some((entry) =>
      typeof entry.sourceTruth !== "string"
      || typeof entry.freshnessState !== "string"
      || typeof entry.confidenceScore !== "number"
      || typeof entry.evidenceKind !== "string"
      || typeof entry.dedupeKey !== "string"
      || entry.lateArrivalWindowDays !== ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS
    )) {
      failures.push("active source coverage rows must expose sourceTruth, freshnessState, confidenceScore, evidenceKind, dedupeKey, and lateArrivalWindowDays.");
    }
    if (activeSourceCoverage.familySourceStates?.some((entry) => entry.productTruthEligibleFromSourceScan !== false)) {
      failures.push("active source scan cannot mark families product-truth eligible by itself.");
    }
  }
  if (report.launchHistoryCoverage.recoveredDayCount > 0 && (!report.launchHistoryCoverage.firstRecoveredDayKey || !report.launchHistoryCoverage.lastRecoveredDayKey)) {
    failures.push("launch recovery recovered days require firstRecoveredDayKey and lastRecoveredDayKey.");
  }
  if (typeof report.launchHistoryCoverage.evidenceObservedDayCount !== "number" || report.launchHistoryCoverage.evidenceObservedDayCount !== report.launchHistoryCoverage.recoveredDayCount) {
    failures.push("launch recovery must expose evidenceObservedDayCount matching recoveredDayCount so recovered means observed evidence.");
  }
  if (
    typeof report.launchHistoryCoverage.productTruthRecoveredDayCount !== "number"
    || report.launchHistoryCoverage.productTruthRecoveredDayCount !== report.launchHistoryCoverage.firstPartyCoverage.coveredDayCount
  ) {
    failures.push("launch recovery must expose productTruthRecoveredDayCount from first-party coverage.");
  }
  for (const day of report.launchHistoryCoverage.days) {
    for (const required of ["first_party", "ga4", "historicalSnapshot", "legacySupport"] as const) {
      if (typeof day.sourceCounts[required] !== "number") {
        failures.push(`launch day ${day.dayKey} missing ${required} source count.`);
      }
    }
    for (const required of ["first_party", "ga4", "historicalSnapshot", "legacySupport"] as const) {
      if (!Array.isArray(day.missingRangesBySource[required])) {
        failures.push(`launch day ${day.dayKey} missing ${required} missing-range classification.`);
      }
    }
    if (!Array.isArray(day.duplicateRanges)) {
      failures.push(`launch day ${day.dayKey} missing duplicateRanges.`);
    }
    if (day.sourceCounts.first_party === 0 && day.confidence === "verified") {
      failures.push(`launch day ${day.dayKey} cannot be verified without first-party evidence.`);
    }
    if (day.confidenceBand !== classifyRecoveryMetricConfidenceBand(day.confidenceScore)) {
      failures.push(`launch day ${day.dayKey} confidenceBand must match the canonical confidenceScore classifier.`);
    }
    if (day.sourceCounts.first_party === 0 && day.productTruthRecovered) {
      failures.push(`launch day ${day.dayKey} cannot be product-truth recovered without first-party evidence.`);
    }
    if (day.sourceCounts.first_party === 0 && day.sourceTruthState === "first_party_recovered") {
      failures.push(`launch day ${day.dayKey} cannot use first_party_recovered without first-party evidence.`);
    }
    if (
      day.sourceCounts.first_party === 0 &&
      day.recovered &&
      day.sourceTruthState !== "second_source_only" &&
      day.sourceTruthState !== "fallback_only" &&
      day.sourceTruthState !== "source_missing"
    ) {
      failures.push(`launch day ${day.dayKey} must label non-first-party recovery as second_source_only or fallback_only.`);
    }
  }
  if (report.sourceAgreement.state === "failed" && (!Array.isArray(report.sourceAgreement.disagreements) || report.sourceAgreement.disagreements.length === 0)) {
    failures.push("failed source agreement must include per-day disagreement details.");
  }
  if (report.sourceAgreement.disagreements.some((entry) => typeof entry.dayKey !== "string" || !Array.isArray(entry.classifications))) {
    failures.push("source agreement disagreement details must include dayKey and classifications.");
  }
  if (report.sourceAgreement.disagreements.some((entry) =>
    entry.primarySourceState === "first_party_missing"
    && (!entry.recoveryLane || !entry.blockingOwner || !Array.isArray(entry.proofRequired) || entry.productTruthEligible !== false)
  )) {
    failures.push("first-party-missing source disagreements must name recovery lane, owner, required proof, and block product truth.");
  }
  if (report.sourceAgreement.state === "failed" && (!Array.isArray(report.sourceAgreement.blockedConsumerDetails) || report.sourceAgreement.blockedConsumerDetails.length === 0)) {
    failures.push("failed source agreement must include blocked consumer display states.");
  }
  if (report.sourceAgreement.blockedConsumerDetails.some((entry) => (
    typeof entry.consumer !== "string"
    || typeof entry.allowedDisplayState !== "string"
      || typeof entry.nextAction !== "string"
  ))) {
    failures.push("blocked consumer details must include consumer, allowedDisplayState, and nextAction.");
  }
  if (report.sourceAgreement.state === "failed" && report.adminPanelConnection.sourceAgreementBlockedConsumers !== report.sourceAgreement.blockedConsumerDetails.length) {
    failures.push("admin panel connection must count source-agreement blocked consumers separately from hydration gaps.");
  }
  const sourceAgreementConsumerStateTotal =
    report.adminPanelConnection.sourceAgreementSourceMissingConsumers
    + report.adminPanelConnection.sourceAgreementSecondSourceConsumers
    + report.adminPanelConnection.sourceAgreementChartPromotionBlockedConsumers
    + report.adminPanelConnection.sourceAgreementConsumerMismatchConsumers;
  if (report.adminPanelConnection.sourceAgreementBlockedConsumers > 0 && sourceAgreementConsumerStateTotal !== report.adminPanelConnection.sourceAgreementBlockedConsumers) {
    failures.push("source-agreement blocked consumer state counts must sum to the blocked consumer total.");
  }
  if (report.legacyRecovery.productTruthRole !== "recovery_evidence_only" || report.legacyRecovery.productionMutationAllowed) {
    failures.push("legacy recovery must remain recovery evidence only with production mutations disabled.");
  }
  if (report.legacyRecovery.currentTotalsEligibleCount !== 0 || report.legacyRecovery.productTruthEligibleCount !== 0 || report.legacyRecovery.overwritesCurrentTruth) {
    failures.push("legacy recovery cannot mark purgatory rows current/product-truth eligible or overwrite current truth.");
  }
  if (!Array.isArray(report.legacyRecovery.reports) || report.legacyRecovery.reports.length < LEGACY_RECOVERY_INPUTS.length) {
    failures.push("legacy recovery summary must include all canonical legacy input artifacts.");
  }
  if (report.legacyRecovery.reports.some((entry) => typeof entry.freshnessState !== "string")) {
    failures.push("legacy recovery reports must classify freshness state.");
  }
  if (!report.legacyRecovery.productTruthBoundary.includes("cannot overwrite")) {
    failures.push("legacy recovery summary must state the product-truth boundary.");
  }
  return failures;
}

function renderLaunchRecoveryDoc(report: ReturnType<typeof buildLaunchAnalyticsRecoveryReport>) {
  return [
    "# Launch Analytics Recovery",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Source Order",
    "",
    "- First-party/user activity is primary product truth.",
    "- GA4 is second-source evidence for sessions, views, device mix, regions, top paths, and acquisition-like comparisons.",
    "- Historical snapshots and legacy support can explain gaps, but they do not overwrite first-party user, purchase, unlock, watch, task, creator, admin, wallet, or GumDrop truth.",
    "",
    "## Evidence Provenance",
    "",
    `- Launch coverage input: ${report.evidenceProvenance.launchCoverageInput}`,
    `- Launch coverage input mode: ${report.evidenceProvenance.sourceAgreementInputMode}`,
    `- Usable launch coverage input found: ${report.evidenceProvenance.usableLaunchCoverageInputFound ? "yes" : "no"}`,
    `- Candidate local/export inputs: ${report.evidenceProvenance.candidateLaunchCoverageInputPaths.join(", ") || "none"}`,
    `- Candidate input states: ${report.evidenceProvenance.candidateLaunchCoverageInputStatuses.map((entry) => `${entry.path}=${entry.state}`).join("; ") || "none"}`,
    `- Panel hydration input: ${report.evidenceProvenance.panelHydrationInput}`,
    `- GA4 read mode: ${report.evidenceProvenance.ga4ReadMode}`,
    `- First-party read mode: ${report.evidenceProvenance.firstPartyReadMode}`,
    `- Limitation: ${report.evidenceProvenance.limitation}`,
    `- Source gate: ${report.canClearSourceGate ? "clear" : "blocked"} - ${report.sourceGateReason}`,
    `- Source gate blockers: ${report.sourceGateBlockers.length ? report.sourceGateBlockers.map((entry) => `${entry.blocker}: ${entry.reason}`).join("; ") : "none"}`,
    "",
    "## Canonical Owners",
    "",
    ...Object.entries(report.sourceMap.canonicalOwners).map(([source, owner]) => `- ${source}: ${owner}`),
    "",
    "## Source Inventory",
    "",
    ...report.sourceMap.sourceInventory.map((entry) =>
      `- ${entry.sourceId}: ${entry.contract} / ${entry.localState}; role ${entry.productTruthRole}; owner ${entry.owner}; coverage ${entry.coveredDayCount ?? "n/a"}; boundary: ${entry.proofBoundary}`,
    ),
    "",
    "## Launch Coverage",
    "",
    `- Formal range: ${report.formalLaunchRange.launchStartDayKey} to ${report.formalLaunchRange.expectedThroughDayKey}`,
    `- Formal range state: ${report.formalLaunchRange.state}`,
    `- Formal expected days: ${report.formalLaunchRange.expectedDayCount}`,
    `- Local evidence days: ${report.formalLaunchRange.localEvidenceDayCount}`,
    `- Approved coverage days: ${report.formalLaunchRange.approvedCoverageDayCount}`,
    `- Formal day rows: ${report.formalLaunchRange.dayCoverage.length}`,
    `- Unproven formal days: ${report.formalLaunchRange.unprovenDayCount}`,
    `- Local evidence ranges: ${report.formalLaunchRange.localEvidenceRanges.join(", ") || "none"}`,
    `- Unproven formal ranges: ${report.formalLaunchRange.unprovenRanges.join(", ") || "none"}`,
    `- Formal range reason: ${report.formalLaunchRange.reason}`,
    `- Range: ${report.launchHistoryCoverage.rangeStartDayKey ?? "unknown"} to ${report.launchHistoryCoverage.rangeEndDayKey ?? "unknown"}`,
    `- Range proof: ${report.launchHistoryCoverage.rangeProof.allLaunchRangeProven ? "all launch range proven" : report.launchHistoryCoverage.rangeProof.expectedRangeSource}`,
    `- Coverage window: ${report.launchHistoryCoverage.rangeProof.coverageWindowKind}`,
    `- Range proof reason: ${report.launchHistoryCoverage.rangeProof.reason}`,
    `- Evidence-observed days: ${report.launchHistoryCoverage.evidenceObservedDayCount}/${report.launchHistoryCoverage.expectedDayCount}`,
    `- Product-truth recovered days: ${report.launchHistoryCoverage.productTruthRecoveredDayCount}/${report.launchHistoryCoverage.expectedDayCount}`,
    `- Second-source-only days: ${report.launchHistoryCoverage.secondSourceOnlyDayCount}`,
    `- Fallback-only days: ${report.launchHistoryCoverage.fallbackOnlyDayCount}`,
    `- First recovered day: ${report.launchHistoryCoverage.firstRecoveredDayKey ?? "unknown"}`,
    `- Last recovered day: ${report.launchHistoryCoverage.lastRecoveredDayKey ?? "unknown"}`,
    `- Coverage state: ${report.launchHistoryCoverage.state}`,
    `- Coverage reason: ${report.launchHistoryCoverage.reason}`,
    `- First-party product truth state: ${report.launchHistoryCoverage.firstPartyCoverage.state}`,
    `- First-party missing ranges: ${report.launchHistoryCoverage.firstPartyCoverage.missingRanges.join(", ") || "none"}`,
    `- Launch-critical canonical mapping: ${report.launchHistoryCoverage.eventFamilyCoverage.canonicalMappingCoveragePercent}% (${report.launchHistoryCoverage.eventFamilyCoverage.canonicalMappedFamilyCount}/13 families)`,
    `- Launch-critical observed first-party coverage: ${report.launchHistoryCoverage.eventFamilyCoverage.observedFirstPartyCoveragePercent}% (${report.launchHistoryCoverage.eventFamilyCoverage.observedFirstPartyFamilyCount}/13 families)`,
    `- Launch-critical holdback: ${report.launchHistoryCoverage.eventFamilyCoverage.holdbackValidation.status} - ${report.launchHistoryCoverage.eventFamilyCoverage.holdbackValidation.reason}`,
    `- Active source-code coverage: ${report.launchHistoryCoverage.activeSourceCoverage.activeSourceCoveragePercent}% (${report.launchHistoryCoverage.activeSourceCoverage.activeSourceFamilyCount}/13 families)`,
    `- Active source-code proof clears historical launch rows: ${report.launchHistoryCoverage.activeSourceCoverage.canClearHistoricalLaunchProof ? "yes" : "no"}`,
    `- Recovered metric metadata: event families ${report.recoveredMetricMetadataCompleteness.eventFamilySourceStates.status}, active sources ${report.recoveredMetricMetadataCompleteness.activeSourceFamilyStates.status}, local days ${report.recoveredMetricMetadataCompleteness.localEvidenceDays.status}, formal days ${report.recoveredMetricMetadataCompleteness.formalLaunchDayCoverage.status}, source-agreement disagreements ${report.recoveredMetricMetadataCompleteness.sourceAgreementDisagreements.status}, source-agreement count deltas ${report.recoveredMetricMetadataCompleteness.sourceAgreementMetricDeltas.status}; boundary=${report.recoveredMetricMetadataCompleteness.proofBoundary}`,
    `- Recovery policy: event-id-primary dedupe=${report.recoveryPolicy.dedupeRules.eventIdIsPrimaryWhenPresent ? "on" : "off"}; fallback identity/route/window dedupe=${report.recoveryPolicy.dedupeRules.fallbackUsesSessionIdentityRouteObjectAndTimestampWindow ? "on" : "off"}; GA4/legacy evidence-only=${report.recoveryPolicy.productTruthPolicy.ga4EvidenceOnly && report.recoveryPolicy.productTruthPolicy.legacyEvidenceOnly ? "yes" : "no"}; modeled calibration-only=${report.recoveryPolicy.modelingPolicy.modeledEvidenceCanCalibrateOnly ? "yes" : "no"}; visibility threshold=${report.recoveryPolicy.modelingPolicy.visibilityMinimumVisiblePercent}%/${report.recoveryPolicy.modelingPolicy.visibilityMinimumVisibleMs}ms; boundary=${report.recoveryPolicy.proofBoundary}`,
    `- First-party days: ${report.launchHistoryCoverage.sourceDayCounts.first_party}`,
    `- GA4 days: ${report.launchHistoryCoverage.sourceDayCounts.ga4}`,
    `- Historical snapshot days: ${report.launchHistoryCoverage.sourceDayCounts.historicalSnapshot}`,
    `- Legacy support days: ${report.launchHistoryCoverage.sourceDayCounts.legacySupport}`,
    `- All-source missing ranges: ${report.launchHistoryCoverage.missingRanges.join(", ") || "none"}`,
    `- Stale input evidence: ${report.launchHistoryCoverage.staleInputEvidence ? "yes" : "no"}`,
    "",
    "## Formal Launch Day Rows",
    "",
    ...report.formalLaunchRange.dayCoverage.slice(0, 14).map((day) =>
      `- ${day.dayKey}: state=${day.formalEvidenceState}; evidenceObserved=${day.evidenceObserved ? "yes" : "no"}; productTruthRecovered=${day.productTruthRecovered ? "yes" : "no"}; sourceTruthState=${day.sourceTruthState}; sourceCountsKnown=${day.sourceCountsKnown}; first_party=${day.sourceCounts.first_party ?? "unknown"}, ga4=${day.sourceCounts.ga4 ?? "unknown"}, historicalSnapshot=${day.sourceCounts.historicalSnapshot ?? "unknown"}, legacySupport=${day.sourceCounts.legacySupport ?? "unknown"}; confidence=${day.confidence}; confidenceBand=${day.confidenceBand}; next=${day.nextAction}`,
    ),
    report.formalLaunchRange.dayCoverage.length > 14
      ? `- ${report.formalLaunchRange.dayCoverage.length - 14} additional formal launch days omitted from compact doc; see agent/state/launch-analytics-recovery.generated.json.`
      : "",
    "",
    "## Daily Recovery Rows",
    "",
    ...report.launchHistoryCoverage.days.slice(0, 14).map((day) => {
      const missingSources = Object.entries(day.missingRangesBySource)
        .filter(([, ranges]) => ranges.length > 0)
        .map(([source, ranges]) => `${source}:${ranges.join(",")}`);
      return `- ${day.dayKey}: evidenceObserved=${day.evidenceObserved ? "yes" : "no"}; productTruthRecovered=${day.productTruthRecovered ? "yes" : "no"}; sourceTruthState=${day.sourceTruthState}; sourceCounts first_party=${day.sourceCounts.first_party}, ga4=${day.sourceCounts.ga4}, historicalSnapshot=${day.sourceCounts.historicalSnapshot}, legacySupport=${day.sourceCounts.legacySupport}; missing=${missingSources.join(" | ") || "none"}; duplicateRanges=${day.duplicateRanges.join(", ") || "none"}; internalAdminExcluded=${day.internalAdminExcludedCount ?? "unknown"}; confidence=${day.confidence}; confidenceBand=${day.confidenceBand}; next=${day.nextAction}`;
    }),
    report.launchHistoryCoverage.days.length > 14
      ? `- ${report.launchHistoryCoverage.days.length - 14} additional days omitted from compact doc; see agent/state/launch-analytics-recovery.generated.json.`
      : "",
    "",
    "## Source Agreement",
    "",
    `- State: ${String(report.sourceAgreement.state)}`,
    `- Compared sources: ${report.sourceAgreement.comparedSources.join(", ") || "none"}`,
    `- Disagreements: ${report.sourceAgreement.disagreementCount}`,
    `- Max delta: ${report.sourceAgreement.maxDeltaPct ?? "unknown"}`,
    `- Classifications: ${report.sourceAgreement.classifications.join(", ") || "none"}`,
    `- Per-day disagreement details: ${report.sourceAgreement.disagreements.length}${report.sourceAgreement.disagreementsTruncated ? " (truncated)" : ""}`,
    ...report.sourceAgreement.disagreements.slice(0, 6).map((entry) =>
      `  - ${String(entry.dayKey)}: present ${asStringArray(entry.sourcesPresent).join(", ") || "none"}; missing ${asStringArray(entry.sourcesMissing).join(", ") || "none"}; lane ${String(entry.recoveryLane ?? "review")}; owner ${String(entry.blockingOwner ?? "source agreement")}; ${String(entry.likelyRootCause ?? "review source mismatch")}`,
    ),
    `- Blocked consumers: ${report.sourceAgreement.blockedConsumerDetails.length}${report.sourceAgreement.blockedConsumerDetailsTruncated ? " (truncated)" : ""}`,
    ...report.sourceAgreement.blockedConsumerDetails.map((entry) =>
      `  - ${String(entry.label ?? entry.consumer)}: ${String(entry.allowedDisplayState ?? "review")}; Next: ${String(entry.nextAction ?? "repair source agreement")}`,
    ),
    `- Count delta details: ${report.sourceAgreement.perDayMetricDeltas.length}${report.sourceAgreement.perDayMetricDeltasTruncated ? " (truncated)" : ""}`,
    ...report.sourceAgreement.perDayMetricDeltas.slice(0, 6).map((entry) =>
      `  - ${entry.dayKey}: ${entry.primarySource}=${entry.primaryCount}, ${entry.secondSource}=${entry.secondSourceCount}, delta=${entry.deltaPct}%; ${entry.classifications.join(", ") || "review"}`,
    ),
    `- Exact next steps: ${asStringArray(report.sourceAgreement.nextExactSteps).join(" | ") || "see next action"}`,
    `- Next action: ${report.sourceAgreement.nextAction}`,
    "",
    "## Legacy Recovery Queue",
    "",
    `- Role: ${report.legacyRecovery.productTruthRole}`,
    `- Production mutation allowed: ${report.legacyRecovery.productionMutationAllowed ? "yes" : "no"}`,
    `- Current totals eligible: ${report.legacyRecovery.currentTotalsEligibleCount}`,
    `- Product-truth eligible: ${report.legacyRecovery.productTruthEligibleCount}`,
    `- Overwrites current truth: ${report.legacyRecovery.overwritesCurrentTruth ? "yes" : "no"}`,
    `- Legacy sources inventoried: ${report.legacyRecovery.sourceInventory.sourceCount}`,
    `- Backfillable sources: ${report.legacyRecovery.sourceInventory.backfillableCount}`,
    `- Directional sources: ${report.legacyRecovery.sourceInventory.directionalCount}`,
    `- Debug-only sources: ${report.legacyRecovery.sourceInventory.debugOnlyCount}`,
    `- Purgatory rows: ${report.legacyRecovery.purgatoryQueue.totalCount}`,
    `- Weak matches: ${report.legacyRecovery.purgatoryQueue.weakMatchCount}`,
    `- Unknown legacy rows: ${report.legacyRecovery.purgatoryQueue.unknownCount}`,
    `- Manual review required: ${report.legacyRecovery.purgatoryQueue.manualReviewRequired}`,
    `- Stale legacy report inputs: ${report.legacyRecovery.staleReportPaths.join(", ") || "none"}`,
    `- Historical evidence-only inputs: ${report.legacyRecovery.historicalEvidenceOnlyPaths.join(", ") || "none"}`,
    `- Boundary: ${report.legacyRecovery.productTruthBoundary}`,
    ...report.legacyRecovery.purgatoryQueue.sample.map((entry) =>
      `  - ${entry.legacySource}/${entry.legacyId}: ${entry.classification}; confidence=${entry.identityConfidence}; currentTotalsEligible=${entry.currentTotalsEligible ? "yes" : "no"}; action=${entry.suggestedRecoveryAction}`,
    ),
    report.legacyRecovery.purgatoryQueue.sampleTruncated
      ? `  - ${report.legacyRecovery.purgatoryQueue.totalCount - report.legacyRecovery.purgatoryQueue.sample.length} additional legacy rows omitted from compact doc; see agent/state/launch-analytics-recovery.generated.json.`
      : "",
    `- Legacy next steps: ${report.legacyRecovery.nextExactSteps.join(" | ")}`,
    "",
    "## Admin Panel Connection",
    "",
    `- Hydrated panels: ${report.adminPanelConnection.hydratedPanels}/${report.adminPanelConnection.totalPanels}`,
    `- Source missing: ${report.adminPanelConnection.sourceMissingPanels}`,
    `- Materializer missing: ${report.adminPanelConnection.materializerMissingPanels}`,
    `- Bridge missing: ${report.adminPanelConnection.bridgeMissingPanels}`,
    `- Runtime evidence required: ${report.adminPanelConnection.runtimeEvidenceRequiredPanels}`,
    `- External evidence required: ${report.adminPanelConnection.externalRequiredPanels}`,
    `- Source-agreement blocked consumers: ${report.adminPanelConnection.sourceAgreementBlockedConsumers}`,
    `- Source-agreement source missing: ${report.adminPanelConnection.sourceAgreementSourceMissingConsumers}`,
    `- Source-agreement second-source only: ${report.adminPanelConnection.sourceAgreementSecondSourceConsumers}`,
    `- Source-agreement charts waiting for proof: ${report.adminPanelConnection.sourceAgreementChartPromotionBlockedConsumers}`,
    `- Source-agreement consumer mismatch: ${report.adminPanelConnection.sourceAgreementConsumerMismatchConsumers}`,
    "",
    "## Next Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n");
}

function main() {
  const sourceAgreementResult = buildLaunchSourceAgreementDetail();

  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const finalReleasePacket = readJson("agent/state/final-release-exit-readiness-packet.generated.json");
  const report = buildAnalyticsPanelHydrationReport({
    generatedAtUtc,
    currentHead,
    scoreDimensions: scoreDimensions(),
    eventLivenessAudit: readJson("agent/state/event-liveness-audit.generated.json"),
    personMetricsHydration: readJson("agent/state/person-metrics-hydration.generated.json"),
    userJourneyBehavioralIntelligence: readJson("agent/state/user-journey-behavioral-intelligence.generated.json"),
    debugRuntimeEvidence: readJson("agent/state/debug-runtime-evidence.generated.json"),
    finalReleasePacket,
    dirtyFiles,
  });
  const livePanelEvidence = buildLivePanelEvidenceReport(report);
  const validationFailures = [
    ...validateAnalyticsPanelHydrationReport(report),
    livePanelEvidence.decisions.length === report.totalPanels ? "" : "panel hydration does not feed live evidence resolver.",
  ].filter(Boolean);
  const finalReport = { ...report, validationFailures };

  write(REPORT_PATH, `${JSON.stringify(compactReport(report, livePanelEvidence, validationFailures), null, 2)}\n`);
  write(DOC_PATH, renderDoc(finalReport));
  const launchRecoveryReport = buildLaunchAnalyticsRecoveryReport({
    generatedAtUtc,
    currentHead,
    panelReport: report,
    sourceAgreementResult,
  });
  const launchRecoveryValidationFailures = validateLaunchAnalyticsRecoveryReport(launchRecoveryReport);
  const finalLaunchRecoveryReport = {
    ...launchRecoveryReport,
    validationFailures: launchRecoveryValidationFailures,
  };
  write(LAUNCH_RECOVERY_REPORT_PATH, `${JSON.stringify(compactLaunchAnalyticsRecoveryReport(finalLaunchRecoveryReport), null, 2)}\n`);
  write(LAUNCH_RECOVERY_DOC_PATH, renderLaunchRecoveryDoc(finalLaunchRecoveryReport));

  if (validationFailures.length > 0 || launchRecoveryValidationFailures.length > 0) {
    console.error("analytics-panel-hydration validation failed:");
    for (const failure of [...validationFailures, ...launchRecoveryValidationFailures]) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`analytics-panel-hydration passed. panels=${report.totalPanels} hydrated=${report.hydratedPanels} collecting=${report.collectingPanels} sourceMissing=${report.sourceMissingPanels}`);
}

main();
