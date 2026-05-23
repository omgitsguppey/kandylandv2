import type {
  DebugBacklogSeverity,
  DebugFixClass,
  ScoreDimensionImpact,
} from "./debug-backlog-contract";

export type DebugSignalActionability =
  | "fix_now"
  | "score_impacting"
  | "evidence_required"
  | "formal_gate"
  | "quiet_future_activity"
  | "informational"
  | "duplicate"
  | "superseded"
  | "not_actionable";

export type DebugSignalActionabilityInput = {
  signalId: string;
  signalType: string;
  severity?: DebugBacklogSeverity | string;
  actionability?: DebugSignalActionability;
  scoreDimensionsAffected?: ScoreDimensionImpact[];
  scoreImpact?: number;
  estimatedPointImpact?: number;
  owner?: string;
  nextAction?: string;
  sourceFiles?: string[];
  validator?: string;
  sourceMessage?: string;
  evidenceStatus?: string;
  fixClass?: DebugFixClass | string;
  dedupeKey?: string;
};

export type DebugSignalActionabilityResult = {
  signalId: string;
  signalType: string;
  severity: DebugBacklogSeverity;
  actionability: DebugSignalActionability;
  scoreDimensionsAffected: ScoreDimensionImpact[];
  estimatedPointImpact: number;
  owner: string;
  nextAction: string;
  sourceFiles: string[];
  validator?: string;
  defaultVisible: boolean;
  dedupeKey: string;
  duplicateChildren: string[];
};

export type DebugSignalActionabilitySummary = {
  totalSignals: number;
  uniqueSignals: number;
  defaultVisibleCount: number;
  hiddenByDefaultCount: number;
  quietFutureActivityCount: number;
  duplicateSignalCount: number;
  formalGateCount: number;
  scoreImpactingCount: number;
  byActionability: Record<DebugSignalActionability, number>;
  defaultVisibleSignals: DebugSignalActionabilityResult[];
  hiddenSignals: DebugSignalActionabilityResult[];
  validationFailures: string[];
};

const DEFAULT_VISIBLE_ACTIONABILITY = new Set<DebugSignalActionability>([
  "fix_now",
  "score_impacting",
  "evidence_required",
  "formal_gate",
]);

const ACTIONABILITY_RANK: Record<DebugSignalActionability, number> = {
  fix_now: 9,
  score_impacting: 8,
  evidence_required: 7,
  formal_gate: 6,
  informational: 4,
  not_actionable: 3,
  quiet_future_activity: 2,
  superseded: 1,
  duplicate: 0,
};

const SEVERITY_RANK: Record<DebugBacklogSeverity, number> = {
  critical: 6,
  p0: 5,
  p1: 4,
  p2: 3,
  p3: 2,
  info: 1,
};

const ALL_ACTIONABILITY: DebugSignalActionability[] = [
  "fix_now",
  "score_impacting",
  "evidence_required",
  "formal_gate",
  "quiet_future_activity",
  "informational",
  "duplicate",
  "superseded",
  "not_actionable",
];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeSeverity(value: unknown): DebugBacklogSeverity {
  const raw = text(value).toLowerCase();
  if (raw === "critical") return "critical";
  if (raw === "p0") return "p0";
  if (raw === "p1" || raw === "error" || raw === "major") return "p1";
  if (raw === "p2" || raw === "warn" || raw === "warning" || raw === "review") return "p2";
  if (raw === "p3" || raw === "minor") return "p3";
  return "info";
}

function normalizePointImpact(input: DebugSignalActionabilityInput) {
  return Number(toNumber(input.estimatedPointImpact ?? input.scoreImpact, 0).toFixed(2));
}

function quietFutureActivity(input: DebugSignalActionabilityInput) {
  const searchable = `${input.signalType} ${input.sourceMessage ?? ""} ${input.nextAction ?? ""}`.toLowerCase();
  return /future[_ -]?activity|future[_ -]?real[_ -]?activity[_ -]?pending|activity[_ -]?pending|waiting[_ -]?for[_ -]?real[_ -]?user/iu.test(searchable);
}

