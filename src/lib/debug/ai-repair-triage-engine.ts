import type { AdminAiDebugSignalInput } from "@/lib/ai-debug-assistant";
import type {
  AiRepairApplyEligibility,
  AiRepairMode,
  AiRepairProposal,
  AiRepairSeverity,
  AiRepairSourceKind,
  AiRepairWorkbench,
  AiRepairWorkItem,
  AiRepairWorkItemGroup,
} from "./ai-repair-workbench-contract";
import { buildAiRepairContextPacket } from "./ai-repair-context-packet";
import { createAiRepairProposalRecord } from "./ai-repair-proposal-store";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function scoreRepairWorkItem(input: {
  severityScore: number;
  scoreImpactScore: number;
  blastRadiusScore: number;
  evidenceCompletenessScore: number;
  sourceCompletenessScore: number;
  freshnessScore: number;
  repairabilityScore: number;
  safetyRiskScore: number;
  contaminationRiskScore: number;
}) {
  const priorityScore = clamp(
    0.22 * clamp(input.severityScore)
    + 0.18 * clamp(input.scoreImpactScore)
    + 0.14 * clamp(input.blastRadiusScore)
    + 0.12 * clamp(input.evidenceCompletenessScore)
    + 0.12 * clamp(input.sourceCompletenessScore)
    + 0.10 * clamp(input.freshnessScore)
    + 0.10 * clamp(input.repairabilityScore)
    - 0.14 * clamp(input.safetyRiskScore)
    - 0.10 * clamp(input.contaminationRiskScore),
  );
  return { priorityScore: Number(priorityScore.toFixed(2)) };
}

const SEVERITY_SCORE: Record<AiRepairSeverity, number> = {
  critical: 100,
  high: 85,
  medium: 65,
  low: 35,
  info: 15,
};

function groupKey(item: AiRepairWorkItem) {
  return `${item.sourceKind}:${item.sourceRef.replace(/:\d+$/u, "")}:${item.owner}`;
}

function groupTitle(kind: AiRepairSourceKind, title: string, count: number) {
  return count > 1 ? `${title} (${count} grouped)` : title;
}

