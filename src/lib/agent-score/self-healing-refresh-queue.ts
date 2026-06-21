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

type SourceEvidenceKind = "runtime" | "provider" | "admin_truth" | "generic";

const FORMAL_EVIDENCE_PATTERN = /\battach formal|formal provider|formal runtime|admin truth sample|provider smoke|runtime smoke/i;
const LEGACY_SCREENSHOT_EVIDENCE_PATTERN =
  /\b(manual screenshot|screenshot evidence|visual\/manual screenshot|targeted visual\/manual|operator screenshot|manual visual|visual manual|visual proof|visual evidence|visual qa|manual ui evidence|manual mobile ui evidence)\b/i;
const LEGACY_MANUAL_UI_PROOF_PATTERN = /\bmanual proof\b/i;
const UI_EVIDENCE_CONTEXT_PATTERN = /\b(ui|visual|browser|surface|modal|dialog|drawer|layout|mobile|desktop|screenshot)\b/i;
const FORBIDDEN_COMMAND_PATTERN = /\b(firebase deploy|gcloud|deploy|production read|paypal|provider call)\b/i;
const UI_SOURCE_COVERAGE_REFRESH_COMMAND = "npm run check:ui-visual-smoke-minimal";

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

function formalEvidenceKind(value: string): SourceEvidenceKind | null {
  const normalized = normalizeFormalEvidenceText(value);
  if (!normalized) return null;
  if (/\b(admin truth sample evidence|admin truth sample|admin sample required|truth sample|admin source activity sample|admin source sample)\b/u.test(normalized)) return "admin_truth";
  if (/\b(provider smoke evidence|provider smoke|formal provider|external proof|required provider|provider backed|provider source|provider manual proof)\b/u.test(normalized)) return "provider";
  if (/\b(runtime smoke evidence|runtime smoke|debug runtime evidence|deployed runtime|runtime route evidence|formal runtime)\b/u.test(normalized)) return "runtime";
  if (FORMAL_EVIDENCE_PATTERN.test(value)) return "generic";
  return null;
}

function isFormalEvidenceRefresh(command: string, artifact: string, status = "") {
  return formalEvidenceKind(`${command} ${artifact} ${status}`) !== null;
}

function isLegacyScreenshotEvidenceText(value: string) {
  return LEGACY_SCREENSHOT_EVIDENCE_PATTERN.test(value)
    || (LEGACY_MANUAL_UI_PROOF_PATTERN.test(value) && UI_EVIDENCE_CONTEXT_PATTERN.test(value));
}

function normalizeRefreshCommand(command: string, artifact: string, status = "") {
  if (isLegacyScreenshotEvidenceText(`${command} ${artifact} ${status}`)) {
    return UI_SOURCE_COVERAGE_REFRESH_COMMAND;
  }
  const kind = formalEvidenceKind(`${command} ${artifact} ${status}`);
  if (kind === "runtime") return "Produce deployed runtime route evidence, then run npm run check:evidence-capture-status";
  if (kind === "provider") return "Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status";
  if (kind === "admin_truth") return "Produce redacted admin source activity sample, then run npm run check:evidence-capture-status";
  if (kind === "generic") return "Produce matching source activity evidence, then run npm run check:evidence-capture-status";
  return command;
}

function normalizeStaleReason(status: string | undefined, command: string, artifact: string) {
  if (isLegacyScreenshotEvidenceText(`${command} ${artifact} ${status ?? ""}`)) {
    return "UI source coverage required";
  }
  return status ?? "score_impact";
}

function formalEvidenceBlockedReason(artifact: string) {
  const kind = formalEvidenceKind(artifact);
  if (kind === "runtime") {
    return "blocked_source_evidence: deployed runtime route evidence required; source/debug evidence is partial only.";
  }
  if (kind === "provider") {
    return "blocked_source_evidence: provider-backed site activity evidence required; operator-confirmed usage remains partial confidence only.";
  }
  if (kind === "admin_truth") {
    return "blocked_source_evidence: redacted admin source activity sample required; source samples remain partial confidence only.";
  }
  return "blocked_source_evidence: matching source activity evidence required; source queue cannot generate it automatically.";
}

function formalEvidenceStaleReason(artifact: string) {
  const kind = formalEvidenceKind(artifact);
  if (kind === "runtime") return "Deployed runtime route evidence required";
  if (kind === "provider") return "Provider-backed site activity required";
  if (kind === "admin_truth") return "Admin source sample required";
  return "Source activity evidence required";
}

function formalEvidenceExpectedOutcome(artifact: string) {
  const kind = formalEvidenceKind(artifact);
  if (kind === "runtime") {
    return "Remain blocked until deployed runtime route evidence is produced from source activity.";
  }
  if (kind === "provider") {
    return "Remain blocked until provider-backed site activity evidence is produced.";
  }
  if (kind === "admin_truth") {
    return "Remain blocked until a redacted admin source activity sample is produced.";
  }
  return "Remain blocked until matching source activity evidence is produced.";
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
      const command = normalizeRefreshCommand(entry.refreshCommand ?? "", entry.artifactPath, entry.status);
      const formal = isFormalEvidenceRefresh(command, entry.artifactPath, entry.status);
      return {
        artifact: entry.artifactPath,
        staleReason: formal ? formalEvidenceStaleReason(entry.artifactPath) : normalizeStaleReason(entry.status, command, entry.artifactPath),
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
      const command = normalizeRefreshCommand(item.refreshCommand ?? getRegisteredRefreshCommand(item.id) ?? "", item.id, item.status);
      const formal = isFormalEvidenceRefresh(command, item.id, item.status);
      return {
        artifact: item.id,
        staleReason: formal ? formalEvidenceStaleReason(item.id) : normalizeStaleReason(item.status, command, item.id),
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
        expectedOutcome: isLegacyScreenshotEvidenceText(`${item.refreshCommand ?? ""} ${item.id} ${item.status ?? ""}`)
          ? "Run deterministic UI source coverage and fix any source-reported UI surface gap; browser reproduction is optional evidence only."
          : formal
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
      failures.push(`${entry.artifact} suggests automatic source evidence refresh for a blocked lane.`);
    }
    if (!entry.canRunAutomatically && !entry.blockedReason) failures.push(`${entry.artifact} is blocked without blocked reason.`);
  }

  for (const key of ["betaScoreRefreshPlan", "debugBacklog", "adminDebugPanelSource", "finalLockReports"] as const) {
    if (!report.integration[key]) failures.push(`integration missing ${key}.`);
  }

  return failures;
}
