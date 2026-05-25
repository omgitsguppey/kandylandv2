import fs from "node:fs";
import path from "node:path";

import { buildAiDebugWorkbenchUiModel } from "../../src/lib/debug/ai-debug-workbench-ui-model";
import { buildAiRepairContextPacket, redactAiDebugContext, validateAiContextSafety } from "../../src/lib/debug/ai-repair-context-packet";
import { buildAiRepairApplyContract } from "../../src/lib/debug/ai-repair-apply-contract";
import { evaluateAiRepairApprovalGate } from "../../src/lib/debug/ai-repair-approval-gate";
import { reviewAiRepairProposal } from "../../src/lib/debug/ai-repair-critic";
import { createAiRepairProposalRecord, sanitizeAiRepairProposalForStore } from "../../src/lib/debug/ai-repair-proposal-store";
import { buildDebugCockpitBatch27AiRepairWorkbenchReport } from "../../src/lib/debug/debug-cockpit-batch27-ai-repair-workbench";
import { buildAiRepairWorkbenchFromSignal, buildDeterministicRepairPlan, classifyApplyEligibility, classifyRepairMode, groupRepairWorkItems, scoreRepairWorkItem } from "../../src/lib/debug/ai-repair-triage-engine";
import { GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL } from "../../src/lib/admin-ai-models";
import type { AdminAiDebugSignalInput } from "../../src/lib/ai-debug-assistant";
import type { AiRepairProposal, AiRepairWorkbench, AiRepairWorkItem } from "../../src/lib/debug/ai-repair-workbench-contract";

