import { pathToFileURL } from "node:url";

import {
  getPackageScripts,
  nowIso,
  readJsonFile,
  writeJsonFile,
  type Json,
} from "./shared";
import {
  SIGNAL_FINDING_SCHEMA_VERSION,
  type SignalEvidenceKind,
  type SignalFinding,
  type SignalOwnerLane,
  type SignalSourceSurface,
  type SignalTerminalProofRequirement,
} from "../../src/lib/agent-score/signal-finding-contract";
import {
  buildGeneratedReportCleanupMetadata,
  buildGeneratedReportCompleteness,
  type GeneratedReportCompletenessMetadata,
  type GeneratedReportCleanupMetadata,
  type GeneratedReportFreshness,
} from "../../src/lib/generated-reports/generated-report-contract";
import { selectVerificationPlan, type VerificationPlan } from "./verification-selector";
import { buildSignalSourceGraphReportFromRepo } from "./collect-signal-source-graph";

const SOURCE_GRAPH_REPORT_PATH = "agent/state/signal-source-graph.generated.json";
const PROBLEM_RANK_REPORT_PATH = "agent/state/signal-problem-rank.generated.json";
const MAX_RANKED_PROBLEMS = 50;

type CanonicalHelperEntry = {
  path: string;
  family: string;
  purpose: string;
};

type WorkflowGuidanceEntry = {
  path: string;
  authorityLevel: string;
};

type SignalSourceGraphReport = {
  schemaVersion: typeof SIGNAL_FINDING_SCHEMA_VERSION;
  generatedAtUtc: string;
  reportPath: string;
  gitStatus?: "available" | "missing" | "error";
  sourceFileDiscovery?: "git" | "repo_inventory" | "filesystem";
  toolingDegraded?: boolean;
  degradationReason?: string | null;
  currentHead?: string | null;
  currentHeadSource?: "git" | "repo_inventory" | "generated_artifact" | "unknown";
  inventoryBaselineStatus?: "current" | "stale" | "missing" | "unknown";
  summary: {
    findingCount: number;
    byRule: Record<string, number>;
    byOwnerLane: Record<string, number>;
    bySourceSurface: Record<string, number>;
  };
  findings: SignalFinding[] | {
    totalCount: number;
    emittedCount: number;
    examples: SignalFinding[];
    topRiskExamples: SignalFinding[];
  };
  rankInputFindings?: SignalFinding[];
};

type SignalEvidenceClassification =
  | "source_only"
  | "generated_stale_snapshot"
  | "redacted_runtime_evidence"
  | "provider_runtime_proof"
  | "manual_operator_evidence"
  | "fixture_only";

type SignalMinimalVerificationCategory =
  | "no_terminal_needed"
  | "typecheck_only"
  | "lint_only"
  | "targeted_unit_or_contract_test"
  | "task_specific_validator"
  | "signoff_only_check"
  | "browser_provider_deploy_forbidden";

type SignalProblemQueueCategory =
  | "fix_now"
  | "queue_later"
  | "manual_evidence_required"
  | "external_proof_required"
  | "do_not_source_fix"
  | "archive_stale_evidence";

type SignalProblemRiskDimensions = {
  fixability: number;
  impact: number;
  evidenceQuality: number;
  safety: number;
  sourceTruthRisk: number;
  userImpactRisk: number;
  privacySecurityRisk: number;
  paymentEconomyRisk: number;
  lockedContentRisk: number;
  staleEvidenceRisk: number;
  orphanDisconnectedCodeRisk: number;
  duplicateOwnerRisk: number;
  validatorCoverageGap: number;
  protectedDomainRisk: number;
  confidence: number;
  blastRadius: number;
  verificationCost: number;
};

type RankedSignalProblem = {
  rank: number;
  id: string;
  ruleId: string;
  score: number;
  shortTitle: string;
  whyItMatters: string;
  queueCategory: SignalProblemQueueCategory;
  affectedSurface: SignalSourceSurface;
  ownerLane: SignalOwnerLane;
  canonicalOwner: string;
  evidenceClassifications: SignalEvidenceClassification[];
  evidenceReferences: string[];
  affectedFiles: string[];
  nextSafeStep: string;
  minimalValidatorRecommendation: string[];
  minimalVerification: {
    category: SignalMinimalVerificationCategory;
    commands: string[];
    signoffCommands: string[];
    selectorMatchedPaths: string[];
    selectorTouchedDomains: string[];
    broadChecksNotNeededBecause: string;
    browserProviderDeployPolicy: "forbidden_by_default" | "explicit_promotion_required" | "not_applicable";
    blockedCommandsRequiringPromotion: string[];
    explanation: string;
  };
  terminalRequirement: SignalTerminalProofRequirement;
  sourceTruthCaveat: string;
  dimensions: SignalProblemRiskDimensions;
};

