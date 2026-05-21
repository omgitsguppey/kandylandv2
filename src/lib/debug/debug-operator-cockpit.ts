import type { SelfHealingRefreshQueueEntry } from "@/lib/agent-score/self-healing-refresh-queue";

export type DebugOperatorCockpitState = "live" | "degraded" | "failed" | "stale" | "unknown" | "unavailable";
export type DebugOperatorCockpitSectionId =
  | "score_impact_queue"
  | "critical_runtime_debug_warnings"
  | "stale_artifact_refresh_queue"
  | "admin_truth_status"
  | "telemetry_lane_status"
  | "cost_owner_review_lanes"
  | "ai_critic_requested_changes"
  | "recovery_playbook_cta";

export interface DebugOperatorWarningInput {
  id: string;
  severity: string;
  owner: string;
  message: string;
  nextAction: string;
  truthState: DebugOperatorCockpitState;
}

export interface DebugOperatorStatusInput {
  state: DebugOperatorCockpitState;
  label: string;
  nextAction: string;
}

export interface DebugOperatorLaneInput extends DebugOperatorStatusInput {
  id: string;
  owner: string;
}

export interface DebugOperatorAiCriticFindingInput {
  id: string;
  severity: string;
  title: string;
  requiredFix: string;
}

export interface DebugOperatorPlaybookInput {
  id: string;
  title: string;
  triggerPatterns: string[];
  commands: string[];
  validators: string[];
  forbiddenActions: string[];
}

export interface DebugOperatorCockpitInput {
  scoreImpactQueue: SelfHealingRefreshQueueEntry[];
  criticalRuntimeWarnings: DebugOperatorWarningInput[];
  adminTruthStatus: DebugOperatorStatusInput;
  telemetryLaneStatus: DebugOperatorStatusInput;
  costOwnerReviewLanes: DebugOperatorLaneInput[];
  aiCriticFindings: DebugOperatorAiCriticFindingInput[];
  recoveryPlaybooks: DebugOperatorPlaybookInput[];
}

export interface DebugOperatorCockpitSection {
  id: DebugOperatorCockpitSectionId;
  title: string;
  operatorSummary: string;
  owner: string;
  state: DebugOperatorCockpitState;
  scoreImpactEstimate: number;
  nextAction: string;
  items: unknown[];
}

export interface DebugOperatorCockpitReport {
  generatedAtUtc: string;
  reportKey: "debug-operator-cockpit";
  currentHead: string;
  sourceCommit: string;
  overallStatus: "pass" | "fail";
  rawDumpDefaultOpen: false;
  defaultSections: DebugOperatorCockpitSection[];
  validationFailures: string[];
  summary: {
    sectionCount: number;
    scoreImpactItems: number;
    staleRefreshItems: number;
    criticalWarningItems: number;
    aiCriticFindings: number;
    recoveryPlaybooks: number;
  };
}