type Report = Record<string, unknown>;

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function expectPass(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function runValidation(reportKey: string, report: Report, failures: string[], summary: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const result = {
    reportKey,
    generatedAtUtc,
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    ...summary.map((line) => `- ${line}`),
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

function fixtureWorkItem(overrides: Partial<AiRepairWorkItem> = {}): AiRepairWorkItem {
  return {
    workItemId: "wi-route-context",
    title: "Missing route context",
    sourceKind: "telemetry_gap",
    sourceRef: "orchestration:missing_route_context",
    owner: "telemetry",
    severity: "high",
    scoreImpact: 5,
    risk: ["data_integrity"],
    status: "preflight_ready",
    sourceEvidence: ["Missing route context; event can be counted but surface attribution is incomplete."],
    redactionClass: "internal",
    allowedModes: ["inspect_only", "source_patch_candidate"],
    selectedMode: "source_patch_candidate",
    applyEligibility: "critic_required",
    validators: ["npm run check:debug-backlog-engine"],
    filesToInspect: ["src/lib/debug/debug-backlog-builder.ts"],
    filesPotentiallyTouched: ["src/lib/debug/debug-backlog-builder.ts"],
    rollbackPlan: "Revert the scoped telemetry/context patch.",
    nextAction: "Prepare bounded route-context source patch candidate.",
    ...overrides,
  };
}

function fixtureSignal(): AdminAiDebugSignalInput {
  return {
    generatedAt: new Date(0).toISOString(),
    ops: {
      score: 70,
      pipelineFailureCount: 709,
      lastPipelineFailureAt: 0,
      topRoutes: [{ route: "admin/debug", count: 709 }],
      degradedMaterializers: [{ label: "analytics", status: "degraded", detail: "Identified analytics ingestion failed." }],
      runtimeWarnings: [],
      diagnosticChannels: [{ label: "analytics", errorCount: 1, warnCount: 0, count: 1 }],
      recentDiagnostics: [{ channel: "analytics", severity: "error", message: "Identified analytics ingestion failed", detailPreview: "bounded" }],
    },
    orchestration: {
      score: 70,
      openFindings: 40,
      criticalFindings: 0,
      actionableProposals: 1,
      contaminationRisks: 0,
      lowConfidenceEvents: 0,
      topDomains: [{ key: "route_context", eventCount: 40, openFindingCount: 40 }],
      findings: [{ title: "Missing route context", severity: "warn", summary: "event can be counted, but surface attribution is incomplete", fixSummary: "Map route context." }],
    },
    creatorOnboarding: {
      totalIssues: 8,
      missingQueueCount: 0,
      missingSourceCount: 0,
      projectionWithoutSourceCount: 0,
      queueParityMismatchCount: 1,
      missingIdMetadataCount: 0,
      stuckAwaitingReviewCount: 0,
      roleMismatchCount: 0,
      sampleIssues: [{ severity: "warn", message: "Creator review queue projection is stale", detail: "queue projection differs from canonical onboarding on isSyntheticCreator" }],
    },
  };
}

export function validateAiRepairContextPacket() {
  const failures: string[] = [];
  const redacted = redactAiDebugContext({ text: "raw support body from user@example.com token=secret" });
  const blocked = buildAiRepairContextPacket({
    workItemId: "wi-private",
    boundedEvidence: ["raw support body from user@example.com token=secret"],
    maxInputTokens: 9000,
    modelRole: "admin_debug_fix_planner",
    selectedMode: "source_patch_candidate",
  });
  const oversized = buildAiRepairContextPacket({
    workItemId: "wi-large",
    boundedEvidence: [Array(400).fill("bounded evidence").join(" ")],
    maxInputTokens: 20,
    modelRole: "admin_debug_assistant",
  });
  expectPass(redacted.redactedText.includes("[redacted_email]"), failures, "full email can enter AI context.");
  expectPass(blocked.privacyDecision === "blocked_for_manual_review", failures, "raw forbidden payload not blocked.");
  expectPass(validateAiContextSafety(blocked).safe === false, failures, "unsafe context marked safe.");
  expectPass(oversized.costDecision === "blocked_token_budget", failures, "token budget overflow not blocked.");
  expectPass(oversized.providerCallRequired === false, failures, "context builder requires provider call.");
  runValidation("ai-repair-context-packet", { blocked, oversized }, failures, [
    "Context packets redact private identifiers and block raw support/chat/payment/private payloads before planning.",
    "Token estimates run before optional provider calls and oversized packets remain inspect-only.",
  ]);
}

export function validateAiRepairTriageEngine() {
  const failures: string[] = [];
  const score = scoreRepairWorkItem({
    severityScore: 90,
    scoreImpactScore: 80,
    blastRadiusScore: 70,
    evidenceCompletenessScore: 80,
    sourceCompletenessScore: 60,
    freshnessScore: 70,
    repairabilityScore: 60,
    safetyRiskScore: 10,
    contaminationRiskScore: 0,
  });
  const grouped = groupRepairWorkItems([
    fixtureWorkItem({ workItemId: "wi-a", sourceKind: "pipeline_failure", sourceRef: "pipeline:analytics" }),
    fixtureWorkItem({ workItemId: "wi-b", sourceKind: "pipeline_failure", sourceRef: "pipeline:analytics" }),
  ]);
  const formalMode = classifyRepairMode(fixtureWorkItem({ sourceKind: "formal_evidence_required" }));
  const blockedMode = classifyRepairMode(fixtureWorkItem({ status: "blocked_missing_context" }));
  const proposal = buildDeterministicRepairPlan(fixtureWorkItem());
  expectPass(score.priorityScore === 72.4, failures, "deterministic priority formula drifted.");
  expectPass(grouped.rawItemCount === 2 && grouped.groupedCount === 1, failures, "pipeline failures become raw work-item spam.");
  expectPass(formalMode === "formal_evidence_request", failures, "formal evidence became source patch.");
  expectPass(blockedMode === "inspect_only", failures, "missing context not forced inspect-only.");
  expectPass(classifyApplyEligibility({ mode: "source_patch_candidate" }) === "critic_required", failures, "source patch can skip critic.");
  expectPass(proposal.criticRequired && proposal.humanApprovalRequired && !proposal.autoApplyAllowed, failures, "deterministic source patch lacks gates.");
  runValidation("ai-repair-triage-engine", { score, grouped, proposal }, failures, [
    "Deterministic triage scores and groups repair work items without raw spam.",
    "Source patch candidates require critic and human approval; evidence requests stay separate.",
  ]);
}

export function validateAiRepairPlanner() {
  const failures: string[] = [];
  const workItem = fixtureWorkItem();
  const plannerSource = fs.readFileSync("src/lib/server/ai-repair-planner.ts", "utf8");
  const assistantRouteSource = fs.readFileSync("src/app/api/admin/debug/assistant/route.ts", "utf8");
  const deterministicProposal = buildDeterministicRepairPlan(workItem);
  expectPass(plannerSource.includes("explicitLiveGenerationRequested"), failures, "planner lacks explicit live generation gate.");
  expectPass(plannerSource.includes("GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL"), failures, "planner model allowlist missing.");
  expectPass(plannerSource.includes("costDecision") && plannerSource.includes("privacyDecision"), failures, "planner lacks budget/privacy guard.");
  expectPass(plannerSource.includes("createAiRepairProposalRecord"), failures, "planner lacks schema-normalized proposal record.");
  expectPass(deterministicProposal.autoApplyAllowed === false && deterministicProposal.approval.status === "critic_required", failures, "deterministic planner proposal can auto-apply or skip critic.");
  expectPass(!/export async function GET[\s\S]*generateAdminAiDebugSummary/.test(assistantRouteSource), failures, "page-load GET can trigger live provider summary.");
  runValidation("ai-repair-planner", { providerCallsInTests: false, deterministicProposal }, failures, [
    "Planner only calls the optional runner for explicit admin generation.",
    "Live AI output remains schema-normalized, non-apply-ready, and critic-gated.",
  ]);
}

export function validateAiRepairCriticApproval() {
  const failures: string[] = [];
  const proposal = createAiRepairProposalRecord({
    workItemId: "wi-critic",
    mode: "source_patch_candidate",
    filesToChange: ["src/lib/debug/debug-backlog-builder.ts"],
    validators: ["npm run check:debug-backlog-engine"],
    patchSummary: "Bounded telemetry mapping patch.",
    rollbackPlan: "Revert patch.",
    createdBy: "validator",
  });
  const review = reviewAiRepairProposal(proposal);
  const approval = evaluateAiRepairApprovalGate({ proposal, criticReview: review });
  const protectedProposal: AiRepairProposal = {
    ...proposal,
    proposalId: "proposal-protected",
    filesToChange: ["src/lib/gumdrop-ledger.ts"],
    patchSummary: "Change GumDrop source of funds.",
    autoApplyAllowed: true,
  };
  const protectedReview = reviewAiRepairProposal(protectedProposal);
  expectPass(review.result === "pass_to_human_review", failures, "safe source patch did not pass to human review.");
  expectPass(approval.status === "critic_passed_human_required" && approval.applyAllowed === false, failures, "source patch can skip human approval.");
  expectPass(protectedReview.result === "reject_unsafe", failures, "payment/GumDrop/security auto-apply risk not rejected.");
  runValidation("ai-repair-critic-approval", { review, approval, protectedReview }, failures, [
    "Critic checks security, privacy, cost, data integrity, protected payments/GumDrops, and validator coverage.",
    "Human approval remains mandatory for source patch candidates.",
  ]);
}

export function validateAiRepairProposalWorkflow() {
  const failures: string[] = [];
  const proposal = createAiRepairProposalRecord({
    workItemId: "wi-proposal",
    mode: "source_patch_candidate",
    filesToChange: ["src/lib/debug/example.ts"],
    validators: ["npm run check:debug-backlog-engine"],
    patchSummary: "raw support body from user@example.com token=secret",
    rollbackPlan: "Revert patch.",
    createdBy: "validator",
  });
  const sanitized = sanitizeAiRepairProposalForStore(proposal);
  const applyContract = buildAiRepairApplyContract(sanitized);
  const routeSource = fs.readFileSync("src/app/api/admin/debug/assistant/fix/route.ts", "utf8");
  expectPass(applyContract.status === "manual_patch_required", failures, "assistant/fix does not return manual patch packet.");
  expectPass(applyContract.sourceMutationAllowed === false && applyContract.productionMutationAllowed === false, failures, "proposal workflow permits silent mutation.");
  expectPass(!sanitized.patchSummary.includes("user@example.com") && !sanitized.patchSummary.includes("secret"), failures, "proposal store includes raw forbidden payload.");
  expectPass(!routeSource.includes("planAdminAiDebugFix") && !routeSource.includes("generateVertexAiDebugText"), failures, "assistant/fix can still invoke live AI planner.");
  runValidation("ai-repair-proposal-workflow", { sanitized, applyContract }, failures, [
    "assistant/fix returns proposal/approval state and manual patch instructions only.",
    "Proposal persistence redacts forbidden payloads and keeps audit/rollback fields.",
  ]);
}

export function validateAiDebugWorkbenchUiModel() {
  const failures: string[] = [];
  const workbench = buildAiRepairWorkbenchFromSignal({
    signal: fixtureSignal(),
    fallbackStatus: "deterministic_fallback_summary",
    livePlannerStatus: "not_requested",
    routePreflightStatus: "no_sample",
  });
  const model = buildAiDebugWorkbenchUiModel({
    fallbackStatus: "deterministic_fallback_summary",
    workbench,
  });
  const uiSource = fs.readFileSync("src/app/admin/debug/components/DebugTabAi.tsx", "utf8");
  expectPass(model.summaryLabel === "Deterministic fallback summary", failures, "fallback displayed as solution.");
  expectPass(model.rawEvidenceDefaultOpen === false, failures, "raw evidence shown by default.");
  expectPass(model.workItemRows.length > 0 && model.proposalQueueLabel === "Proposal queue", failures, "work item/proposal queue missing.");
  expectPass(uiSource.includes("Workbench summary") && uiSource.includes("Proposal queue"), failures, "UI still centers old guidance-only headings.");
  expectPass(uiSource.includes("routePreflightStatus") || uiSource.includes("Route preflight"), failures, "live generation route no-sample status missing.");
  runValidation("ai-debug-workbench-ui-model", { model }, failures, [
    "Admin AI panel presents work item groups, proposal queue, route preflight, critic, and approval status.",
    "Fallback summaries remain labeled as deterministic and raw evidence stays collapsed.",
  ]);
}

export function validateDebugCockpitBatch27AiRepairWorkbench() {
  const failures: string[] = [];
  const workbench = buildAiRepairWorkbenchFromSignal({
    signal: fixtureSignal(),
    fallbackStatus: "deterministic_fallback_summary",
    livePlannerStatus: "not_requested",
    routePreflightStatus: "no_sample",
  });
  const report = buildDebugCockpitBatch27AiRepairWorkbenchReport({
    workItems: workbench.workItems,
    proposals: workbench.proposalQueue,
    workItemGroups: workbench.workItemGroups.length,
    fallbackStatus: workbench.fallbackStatus,
    livePlannerStatus: workbench.livePlannerStatus,
    providerCallsInTests: false,
  });
  expectPass(workbench.status === "async_repair_workbench_ready", failures, "AI assistant still only outputs unstructured guidance.");
  expectPass(workbench.workItemGroups.length > 0, failures, "no work item queue exists.");
  expectPass(workbench.contextPacketStatus !== "missing", failures, "no context packet/redaction exists.");
  expectPass(workbench.counts.autoApplyAllowed === 0 && report.autoApplyAllowedCount === 0, failures, "auto-apply is allowed.");
  expectPass(report.providerCallsInTests === false, failures, "provider call occurs in tests.");
  expectPass(report.scoreDimensions.includes("workItemStructure"), failures, "score dimensions missing.");
  runValidation("debug-cockpit-batch27-ai-repair-workbench", { ...report, workbench }, failures, [
    "Batch 27 final lock confirms async repair workbench structure, deterministic triage, context safety, critic approval, and apply safety.",
    "Fallback output is separated from live planner state and cannot create apply-ready patches.",
  ]);
}
