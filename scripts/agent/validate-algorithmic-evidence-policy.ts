import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

import {
  buildAlgorithmicEvidencePolicyReport,
  validateAlgorithmicEvidencePolicyReport,
} from "../../src/lib/agent-score/algorithmic-evidence-policy";
import {
  buildPublicBetaScoreReport,
  type PublicBetaEvidenceArtifact,
} from "../../src/lib/agent-score/core";
import { buildPublicBetaCommandBudget } from "../../src/lib/agent-score/reporting";
import { buildScore80CostReadinessFromRepo } from "./validate-score-80-cost-readiness";

const ARTIFACT_PATH = "agent/state/algorithmic-evidence-policy.generated.json";
const DOC_PATH = "docs/agent-truth/algorithmic-evidence-policy.md";

function readJson(root: string, path: string): Record<string, unknown> | null {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function evidenceFromArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function readArtifact(root: string, path: string, fallbackStatus: string, fallbackDetail: string): PublicBetaEvidenceArtifact {
  const parsed = readJson(root, path);
  if (!parsed) {
    return {
      path,
      status: fallbackStatus,
      passed: false,
      detail: fallbackDetail,
      evidence: [`artifactPath=${path}`, "artifactExists=false"],
    };
  }
  return {
    path,
    status: readString(parsed.status) ?? readString(parsed.overallStatus) ?? fallbackStatus,
    passed: readBoolean(parsed.passed) === true,
    detail: readString(parsed.detail)
      ?? readString(parsed.nextAction)
      ?? fallbackDetail,
    evidence: [
      `artifactPath=${path}`,
      `artifactExists=true`,
      ...evidenceFromArray(parsed.evidence),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readOperatorRevenueSmoke(root: string): PublicBetaEvidenceArtifact {
  const path = "agent/state/operator-revenue-smoke.generated.json";
  const parsed = readJson(root, path);
  const summary = readRecord(parsed?.summary);
  return {
    path,
    status: readString(summary.revenueSmokeStatus) ?? "missing_or_unknown",
    passed: readString(summary.revenueSmokeStatus) === "operator_confirmed_revenue_smoke",
    detail: readString(parsed?.plainLanguageNote) ?? "Operator revenue smoke is not recorded.",
    evidence: [
      `artifactPath=${path}`,
      `revenueSmokeStatus=${readString(summary.revenueSmokeStatus) ?? "missing"}`,
      `confirmationSource=${readString(summary.confirmationSource) ?? "missing"}`,
      `formalProviderSmokePassed=${readBoolean(summary.formalProviderSmokePassed) === true}`,
      `providerArtifactAttached=${readBoolean(summary.providerArtifactAttached) === true}`,
    ],
    generatedAtUtc: readString(parsed?.generatedAtUtc),
    sourceCommit: readString(parsed?.sourceCommit) ?? readString(parsed?.currentHead),
  };
}

function readProviderSmoke(root: string): PublicBetaEvidenceArtifact {
  const provider = readArtifact(
    root,
    "agent/state/provider-smoke-evidence.generated.json",
    "missing_formal_evidence",
    "No formal provider smoke evidence artifact was supplied.",
  );
  const operator = readOperatorRevenueSmoke(root);
  return {
    ...provider,
    detail: `${operator.detail} ${provider.detail}`,
    evidence: [
      ...provider.evidence,
      ...operator.evidence.map((entry) => `operatorRevenueSmoke.${entry}`),
    ],
  };
}

function readGitHead(root: string) {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function writeJson(root: string, path: string, value: unknown) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDoc(root: string, report: ReturnType<typeof buildAlgorithmicEvidencePolicyReport>) {
  const lines = [
    "# Algorithmic Evidence Policy",
    "",
    `Status: ${report.overallStatus}`,
    "",
    "Manual screenshot evidence is scoped to UI visual/layout confirmation. It must not block non-UI telemetry, admin, cost, refresh, or source-runtime confidence.",
    "",
    "## Coverage",
    "",
    ...report.coverage.map((item) =>
      `- ${item.category}: ${item.confidence}; score=${item.score}; source=\`${item.sourcePath}\`; ${item.distinction}`),
    "",
    "## Formal Gates",
    "",
    `- UI visual gate cleared: ${report.formalGateImpact.uiVisualGateCleared}`,
    `- Deployed runtime smoke cleared: ${report.formalGateImpact.deployedRuntimeSmokeCleared}`,
    `- Formal provider gate cleared: ${report.formalGateImpact.formalProviderGateCleared}`,
    `- Formal admin runtime sample cleared: ${report.formalGateImpact.formalAdminRuntimeSampleCleared}`,
    "",
    "## Remaining Evidence",
    "",
    ...report.remainingFormalEvidenceGates.map((gate) => `- ${gate}`),
    "",
  ];
  const fullPath = join(root, DOC_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${lines.join("\n")}\n`);
}

function main() {
  const root = process.cwd();
  const currentHead = readGitHead(root);
  const report = buildAlgorithmicEvidencePolicyReport({
    visualManualEvidence: readArtifact(
      root,
      "agent/state/manual-smoke-evidence.generated.json",
      "missing_formal_evidence",
      "No valid visual/manual evidence artifact was supplied.",
    ),
    runtimeSmokeEvidence: readArtifact(
      root,
      "agent/state/runtime-smoke-evidence.generated.json",
      "runtime_unverified",
      "No deployed runtime smoke evidence artifact was supplied.",
    ),
    providerSmokeEvidence: readProviderSmoke(root),
    debugRuntimeEvidence: readArtifact(
      root,
      "agent/state/debug-runtime-evidence.generated.json",
      "missing_or_unknown",
      "No source-backed debug/runtime evidence artifact was supplied.",
    ),
    sourceBackedRuntimeConfidenceEvidence: readArtifact(
      root,
      "agent/state/source-backed-runtime-confidence.generated.json",
      "missing_or_unknown",
      "No source-backed runtime confidence artifact was supplied.",
    ),
    realUsageConfidenceEvidence: readArtifact(
      root,
      "agent/state/real-usage-confidence.generated.json",
      "missing_or_unknown",
      "No real usage confidence artifact was supplied.",
    ),
    behaviorMathEvidence: readArtifact(
      root,
      "agent/state/behavior-math-verification.generated.json",
      "missing_or_unknown",
      "No behavior math verification artifact was supplied.",
    ),
    adminTruthSampleEvidence: readArtifact(
      root,
      "agent/state/admin-truth-source-sample.generated.json",
      "missing_or_unknown",
      "No admin truth source sample artifact was supplied.",
    ),
    operatorRevenueSmokeEvidence: readOperatorRevenueSmoke(root),
    costReadiness: buildScore80CostReadinessFromRepo(root).costReadiness,
    costReadinessSourcePath: "agent/state/score-80-cost-readiness.generated.json",
    refreshQueueSourcePath: "agent/state/self-healing-refresh-queue.generated.json",
  });
  const failures = validateAlgorithmicEvidencePolicyReport(report);
  const scoreReport = buildPublicBetaScoreReport([], {
    commandBudget: buildPublicBetaCommandBudget(),
    currentHead,
    evidence: {
      visualManualEvidence: readArtifact(
        root,
        "agent/state/manual-smoke-evidence.generated.json",
        "missing_formal_evidence",
        "No valid visual/manual evidence artifact was supplied.",
      ),
      providerSmokeEvidence: readProviderSmoke(root),
      runtimeSmokeEvidence: readArtifact(
        root,
        "agent/state/runtime-smoke-evidence.generated.json",
        "runtime_unverified",
        "No deployed runtime smoke evidence artifact was supplied.",
      ),
      debugRuntimeEvidenceArtifact: readArtifact(
        root,
        "agent/state/debug-runtime-evidence.generated.json",
        "missing_or_unknown",
        "No source-backed debug/runtime evidence artifact was supplied.",
      ),
      realUsageConfidenceEvidence: readArtifact(
        root,
        "agent/state/real-usage-confidence.generated.json",
        "missing_or_unknown",
        "No real usage confidence artifact was supplied.",
      ),
      behaviorMathEvidence: readArtifact(
        root,
        "agent/state/behavior-math-verification.generated.json",
        "missing_or_unknown",
        "No behavior math verification artifact was supplied.",
      ),
      adminTruthSampleEvidence: readArtifact(
        root,
        "agent/state/admin-truth-source-sample.generated.json",
        "missing_or_unknown",
        "No admin truth source sample artifact was supplied.",
      ),
      costReadiness: buildScore80CostReadinessFromRepo(root).costReadiness,
      openPrTriageFresh: true,
    },
  });

  const visualGate = scoreReport.evidenceGates.find((gate) => gate.id === "visualManualSmoke");
  if (scoreReport.runtimeHealthScore <= 55) {
    failures.push("manual screenshot gate still appears to block non-UI runtime confidence.");
  }
  if (!visualGate?.detail.includes("UI-only")) {
    failures.push("score report must show visual/manual evidence as UI-only.");
  }
  if (!scoreReport.nuancedScoreExplanation.join("\n").includes("UI-only")) {
    failures.push("score report hides partial-vs-formal evidence distinction.");
  }
  if (report.formalGateImpact.formalProviderGateCleared && report.providerConfidence.confidence !== "formal") {
    failures.push("operator revenue smoke must not clear formal provider gate.");
  }
  if (report.formalGateImpact.deployedRuntimeSmokeCleared && report.runtimeSourceConfidence.confidence !== "formal") {
    failures.push("source-backed runtime confidence must not clear deployed runtime smoke.");
  }
  if (report.formalGateImpact.formalAdminRuntimeSampleCleared && report.adminTruthConfidence.confidence !== "formal") {
    failures.push("admin source sample must not clear formal admin runtime sample.");
  }

  const overallStatus: ReturnType<typeof buildAlgorithmicEvidencePolicyReport>["overallStatus"] = failures.length > 0
    ? "algorithmic_evidence_policy_blocked"
    : "algorithmic_evidence_policy_ready";
  const output = {
    ...report,
    currentHead,
    scoreProbe: {
      runtimeHealthScore: scoreReport.runtimeHealthScore,
      evidenceCompletenessScore: scoreReport.evidenceCompletenessScore,
      readinessStatus: scoreReport.readinessStatus,
      launchBlockers: scoreReport.launchBlockers,
    },
    validationFailures: failures,
    overallStatus,
  };
  writeJson(root, ARTIFACT_PATH, output);
  writeDoc(root, output);
  if (failures.length > 0) {
    console.error(`Algorithmic evidence policy validation failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Algorithmic evidence policy ready. Non-UI coverage: ${report.nonUiAlgorithmicCoverageScore}/100`);
}

main();
