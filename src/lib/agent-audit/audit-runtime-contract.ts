export const AUDIT_RUNTIME_LEDGER_PATH = "agent/state/audit-runtime-ledger.jsonl";
export const AUDIT_RUNTIME_SUMMARY_PATH = "agent/state/audit-runtime-summary.generated.json";
export const AUDIT_RUNTIME_DOC_PATH = "docs/agent-truth/audit-runtime-ledger.md";

export const AUDIT_ACCURACY_STATUSES = ["unknown", "confirmed", "false_positive", "superseded"] as const;
export type AuditAccuracyStatus = (typeof AUDIT_ACCURACY_STATUSES)[number];

export const AUDIT_RESOURCE_CLASSES = [
  "static_scan",
  "targeted_test",
  "typecheck",
  "heavy_browser",
  "full_suite",
] as const;
export type AuditResourceClass = (typeof AUDIT_RESOURCE_CLASSES)[number];

export type AuditRuntimeLedgerEntry = {
  runId: string;
  auditName: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  changedFiles: string[];
  inspectedFiles: string[];
  terminalCommands: string[];
  forbiddenCommandsAttempted: string[];
  cacheKey: string;
  cacheHit: boolean;
  findingsCount: number;
  criticalCount: number;
  majorCount: number;
  accuracyStatus: AuditAccuracyStatus;
  resourceClass: AuditResourceClass;
  triggerReason: string;
};

export type AuditRuntimeScoreBreakdown = {
  score: number;
  durationPenalty: number;
  terminalCommandPenalty: number;
  forbiddenCommandPenalty: number;
  inspectedFileCountPenalty: number;
  falsePositivePenalty: number;
  cacheHitBonus: number;
  confirmedFindingBonus: number;
};

export type AuditRuntimeAuditAggregate = {
  auditName: string;
  totalRuns: number;
  latestRunAt: number;
  totalDurationMs: number;
  averageDurationMs: number;
  maxDurationMs: number;
  totalTerminalCommands: number;
  terminalRunRate: number;
  forbiddenCommandCount: number;
  inspectedFileCount: number;
  cacheHits: number;
  cacheHitRate: number;
  findingsCount: number;
  criticalCount: number;
  majorCount: number;
  confirmedFindings: number;
  falsePositiveFindings: number;
  accuracy: number;
  usefulness: number;
  averageSpeedScore: number;
  resourceClasses: AuditResourceClass[];
};

export type AuditRuntimeSummary = {
  generatedAt: number;
  ledgerPath: string;
  totalRuns: number;
  totalAudits: number;
  overallSpeedScore: number;
  accuracy: number;
  usefulness: number;
  slowestAudits: AuditRuntimeAuditAggregate[];
  mostUsefulAudits: AuditRuntimeAuditAggregate[];
  leastUsefulAudits: AuditRuntimeAuditAggregate[];
  mostFalsePositiveAudits: AuditRuntimeAuditAggregate[];
  terminalHeavyAudits: AuditRuntimeAuditAggregate[];
  auditScores: AuditRuntimeAuditAggregate[];
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
};

export const FORBIDDEN_AUDIT_COMMAND_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "playwright", pattern: /\bplaywright\b/iu },
  { id: "lighthouse", pattern: /\blighthouse\b|run-lighthouse-audits/iu },
  { id: "cypress", pattern: /\bcypress\b/iu },
  { id: "full_npm_check", pattern: /^(?:npm\s+run\s+)?check(?:\s|$)/iu },
];