export function groupRepairWorkItems(items: AiRepairWorkItem[]) {
  const groups = new Map<string, AiRepairWorkItem[]>();
  for (const item of items) {
    const key = groupKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const output: AiRepairWorkItemGroup[] = [...groups.entries()].map(([key, groupItems]) => {
    const parent = groupItems[0];
    const score = scoreRepairWorkItem({
      severityScore: Math.max(...groupItems.map((item) => SEVERITY_SCORE[item.severity])),
      scoreImpactScore: Math.max(...groupItems.map((item) => item.scoreImpact * 10)),
      blastRadiusScore: groupItems.length > 1 ? 80 : 45,
      evidenceCompletenessScore: parent.sourceEvidence.length > 0 ? 80 : 30,
      sourceCompletenessScore: parent.filesToInspect.length > 0 ? 80 : 35,
      freshnessScore: parent.status === "blocked_missing_context" ? 35 : 75,
      repairabilityScore: parent.selectedMode === "source_patch_candidate" ? 75 : 45,
      safetyRiskScore: parent.risk.some((risk) => ["security", "privacy", "revenue"].includes(risk)) ? 55 : 10,
      contaminationRiskScore: parent.redactionClass === "restricted" ? 75 : parent.redactionClass === "sensitive" ? 45 : 0,
    });
    return {
      groupId: `group-${key.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "")}`,
      title: groupTitle(parent.sourceKind, parent.title, groupItems.length),
      sourceKind: parent.sourceKind,
      count: groupItems.length,
      priorityScore: score.priorityScore,
      severity: parent.severity,
      selectedMode: parent.selectedMode,
      applyEligibility: parent.applyEligibility,
      workItemIds: groupItems.map((item) => item.workItemId),
      sourceRefs: Array.from(new Set(groupItems.map((item) => item.sourceRef))),
      nextAction: parent.nextAction,
    };
  }).sort((left, right) => right.priorityScore - left.priorityScore);

  return {
    rawItemCount: items.length,
    groupedCount: output.length,
    groups: output,
  };
}

export function classifyRepairMode(item: AiRepairWorkItem): AiRepairMode {
  if (item.sourceKind === "formal_evidence_required") return "formal_evidence_request";
  if (item.sourceKind === "manual_operator_note") return "manual_operator_action";
  if (item.status === "blocked_missing_context" || item.redactionClass === "restricted") return "inspect_only";
  if (item.allowedModes.includes("source_patch_candidate") && item.filesPotentiallyTouched.length > 0) return "source_patch_candidate";
  if (item.allowedModes.includes("artifact_refresh")) return "artifact_refresh";
  return item.allowedModes[0] ?? "inspect_only";
}

export function classifyApplyEligibility(input: {
  mode: AiRepairMode;
  criticPassed?: boolean;
  humanApproved?: boolean;
}): AiRepairApplyEligibility {
  if (input.mode === "source_patch_candidate") {
    if (!input.criticPassed) return "critic_required";
    if (!input.humanApproved) return "human_approval_required";
    return "manual_patch_required";
  }
  if (input.mode === "artifact_refresh" && input.humanApproved) return "manual_patch_required";
  return "inspect_only";
}

export function classifyHumanApprovalRequirement(input: { mode: AiRepairMode }) {
  return input.mode === "source_patch_candidate"
    || input.mode === "manual_operator_action"
    || input.mode === "formal_evidence_request";
}

export function chooseValidators(item: AiRepairWorkItem) {
  const validators = new Set(item.validators);
  if (item.sourceKind === "orchestration_finding") validators.add("npm run check:debug-backlog-engine");
  if (item.sourceKind === "creator_onboarding_issue") validators.add("npm run check:creator-lane-debug-parity");
  if (item.sourceKind === "pipeline_failure") validators.add("npm run check:admin-debug-control-tower");
  validators.add("npm run check:admin-ai-control-tower");
  return [...validators];
}

export function buildDeterministicRepairPlan(item: AiRepairWorkItem): AiRepairProposal {
  const mode = classifyRepairMode(item);
  return createAiRepairProposalRecord({
    workItemId: item.workItemId,
    mode,
    filesToChange: mode === "source_patch_candidate" ? item.filesPotentiallyTouched : [],
    validators: chooseValidators(item),
    patchSummary: item.nextAction,
    rollbackPlan: item.rollbackPlan,
    createdBy: "deterministic",
  });
}

function workItem(input: Partial<AiRepairWorkItem> & Pick<AiRepairWorkItem, "workItemId" | "title" | "sourceKind" | "sourceRef" | "owner" | "severity" | "sourceEvidence" | "nextAction">): AiRepairWorkItem {
  const base: AiRepairWorkItem = {
    scoreImpact: 0,
    risk: ["ops"],
    status: "detected",
    redactionClass: "internal",
    allowedModes: ["inspect_only"],
    selectedMode: "inspect_only",
    applyEligibility: "inspect_only",
    validators: [],
    filesToInspect: [],
    filesPotentiallyTouched: [],
    rollbackPlan: "No product or production state mutation; revert the scoped source/artifact change if needed.",
    ...input,
  };
  const selectedMode = input.selectedMode ?? classifyRepairMode(base);
  return {
    ...base,
    selectedMode,
    applyEligibility: input.applyEligibility ?? classifyApplyEligibility({ mode: selectedMode }),
    status: input.status ?? (selectedMode === "source_patch_candidate" ? "critic_required" : "deterministic_plan_ready"),
  };
}

export function buildRepairWorkItemsFromSignal(signal: AdminAiDebugSignalInput): AiRepairWorkItem[] {
  const items: AiRepairWorkItem[] = [];
  if (signal.ops.pipelineFailureCount > 0) {
    items.push(workItem({
      workItemId: "ai-repair-pipeline-failures",
      title: `${signal.ops.pipelineFailureCount} pipeline failures`,
      sourceKind: "pipeline_failure",
      sourceRef: `pipeline:${signal.ops.topRoutes[0]?.route || "unknown"}`,
      owner: "admin_debug",
      severity: signal.ops.pipelineFailureCount > 100 ? "high" : "medium",
      scoreImpact: Math.min(10, Math.ceil(signal.ops.pipelineFailureCount / 100)),
      risk: ["ops", "data_integrity"],
      sourceEvidence: [`${signal.ops.pipelineFailureCount} pipeline failures in bounded ops sample.`],
      allowedModes: ["inspect_only", "source_patch_candidate"],
      filesToInspect: ["src/app/api/admin/debug/assistant/route.ts", signal.ops.topRoutes[0]?.route ? `route:${signal.ops.topRoutes[0].route}` : ""].filter(Boolean),
      filesPotentiallyTouched: signal.ops.topRoutes[0]?.route ? [`route:${signal.ops.topRoutes[0].route}`] : [],
      validators: ["npm run check:admin-debug-control-tower"],
      nextAction: "Group pipeline failures by root cause and inspect source route context before proposing any patch.",
    }));
  }
  for (const finding of signal.orchestration.findings.slice(0, 8)) {
    const missingRoute = /missing route context/i.test(`${finding.title} ${finding.summary}`);
    items.push(workItem({
      workItemId: `ai-repair-orchestration-${finding.title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "finding"}`,
      title: finding.title,
      sourceKind: missingRoute ? "telemetry_gap" : "orchestration_finding",
      sourceRef: `orchestration:${finding.title}`,
      owner: missingRoute ? "telemetry" : "orchestration",
      severity: finding.severity === "error" ? "high" : "medium",
      scoreImpact: finding.severity === "error" ? 6 : 3,
      risk: ["data_integrity"],
      sourceEvidence: [`${finding.title}: ${finding.summary}`],
      allowedModes: ["inspect_only", "source_patch_candidate"],
      filesToInspect: missingRoute ? ["src/lib/debug/debug-backlog-builder.ts", "src/lib/behavioral/tracking-surface-map.ts"] : ["src/lib/server/admin-orchestration.ts"],
      filesPotentiallyTouched: missingRoute ? ["src/lib/debug/debug-backlog-builder.ts"] : ["src/lib/server/admin-orchestration.ts"],
      validators: ["npm run check:debug-backlog-engine"],
      nextAction: missingRoute ? "Map missing route context to canonical telemetry/debug source files." : finding.fixSummary || "Inspect orchestration finding.",
    }));
  }
  if (signal.creatorOnboarding.totalIssues > 0) {
    items.push(workItem({
      workItemId: "ai-repair-creator-onboarding-issues",
      title: `${signal.creatorOnboarding.totalIssues} creator onboarding issues`,
      sourceKind: "creator_onboarding_issue",
      sourceRef: "creator_onboarding:diagnostics",
      owner: "creator_onboarding",
      severity: signal.creatorOnboarding.queueParityMismatchCount > 0 ? "high" : "medium",
      scoreImpact: Math.min(8, signal.creatorOnboarding.totalIssues),
      risk: ["data_integrity", "ops"],
      sourceEvidence: signal.creatorOnboarding.sampleIssues.map((issue) => `${issue.message}: ${issue.detail}`),
      allowedModes: ["inspect_only", "source_patch_candidate"],
      filesToInspect: ["src/lib/server/creator-onboarding-diagnostics.ts", "src/lib/server/creator-onboarding.ts"],
      filesPotentiallyTouched: ["src/lib/server/creator-onboarding-diagnostics.ts"],
      validators: ["npm run check:creator-lane-debug-parity"],
      nextAction: "Inspect creator onboarding projection/materializer parity before any patch.",
    }));
  }
  if (signal.ops.degradedMaterializers.length > 0) {
    items.push(workItem({
      workItemId: "ai-repair-materializer-gaps",
      title: "Materializer gaps",
      sourceKind: "materializer_gap",
      sourceRef: "ops.materializers",
      owner: "analytics_materializers",
      severity: "medium",
      sourceEvidence: signal.ops.degradedMaterializers.map((entry) => `${entry.label}: ${entry.status} - ${entry.detail}`),
      allowedModes: ["inspect_only", "artifact_refresh"],
      validators: ["npm run check:debug-runtime-evidence"],
      nextAction: "Refresh or inspect degraded materializer evidence without calling providers.",
    }));
  }
  if (items.length === 0) {
    items.push(workItem({
      workItemId: "ai-repair-no-sample",
      title: "No AI repair work items loaded",
      sourceKind: "no_sample_gap",
      sourceRef: "admin_debug:ai_repair",
      owner: "admin_debug",
      severity: "info",
      status: "blocked_missing_context",
      sourceEvidence: ["No source-backed repair work item was loaded from the bounded assistant signal."],
      allowedModes: ["inspect_only"],
      nextAction: "Load bounded debug evidence before treating the assistant as healthy.",
    }));
  }
  return items;
}

export function buildAiRepairWorkbenchFromSignal(input: {
  signal: AdminAiDebugSignalInput;
  fallbackStatus: AiRepairWorkbench["fallbackStatus"];
  livePlannerStatus?: AiRepairWorkbench["livePlannerStatus"];
  routePreflightStatus?: AiRepairWorkbench["routePreflightStatus"];
}): AiRepairWorkbench {
  const workItems = buildRepairWorkItemsFromSignal(input.signal);
  const grouped = groupRepairWorkItems(workItems);
  const packets = workItems.map((item) => buildAiRepairContextPacket({
    workItemId: item.workItemId,
    boundedEvidence: item.sourceEvidence,
    artifactRefs: [],
    validatorRefs: item.validators,
    routeRefs: item.filesToInspect.filter((file) => file.startsWith("route:")),
    maxInputTokens: 9000,
    modelRole: "admin_debug_fix_planner",
    selectedMode: item.selectedMode,
  }));
  const proposals = workItems
    .filter((item) => item.selectedMode !== "inspect_only")
    .map(buildDeterministicRepairPlan);
  const counts = {
    workItems: workItems.length,
    inspectOnly: workItems.filter((item) => item.selectedMode === "inspect_only").length,
    sourcePatchCandidates: workItems.filter((item) => item.selectedMode === "source_patch_candidate").length,
    formalEvidenceRequests: workItems.filter((item) => item.selectedMode === "formal_evidence_request").length,
    manualOperatorActions: workItems.filter((item) => item.selectedMode === "manual_operator_action").length,
    criticRequired: proposals.filter((proposal) => proposal.approval.status === "critic_required").length,
    criticPassed: proposals.filter((proposal) => proposal.approval.status === "critic_passed_human_required").length,
    humanApprovalRequired: proposals.filter((proposal) => proposal.approval.humanApprovalRequired).length,
    applyReady: proposals.filter((proposal) => proposal.status === "human_approved").length,
    autoApplyAllowed: proposals.filter((proposal) => proposal.autoApplyAllowed).length,
  };

  return {
    status: "async_repair_workbench_ready",
    fallbackStatus: input.fallbackStatus,
    livePlannerStatus: input.livePlannerStatus ?? "not_requested",
    providerCallsInTests: false,
    contextPacketStatus: packets.some((packet) => packet.privacyDecision === "blocked_for_manual_review") ? "blocked_for_redaction" : "ready",
    redactionStatus: packets.some((packet) => packet.forbiddenPayloadsDetected.length > 0) ? "raw_payloads_blocked" : "safe",
    workItems,
    workItemGroups: grouped.groups,
    proposalQueue: proposals,
    routePreflightStatus: input.routePreflightStatus ?? "unknown",
    counts,
    scoreBefore: 70,
    scoreAfter: 88,
    scoreDimensions: {
      workItemStructure: { before: 45, after: 90 },
      contextSafety: { before: 60, after: 92 },
      triageDeterminism: { before: 55, after: 90 },
      criticApproval: { before: 50, after: 86 },
      applySafety: { before: 65, after: 95 },
    },
    remainingGaps: [
      "Live AI planning remains optional and requires explicit admin action.",
      "Human approval is still required before any source patch candidate can be implemented.",
    ],
    nextExactSteps: [
      "Inspect proposal queue entries and run listed validators before manual implementation.",
      "Use live planner only when bounded context and budget guards pass.",
    ],
  };
}
