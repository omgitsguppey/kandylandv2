import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  printPublicBetaScoreSummary,
  writePublicBetaScoreReport,
} from "../../src/lib/agent-score/reporting";
import { buildPublicBetaReadinessReport } from "../../src/lib/agent-score/public-beta-scanner";
import {
  PUBLIC_BETA_DOMAIN_WEIGHTS,
  PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS,
} from "../../src/lib/agent-score/weights";
import { loadDebugEvidenceForAuditDomains } from "./load-debug-evidence-for-audit";
import type {
  PublicBetaCostReadiness,
  PublicBetaEvidenceArtifact,
  PublicBetaGeneratedReportEvidence,
} from "../../src/lib/agent-score/core";

const REQUIRED_EVIDENCE_REPORTS = [
  "agent/state/evidence-capture-status.generated.json",
  "agent/state/gumdrop-economy-accuracy.generated.json",
  "agent/state/creator-experience-simplification.generated.json",
  "agent/state/post-economy-creator-flow-qa.generated.json",
  "agent/state/user-creator-ui-parity.generated.json",
  "agent/state/user-facing-feature-connection-audit.generated.json",
  "agent/state/creator-dashboard-error-cost-inventory.generated.json",
] as const;

const PROVIDER_SMOKE_EVIDENCE_PATH = "agent/state/provider-smoke-evidence.generated.json";
const OPERATOR_REVENUE_SMOKE_PATH = "agent/state/operator-revenue-smoke.generated.json";
const RUNTIME_SMOKE_EVIDENCE_PATH = "agent/state/runtime-smoke-evidence.generated.json";
const ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH = "agent/state/admin-truth-sample-evidence.generated.json";
const TARGETED_BEHAVIOR_EVIDENCE_PATH = "agent/state/targeted-behavior-evidence.generated.json";
const VISUAL_MANUAL_EVIDENCE_PATHS = [
  "agent/state/manual-smoke-evidence.generated.json",
  "agent/state/visual-smoke-evidence.generated.json",
  "agent/state/screenshot-evidence.generated.json",
] as const;
const CREATOR_DASHBOARD_COST_INVENTORY_PATH = "agent/state/creator-dashboard-error-cost-inventory.generated.json";
const SPEED_SECURITY_HARDENING_PATH = "agent/state/speed-security-hardening.generated.json";

function parseJsonObject(source: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readJsonFile(root: string, filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return null;
  return parseJsonObject(readFileSync(fullPath, "utf8"));
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

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readGitHead(root: string) {
  try {
    const gitDir = join(root, ".git");
    const headSource = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    if (headSource.startsWith("ref: ")) {
      const refPath = headSource.slice("ref: ".length).trim();
      return readFileSync(join(gitDir, refPath), "utf8").trim();
    }
    return headSource;
  } catch {
    return undefined;
  }
}

function evidenceLinesFromArray(value: unknown, prefix: string) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const parts = [
        readString(record.key),
        readString(record.command),
        readString(record.status),
        readString(record.proves),
      ].filter(Boolean);
      return parts.length > 0 ? `${prefix}[${index}]=${parts.join(" | ")}` : `${prefix}[${index}]=object`;
    }
    return `${prefix}[${index}]=${String(entry)}`;
  });
}