const SECTION_TITLES: Record<DebugOperatorCockpitSectionId, string> = {
  score_impact_queue: "Score Impact Queue",
  critical_runtime_debug_warnings: "Critical Runtime + Debug Warnings",
  stale_artifact_refresh_queue: "Stale Artifact Refresh Queue",
  admin_truth_status: "Admin Truth Status",
  telemetry_lane_status: "Telemetry Lane Status",
  cost_owner_review_lanes: "Cost Owner-Review Lanes",
  ai_critic_requested_changes: "AI Critic Requested Changes",
  recovery_playbook_cta: "Recovery Playbook CTA",
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function topScoreQueue(queue: SelfHealingRefreshQueueEntry[]) {
  return [...queue]
    .sort((left, right) => right.scoreImpactEstimate - left.scoreImpactEstimate || left.dependencyOrder - right.dependencyOrder)
    .slice(0, 8);
}

function staleRefreshQueue(queue: SelfHealingRefreshQueueEntry[]) {
  return queue
    .filter((entry) => entry.canRunAutomatically || /stale|missing|unknown/i.test(entry.staleReason))
    .sort((left, right) => left.dependencyOrder - right.dependencyOrder)
    .slice(0, 8);
}

function section(section: Omit<DebugOperatorCockpitSection, "title">): DebugOperatorCockpitSection {
  return {
    ...section,
    title: SECTION_TITLES[section.id],
  };
}

export function buildDebugOperatorCockpit(
  input: DebugOperatorCockpitInput,
  options: { generatedAtUtc?: string; currentHead?: string } = {},
): DebugOperatorCockpitReport {
  const scoreItems = topScoreQueue(input.scoreImpactQueue);
  const staleItems = staleRefreshQueue(input.scoreImpactQueue);
  const criticalWarnings = input.criticalRuntimeWarnings
    .filter((warning) => ["critical", "error", "p0", "p1"].includes(warning.severity))
    .slice(0, 8);
  const costImpact = input.costOwnerReviewLanes.reduce((sum, lane) => sum + (lane.state === "degraded" || lane.state === "unknown" ? 1 : 0), 0);

  const defaultSections: DebugOperatorCockpitSection[] = [
    section({
      id: "score_impact_queue",
      operatorSummary: scoreItems.length ? "Fix these first; they carry the highest score drag." : "No score-impact queue entries are loaded.",
      owner: scoreItems[0]?.owner ?? "beta",
      state: scoreItems.length ? "degraded" : "unknown",
      scoreImpactEstimate: round(scoreItems.reduce((sum, entry) => sum + entry.scoreImpactEstimate, 0)),
      nextAction: scoreItems[0]?.refreshCommand || "Run npm run check:self-healing-refresh-queue.",
      items: scoreItems,
    }),
    section({
      id: "critical_runtime_debug_warnings",
      operatorSummary: criticalWarnings.length ? "Runtime/debug warnings need action before completion claims." : "No critical runtime/debug warnings are loaded.",
      owner: criticalWarnings[0]?.owner ?? "runtime",
      state: criticalWarnings.length ? "failed" : "unknown",
      scoreImpactEstimate: criticalWarnings.length * 2,
      nextAction: criticalWarnings[0]?.nextAction || "Run npm run check:debug-backlog-engine.",
      items: criticalWarnings,
    }),
    section({
      id: "stale_artifact_refresh_queue",
      operatorSummary: staleItems.length ? "Run these registered refresh commands before trusting stale snapshots." : "No stale refresh queue entries are loaded.",
      owner: staleItems[0]?.owner ?? "repo",
      state: staleItems.length ? "stale" : "unknown",
      scoreImpactEstimate: round(staleItems.reduce((sum, entry) => sum + entry.scoreImpactEstimate, 0)),
      nextAction: staleItems[0]?.refreshCommand || "Run npm run check:self-healing-refresh-queue.",
      items: staleItems,
    }),
    section({
      id: "admin_truth_status",
      operatorSummary: input.adminTruthStatus.label,
      owner: "admin",
      state: input.adminTruthStatus.state,
      scoreImpactEstimate: input.adminTruthStatus.state === "live" ? 0 : 4,
      nextAction: input.adminTruthStatus.nextAction,
      items: [input.adminTruthStatus],
    }),
    section({
      id: "telemetry_lane_status",
      operatorSummary: input.telemetryLaneStatus.label,
      owner: "telemetry",
      state: input.telemetryLaneStatus.state,
      scoreImpactEstimate: input.telemetryLaneStatus.state === "live" ? 0 : 3,
      nextAction: input.telemetryLaneStatus.nextAction,
      items: [input.telemetryLaneStatus],
    }),
    section({
      id: "cost_owner_review_lanes",
      operatorSummary: input.costOwnerReviewLanes.length ? "Cost lanes need owner review where degraded or unknown." : "No cost owner-review lanes are loaded.",
      owner: input.costOwnerReviewLanes[0]?.owner ?? "cost",
      state: input.costOwnerReviewLanes.some((lane) => lane.state === "failed") ? "failed" : input.costOwnerReviewLanes.some((lane) => lane.state !== "live") ? "degraded" : "live",
      scoreImpactEstimate: costImpact,
      nextAction: input.costOwnerReviewLanes[0]?.nextAction || "Run npm run check:global-cost.",
      items: input.costOwnerReviewLanes,
    }),
    section({
      id: "ai_critic_requested_changes",
      operatorSummary: input.aiCriticFindings.length ? "AI critic requested changes must be resolved before claiming the patch complete." : "No AI critic findings are loaded.",
      owner: "critic",
      state: input.aiCriticFindings.length ? "degraded" : "unknown",
      scoreImpactEstimate: input.aiCriticFindings.length,
      nextAction: input.aiCriticFindings[0]?.requiredFix || "Run npm run check:ai-debug-critic.",
      items: input.aiCriticFindings,
    }),
    section({
      id: "recovery_playbook_cta",
      operatorSummary: input.recoveryPlaybooks.length ? "Use the matching recovery playbook before editing source." : "No recovery playbooks are linked.",
      owner: "debug",
      state: input.recoveryPlaybooks.length ? "degraded" : "unknown",
      scoreImpactEstimate: input.recoveryPlaybooks.length ? 1 : 0,
      nextAction: input.recoveryPlaybooks[0]?.commands[0] || "Run npm run check:debug-recovery-playbooks.",
      items: input.recoveryPlaybooks.slice(0, 6),
    }),
  ];

  const generatedAtUtc = options.generatedAtUtc ?? new Date().toISOString();
  const currentHead = options.currentHead ?? "unknown";
  const report: DebugOperatorCockpitReport = {
    generatedAtUtc,
    reportKey: "debug-operator-cockpit",
    currentHead,
    sourceCommit: currentHead,
    overallStatus: "pass",
    rawDumpDefaultOpen: false,
    defaultSections,
    validationFailures: [],
    summary: {
      sectionCount: defaultSections.length,
      scoreImpactItems: scoreItems.length,
      staleRefreshItems: staleItems.length,
      criticalWarningItems: criticalWarnings.length,
      aiCriticFindings: input.aiCriticFindings.length,
      recoveryPlaybooks: input.recoveryPlaybooks.length,
    },
  };
  const validationFailures = validateDebugOperatorCockpit(report);
  return {
    ...report,
    overallStatus: validationFailures.length ? "fail" : "pass",
    validationFailures,
  };
}

export function validateDebugOperatorCockpit(report: DebugOperatorCockpitReport): string[] {
  const failures: string[] = [];
  const expectedOrder: DebugOperatorCockpitSectionId[] = [
    "score_impact_queue",
    "critical_runtime_debug_warnings",
    "stale_artifact_refresh_queue",
    "admin_truth_status",
    "telemetry_lane_status",
    "cost_owner_review_lanes",
    "ai_critic_requested_changes",
    "recovery_playbook_cta",
  ];

  if (report.rawDumpDefaultOpen !== false) failures.push("raw dumps default before summary.");
  if (report.defaultSections.map((entry) => entry.id).join("|") !== expectedOrder.join("|")) {
    failures.push("debug panel lacks required operator cockpit section order.");
  }

  const byId = new Map(report.defaultSections.map((entry) => [entry.id, entry]));
  if (!byId.get("score_impact_queue")?.items.length) failures.push("debug panel lacks score impact queue.");
  if (!byId.get("ai_critic_requested_changes")?.items.length) failures.push("AI critic findings not surfaced.");
  if (!byId.get("recovery_playbook_cta")?.items.length) failures.push("recovery playbooks not linked.");

  for (const section of report.defaultSections) {
    if (!section.nextAction || /^no action needed\.?$/iu.test(section.nextAction)) {
      if (section.state === "unknown" || section.state === "stale" || section.state === "degraded" || section.state === "failed") {
        failures.push(`${section.id} unknown shown healthy or lacks next action.`);
      }
    }
  }

  const staleRefresh = byId.get("stale_artifact_refresh_queue");
  if (!staleRefresh?.items.length || staleRefresh.items.some((item) => {
    if (!item || typeof item !== "object") return true;
    const refreshCommand = (item as { refreshCommand?: unknown }).refreshCommand;
    return typeof refreshCommand !== "string" || refreshCommand.length === 0;
  })) {
    failures.push("stale artifact lacks refresh CTA.");
  }

  return failures;
}
