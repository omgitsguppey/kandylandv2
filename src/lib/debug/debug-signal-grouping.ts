import type {
  DebugBacklogSeverity,
  DebugSignalActionability,
  ScoreDimensionImpact,
} from "./debug-backlog-contract";

export type DebugSignalGroupingInput = {
  signalId: string;
  signalType: string;
  severity?: DebugBacklogSeverity | string;
  actionability: DebugSignalActionability;
  rootCause?: string;
  featureId?: string;
  eventFamily?: string;
  metricFamily?: string;
  materializerLane?: string;
  scoreDimension?: ScoreDimensionImpact | string;
  scoreDimensionsAffected?: Array<ScoreDimensionImpact | string>;
  owner?: string;
  gateId?: string;
  estimatedPointImpact?: number;
  nextAction?: string;
  sourceFiles?: string[];
  validator?: string;
};

export type DebugSignalGroupExample = {
  signalId: string;
  signalType: string;
  severity: DebugBacklogSeverity;
  featureId?: string;
  eventFamily?: string;
  metricFamily?: string;
  scoreDimensionsAffected: ScoreDimensionImpact[];
  estimatedPointImpact: number;
  sourceFiles: string[];
  validator?: string;
};

export type DebugSignalGroup = {
  groupId: string;
  groupLabel: string;
  count: number;
  examples: DebugSignalGroupExample[];
  rootCause: string;
  actionability: DebugSignalActionability;
  severity: DebugBacklogSeverity;
  scoreDimensionsAffected: ScoreDimensionImpact[];
  estimatedPointImpact: number;
  owner: string;
  nextAction: string;
  hiddenByDefault: boolean;
  sourceFiles: string[];
  validator?: string;
};

export type DebugSignalGroupSummary = {
  rawSignalCount: number;
  groupedSignalCount: number;
  defaultVisibleGroupCount: number;
  hiddenByDefaultGroupCount: number;
  quietFutureActivityGroupCount: number;
  actionableFutureActivitySignalCount: number;
  rawP1P2SignalCount: number;
  p1GroupCount: number;
  p2GroupCount: number;
  duplicateSignalsCollapsed: number;
};

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