type SignalProblemRankReport = {
  schemaVersion: typeof SIGNAL_FINDING_SCHEMA_VERSION;
  generatedAtUtc: string;
  sourceGraphPath: typeof SOURCE_GRAPH_REPORT_PATH;
  sourceGraphGeneratedAtUtc: string;
  reportPath: typeof PROBLEM_RANK_REPORT_PATH;
  reportCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  totalFindingCount: number;
  emittedFindingCount: number;
  omittedFindingCount: number;
  capReason: string | null;
  capStrategy: GeneratedReportCompletenessMetadata["capStrategy"];
  capLimit: number | null;
  rankingInputCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  highRiskCounts: NonNullable<GeneratedReportCompletenessMetadata["highRiskCounts"]>;
  sourceFileDiscovery: SignalSourceGraphReport["sourceFileDiscovery"] | "not_applicable";
  gitStatus: SignalSourceGraphReport["gitStatus"] | "not_required";
  toolingDegraded: boolean;
  degradationReason: string | null;
  currentHead: string | null;
  currentHeadSource: "git" | "repo_inventory" | "generated_artifact" | "unknown" | "not_required";
  sourceCommit: string | null;
  freshness: GeneratedReportFreshness;
  baselineStatus: SignalSourceGraphReport["inventoryBaselineStatus"] | "not_required";
  owner: string;
  safetyClass: GeneratedReportCleanupMetadata["safetyClass"];
  costClass: GeneratedReportCleanupMetadata["costClass"];
  rollback: string;
  cleanupPolicy: GeneratedReportCleanupMetadata["cleanupPolicy"];
  cleanupCommand: string | null;
  sourceTruthRole: GeneratedReportCleanupMetadata["sourceTruthRole"];
  verificationInputs: {
    selector: string;
    indexes: string[];
    workflowGuidanceFiles: number;
    requiredWorkflowGuidanceFiles: number;
  };
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: {
    sourceFindingCount: number;
    rankInputFindingCount: number;
    rankedProblemCount: number;
    topScore: number;
    providerRuntimeProofCount: number;
    sourceOnlyEvidenceCount: number;
    staleGeneratedSnapshotCount: number;
    signoffTerminalCount: number;
    targetedTerminalCount: number;
    forbiddenTerminalCount: number;
    byQueueCategory: Record<SignalProblemQueueCategory, number>;
  };
  compactQueue: Record<SignalProblemQueueCategory, Array<{
    rank: number;
    id: string;
    score: number;
    title: string;
    nextSafeStep: string;
  }>>;
  rankedProblems: RankedSignalProblem[];
};

const SEVERITY_WEIGHT: Record<SignalFinding["severity"], number> = {
  info: 4,
  minor: 10,
  moderate: 18,
  major: 28,
  critical: 40,
};

