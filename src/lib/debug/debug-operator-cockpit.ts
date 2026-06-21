import type { SelfHealingRefreshQueueEntry } from "@/lib/agent-score/self-healing-refresh-queue";
import {
  classifyFormalGate,
  shouldCollapseExternalReview,
} from "@/lib/agent-score/formal-gate-classifier";

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

const OBSOLETE_ACTIVE_COCKPIT_ARTIFACTS = [
  "agent/state/score-80-path-lock.generated.json",
  "agent/state/final-launch-readiness-report.generated.json",
  "agent/state/admin-truth-sample-evidence.generated.json",
];

function queueText(entry: SelfHealingRefreshQueueEntry) {
  return [
    entry.artifact,
    entry.staleReason,
    entry.refreshCommand,
    entry.blockedReason,
    entry.expectedOutcome,
  ].join("\n");
}

function isObsoleteActiveCockpitArtifact(entry: SelfHealingRefreshQueueEntry) {
  return OBSOLETE_ACTIVE_COCKPIT_ARTIFACTS.includes(entry.artifact);
}

function isFormalEvidenceQueueEntry(entry: SelfHealingRefreshQueueEntry) {
  const gate = classifyFormalGate({
    id: entry.artifact,
    label: entry.artifact,
    statusText: entry.staleReason,
    nextAction: entry.refreshCommand || entry.expectedOutcome,
    artifactPath: entry.artifact,
    scoreImpactEstimate: entry.scoreImpactEstimate,
    blockedReason: entry.blockedReason,
  });
  return gate.queueClassification === "formal_evidence" || gate.queueClassification === "external_owner_review";
}

function isCleanInformationalEntry(entry: SelfHealingRefreshQueueEntry) {
  return entry.scoreImpactEstimate <= 0
    || /clean_current|current_clean|score impact: 0|scoreImpactEstimate=0/iu.test(queueText(entry));
}

function isActionableSourceOrDebugEntry(entry: SelfHealingRefreshQueueEntry) {
  return !isFormalEvidenceQueueEntry(entry)
    && !isObsoleteActiveCockpitArtifact(entry)
    && !isCleanInformationalEntry(entry)
    && entry.scoreImpactEstimate > 0
    && entry.canRunAutomatically === false
    && /source|debug|route|telemetry|runtime/iu.test(queueText(entry));
}

function isScoreImpactingStaleRefresh(entry: SelfHealingRefreshQueueEntry) {
  return entry.canRunAutomatically
    && !isFormalEvidenceQueueEntry(entry)
    && !isObsoleteActiveCockpitArtifact(entry)
    && !isCleanInformationalEntry(entry)
    && entry.scoreImpactEstimate > 0
    && /stale|missing|unknown|refresh|score:beta|check:beta-score/iu.test(queueText(entry));
}

function isFormalWarning(warning: DebugOperatorWarningInput) {
  const gate = classifyFormalGate({
    id: warning.id,
    label: warning.message,
    statusText: warning.truthState,
    nextAction: warning.nextAction,
  });
  return gate.queueClassification === "formal_evidence"
    || /score drag|score-80|final launch|launch readiness|launch pr|typed evidence|formal evidence|smoke required/iu.test(`${warning.id} ${warning.message} ${warning.nextAction}`);
}

function isSourceCriticFinding(finding: DebugOperatorAiCriticFindingInput) {
  const text = `${finding.title}\n${finding.requiredFix}\n${finding.severity}`;
  if (/no source changes requested|refresh\/formal\/operator|typed evidence|formal evidence|operator confirmation|stay visible/iu.test(text)) {
    return false;
  }
  if (classifyFormalGate({
    id: finding.id,
    label: finding.title,
    nextAction: finding.requiredFix,
  }).queueClassification === "formal_evidence") {
    return false;
  }
  return /blocker|required|request[_ -]?changes|needs[_ -]?code[_ -]?change|source/iu.test(text);
}

function topScoreQueue(queue: SelfHealingRefreshQueueEntry[]) {
  return [...queue]
    .filter(isActionableSourceOrDebugEntry)
    .sort((left, right) => right.scoreImpactEstimate - left.scoreImpactEstimate || left.dependencyOrder - right.dependencyOrder)
    .slice(0, 8);
}