function text(value: unknown, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function slug(value: unknown, fallback = "signal") {
  return text(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 120) || fallback;
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

function normalizeDimensions(input: DebugSignalGroupingInput): ScoreDimensionImpact[] {
  const values = [...(input.scoreDimensionsAffected ?? []), input.scoreDimension].filter(Boolean);
  const output: ScoreDimensionImpact[] = [];
  for (const value of values) {
    const normalized = String(value).replace(/[^a-z]/giu, "").toLowerCase();
    const dimension = normalized === "sourcehealth"
      ? "sourceHealth"
      : normalized === "runtimehealth"
        ? "runtimeHealth"
        : normalized === "evidencecompleteness"
          ? "evidenceCompleteness"
          : normalized === "freshness"
            ? "freshness"
            : normalized === "costrisk"
              ? "costRisk"
              : normalized === "regressionrisk"
                ? "regressionRisk"
                : null;
    if (dimension && !output.includes(dimension)) output.push(dimension);
  }
  return output;
}

function numberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function defaultHidden(actionability: DebugSignalActionability) {
  return !["fix_now", "score_impacting", "evidence_required", "formal_gate"].includes(actionability);
}

function rootCauseFor(input: DebugSignalGroupingInput) {
  if (input.actionability === "quiet_future_activity") return "future_activity_placeholder";
  return text(input.rootCause || input.signalType || input.actionability, "debug_signal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_|_$/gu, "")
    .slice(0, 120) || "debug_signal";
}

function groupingKey(input: DebugSignalGroupingInput) {
  const severity = normalizeSeverity(input.severity);
  if (severity === "critical" || severity === "p0") {
    return `critical:${input.signalId}`;
  }
  if (input.actionability === "quiet_future_activity") {
    return "quiet_future_activity:future_activity_catalog";
  }

  const rootCause = rootCauseFor(input);
  if (rootCause.includes("missing_materializer")) {
    return [
      input.actionability,
      "missing_materializer",
      slug(input.materializerLane || input.eventFamily || input.signalType, "materializer"),
      slug(input.owner, "owner"),
      normalizeDimensions(input).join(","),
    ].join("|");
  }

  if (rootCause.includes("missing_metric")) {
    return [
      input.actionability,
      "missing_metric",
      slug(input.metricFamily || input.signalType, "metric"),
      slug(input.owner, "owner"),
      normalizeDimensions(input).join(","),
    ].join("|");
  }

  if (input.actionability === "formal_gate") {
    return [
      "formal_gate",
      slug(input.gateId || rootCause, "gate"),
      slug(input.owner, "owner"),
    ].join("|");
  }

  return [
    slug(input.signalType, "debug_signal"),
    rootCause,
    slug(input.featureId, "feature"),
    slug(input.eventFamily, "event"),
    slug(input.metricFamily, "metric"),
    normalizeDimensions(input).join(","),
    slug(input.owner, "owner"),
    input.actionability,
  ].join("|");
}

function groupLabel(input: DebugSignalGroupingInput, count: number) {
  if (input.actionability === "quiet_future_activity") return `Future activity catalog (${count} quiet placeholders)`;
  const rootCause = rootCauseFor(input).replace(/[-_]+/gu, " ");
  if (rootCause.includes("missing materializer")) return `Missing materializer: ${text(input.materializerLane || input.eventFamily || input.signalType, "unknown")}`;
  if (rootCause.includes("missing metric")) return `Missing metric mapping: ${text(input.metricFamily || input.signalType, "unknown")}`;
  if (input.actionability === "formal_gate") return `Formal evidence gate: ${text(input.gateId || input.rootCause || input.signalType, "unknown")}`;
  return `${rootCause.charAt(0).toUpperCase()}${rootCause.slice(1)}`;
}

function exampleFor(input: DebugSignalGroupingInput): DebugSignalGroupExample {
  return {
    signalId: input.signalId,
    signalType: text(input.signalType, "debug_signal"),
    severity: normalizeSeverity(input.severity),
    featureId: text(input.featureId) || undefined,
    eventFamily: text(input.eventFamily) || undefined,
    metricFamily: text(input.metricFamily) || undefined,
    scoreDimensionsAffected: normalizeDimensions(input),
    estimatedPointImpact: numberValue(input.estimatedPointImpact),
    sourceFiles: input.sourceFiles?.filter(Boolean) ?? [],
    validator: text(input.validator) || undefined,
  };
}

function pickRepresentative(inputs: DebugSignalGroupingInput[]) {
  return [...inputs].sort((left, right) =>
    ACTIONABILITY_RANK[right.actionability] - ACTIONABILITY_RANK[left.actionability]
    || SEVERITY_RANK[normalizeSeverity(right.severity)] - SEVERITY_RANK[normalizeSeverity(left.severity)]
    || numberValue(right.estimatedPointImpact) - numberValue(left.estimatedPointImpact)
    || left.signalId.localeCompare(right.signalId))[0];
}

export function groupDebugSignals(inputs: readonly DebugSignalGroupingInput[]): DebugSignalGroup[] {
  const buckets = new Map<string, DebugSignalGroupingInput[]>();
  for (const input of inputs) {
    const key = groupingKey(input);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(input);
    } else {
      buckets.set(key, [input]);
    }
  }

  return Array.from(buckets.entries()).map(([key, groupInputs]) => {
    const representative = pickRepresentative(groupInputs);
    const dimensions = Array.from(new Set(groupInputs.flatMap((input) => normalizeDimensions(input))));
    const sourceFiles = Array.from(new Set(groupInputs.flatMap((input) => input.sourceFiles ?? []).filter(Boolean)));
    const severity = normalizeSeverity(representative.severity);
    return {
      groupId: slug(key, "debug-signal-group"),
      groupLabel: groupLabel(representative, groupInputs.length),
      count: groupInputs.length,
      examples: groupInputs.slice(0, 5).map(exampleFor),
      rootCause: rootCauseFor(representative),
      actionability: representative.actionability,
      severity,
      scoreDimensionsAffected: dimensions,
      estimatedPointImpact: representative.actionability === "quiet_future_activity"
        ? 0
        : Number(Math.max(...groupInputs.map((input) => numberValue(input.estimatedPointImpact))).toFixed(2)),
      owner: text(representative.owner, "unassigned"),
      nextAction: text(representative.nextAction, "Classify this grouped debug signal before treating it as resolved."),
      hiddenByDefault: defaultHidden(representative.actionability),
      sourceFiles,
      validator: text(representative.validator) || undefined,
    };
  }).sort((left, right) =>
    Number(left.hiddenByDefault) - Number(right.hiddenByDefault)
    || ACTIONABILITY_RANK[right.actionability] - ACTIONABILITY_RANK[left.actionability]
    || SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
    || right.estimatedPointImpact - left.estimatedPointImpact
    || left.groupId.localeCompare(right.groupId));
}

export function summarizeDebugSignalGroups(
  groups: readonly DebugSignalGroup[],
  rawSignalCount = groups.reduce((total, group) => total + group.count, 0),
): DebugSignalGroupSummary {
  const rawP1P2SignalCount = groups
    .filter((group) => group.severity === "p1" || group.severity === "p2")
    .reduce((total, group) => total + group.count, 0);
  return {
    rawSignalCount,
    groupedSignalCount: groups.length,
    defaultVisibleGroupCount: groups.filter((group) => !group.hiddenByDefault).length,
    hiddenByDefaultGroupCount: groups.filter((group) => group.hiddenByDefault).length,
    quietFutureActivityGroupCount: groups.filter((group) => group.actionability === "quiet_future_activity").length,
    actionableFutureActivitySignalCount: groups
      .filter((group) => /future[_ -]?activity/iu.test(`${group.groupId} ${group.groupLabel} ${group.rootCause}`) && !group.hiddenByDefault)
      .reduce((total, group) => total + group.count, 0),
    rawP1P2SignalCount,
    p1GroupCount: groups.filter((group) => group.severity === "critical" || group.severity === "p0" || group.severity === "p1").length,
    p2GroupCount: groups.filter((group) => group.severity === "p2").length,
    duplicateSignalsCollapsed: Math.max(0, rawSignalCount - groups.length),
  };
}

export function validateDebugSignalGroups(groups: readonly DebugSignalGroup[], rawSignalCount = groups.reduce((total, group) => total + group.count, 0)) {
  const failures: string[] = [];
  const summary = summarizeDebugSignalGroups(groups, rawSignalCount);
  for (const group of groups) {
    if (!group.groupId) failures.push("grouped issue lacks groupId.");
    if (!group.groupLabel) failures.push(`${group.groupId} lacks groupLabel.`);
    if (!group.rootCause) failures.push(`${group.groupId} grouped issue lacks rootCause.`);
    if (!group.nextAction) failures.push(`${group.groupId} grouped issue lacks nextAction.`);
    if (group.examples.length === 0 || group.examples.length > 5) failures.push(`${group.groupId} grouped issue lacks examples or exceeds max examples.`);
    if (group.actionability === "quiet_future_activity" && !group.hiddenByDefault) failures.push(`${group.groupId} quiet future activity is not grouped as hidden.`);
    if ((group.severity === "critical" || group.severity === "p0") && group.count > 1) failures.push(`${group.groupId} unique critical issue gets hidden in group.`);
  }
  if (summary.rawSignalCount > 100 && summary.groupedSignalCount >= summary.rawSignalCount) {
    failures.push("debug panel default shows raw 400+ rows.");
  }
  return failures;
}
