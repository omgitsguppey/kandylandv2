import type { ArtifactRefreshStatus } from "./refresh-safeguards";
import { getRegisteredRefreshCommand } from "./refresh-registry";

export type SelfHealingRefreshQueueSource =
  | "refresh_plan"
  | "score_impact"
  | "debug_backlog"
  | "final_lock";

export type SelfHealingRefreshQueueOwner = ArtifactRefreshStatus["owner"] | "runtime" | "admin" | "ui_source";

export interface ScoreImpactArtifactInput {
  id: string;
  status?: string;
  pointImpact?: number;
  refreshCommand?: string;
  nextAction?: string;
}

export interface SelfHealingRefreshQueueInput {
  refreshPlan: ArtifactRefreshStatus[];
  scoreImpactArtifacts?: ScoreImpactArtifactInput[];
  debugBacklogArtifacts?: ScoreImpactArtifactInput[];
  finalLockArtifacts?: ScoreImpactArtifactInput[];
  currentArtifactPaths?: string[];
}

export interface SelfHealingRefreshQueueEntry {
  artifact: string;
  staleReason: string;
  refreshCommand: string;
  scoreImpactEstimate: number;
  owner: SelfHealingRefreshQueueOwner;
  dependencyOrder: number;
  canRunAutomatically: boolean;
  blockedReason: string;
  source: SelfHealingRefreshQueueSource;
  expectedOutcome: string;
}

export interface SelfHealingRefreshQueueReport {
  generatedAtUtc: string;
  reportKey: "self-healing-refresh-queue";
  currentHead: string;
  sourceCommit: string;
  overallStatus: "pass" | "fail";
  queue: SelfHealingRefreshQueueEntry[];
  summary: {
    total: number;
    automatic: number;
    blocked: number;
    totalScoreImpactEstimate: number;
  };
  integration: {
    betaScoreRefreshPlan: boolean;
    debugBacklog: boolean;
    adminDebugPanelSource: boolean;
    finalLockReports: boolean;
  };
  validationFailures: string[];
}

type FormalEvidenceKind = "runtime" | "provider" | "admin_truth" | "generic";

const FORMAL_EVIDENCE_PATTERN = /\battach formal|formal provider|formal runtime|admin truth sample|provider smoke|runtime smoke/i;
const FORBIDDEN_COMMAND_PATTERN = /\b(firebase deploy|gcloud|deploy|production read|paypal|provider call)\b/i;

const OWNER_BY_ARTIFACT: Array<[RegExp, SelfHealingRefreshQueueOwner]> = [
  [/runtime|provider/i, "runtime"],
  [/admin-truth|admin_truth/i, "admin"],
  [/ui-visual|ui-surface|visual/i, "ui_source"],
  [/telemetry/i, "telemetry"],
  [/mobile|wallet/i, "mobile"],
  [/creator/i, "creator"],
  [/beta/i, "beta"],
];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function ownerForArtifact(artifact: string, fallback: SelfHealingRefreshQueueOwner = "repo"): SelfHealingRefreshQueueOwner {
  return OWNER_BY_ARTIFACT.find(([pattern]) => pattern.test(artifact))?.[1] ?? fallback;
}