function formalGate(input: DebugSignalActionabilityInput) {
  const searchable = `${input.signalType} ${input.evidenceStatus ?? ""} ${input.fixClass ?? ""} ${input.sourceMessage ?? ""} ${input.nextAction ?? ""}`.toLowerCase();
  return /formal[_ -]?missing|runtime[_ -]?unverified|external[_ -]?required|blocked[_ -]?manual|blocked[_ -]?external|manual[_ -]?required|provider[_ -]?smoke|admin[_ -]?truth[_ -]?sample/iu.test(searchable);
}

function sourceFixable(input: DebugSignalActionabilityInput) {
  return /source_fix|route_fix|telemetry_closure|algorithm_refine|cost_guard/iu.test(text(input.fixClass));
}

function evidenceRequired(input: DebugSignalActionabilityInput) {
  const searchable = `${input.evidenceStatus ?? ""} ${input.fixClass ?? ""}`.toLowerCase();
  return /stale|missing|unknown|evidence_refresh|stale_retire/iu.test(searchable);
}

function defaultActionability(input: DebugSignalActionabilityInput): DebugSignalActionability {
  if (input.actionability) return input.actionability;
  if (quietFutureActivity(input)) return "quiet_future_activity";
  if (formalGate(input)) return "formal_gate";
  if (normalizePointImpact(input) > 0 && (input.scoreDimensionsAffected?.length ?? 0) > 0) return "score_impacting";
  if (["critical", "p0", "p1"].includes(normalizeSeverity(input.severity)) && (input.scoreDimensionsAffected?.length ?? 0) > 0) return "score_impacting";
  if (sourceFixable(input)) return "fix_now";
  if (evidenceRequired(input)) return "evidence_required";
  if (/no_action|not_applicable|stale_retired/iu.test(`${input.fixClass ?? ""} ${input.evidenceStatus ?? ""}`)) return "not_actionable";
  return "informational";
}

function defaultVisible(actionability: DebugSignalActionability) {
  return DEFAULT_VISIBLE_ACTIONABILITY.has(actionability);
}

function defaultDedupeKey(input: DebugSignalActionabilityInput, actionability: DebugSignalActionability) {
  return text(input.dedupeKey)
    || [
      actionability,
      input.signalType,
      input.owner,
      input.scoreDimensionsAffected?.join(","),
      text(input.nextAction || input.sourceMessage).toLowerCase().replace(/[^a-z0-9]+/gu, "-").slice(0, 80),
    ].filter(Boolean).join("|")
    || input.signalId;
}

export function classifyDebugSignalActionability(input: DebugSignalActionabilityInput): DebugSignalActionabilityResult {
  const actionability = defaultActionability(input);
  const quiet = actionability === "quiet_future_activity";
  const pointImpact = quiet ? 0 : normalizePointImpact(input);
  const dimensions = quiet ? [] : [...new Set(input.scoreDimensionsAffected ?? [])];
  const severity = quiet
    ? "info"
    : pointImpact > 0 && normalizeSeverity(input.severity) === "info"
      ? "p2"
      : normalizeSeverity(input.severity);

  return {
    signalId: input.signalId,
    signalType: actionability === "formal_gate" ? "formal_gate" : text(input.signalType || "debug_signal"),
    severity,
    actionability,
    scoreDimensionsAffected: dimensions,
    estimatedPointImpact: pointImpact,
    owner: text(input.owner),
    nextAction: text(input.nextAction),
    sourceFiles: input.sourceFiles?.filter(Boolean) ?? [],
    validator: text(input.validator) || undefined,
    defaultVisible: defaultVisible(actionability),
    dedupeKey: defaultDedupeKey(input, actionability),
    duplicateChildren: [],
  };
}

function pickParent(
  current: DebugSignalActionabilityResult,
  next: DebugSignalActionabilityResult,
) {
  const currentRank = ACTIONABILITY_RANK[current.actionability] + SEVERITY_RANK[current.severity] + current.estimatedPointImpact;
  const nextRank = ACTIONABILITY_RANK[next.actionability] + SEVERITY_RANK[next.severity] + next.estimatedPointImpact;
  return nextRank > currentRank ? next : current;
}