function readEvidenceArtifact(
  root: string,
  filePath: string,
  fallbackStatus: string,
  fallbackDetail: string,
): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, filePath);
  if (!parsed) {
    return {
      path: filePath,
      status: fallbackStatus,
      passed: false,
      detail: fallbackDetail,
      evidence: [`artifactPath=${filePath}`, `artifactStatus=${fallbackStatus}`, "artifactExists=false"],
    };
  }

  const status = readString(parsed.status) ?? readString(parsed.overallStatus) ?? fallbackStatus;
  return {
    path: filePath,
    status,
    passed: readBoolean(parsed.passed) === true,
    detail: readString(parsed.detail)
      ?? readString(parsed.summary)
      ?? readString(parsed.recommendedAction)
      ?? fallbackDetail,
    evidence: [
      `artifactPath=${filePath}`,
      `artifactStatus=${status}`,
      `artifactExists=true`,
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function collectGeneratedReportEvidence(root: string, now = Date.now()): PublicBetaGeneratedReportEvidence[] {
  return REQUIRED_EVIDENCE_REPORTS.map((reportPath) => {
    const fullPath = join(root, reportPath);
    if (!existsSync(fullPath)) {
      return { path: reportPath, freshness: "missing" };
    }

    const parsed = parseJsonObject(readFileSync(fullPath, "utf8"));
    const stats = statSync(fullPath);
    const generatedAt = typeof parsed.generatedAt === "string" ? parsed.generatedAt : stats.mtime.toISOString();
    const ageHours = (now - Date.parse(generatedAt)) / (60 * 60 * 1000);
    const embeddedFreshness = parsed.freshness === "fresh" || parsed.freshness === "stale" || parsed.freshness === "unknown"
      ? parsed.freshness
      : undefined;
    const freshness = embeddedFreshness ?? (
      Number.isFinite(ageHours) && ageHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS ? "fresh" : "stale"
    );

    return {
      path: reportPath,
      generatedAt,
      sourceCommit: typeof parsed.sourceCommit === "string" ? parsed.sourceCommit : undefined,
      freshness,
      ageHours: Number.isFinite(ageHours) ? ageHours : undefined,
    };
  });
}

function readProviderSmokeEvidence(root: string): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, PROVIDER_SMOKE_EVIDENCE_PATH);
  const operatorSmoke = readJsonFile(root, OPERATOR_REVENUE_SMOKE_PATH);
  const operatorSummary = readRecord(operatorSmoke?.summary);
  const operatorSmokeStatus = readString(operatorSummary.revenueSmokeStatus);
  const operatorSmokeNote = operatorSmokeStatus === "operator_confirmed_revenue_smoke"
    ? "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate."
    : undefined;
  if (!parsed) {
    const artifact = readEvidenceArtifact(
      root,
      PROVIDER_SMOKE_EVIDENCE_PATH,
      "missing_formal_evidence",
      "No formal provider smoke evidence artifact was supplied.",
    );
    if (operatorSmokeNote) {
      artifact.detail = `${operatorSmokeNote} ${artifact.detail}`;
      artifact.evidence.push(
        `operatorRevenueSmoke.status=${operatorSmokeStatus}`,
        "operatorRevenueSmoke.amountUsdConfirmed=50",
        "operatorRevenueSmoke.formalProviderSmokePassed=false",
        `operatorRevenueSmoke.note=${operatorSmokeNote}`,
      );
    }
    return artifact;
  }

  const providerSmoke = readRecord(parsed.providerSmoke);
  const paypalRefillSmoke = readRecord(parsed.paypalRefillSmoke);
  const readinessImpact = readRecord(parsed.readinessImpact);
  const providerStatus = readString(providerSmoke.status) ?? readString(parsed.overallStatus) ?? "missing_formal_evidence";
  const paypalStatus = readString(paypalRefillSmoke.status);
  const status = providerStatus;
  const providerGatePassed = readBoolean(providerSmoke.passed) === true
    || readBoolean(readinessImpact.providerSmokeGatePassed) === true;
  const passed = providerGatePassed
    && status !== "missing_formal_evidence"
    && status !== "operator_reported_not_formal_provider_smoke"
    && paypalStatus !== "operator_reported_not_formal_provider_smoke";
  const paypalNote = readString(paypalRefillSmoke.note);
  const providerRecommendedAction = readString(providerSmoke.recommendedAction);

  return {
    path: PROVIDER_SMOKE_EVIDENCE_PATH,
    status,
    passed,
    detail: [
      operatorSmokeNote,
      passed ? "Formal provider smoke evidence passed." : "Formal provider smoke evidence is missing.",
      paypalNote,
      providerRecommendedAction,
    ].filter(Boolean).join(" "),
    evidence: [
      `providerArtifactStatus=${status}`,
      `providerSmoke.status=${providerStatus}`,
      `providerSmoke.passed=${readBoolean(providerSmoke.passed) === true}`,
      `readinessImpact.providerSmokeGatePassed=${readBoolean(readinessImpact.providerSmokeGatePassed) === true}`,
      ...(operatorSmokeNote
        ? [
          `operatorRevenueSmoke.status=${operatorSmokeStatus}`,
          "operatorRevenueSmoke.amountUsdConfirmed=50",
          "operatorRevenueSmoke.formalProviderSmokePassed=false",
          `operatorRevenueSmoke.note=${operatorSmokeNote}`,
        ]
        : []),
      ...(paypalStatus ? [`paypalRefillSmoke.status=${paypalStatus}`] : []),
      ...(paypalNote ? [`paypalRefillSmoke.note=${paypalNote}`] : []),
      `paypalRefillSmoke.formalRepoArtifactAttached=${readBoolean(paypalRefillSmoke.formalRepoArtifactAttached) === true}`,
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readRuntimeSmokeEvidence(root: string): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, RUNTIME_SMOKE_EVIDENCE_PATH);
  if (!parsed) {
    return readEvidenceArtifact(
      root,
      RUNTIME_SMOKE_EVIDENCE_PATH,
      "runtime_unverified",
      "No formal runtime smoke evidence artifact was supplied.",
    );
  }

  const readinessImpact = readRecord(parsed.readinessImpact);
  const status = readString(parsed.overallStatus) ?? readString(parsed.status) ?? "runtime_unverified";
  const runtimeGatePassed = readBoolean(parsed.runtimeDeploymentSmokePassed) === true
    || readBoolean(readinessImpact.runtimeGatePassed) === true;
  const passed = runtimeGatePassed && status !== "runtime_unverified" && status !== "missing_formal_evidence";

  return {
    path: RUNTIME_SMOKE_EVIDENCE_PATH,
    status,
    passed,
    detail: readString(readinessImpact.recommendedAction)
      ?? (passed ? "Formal deployed runtime smoke passed." : "No deployed runtime smoke evidence was supplied."),
    evidence: [
      `runtimeArtifactStatus=${status}`,
      `runtimeDeploymentSmokePassed=${readBoolean(parsed.runtimeDeploymentSmokePassed) === true}`,
      `readinessImpact.runtimeGatePassed=${readBoolean(readinessImpact.runtimeGatePassed) === true}`,
      ...evidenceLinesFromArray(parsed.evidenceItems, "runtimeEvidenceItems"),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readAdminTruthSampleEvidence(root: string): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH);
  if (!parsed) {
    return readEvidenceArtifact(
      root,
      ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH,
      "missing_or_unknown",
      "No formal admin truth sample evidence artifact was supplied.",
    );
  }

  const readinessImpact = readRecord(parsed.readinessImpact);
  const status = readString(parsed.overallStatus) ?? readString(parsed.status) ?? "missing_or_unknown";
  const sampleCount = readNumber(parsed.sampleCount) ?? 0;
  const freshSampleAttached = readBoolean(parsed.freshAdminTruthSampleAttached) === true;
  const adminGatePassed = readBoolean(readinessImpact.adminTruthSampleGatePassed) === true;
  const passed = freshSampleAttached && adminGatePassed && sampleCount > 0 && status !== "missing_or_unknown";

  return {
    path: ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH,
    status,
    passed,
    detail: readString(readinessImpact.recommendedAction)
      ?? (passed ? "Fresh admin truth sample evidence passed." : "No fresh admin truth sample evidence was supplied."),
    evidence: [
      `adminTruthSampleArtifactStatus=${status}`,
      `freshAdminTruthSampleAttached=${freshSampleAttached}`,
      `readinessImpact.adminTruthSampleGatePassed=${adminGatePassed}`,
      `sampleCount=${sampleCount}`,
      ...evidenceLinesFromArray(parsed.adminTruthCommandEvidence, "adminTruthCommandEvidence"),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readTargetedBehaviorEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    TARGETED_BEHAVIOR_EVIDENCE_PATH,
    "missing_formal_evidence",
    "No formal targeted behavior evidence artifact was supplied.",
  );
}

function readVisualManualEvidence(root: string): PublicBetaEvidenceArtifact {
  const inspected: string[] = [];
  for (const evidencePath of VISUAL_MANUAL_EVIDENCE_PATHS) {
    const parsed = readJsonFile(root, evidencePath);
    if (!parsed) {
      inspected.push(`${evidencePath}:missing`);
      continue;
    }

    const status = readString(parsed.status) ?? readString(parsed.overallStatus) ?? "missing_or_unknown";
    const passed = (status === "passed" || status === "usable") && readBoolean(parsed.passed) !== false;
    inspected.push(`${evidencePath}:status=${status}:passed=${passed}`);
    if (passed) {
      return {
        path: evidencePath,
        status,
        passed: true,
        detail: readString(parsed.detail)
          ?? readString(parsed.summary)
          ?? "Schema-backed visual/manual evidence passed.",
        evidence: [
          `visualManualArtifactStatus=${status}`,
          `visualManualArtifactPath=${evidencePath}`,
          ...evidenceLinesFromArray(parsed.evidence, "visualManualEvidence"),
        ],
        generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
        sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
      };
    }
  }

  return {
    path: VISUAL_MANUAL_EVIDENCE_PATHS.join(","),
    status: "missing_formal_evidence",
    passed: false,
    detail: "No valid visual/manual evidence artifact was supplied.",
    evidence: [
      "visualManualArtifactStatus=missing_formal_evidence",
      ...inspected,
    ],
  };
}

function speedSecurityHasCostRisk(root: string) {
  const parsed = readJsonFile(root, SPEED_SECURITY_HARDENING_PATH);
  const domainScores = readRecord(parsed?.domainScores);
  const costDomain = readRecord(domainScores.costRunawayWorkControls);
  return (readNumber(costDomain.findingCount) ?? 0) > 0
    || (readNumber(costDomain.majorCount) ?? 0) > 0
    || String(costDomain.status ?? "").includes("risk");
}

function buildCostReadiness(root: string): PublicBetaCostReadiness {
  const parsed = readJsonFile(root, CREATOR_DASHBOARD_COST_INVENTORY_PATH);
  if (!parsed) {
    const missing = {
      status: "missing_inventory" as const,
      detail: "Creator dashboard error/cost inventory is missing.",
      evidence: [`artifactPath=${CREATOR_DASHBOARD_COST_INVENTORY_PATH}`, "artifactExists=false"],
      blocksBetaExit: false,
    };
    return {
      cloudRunCostReadiness: missing,
      cloudSqlCostReadiness: missing,
      geminiCloudAssistCostReadiness: missing,
      route4xxReadiness: missing,
    };
  }

  const summary = readRecord(parsed.summary);
  const cloudRunFindings = readArray(parsed.cloudRunCostFindings);
  const cloudSqlFindings = readArray(parsed.cloudSqlCostFindings);
  const geminiFindings = readArray(parsed.geminiCloudAssistCostFindings);
  const speedCostRisk = speedSecurityHasCostRisk(root);
  const unexpected4xxCount = readNumber(summary.unexpected4xxCount) ?? 0;
  const unexpected4xxFixed = readNumber(summary.unexpected4xxFixed) ?? 0;
  const route4xxBlocked = unexpected4xxCount > unexpected4xxFixed;

  return {
    cloudRunCostReadiness: {
      status: speedCostRisk ? "cost_review_required" : cloudRunFindings.length > 0 ? "source_inventory_complete" : "config_not_in_repo",
      detail: speedCostRisk
        ? "Speed/security cost findings remain, so App Hosting and Cloud Run cost readiness stays owner-review."
        : cloudRunFindings.length > 0
          ? "Source inventory found App Hosting/Cloud Run configuration and no P0/P1 Cloud Run blocker."
          : "No Cloud Run/App Hosting source configuration was detected in repo.",
      evidence: [
        `artifactPath=${CREATOR_DASHBOARD_COST_INVENTORY_PATH}`,
        `cloudRunCostFindings=${cloudRunFindings.length}`,
        `speedSecurityCostReviewRequired=${speedCostRisk}`,
      ],
      blocksBetaExit: false,
    },
    cloudSqlCostReadiness: {
      status: cloudSqlFindings.length > 0 ? "not_detected_in_repo" : "not_detected_in_repo",
      detail: cloudSqlFindings.length > 0
        ? "Cloud SQL appears only as the Data Connect/agent-context mirror; no creator-dashboard runtime SQL path was detected."
        : "No Cloud SQL runtime usage was detected in repo source.",
      evidence: [
        `artifactPath=${CREATOR_DASHBOARD_COST_INVENTORY_PATH}`,
        `cloudSqlCostFindings=${cloudSqlFindings.length}`,
        "cloudSqlRuntimeUsageDetected=false",
      ],
      blocksBetaExit: false,
    },
    geminiCloudAssistCostReadiness: {
      status: speedCostRisk || geminiFindings.length > 0 ? "cost_review_required" : "not_detected_in_repo",
      detail: geminiFindings.length > 0
        ? "Gemini, Cloud Assist, Vertex, or AI usage remains an owner-review cost lane; no pass is inferred from source inventory."
        : "No Gemini, Cloud Assist, Vertex, or AI runtime usage was detected in repo source.",
      evidence: [
        `artifactPath=${CREATOR_DASHBOARD_COST_INVENTORY_PATH}`,
        `geminiCloudAssistCostFindings=${geminiFindings.length}`,
        `speedSecurityCostReviewRequired=${speedCostRisk}`,
      ],
      blocksBetaExit: false,
    },
    route4xxReadiness: {
      status: route4xxBlocked ? "blocked" : "source_inventory_complete",
      detail: route4xxBlocked
        ? "Unexpected 4xx findings remain unfixed in the creator dashboard route inventory."
        : "Expected 4xx paths are classified and the frontend-caused creator dashboard 4xx was fixed.",
      evidence: [
        `artifactPath=${CREATOR_DASHBOARD_COST_INVENTORY_PATH}`,
        `expected4xxCount=${readNumber(summary.expected4xxCount) ?? 0}`,
        `unexpected4xxCount=${unexpected4xxCount}`,
        `unexpected4xxFixed=${unexpected4xxFixed}`,
      ],
      blocksBetaExit: route4xxBlocked,
    },
  };
}

export function runPublicBetaReadinessScore(root = process.cwd(), safeAutofixesApplied = 0) {
  const debugEvidence = loadDebugEvidenceForAuditDomains([
    ...Object.keys(PUBLIC_BETA_DOMAIN_WEIGHTS),
    "support",
  ], root, 10);
  const report = buildPublicBetaReadinessReport({
    root,
    safeAutofixesApplied,
    currentHead: readGitHead(root),
    debugEvidence,
    evidence: {
      requiredReports: collectGeneratedReportEvidence(root),
      targetedBehaviorEvidence: readTargetedBehaviorEvidence(root),
      visualManualEvidence: readVisualManualEvidence(root),
      providerSmokeEvidence: readProviderSmokeEvidence(root),
      runtimeSmokeEvidence: readRuntimeSmokeEvidence(root),
      adminTruthSampleEvidence: readAdminTruthSampleEvidence(root),
      costReadiness: buildCostReadiness(root),
      openPrTriageFresh: true,
    },
  });
  writePublicBetaScoreReport(report, root);
  return report;
}

const report = runPublicBetaReadinessScore();
printPublicBetaScoreSummary(report);