function normalizeFormalEvidenceText(value: string) {
  return value
    .toLowerCase()
    .replace(/[-_/]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function formalEvidenceKind(value: string): FormalEvidenceKind | null {
  const normalized = normalizeFormalEvidenceText(value);
  if (!normalized) return null;
  if (/\b(admin truth sample evidence|admin truth sample|admin sample required|truth sample)\b/u.test(normalized)) return "admin_truth";
  if (/\b(provider smoke evidence|provider smoke|formal provider|external proof|required provider)\b/u.test(normalized)) return "provider";
  if (/\b(runtime smoke evidence|runtime smoke|debug runtime evidence|deployed runtime|formal runtime)\b/u.test(normalized)) return "runtime";
  if (FORMAL_EVIDENCE_PATTERN.test(value)) return "generic";
  return null;
}

function isFormalEvidenceRefresh(command: string, artifact: string, status = "") {
  return formalEvidenceKind(`${command} ${artifact} ${status}`) !== null;
}

function formalEvidenceBlockedReason(artifact: string) {
  const kind = formalEvidenceKind(artifact);
  if (kind === "runtime") {
    return "blocked_formal_evidence: deployed runtime smoke artifact required; source/debug evidence is partial only and cannot clear formal runtime gate.";
  }
  if (kind === "provider") {
    return "blocked_formal_evidence: formal provider smoke artifact required; operator-confirmed usage remains partial confidence only.";
  }
  if (kind === "admin_truth") {
    return "blocked_formal_evidence: first-party admin truth sample artifact required; source samples remain partial confidence only.";
  }
  return "blocked_formal_evidence: formal artifact required; source queue cannot generate proof.";
}

function formalEvidenceStaleReason(artifact: string) {
  const kind = formalEvidenceKind(artifact);
  if (kind === "runtime") return "Deployed runtime proof required";
  if (kind === "provider") return "External proof required";
  if (kind === "admin_truth") return "Admin sample required";
  return "Formal proof required";
}

function formalEvidenceExpectedOutcome(artifact: string) {
  const kind = formalEvidenceKind(artifact);
  if (kind === "runtime") {
    return "Remain blocked until a human attaches the deployed runtime smoke artifact.";
  }
  if (kind === "provider") {
    return "Remain blocked until a human attaches the formal provider smoke artifact.";
  }
  if (kind === "admin_truth") {
    return "Remain blocked until a human attaches the admin truth sample artifact.";
  }
  return "Remain blocked until a human attaches the required formal artifact.";
}

function isForbiddenCommand(command: string) {
  return FORBIDDEN_COMMAND_PATTERN.test(command);
}

function impactMap(items: readonly ScoreImpactArtifactInput[] = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function buildRefreshPlanEntries(
  refreshPlan: readonly ArtifactRefreshStatus[],
  impacts: Map<string, ScoreImpactArtifactInput>,
): SelfHealingRefreshQueueEntry[] {
  return refreshPlan
    .filter((entry) => entry.needsRefresh)
    .map((entry) => {
      const impact = impacts.get(entry.artifactPath) ?? impacts.get(entry.reportKey ?? "");
      const command = entry.refreshCommand ?? "";
      const formal = isFormalEvidenceRefresh(command, entry.artifactPath, entry.status);
      return {
        artifact: entry.artifactPath,
        staleReason: formal ? formalEvidenceStaleReason(entry.artifactPath) : entry.status,
        refreshCommand: command,
        scoreImpactEstimate: round(impact?.pointImpact ?? (entry.status === "stale_source_version" ? 1 : 0.5)),
        owner: entry.owner,
        dependencyOrder: 0,
        canRunAutomatically: Boolean(command) && !formal && !isForbiddenCommand(command),
        blockedReason: formal
          ? formalEvidenceBlockedReason(entry.artifactPath)
          : isForbiddenCommand(command)
            ? "Forbidden command is not allowed in the self-healing queue."
            : command
              ? ""
              : "No registered refresh command.",
        source: "refresh_plan",
        expectedOutcome: "Refresh generated artifact from current source and update debug/beta freshness state.",
      };
    });
}

function buildScoreImpactEntries(
  items: readonly ScoreImpactArtifactInput[] = [],
  existingArtifacts: Set<string>,
): SelfHealingRefreshQueueEntry[] {
  const uniqueItems = new Map<string, ScoreImpactArtifactInput>();
  for (const item of items) {
    if (existingArtifacts.has(item.id)) continue;
    const existing = uniqueItems.get(item.id);
    if (!existing || (item.pointImpact ?? 0) > (existing.pointImpact ?? 0)) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()]
    .map((item) => {
      const command = item.refreshCommand ?? getRegisteredRefreshCommand(item.id) ?? "";
      const formal = isFormalEvidenceRefresh(command, item.id, item.status);
      return {
        artifact: item.id,
        staleReason: formal ? formalEvidenceStaleReason(item.id) : item.status ?? "score_impact",
        refreshCommand: command,
        scoreImpactEstimate: round(item.pointImpact ?? 0),
        owner: ownerForArtifact(item.id),
        dependencyOrder: 0,
        canRunAutomatically: Boolean(command) && !formal && !isForbiddenCommand(command),
        blockedReason: formal
          ? formalEvidenceBlockedReason(item.id)
          : isForbiddenCommand(command)
            ? "Forbidden command is not allowed in the self-healing queue."
            : command
              ? ""
              : "No registered refresh command.",
        source: "score_impact",
        expectedOutcome: formal
          ? formalEvidenceExpectedOutcome(item.id)
          : "Refresh score-impact artifact and reduce freshness/regression drag if validation passes.",
      };
    });
}

function orderEntries(entries: SelfHealingRefreshQueueEntry[]) {
  return [...entries]
    .sort((left, right) => {
      if (left.canRunAutomatically !== right.canRunAutomatically) {
        return left.canRunAutomatically ? -1 : 1;
      }
      return right.scoreImpactEstimate - left.scoreImpactEstimate
        || left.owner.localeCompare(right.owner)
        || left.artifact.localeCompare(right.artifact);
    })
    .map((entry, index) => ({
      ...entry,
      dependencyOrder: index + 1,
    }));
}

export function buildSelfHealingRefreshQueue(input: SelfHealingRefreshQueueInput, options: {
  generatedAtUtc?: string;
  currentHead?: string;
} = {}): SelfHealingRefreshQueueReport {
  const currentArtifacts = new Set(input.currentArtifactPaths ?? []);
  const scoreArtifacts = [
    ...(input.scoreImpactArtifacts ?? []),
    ...(input.debugBacklogArtifacts ?? []),
    ...(input.finalLockArtifacts ?? []),
  ].filter((item) => !currentArtifacts.has(item.id));
  const impacts = impactMap(scoreArtifacts);
  const refreshPlanEntries = buildRefreshPlanEntries(input.refreshPlan, impacts);
  const existing = new Set(refreshPlanEntries.map((entry) => entry.artifact));
  const scoreImpactEntries = buildScoreImpactEntries(scoreArtifacts, existing);
  const queue = orderEntries([...refreshPlanEntries, ...scoreImpactEntries]);
  const validationFailures = validateSelfHealingRefreshQueue({
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "self-healing-refresh-queue",
    currentHead: options.currentHead ?? "unknown",
    sourceCommit: options.currentHead ?? "unknown",
    overallStatus: "pass",
    queue,
    summary: {
      total: queue.length,
      automatic: queue.filter((entry) => entry.canRunAutomatically).length,
      blocked: queue.filter((entry) => !entry.canRunAutomatically).length,
      totalScoreImpactEstimate: round(queue.reduce((sum, entry) => sum + entry.scoreImpactEstimate, 0)),
    },
    integration: {
      betaScoreRefreshPlan: true,
      debugBacklog: true,
      adminDebugPanelSource: true,
      finalLockReports: true,
    },
    validationFailures: [],
  });

  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "self-healing-refresh-queue",
    currentHead: options.currentHead ?? "unknown",
    sourceCommit: options.currentHead ?? "unknown",
    overallStatus: validationFailures.length === 0 ? "pass" : "fail",
    queue,
    summary: {
      total: queue.length,
      automatic: queue.filter((entry) => entry.canRunAutomatically).length,
      blocked: queue.filter((entry) => !entry.canRunAutomatically).length,
      totalScoreImpactEstimate: round(queue.reduce((sum, entry) => sum + entry.scoreImpactEstimate, 0)),
    },
    integration: {
      betaScoreRefreshPlan: true,
      debugBacklog: true,
      adminDebugPanelSource: true,
      finalLockReports: true,
    },
    validationFailures,
  };
}

export function validateSelfHealingRefreshQueue(report: SelfHealingRefreshQueueReport): string[] {
  const failures: string[] = [];
  const seenOrder = new Set<number>();

  for (const entry of report.queue) {
    if (!entry.artifact) failures.push("queue entry lacks artifact.");
    if (!entry.staleReason) failures.push(`${entry.artifact} lacks stale reason.`);
    if (!entry.refreshCommand) failures.push(`${entry.artifact} lacks refresh command.`);
    if (entry.dependencyOrder <= 0 || seenOrder.has(entry.dependencyOrder)) {
      failures.push(`${entry.artifact} lacks dependency ordering.`);
    }
    seenOrder.add(entry.dependencyOrder);
    if (entry.scoreImpactEstimate <= 0) failures.push(`${entry.artifact} has no score impact estimate.`);
    if (isForbiddenCommand(entry.refreshCommand)) failures.push(`${entry.artifact} contains forbidden command.`);
    if (entry.canRunAutomatically && isFormalEvidenceRefresh(entry.refreshCommand, entry.artifact, entry.staleReason)) {
      failures.push(`${entry.artifact} suggests formal evidence refresh without artifact.`);
    }
    if (!entry.canRunAutomatically && !entry.blockedReason) failures.push(`${entry.artifact} is blocked without blocked reason.`);
  }

  for (const key of ["betaScoreRefreshPlan", "debugBacklog", "adminDebugPanelSource", "finalLockReports"] as const) {
    if (!report.integration[key]) failures.push(`integration missing ${key}.`);
  }

  return failures;
}
