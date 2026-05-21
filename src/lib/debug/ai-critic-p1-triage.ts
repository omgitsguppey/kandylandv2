import type {
  AiDebugCriticActionClass,
  AiDebugCriticReport,
} from "./ai-debug-critic-contract";
import type {
  DebugBacklogItem,
  DebugBacklogSeverity,
  DebugFixClass,
} from "./debug-backlog-contract";

const SOURCE_FIX_CLASSES: DebugFixClass[] = [
  "source_fix",
  "route_fix",
  "telemetry_closure",
  "cost_guard",
  "algorithm_refine",
];

export type AiCriticP1TriageItem = {
  rank: number;
  id: string;
  title: string;
  severity: DebugBacklogSeverity;
  owner: string;
  surface: string;
  scoreImpact: number;
  weightedScoreImpact: number;
  fixClass: DebugFixClass;
  actionClass: AiDebugCriticActionClass | "blocked_formal_evidence";
  sourceFixable: boolean;
  evidenceFixable: boolean;
  staleRefreshFixable: boolean;
  manualOnly: boolean;
  status: "open" | "fixed" | "deferred";
  deferredReason?: string;
  exactNextAction: string;
  sourceFiles: string[];
};

export type AiCriticP1TriageReport = {
  generatedAtUtc: string;
  reportKey: "ai-critic-p1-triage";
  currentHead: string;
  scoreBefore: number;
  scoreAfter: number;
  criticStatusBefore: AiDebugCriticReport["criticStatus"];
  criticStatusAfter: AiDebugCriticReport["criticStatus"];
  p1Count: number;
  p2Count: number;
  p1FixedCount: number;
  p1DeferredCount: number;
  p2DeferredCount: number;
  p1Ranking: AiCriticP1TriageItem[];
  p2Ranking: AiCriticP1TriageItem[];
  fixedThisPass: AiCriticP1TriageItem[];
  deferred: AiCriticP1TriageItem[];
  topRemainingScoreDrag: string[];
  duplicateSystemsTracked: boolean;
  monolithRisksTracked: boolean;
  fakeEvidenceBlocked: boolean;
  formalEvidenceGates: string[];
  requiredValidators: string[];
  notes: string[];
};

type ResolvedSourceFix = Pick<DebugBacklogItem, "id" | "title" | "severity" | "owner" | "surface" | "scoreImpact" | "fixClass" | "exactNextAction" | "sourceFiles"> & {
  deferredReason?: string;
};

export type AiCriticP1TriageInput = {
  backlog: DebugBacklogItem[];
  aiCritic: AiDebugCriticReport;
  criticStatusBefore?: AiDebugCriticReport["criticStatus"];
  scoreBefore: number;
  scoreAfter: number;
  currentHead: string;
  resolvedSourceFixes?: ResolvedSourceFix[];
  formalEvidenceGates?: string[];
  generatedAtUtc?: string;
};

function severityWeight(severity: DebugBacklogSeverity) {
  const weights: Record<DebugBacklogSeverity, number> = {
    critical: 6,
    p0: 5,
    p1: 4,
    p2: 3,
    p3: 2,
    info: 1,
  };
  return weights[severity];
}

export function classifyBacklogAction(item: Pick<DebugBacklogItem, "status" | "fixClass" | "evidenceStatus" | "exactNextAction" | "blockedReason">): AiCriticP1TriageItem["actionClass"] {
  const text = `${item.status} ${item.fixClass} ${item.evidenceStatus} ${item.exactNextAction} ${item.blockedReason ?? ""}`.toLowerCase();
  if (/visual|screenshot|manual qa|manual smoke/.test(text)) return "needs_operator_ui_confirmation";
  if (/formal|provider|deployed runtime|runtime smoke|admin truth sample|production sample|blocked_manual|blocked_external|external_required/.test(text)) {
    return "blocked_formal_evidence";
  }
  if (item.evidenceStatus === "stale" || item.fixClass === "evidence_refresh") return "needs_refresh";
  if (SOURCE_FIX_CLASSES.includes(item.fixClass)) return "needs_code_change";
  return "needs_evidence_artifact";
}

function toTriageItem(item: DebugBacklogItem, rank: number): AiCriticP1TriageItem {
  const actionClass = classifyBacklogAction(item);
  const sourceFixable = actionClass === "needs_code_change";
  const manualOnly = actionClass === "blocked_formal_evidence" || actionClass === "needs_operator_ui_confirmation";
  const staleRefreshFixable = actionClass === "needs_refresh";
  const evidenceFixable = actionClass === "needs_evidence_artifact" || staleRefreshFixable;
  const status = sourceFixable ? "deferred" : "deferred";
  return {
    rank,
    id: item.id,
    title: item.title,
    severity: item.severity,
    owner: item.owner,
    surface: item.surface,
    scoreImpact: item.scoreImpact,
    weightedScoreImpact: Number((item.scoreImpact * severityWeight(item.severity)).toFixed(2)),
    fixClass: item.fixClass,
    actionClass,
    sourceFixable,
    evidenceFixable,
    staleRefreshFixable,
    manualOnly,
    status,
    deferredReason: sourceFixable
      ? "Source-fixable P1 remains only if a higher-impact formal/manual/evidence gate blocks score movement; handle in its owner lane."
      : manualOnly
        ? "Formal/manual evidence is required and cannot be produced by source-only validation."
        : staleRefreshFixable
          ? "Refresh required; do not treat stale evidence as a code defect."
          : "Evidence artifact is required before this can move score.",
    exactNextAction: item.exactNextAction,
    sourceFiles: item.sourceFiles,
  };
}