function staleRefreshQueue(queue: SelfHealingRefreshQueueEntry[]) {
  return queue
    .filter(isScoreImpactingStaleRefresh)
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
    .filter((warning) => !isFormalWarning(warning))
    .slice(0, 8);
  const actionableCostLanes = input.costOwnerReviewLanes.filter((lane) =>
    lane.state === "failed"
    || (
      lane.state !== "live"
      && !shouldCollapseExternalReview({
        id: lane.id,
        label: lane.label,
        nextAction: lane.nextAction,
      })
    ));
  const costImpact = actionableCostLanes.reduce((sum, lane) => sum + (lane.state === "degraded" || lane.state === "unknown" ? 1 : 0), 0);
  const sourceCriticFindings = input.aiCriticFindings.filter(isSourceCriticFinding);
  const activeRecoveryPlaybooks = criticalWarnings.length > 0 || scoreItems.length > 0
    ? input.recoveryPlaybooks.filter((playbook) => !/formal|evidence|stale_artifact_recovery|debug_runtime_unknown|admin_truth_unknown/iu.test(playbook.id))
    : [];

  const defaultSections: DebugOperatorCockpitSection[] = [
    section({
      id: "score_impact_queue",
      operatorSummary: scoreItems.length ? "Fix these first; actionable source/debug failures are sorted before evidence gates." : "No actionable source/debug fix-first entries are loaded.",
      owner: scoreItems[0]?.owner ?? "beta",
      state: scoreItems.length ? "degraded" : "live",
      scoreImpactEstimate: round(scoreItems.reduce((sum, entry) => sum + entry.scoreImpactEstimate, 0)),
      nextAction: scoreItems[0]?.refreshCommand || "Review typed evidence and owner-review lanes in collapsed drilldown.",
      items: scoreItems,
    }),
    section({
      id: "critical_runtime_debug_warnings",
      operatorSummary: criticalWarnings.length ? "Source-backed runtime/debug warnings need action before completion claims." : "No source-fixable critical runtime/debug warnings are loaded.",
      owner: criticalWarnings[0]?.owner ?? "runtime",
      state: criticalWarnings.length ? "failed" : "live",
      scoreImpactEstimate: criticalWarnings.length * 2,
      nextAction: criticalWarnings[0]?.nextAction || "Keep provider-backed site activity and deployed route evidence in collapsed drilldown.",
      items: criticalWarnings,
    }),
    section({
      id: "stale_artifact_refresh_queue",
      operatorSummary: staleItems.length ? "Run these current registered refresh commands before trusting stale snapshots." : "No score-impacting stale refresh queue entries are loaded.",
      owner: staleItems[0]?.owner ?? "repo",
      state: staleItems.length ? "stale" : "live",
      scoreImpactEstimate: round(staleItems.reduce((sum, entry) => sum + entry.scoreImpactEstimate, 0)),
      nextAction: staleItems[0]?.refreshCommand || "No stale artifact recovery CTA is needed.",
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
      operatorSummary: actionableCostLanes.length ? "Cost lanes need source action where degraded or unknown." : "Cost lanes are source-guarded; external billing review remains collapsed.",
      owner: actionableCostLanes[0]?.owner ?? input.costOwnerReviewLanes[0]?.owner ?? "cost",
      state: actionableCostLanes.some((lane) => lane.state === "failed") ? "failed" : actionableCostLanes.length ? "degraded" : "live",
      scoreImpactEstimate: costImpact,
      nextAction: actionableCostLanes[0]?.nextAction || "Keep exact cost checks in drilldown: npm run check:gumdrop-economy, npm run check:google-cost, npm run check:cloud-cost.",
      items: actionableCostLanes,
    }),
    section({
      id: "ai_critic_requested_changes",
      operatorSummary: sourceCriticFindings.length ? "AI critic source-code requested changes must be resolved before claiming the patch complete." : "AI critic has no source-code changes requested; typed evidence backlog stays visible in drilldown.",
      owner: "critic",
      state: sourceCriticFindings.length ? "degraded" : "live",
      scoreImpactEstimate: sourceCriticFindings.length,
      nextAction: sourceCriticFindings[0]?.requiredFix || "No source changes requested; keep typed evidence backlog visible without marking critic degraded.",
      items: sourceCriticFindings,
    }),
    section({
      id: "recovery_playbook_cta",
      operatorSummary: activeRecoveryPlaybooks.length ? "Use the matching recovery playbook before editing source." : "No active source/debug recovery playbook is needed.",
      owner: "debug",
      state: activeRecoveryPlaybooks.length ? "degraded" : "live",
      scoreImpactEstimate: activeRecoveryPlaybooks.length ? 1 : 0,
      nextAction: activeRecoveryPlaybooks[0]?.commands[0] || "Typed evidence and stale artifact playbooks are collapsed until a matching active issue exists.",
      items: activeRecoveryPlaybooks.slice(0, 6),
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

  for (const section of report.defaultSections) {
    if (!section.nextAction || /^no action needed\.?$/iu.test(section.nextAction)) {
      if (section.state === "unknown" || section.state === "stale" || section.state === "degraded" || section.state === "failed") {
        failures.push(`${section.id} unknown shown healthy or lacks next action.`);
      }
    }
  }

  const scoreQueue = byId.get("score_impact_queue");
  const scoreQueueText = JSON.stringify(scoreQueue?.items ?? []);
  if (/runtime_provider_smoke|debug_runtime_evidence|admin_truth_sample_evidence|ui_source_coverage/iu.test(scoreQueueText)) {
    failures.push("formal runtime/provider/admin evidence appears as source-code fix.");
  }
  if (/score-80-path-lock|final-launch-readiness-report/iu.test(scoreQueueText)) {
    failures.push("obsolete score artifact remains score-impacting in fix-first queue.");
  }
  if (/score impact: 0|scoreImpactEstimate":0|clean_current/iu.test(scoreQueueText)) {
    failures.push("score-impact zero lane appears in fix-first queue.");
  }

  const staleRefresh = byId.get("stale_artifact_refresh_queue");
  if (staleRefresh?.items.some((item) => {
    if (!item || typeof item !== "object") return true;
    const refreshCommand = (item as { refreshCommand?: unknown }).refreshCommand;
    return typeof refreshCommand !== "string" || refreshCommand.length === 0;
  })) {
    failures.push("stale artifact lacks refresh CTA.");
  }
  const staleText = JSON.stringify(staleRefresh?.items ?? []);
  if (/score-80-path-lock|final-launch-readiness-report|admin-truth-sample-evidence/iu.test(staleText)) {
    failures.push("obsolete stale artifact remains in active stale refresh queue.");
  }

  return failures;
}
