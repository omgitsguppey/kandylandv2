import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildAnalyticsPanelHydrationReport,
  validateAnalyticsPanelHydrationReport,
} from "@/lib/admin-analytics/panel-hydration-resolver";
import { buildLivePanelEvidenceReport } from "@/lib/release-readiness/live-panel-evidence-resolver";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/analytics-panel-hydration.generated.json";
const DOC_PATH = "docs/agent-truth/analytics-panel-hydration.md";

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
  if (normalized === "agent/context/optimized-task-context.generated.json") return "current_generated_artifact_to_commit";
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
  if (normalized === "tests/unit/current-beta-exit-status.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/overnight-beta-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/current-beta-exit-status.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/overnight-beta-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/live-evidence-gate-replacement.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/live-evidence-gate-replacement.md") return "documentation_artifact_expected";
  if (normalized === "src/app/admin/analytics/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-analytics-panel-hydration.ts") return "analytics_panel_hydration_artifact_expected";
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
  if (normalized === "scripts/agent/validate-analytics-hydration-consolidation.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/analytics-panel-hydration.spec.ts") return "analytics_panel_hydration_artifact_expected";
  if (normalized === "tests/unit/analytics-hydration-consolidation.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/admin-analytics-page.spec.tsx") return "test_artifact_expected";
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
  if (normalized === "agent/state/analytics-hydration-consolidation.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/analytics-hydration-consolidation-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/analytics-hydration-consolidation.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/analytics-hydration-consolidation-audit.md") return "documentation_artifact_expected";
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

function main() {
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

  if (validationFailures.length > 0) {
    console.error("analytics-panel-hydration validation failed:");
    for (const failure of validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`analytics-panel-hydration passed. panels=${report.totalPanels} hydrated=${report.hydratedPanels} collecting=${report.collectingPanels} sourceMissing=${report.sourceMissingPanels}`);
}

main();