export function normalizeAuditPath(filePath: string) {
  return filePath.replace(/\\/gu, "/").replace(/^\.\//u, "").trim();
}

export function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values.map(normalizeAuditPath).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function createAuditRunId(auditName: string, startedAt: number) {
  const safeAuditName = auditName.replace(/[^a-z0-9:_-]+/giu, "_").replace(/^_+|_+$/gu, "") || "audit";
  return `${safeAuditName}_${startedAt.toString(36)}`;
}

export function createAuditCacheKey(input: {
  auditName: string;
  command: string;
  changedFiles: readonly string[];
  inspectedFiles: readonly string[];
}) {
  const payload = JSON.stringify({
    auditName: input.auditName,
    command: input.command,
    changedFiles: uniqueSorted(input.changedFiles),
    inspectedFiles: uniqueSorted(input.inspectedFiles),
  });

  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `audit:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function detectForbiddenAuditCommands(commands: readonly string[]) {
  const detected: string[] = [];

  for (const command of commands) {
    const normalizedCommand = command.trim();
    for (const forbidden of FORBIDDEN_AUDIT_COMMAND_PATTERNS) {
      if (forbidden.pattern.test(normalizedCommand)) {
        detected.push(`${forbidden.id}:${normalizedCommand}`);
      }
    }
  }

  return uniqueSorted(detected);
}

export function detectAuditResourceClass(auditName: string, command: string): AuditResourceClass {
  const joined = `${auditName} ${command}`.toLowerCase();
  if (/\bplaywright\b|\bcypress\b|\blighthouse\b|run-lighthouse-audits/u.test(joined)) {
    return "heavy_browser";
  }
  if (/^(?:check|npm run check)$/u.test(auditName) || /\bnpm run check(?:\s|$)/u.test(joined)) {
    return "full_suite";
  }
  if (/\btsc\b|typecheck/u.test(joined)) {
    return "typecheck";
  }
  if (/\bvitest\b|\btest:/u.test(joined)) {
    return "targeted_test";
  }
  return "static_scan";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isAuditAccuracyStatus(value: unknown): value is AuditAccuracyStatus {
  return typeof value === "string" && AUDIT_ACCURACY_STATUSES.includes(value as AuditAccuracyStatus);
}

export function isAuditResourceClass(value: unknown): value is AuditResourceClass {
  return typeof value === "string" && AUDIT_RESOURCE_CLASSES.includes(value as AuditResourceClass);
}

export function isAuditRuntimeLedgerEntry(value: unknown): value is AuditRuntimeLedgerEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.runId === "string" &&
    typeof value.auditName === "string" &&
    isFiniteNumber(value.startedAt) &&
    isFiniteNumber(value.endedAt) &&
    isFiniteNumber(value.durationMs) &&
    isStringArray(value.changedFiles) &&
    isStringArray(value.inspectedFiles) &&
    isStringArray(value.terminalCommands) &&
    isStringArray(value.forbiddenCommandsAttempted) &&
    typeof value.cacheKey === "string" &&
    typeof value.cacheHit === "boolean" &&
    isFiniteNumber(value.findingsCount) &&
    isFiniteNumber(value.criticalCount) &&
    isFiniteNumber(value.majorCount) &&
    isAuditAccuracyStatus(value.accuracyStatus) &&
    isAuditResourceClass(value.resourceClass) &&
    typeof value.triggerReason === "string"
  );
}

export function parseAuditRuntimeLedgerLine(line: string, lineNumber = 0) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { entry: null, error: null };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isAuditRuntimeLedgerEntry(parsed)) {
      return { entry: null, error: `Line ${lineNumber} is not an audit runtime ledger entry.` };
    }
    return { entry: parsed, error: null };
  } catch (error) {
    return { entry: null, error: `Line ${lineNumber} is invalid JSON: ${(error as Error).message}` };
  }
}

export function serializeAuditRuntimeLedgerEntry(entry: AuditRuntimeLedgerEntry) {
  return JSON.stringify({
    runId: entry.runId,
    auditName: entry.auditName,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    durationMs: entry.durationMs,
    changedFiles: uniqueSorted(entry.changedFiles),
    inspectedFiles: uniqueSorted(entry.inspectedFiles),
    terminalCommands: uniqueSorted(entry.terminalCommands),
    forbiddenCommandsAttempted: uniqueSorted(entry.forbiddenCommandsAttempted),
    cacheKey: entry.cacheKey,
    cacheHit: entry.cacheHit,
    findingsCount: Math.max(0, Math.trunc(entry.findingsCount)),
    criticalCount: Math.max(0, Math.trunc(entry.criticalCount)),
    majorCount: Math.max(0, Math.trunc(entry.majorCount)),
    accuracyStatus: entry.accuracyStatus,
    resourceClass: entry.resourceClass,
    triggerReason: entry.triggerReason,
  });
}