const CONFIDENCE_WEIGHT: Record<SignalFinding["confidence"], number> = {
  low: 20,
  medium: 55,
  high: 80,
  blocked: 35,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesAny(value: string, needles: string[]) {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function findingText(finding: SignalFinding) {
  return [
    finding.ruleId,
    finding.title,
    finding.rootCauseHypothesis,
    finding.recommendedNextAction,
    finding.sourceSurface,
    finding.ownerLane,
    ...finding.affectedFiles.map((file) => file.path),
  ].join(" ");
}

function evidenceClassificationsForFinding(finding: SignalFinding): SignalEvidenceClassification[] {
  const classes = new Set<SignalEvidenceClassification>();
  const evidenceKinds = new Set<SignalEvidenceKind>(finding.evidence.map((evidence) => evidence.kind));

  if (evidenceKinds.has("provider_proof")) classes.add("provider_runtime_proof");
  if (evidenceKinds.has("runtime_redacted") || evidenceKinds.has("debug_evidence")) classes.add("redacted_runtime_evidence");
  if (evidenceKinds.has("manual_operator")) classes.add("manual_operator_evidence");
  if (evidenceKinds.has("fixture")) classes.add("fixture_only");
  if (evidenceKinds.has("generated_snapshot") || finding.staleEvidence === "stale" || finding.sourceSurface === "generated_artifact") {
    classes.add("generated_stale_snapshot");
  }
  if (evidenceKinds.has("source") && classes.size === 0) classes.add("source_only");
  if (evidenceKinds.has("source") && !classes.has("provider_runtime_proof") && !classes.has("redacted_runtime_evidence")) {
    classes.add("source_only");
  }

  return Array.from(classes).sort();
}

function sourceTruthCaveat(classifications: SignalEvidenceClassification[]) {
  if (classifications.includes("provider_runtime_proof")) {
    return "Provider/runtime proof is represented by evidence metadata; still verify freshness before release claims.";
  }
  if (classifications.includes("redacted_runtime_evidence")) {
    return "Runtime evidence is redacted support signal, not raw user activity or provider proof.";
  }
  if (classifications.includes("manual_operator_evidence")) {
    return "Manual/operator evidence can guide triage but does not replace provider/runtime proof.";
  }
  if (classifications.includes("generated_stale_snapshot")) {
    return "Generated snapshot evidence is stale or derived; refresh only the owning artifact before claiming current truth.";
  }
  if (classifications.includes("fixture_only")) {
    return "Fixture evidence checks shape and behavior only; it is not runtime proof.";
  }
  return "Source-only evidence can identify likely code problems, but it does not prove runtime or provider behavior.";
}

function sourceTruthCaveatForFinding(finding: SignalFinding, sourceGraph: SignalSourceGraphReport, classifications: SignalEvidenceClassification[]) {
  if (sourceGraph.toolingDegraded) {
    return `Source discovery was degraded (${sourceGraph.sourceFileDiscovery ?? "unknown"} fallback: ${sourceGraph.degradationReason ?? "unknown"}). Treat this finding as source-only triage, not Git-backed proof.`;
  }
  if (sourceGraph.inventoryBaselineStatus && sourceGraph.inventoryBaselineStatus !== "current") {
    return `Repo inventory baseline is ${sourceGraph.inventoryBaselineStatus}; hash/freshness-derived evidence needs review before it can establish current source truth.`;
  }
  return sourceTruthCaveat(classifications);
}

function findingsForRanking(sourceGraph: SignalSourceGraphReport) {
  if (sourceGraph.rankInputFindings?.length) return sourceGraph.rankInputFindings;
  if (Array.isArray(sourceGraph.findings)) return sourceGraph.findings;
  return sourceGraph.findings.topRiskExamples.length > sourceGraph.findings.examples.length
    ? sourceGraph.findings.topRiskExamples
    : sourceGraph.findings.examples;
}

function highRiskCounts(problems: RankedSignalProblem[]): NonNullable<GeneratedReportCompletenessMetadata["highRiskCounts"]> {
  return {
    critical: problems.filter((problem) => problem.dimensions.sourceTruthRisk >= 80 || problem.score >= 80).length,
    major: problems.filter((problem) => problem.score >= 60).length,
    signoff: problems.filter((problem) => problem.terminalRequirement === "signoff").length,
    privacy: problems.filter((problem) => problem.dimensions.privacySecurityRisk >= 50).length,
    payment: problems.filter((problem) => problem.dimensions.paymentEconomyRisk >= 50).length,
    lockedContent: problems.filter((problem) => problem.dimensions.lockedContentRisk >= 50).length,
    sourceTruth: problems.filter((problem) => problem.dimensions.sourceTruthRisk >= 50).length,
  };
}

function riskDimensionsForFinding(finding: SignalFinding): SignalProblemRiskDimensions {
  const text = findingText(finding);
  const affectedFiles = finding.affectedFiles.map((file) => file.path);
  const sourceTruthRisk = clampScore(
    SEVERITY_WEIGHT[finding.severity] +
      (finding.sourceSurface === "server_truth" ? 20 : 0) +
      (finding.ruleId.includes("ui-server-import") || finding.ruleId.includes("server-truth-in-ui") ? 25 : 0) +
      (finding.ruleId.includes("route-noncanonical-helper") ? 15 : 0),
  );
  const userImpactRisk = clampScore(
    (["user_ui", "creator_ui", "admin_ui", "server_truth"].includes(finding.sourceSurface) ? 20 : 8) +
      (includesAny(text, ["route", "page", "component", "api", "support", "chat", "drop"]) ? 15 : 0) +
      (finding.severity === "critical" || finding.severity === "major" ? 15 : 0),
  );
  const privacySecurityRisk = clampScore(
    (finding.ownerLane === "privacy" || finding.sourceSurface === "identity_auth" ? 35 : 0) +
      (includesAny(text, ["auth", "identity", "privacy", "permission", "security", "admin", "server"]) ? 25 : 0),
  );
  const paymentEconomyRisk = clampScore(
    (finding.sourceSurface === "wallet_economy_payment" ? 45 : 0) +
      (includesAny(text, ["wallet", "payment", "paypal", "gumdrop", "economy", "billing", "entitlement"]) ? 30 : 0),
  );
  const lockedContentRisk = clampScore(
    (finding.sourceSurface === "drop_content_unlock" ? 35 : 0) +
      (includesAny(text, ["locked", "unlock", "entitlement", "preview", "content_protection", "private media"]) ? 30 : 0),
  );
  const staleEvidenceRisk = clampScore(
    (finding.staleEvidence === "stale" ? 40 : 0) +
      (finding.sourceSurface === "generated_artifact" ? 25 : 0) +
      (finding.ruleId.includes("stale-generated-report") ? 25 : 0),
  );
  const orphanDisconnectedCodeRisk = clampScore(
    (finding.ruleId.includes("orphan") || finding.ruleId.includes("unresolved-import") || finding.ruleId.includes("validator-without-package-owner") ? 45 : 0) +
      (affectedFiles.some((file) => file.startsWith("scripts/agent/")) ? 10 : 0),
  );
  const duplicateOwnerRisk = clampScore(finding.ruleId.includes("duplicate-owner") ? 55 : 0);
  const validatorCoverageGap = clampScore(
    (finding.minimalVerificationCommands.length === 0 ? 30 : 0) +
      (finding.ruleId.includes("validator-without-package-owner") ? 45 : 0) +
      (finding.terminalProof === "signoff" ? 20 : 0),
  );
  const confidence = CONFIDENCE_WEIGHT[finding.confidence];
  const blastRadius = clampScore(
    (finding.affectedFiles.length * 8) +
      (finding.affectedFiles.some((file) => file.path.startsWith("src/lib/server/") || file.path.startsWith("functions/src/")) ? 25 : 0) +
      (finding.affectedFiles.some((file) => file.path.startsWith("src/app/api/")) ? 20 : 0) +
      (finding.ownerLane === "agent_context" ? 10 : 0),
  );
  const verificationCost = clampScore(
    (finding.minimalVerificationCommands.length * 12) +
      (finding.terminalProof === "signoff" ? 40 : 0) +
      (finding.terminalProof === "targeted" ? 18 : 0) +
      (finding.terminalProof === "forbidden" ? 5 : 0),
  );
  const protectedDomainRisk = clampScore(Math.max(
    privacySecurityRisk,
    paymentEconomyRisk,
    lockedContentRisk,
    includesAny(text, ["provider", "paypal", "firebase rules", "middleware", "production", "billing"]) ? 75 : 0,
  ));
  const fixability = clampScore(
    100 -
      verificationCost * 0.42 -
      blastRadius * 0.25 -
      protectedDomainRisk * 0.24 -
      (finding.confidence === "blocked" ? 25 : 0) +
      (finding.minimalVerificationCommands.length > 0 ? 10 : 0) +
      (finding.sourceSurface === "generated_artifact" ? 12 : 0),
  );
  const impact = clampScore(
    sourceTruthRisk * 0.26 +
      userImpactRisk * 0.24 +
      privacySecurityRisk * 0.16 +
      paymentEconomyRisk * 0.14 +
      lockedContentRisk * 0.12 +
      staleEvidenceRisk * 0.08,
  );
  const evidenceQuality = clampScore(
    confidence * 0.55 +
      (finding.staleEvidence === "current" ? 22 : 0) +
      (finding.evidence.some((evidence) => evidence.kind === "source") ? 12 : 0) +
      (finding.evidence.some((evidence) => evidence.kind === "debug_evidence" || evidence.kind === "runtime_redacted") ? 14 : 0) +
      (finding.staleEvidence === "stale" ? -30 : 0) +
      (finding.evidence.some((evidence) => evidence.kind === "manual_operator") ? -8 : 0),
  );
  const safety = clampScore(
    100 -
      protectedDomainRisk * 0.48 -
      verificationCost * 0.18 -
      blastRadius * 0.18 +
      (finding.terminalProof === "none" ? 10 : 0) +
      (finding.sourceSurface === "generated_artifact" ? 8 : 0),
  );

  return {
    fixability,
    impact,
    evidenceQuality,
    safety,
    sourceTruthRisk,
    userImpactRisk,
    privacySecurityRisk,
    paymentEconomyRisk,
    lockedContentRisk,
    staleEvidenceRisk,
    orphanDisconnectedCodeRisk,
    duplicateOwnerRisk,
    validatorCoverageGap,
    protectedDomainRisk,
    confidence,
    blastRadius,
    verificationCost,
  };
}

function scoreDimensions(dimensions: SignalProblemRiskDimensions) {
  return clampScore(
    dimensions.fixability * 0.14 +
      dimensions.impact * 0.18 +
      dimensions.evidenceQuality * 0.12 +
      dimensions.safety * 0.1 +
      dimensions.sourceTruthRisk * 0.12 +
      dimensions.userImpactRisk * 0.1 +
      dimensions.privacySecurityRisk * 0.08 +
      dimensions.paymentEconomyRisk * 0.08 +
      dimensions.lockedContentRisk * 0.07 +
      dimensions.staleEvidenceRisk * 0.08 +
      dimensions.orphanDisconnectedCodeRisk * 0.1 +
      dimensions.duplicateOwnerRisk * 0.05 +
      dimensions.validatorCoverageGap * 0.08 +
      dimensions.confidence * 0.06 +
      dimensions.blastRadius * 0.04 -
      dimensions.verificationCost * 0.08 -
      dimensions.protectedDomainRisk * 0.08,
  );
}

function whyItMatters(finding: SignalFinding, dimensions: SignalProblemRiskDimensions) {
  if (dimensions.privacySecurityRisk >= 50) {
    return "This may affect auth, privacy, permissions, or server-only boundaries and should not be fixed by UI-only patches.";
  }
  if (dimensions.paymentEconomyRisk >= 50) {
    return "This may touch wallet, payment, economy, or entitlement truth where source mistakes can create financial or access drift.";
  }
  if (dimensions.lockedContentRisk >= 50) {
    return "This may affect locked content, preview, unlock, or entitlement boundaries where accidental exposure matters.";
  }
  if (dimensions.sourceTruthRisk >= 60) {
    return "This may put source-truth responsibility in the wrong layer or bypass a canonical owner.";
  }
  if (dimensions.orphanDisconnectedCodeRisk >= 50) {
    return "Disconnected imports, orphan candidates, or unwired validators can hide dead paths and make later fixes miss real owners.";
  }
  if (dimensions.staleEvidenceRisk >= 50) {
    return "The evidence is stale or generated, so agents could over-trust an old snapshot unless it is refreshed for the selected task.";
  }
  return "This is a local source-graph signal that should guide targeted review before broad validation.";
}

function canonicalOwnerForFinding(finding: SignalFinding, helpers: CanonicalHelperEntry[]) {
  const affectedPaths = new Set(finding.affectedFiles.map((file) => file.path));
  const direct = helpers.find((helper) => affectedPaths.has(helper.path));
  if (direct) return `${direct.family}: ${direct.path}`;

  if (finding.ownerLane !== "unknown") return finding.ownerLane;
  return "unknown";
}

function terminalRequirementForFinding(finding: SignalFinding, dimensions: SignalProblemRiskDimensions): SignalTerminalProofRequirement {
  if (finding.terminalProof === "forbidden") return "forbidden";
  if (dimensions.paymentEconomyRisk >= 60 || dimensions.privacySecurityRisk >= 65 || dimensions.lockedContentRisk >= 65) return "signoff";
  if (finding.minimalVerificationCommands.length > 0 || dimensions.sourceTruthRisk >= 50 || dimensions.orphanDisconnectedCodeRisk >= 50) return "targeted";
  return "none";
}

function minimalValidatorRecommendation(finding: SignalFinding, terminalRequirement: SignalTerminalProofRequirement) {
  if (terminalRequirement === "forbidden") return [];
  if (finding.minimalVerificationCommands.length > 0) return finding.minimalVerificationCommands;
  if (finding.ruleId.includes("validator-without-package-owner")) return ["npm run signal:source-graph"];
  if (finding.ruleId.includes("stale-generated-report")) return ["Refresh only the owning generated artifact if the current task consumes it."];
  if (terminalRequirement === "targeted" || terminalRequirement === "signoff") return ["npm run typecheck"];
  return [];
}

function queueCategoryForFinding(input: {
  finding: SignalFinding;
  dimensions: SignalProblemRiskDimensions;
  evidenceClassifications: SignalEvidenceClassification[];
  terminalRequirement: SignalTerminalProofRequirement;
  minimalVerificationCategory: SignalMinimalVerificationCategory;
  score: number;
}): SignalProblemQueueCategory {
  const { finding, dimensions, evidenceClassifications, terminalRequirement, minimalVerificationCategory, score } = input;

  if (terminalRequirement === "forbidden" || dimensions.protectedDomainRisk >= 82) {
    return "do_not_source_fix";
  }
  if (
    evidenceClassifications.includes("provider_runtime_proof") ||
    (terminalRequirement === "signoff" && dimensions.protectedDomainRisk >= 60)
  ) {
    return "external_proof_required";
  }
  if (evidenceClassifications.includes("manual_operator_evidence")) {
    return "manual_evidence_required";
  }
  if (
    evidenceClassifications.includes("generated_stale_snapshot") &&
    dimensions.impact < 45 &&
    dimensions.sourceTruthRisk < 50
  ) {
    return "archive_stale_evidence";
  }
  if (
    score >= 45 &&
    dimensions.fixability >= 55 &&
    dimensions.safety >= 55 &&
    dimensions.blastRadius < 35 &&
    dimensions.protectedDomainRisk < 45 &&
    terminalRequirement !== "signoff" &&
    minimalVerificationCategory !== "signoff_only_check" &&
    finding.staleEvidence !== "stale"
  ) {
    return "fix_now";
  }
  if (terminalRequirement === "signoff") {
    return "manual_evidence_required";
  }
  return "queue_later";
}

function chooseVerificationCategory(input: {
  finding: SignalFinding;
  terminalRequirement: SignalTerminalProofRequirement;
  selectorPlan: VerificationPlan;
  minimalCommands: string[];
  allowedSignoffCommands: string[];
}): SignalMinimalVerificationCategory {
  const { finding, terminalRequirement, selectorPlan, minimalCommands, allowedSignoffCommands } = input;
  const allCommands = [...minimalCommands, ...selectorPlan.fastCommands, ...allowedSignoffCommands].join(" ");

  if (terminalRequirement === "forbidden") return "browser_provider_deploy_forbidden";
  if (terminalRequirement === "signoff" || allowedSignoffCommands.length > 0) return "signoff_only_check";
  if (/agent:test|vitest|test:contracts/iu.test(allCommands)) return "targeted_unit_or_contract_test";
  if (/check:[a-z0-9:-]+|score:[a-z0-9:-]+/iu.test(allCommands) && !/npm run check($|\s)/iu.test(allCommands)) {
    return "task_specific_validator";
  }
  if (minimalCommands.length === 1 && minimalCommands[0] === "npm run typecheck") return "typecheck_only";
  if (minimalCommands.length === 1 && minimalCommands[0] === "npm run lint") return "lint_only";
  if (finding.minimalVerificationCommands.length === 0 && selectorPlan.fastCommands.length === 0) return "no_terminal_needed";
  if (selectorPlan.fastCommands.length === 1 && selectorPlan.fastCommands[0] === "npm run typecheck") return "typecheck_only";
  if (selectorPlan.fastCommands.length === 1 && selectorPlan.fastCommands[0] === "npm run lint") return "lint_only";
  return minimalCommands.length > 0 ? "task_specific_validator" : "no_terminal_needed";
}

function buildMinimalVerification(input: {
  finding: SignalFinding;
  terminalRequirement: SignalTerminalProofRequirement;
  dimensions: SignalProblemRiskDimensions;
}) {
  const selectorPlan = selectVerificationPlan({
    paths: input.finding.affectedFiles.map((file) => file.path),
  });
  const recommendedCommands = minimalValidatorRecommendation(input.finding, input.terminalRequirement);
  const selectorFastCommands = selectorPlan.fastCommands.filter((command) =>
    command !== "npm run check:ui:audits" &&
    command !== "npm run check:continuity" &&
    !/playwright|cypress|lighthouse|firebase deploy|gcloud/iu.test(command),
  );
  const isPromotionRequiredCommand = (command: string) =>
    /playwright|cypress|lighthouse|firebase deploy|gcloud|provider API|check:ui:audits|check:ui:lighthouse/iu.test(command);
  const blockedCommandsRequiringPromotion = selectorPlan.signoffCommands.filter(isPromotionRequiredCommand);
  const allowedSignoffCommands = selectorPlan.signoffCommands.filter((command) => !isPromotionRequiredCommand(command));
  const commands = Array.from(new Set([...recommendedCommands, ...selectorFastCommands])).filter((command) =>
    !/Refresh only the owning generated artifact/iu.test(command),
  );
  const category = chooseVerificationCategory({
    finding: input.finding,
    terminalRequirement: input.terminalRequirement,
    selectorPlan,
    minimalCommands: commands,
    allowedSignoffCommands,
  });
  const signoffCommands = category === "signoff_only_check" ? allowedSignoffCommands : [];
  const hasRuntimeProof = input.finding.evidence.some((evidence) => evidence.kind === "provider_proof" || evidence.kind === "runtime_redacted");

  return {
    category,
    commands: category === "no_terminal_needed" || category === "browser_provider_deploy_forbidden" ? [] : commands,
    signoffCommands,
    selectorMatchedPaths: selectorPlan.matchedRepoPaths.slice(0, 8),
    selectorTouchedDomains: selectorPlan.touchedDomains,
    broadChecksNotNeededBecause: selectorPlan.broadWork || category === "signoff_only_check"
      ? "The selector marks this as broad or signoff-sensitive; keep broad checks out of the edit loop and run them only at signoff."
      : "The finding is bounded to source/index evidence and matched paths have a targeted fast lane, so full npm run check, browser audits, provider calls, and deploy checks are unnecessary by default.",
    browserProviderDeployPolicy: hasRuntimeProof ? "explicit_promotion_required" as const : "forbidden_by_default" as const,
    blockedCommandsRequiringPromotion,
    explanation: selectorPlan.reasoning.join(" "),
  };
}

export function buildSignalProblemRankReport(input: {
  sourceGraph: SignalSourceGraphReport;
  canonicalHelpers: CanonicalHelperEntry[];
  workflowGuidance?: WorkflowGuidanceEntry[];
  packageScripts: Record<string, string>;
}): SignalProblemRankReport {
  const rankInputFindings = findingsForRanking(input.sourceGraph);
  const allRanked = rankInputFindings
    .map((finding) => {
      const dimensions = riskDimensionsForFinding(finding);
      const terminalRequirement = terminalRequirementForFinding(finding, dimensions);
      const evidenceClassifications = evidenceClassificationsForFinding(finding);
      const minimalValidator = minimalValidatorRecommendation(finding, terminalRequirement);
      const minimalVerification = buildMinimalVerification({ finding, terminalRequirement, dimensions });
      const score = scoreDimensions(dimensions);
      const queueCategory = queueCategoryForFinding({
        finding,
        dimensions,
        evidenceClassifications,
        terminalRequirement,
        minimalVerificationCategory: minimalVerification.category,
        score,
      });

      return {
        rank: 0,
        id: finding.id,
        ruleId: finding.ruleId,
        score,
        shortTitle: finding.title,
        whyItMatters: whyItMatters(finding, dimensions),
        queueCategory,
        affectedSurface: finding.sourceSurface,
        ownerLane: finding.ownerLane,
        canonicalOwner: canonicalOwnerForFinding(finding, input.canonicalHelpers),
        evidenceClassifications,
        evidenceReferences: finding.evidence.map((evidence) => `${evidence.kind}:${evidence.source}`).slice(0, 5),
        affectedFiles: finding.affectedFiles.map((file) => file.path).slice(0, 8),
        nextSafeStep: finding.recommendedNextAction,
        minimalValidatorRecommendation: minimalValidator,
        minimalVerification,
        terminalRequirement,
        sourceTruthCaveat: sourceTruthCaveatForFinding(finding, input.sourceGraph, evidenceClassifications),
        dimensions,
      };
    })
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const ranked = allRanked
    .slice(0, MAX_RANKED_PROBLEMS)
    .map((problem, index) => ({ ...problem, rank: index + 1 }));

  const classifications = ranked.flatMap((problem) => problem.evidenceClassifications);
  const emptyCategoryCounts: Record<SignalProblemQueueCategory, number> = {
    fix_now: 0,
    queue_later: 0,
    manual_evidence_required: 0,
    external_proof_required: 0,
    do_not_source_fix: 0,
    archive_stale_evidence: 0,
  };
  const byQueueCategory = ranked.reduce<Record<SignalProblemQueueCategory, number>>((counts, problem) => {
    counts[problem.queueCategory] += 1;
    return counts;
  }, { ...emptyCategoryCounts });
  const compactQueue = Object.fromEntries(
    (Object.keys(emptyCategoryCounts) as SignalProblemQueueCategory[]).map((category) => [
      category,
      ranked
        .filter((problem) => problem.queueCategory === category)
        .slice(0, 8)
        .map((problem) => ({
          rank: problem.rank,
          id: problem.id,
          score: problem.score,
          title: problem.shortTitle,
          nextSafeStep: problem.nextSafeStep,
        })),
    ]),
  ) as SignalProblemRankReport["compactQueue"];
  const completeness = buildGeneratedReportCompleteness({
    totalFindingCount: allRanked.length,
    emittedFindingCount: ranked.length,
    capLimit: MAX_RANKED_PROBLEMS,
    capStrategy: allRanked.length > ranked.length ? "top_risk" : "none",
    capReason: allRanked.length > ranked.length ? "rank report emits the top scored queue while ranking all source findings first" : null,
    degraded: input.sourceGraph.toolingDegraded ?? false,
    rankingInputCompleteness: "complete",
    highRiskCounts: highRiskCounts(allRanked),
  });
  const cleanupMetadata = buildGeneratedReportCleanupMetadata({
    owner: "scripts/agent/rank-signal-problems.ts",
    safetyClass: "source_safe",
    costClass: "local_free",
    rollback: "Revert this generated report and rerun npm run signal:rank after restoring ranker inputs.",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run signal:rank",
    sourceTruthRole: "generated_snapshot",
  });

  return {
    schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
    generatedAtUtc: nowIso(),
    sourceGraphPath: SOURCE_GRAPH_REPORT_PATH,
    sourceGraphGeneratedAtUtc: input.sourceGraph.generatedAtUtc,
    reportPath: PROBLEM_RANK_REPORT_PATH,
    ...completeness,
    sourceFileDiscovery: input.sourceGraph.sourceFileDiscovery ?? "not_applicable",
    gitStatus: input.sourceGraph.gitStatus ?? "not_required",
    toolingDegraded: input.sourceGraph.toolingDegraded ?? false,
    degradationReason: input.sourceGraph.degradationReason ?? null,
    currentHead: input.sourceGraph.currentHead ?? null,
    currentHeadSource: input.sourceGraph.currentHeadSource ?? "unknown",
    sourceCommit: input.sourceGraph.currentHead ?? null,
    freshness: input.sourceGraph.toolingDegraded ? "degraded" : "fresh",
    baselineStatus: input.sourceGraph.inventoryBaselineStatus ?? "unknown",
    ...cleanupMetadata,
    verificationInputs: {
      selector: "scripts/agent/verification-selector.ts",
      indexes: [
        "agent/index/verification-commands.json",
        "agent/index/workflow-guidance.json",
        "agent/index/surface-map.json",
        "agent/index/canonical-helpers.json",
      ],
      workflowGuidanceFiles: input.workflowGuidance?.length ?? 0,
      requiredWorkflowGuidanceFiles: input.workflowGuidance?.filter((entry) => entry.authorityLevel === "workflow_required").length ?? 0,
    },
    commandBudget: {
      allowedCommands: ["npm run signal:rank", "npm run typecheck", "npm run agent:test -- tests/unit/signal-problem-rank.spec.ts"],
      forbiddenCommands: ["npm run check", "playwright", "cypress", "lighthouse", "firebase deploy", "gcloud", "provider API calls"],
    },
    summary: {
      sourceFindingCount: input.sourceGraph.summary.findingCount,
      rankInputFindingCount: rankInputFindings.length,
      rankedProblemCount: ranked.length,
      topScore: ranked[0]?.score ?? 0,
      providerRuntimeProofCount: classifications.filter((classification) => classification === "provider_runtime_proof").length,
      sourceOnlyEvidenceCount: classifications.filter((classification) => classification === "source_only").length,
      staleGeneratedSnapshotCount: classifications.filter((classification) => classification === "generated_stale_snapshot").length,
      signoffTerminalCount: ranked.filter((problem) => problem.terminalRequirement === "signoff").length,
      targetedTerminalCount: ranked.filter((problem) => problem.terminalRequirement === "targeted").length,
      forbiddenTerminalCount: ranked.filter((problem) => problem.terminalRequirement === "forbidden").length,
      byQueueCategory,
    },
    compactQueue,
    rankedProblems: ranked,
  };
}

export function buildSignalProblemRankReportFromRepo() {
  return buildSignalProblemRankReport({
    sourceGraph: buildSignalSourceGraphReportFromRepo(),
    canonicalHelpers: readJsonFile<{ entries: CanonicalHelperEntry[] }>("agent/index/canonical-helpers.json").entries,
    workflowGuidance: readJsonFile<{ files: WorkflowGuidanceEntry[] }>("agent/index/workflow-guidance.json").files,
    packageScripts: getPackageScripts("package.json"),
  });
}

export function main() {
  const packageScripts = getPackageScripts("package.json");
  if (packageScripts["signal:rank"] !== "tsx scripts/agent/rank-signal-problems.ts") {
    throw new Error("package.json must expose signal:rank before writing the SIGNAL problem rank report.");
  }

  const report = buildSignalProblemRankReportFromRepo();
  writeJsonFile(PROBLEM_RANK_REPORT_PATH, report as unknown as Json);
  console.log(
    `SIGNAL problem rank: ranked=${report.summary.rankedProblemCount}, topScore=${report.summary.topScore}, fixNow=${report.summary.byQueueCategory.fix_now}, sourceOnly=${report.summary.sourceOnlyEvidenceCount}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