function resolvedFixToTriageItem(item: ResolvedSourceFix, rank: number): AiCriticP1TriageItem {
  return {
    rank,
    id: item.id,
    title: item.title,
    severity: item.severity,
    owner: item.owner,
    surface: item.surface,
    scoreImpact: item.scoreImpact,
    weightedScoreImpact: Number((item.scoreImpact * severityWeight(item.severity)).toFixed(2)),
    fixClass: item.fixClass,
    actionClass: "needs_code_change",
    sourceFixable: true,
    evidenceFixable: false,
    staleRefreshFixable: false,
    manualOnly: false,
    status: "fixed",
    exactNextAction: item.exactNextAction,
    sourceFiles: item.sourceFiles,
  };
}

function rankItems(items: DebugBacklogItem[]) {
  return items
    .slice()
    .sort((left, right) => (
      severityWeight(right.severity) - severityWeight(left.severity)
      || right.scoreImpact - left.scoreImpact
      || left.id.localeCompare(right.id)
    ))
    .map((item, index) => toTriageItem(item, index + 1));
}

export function buildAiCriticP1TriageReport(input: AiCriticP1TriageInput): AiCriticP1TriageReport {
  const p1Items = input.backlog.filter((item) => ["critical", "p0", "p1"].includes(item.severity));
  const p2Items = input.backlog.filter((item) => item.severity === "p2");
  const fixedThisPass = (input.resolvedSourceFixes ?? []).map((item, index) => resolvedFixToTriageItem(item, index + 1));
  const p1Ranking = rankItems(p1Items);
  const p2Ranking = rankItems(p2Items);
  const deferred = [...p1Ranking, ...p2Ranking].filter((item) => item.status === "deferred");
  const fakeEvidenceBlocked = input.aiCritic.findings
    .filter((finding) => finding.check === "no_fake_evidence" || finding.check === "no_source_ready_as_runtime_proof" || finding.check === "no_formal_gate_cleared_without_artifact")
    .every((finding) => finding.severity === "blocker" || finding.actionClass === "blocked_formal_evidence");

  return {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "ai-critic-p1-triage",
    currentHead: input.currentHead,
    scoreBefore: input.scoreBefore,
    scoreAfter: input.scoreAfter,
    criticStatusBefore: input.criticStatusBefore ?? input.aiCritic.criticStatus,
    criticStatusAfter: input.aiCritic.criticStatus,
    p1Count: p1Items.length,
    p2Count: p2Items.length,
    p1FixedCount: fixedThisPass.filter((item) => item.severity === "p1").length,
    p1DeferredCount: p1Ranking.length,
    p2DeferredCount: p2Ranking.length,
    p1Ranking,
    p2Ranking,
    fixedThisPass,
    deferred,
    topRemainingScoreDrag: p1Ranking.slice(0, 8).map((item) => `${item.id}: ${item.scoreImpact} (${item.actionClass})`),
    duplicateSystemsTracked: Array.isArray(input.aiCritic.duplicateSystems),
    monolithRisksTracked: input.aiCritic.monolithRisks.every((risk) => risk.splitPlanRequired === true),
    fakeEvidenceBlocked,
    formalEvidenceGates: input.formalEvidenceGates ?? [],
    requiredValidators: [
      "npm run check:ai-critic-p1-triage",
      "npm run check:ai-debug-critic",
      "npm run check:debug-backlog-engine",
      "npm run score:beta",
      "npm run check:beta-score",
    ],
    notes: [
      "AI critic request_changes was caused by stale/formal/manual evidence items being treated as code-change work.",
      "Formal provider, runtime, visual/manual, and admin truth sample gates remain blocked until real artifacts exist.",
      "P2 work is deferred while P1 formal evidence and score-impact lanes remain higher priority.",
    ],
  };
}

export function validateAiCriticP1TriageReport(report: AiCriticP1TriageReport): string[] {
  const failures: string[] = [];
  if (report.criticStatusAfter === "request_changes") {
    failures.push("aiCriticStatus remains request_changes after formal/manual evidence classification.");
  }
  for (const item of report.p1Ranking) {
    if (!Number.isFinite(item.rank) || !Number.isFinite(item.scoreImpact)) {
      failures.push(`${item.id} lacks score impact ranking.`);
    }
    if (item.sourceFixable && item.status !== "fixed" && !item.deferredReason) {
      failures.push(`${item.id} source-fixable P1 remains unfixed without reason.`);
    }
  }
  const unresolvedP1 = report.p1Ranking.some((item) => item.sourceFixable && item.status !== "fixed" && !item.deferredReason);
  if (report.fixedThisPass.some((item) => item.severity === "p2") && unresolvedP1) {
    failures.push("P2 items were fixed while higher-impact P1 source-fixable items were ignored.");
  }
  if (!report.duplicateSystemsTracked) failures.push("duplicate systems remain untracked.");
  if (!report.monolithRisksTracked) failures.push("monolith risks lack owner/split plan tracking.");
  if (!report.fakeEvidenceBlocked) failures.push("fake evidence risk is not blocked.");
  if (report.formalEvidenceGates.length === 0) failures.push("formal evidence gates are not listed honestly.");
  return failures;
}