function collapseDuplicates(signals: DebugSignalActionabilityResult[]) {
  const byKey = new Map<string, DebugSignalActionabilityResult>();
  for (const signal of signals) {
    const existing = byKey.get(signal.dedupeKey);
    if (!existing) {
      byKey.set(signal.dedupeKey, { ...signal, duplicateChildren: [] });
      continue;
    }

    const parent = pickParent(existing, signal);
    const child = parent.signalId === existing.signalId ? signal : existing;
    byKey.set(signal.dedupeKey, {
      ...parent,
      duplicateChildren: Array.from(new Set([
        ...parent.duplicateChildren,
        ...existing.duplicateChildren,
        ...signal.duplicateChildren,
        child.signalId,
      ].filter((id) => id !== parent.signalId))),
      estimatedPointImpact: Math.max(existing.estimatedPointImpact, signal.estimatedPointImpact),
      sourceFiles: Array.from(new Set([...existing.sourceFiles, ...signal.sourceFiles])),
    });
  }
  return Array.from(byKey.values()).sort((left, right) =>
    ACTIONABILITY_RANK[right.actionability] - ACTIONABILITY_RANK[left.actionability]
    || SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
    || right.estimatedPointImpact - left.estimatedPointImpact
    || left.signalId.localeCompare(right.signalId));
}

function validateScoredSignals(signals: DebugSignalActionabilityResult[]) {
  const failures: string[] = [];
  for (const signal of signals) {
    if (!signal.owner) failures.push(`${signal.signalId} lacks owner.`);
    if (!signal.nextAction) failures.push(`${signal.signalId} lacks nextAction.`);
    if (signal.defaultVisible && signal.actionability === "quiet_future_activity") {
      failures.push(`${signal.signalId} quiet future activity is default-visible.`);
    }
    if (signal.actionability === "quiet_future_activity" && ["critical", "p0", "p1", "p2"].includes(signal.severity)) {
      failures.push(`${signal.signalId} quiet future activity appears as P1/P2.`);
    }
    if (signal.actionability === "formal_gate" && /telemetry/iu.test(signal.signalType)) {
      failures.push(`${signal.signalId} formal gate appears as telemetry bug.`);
    }
    if (
      ["fix_now", "score_impacting", "formal_gate"].includes(signal.actionability)
      && signal.scoreDimensionsAffected.length > 0
      && signal.estimatedPointImpact <= 0
    ) {
      failures.push(`${signal.signalId} score-impacting signal lacks estimatedPointImpact.`);
    }
  }
  return failures;
}

export function scoreDebugSignalActionability(
  inputs: readonly DebugSignalActionabilityInput[],
): DebugSignalActionabilitySummary {
  const scored = inputs.map((input) => classifyDebugSignalActionability(input));
  const collapsed = collapseDuplicates(scored);
  const defaultVisibleSignals = collapsed.filter((signal) => signal.defaultVisible);
  const hiddenSignals = collapsed.filter((signal) => !signal.defaultVisible);
  const byActionability = Object.fromEntries(ALL_ACTIONABILITY.map((actionability) => [actionability, 0])) as Record<DebugSignalActionability, number>;
  collapsed.forEach((signal) => {
    byActionability[signal.actionability] += 1;
  });

  return {
    totalSignals: inputs.length,
    uniqueSignals: collapsed.length,
    defaultVisibleCount: defaultVisibleSignals.length,
    hiddenByDefaultCount: hiddenSignals.length,
    quietFutureActivityCount: collapsed.filter((signal) => signal.actionability === "quiet_future_activity").length,
    duplicateSignalCount: inputs.length - collapsed.length,
    formalGateCount: collapsed.filter((signal) => signal.actionability === "formal_gate").length,
    scoreImpactingCount: collapsed.filter((signal) => signal.estimatedPointImpact > 0).length,
    byActionability,
    defaultVisibleSignals,
    hiddenSignals,
    validationFailures: validateScoredSignals(collapsed),
  };
}

export function summarizeDebugSignalActionability(
  inputs: readonly DebugSignalActionabilityInput[],
) {
  return scoreDebugSignalActionability(inputs);
}
