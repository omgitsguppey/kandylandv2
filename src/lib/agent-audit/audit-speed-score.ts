import {
  type AuditRuntimeAuditAggregate,
  type AuditRuntimeLedgerEntry,
  type AuditRuntimeScoreBreakdown,
  type AuditRuntimeSummary,
  AUDIT_RUNTIME_LEDGER_PATH,
  uniqueSorted,
} from "./audit-runtime-contract";

export function clampAuditScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function calculateInspectedFileCountPenalty(inspectedFileCount: number) {
  if (inspectedFileCount <= 20) return 0;
  if (inspectedFileCount <= 75) return 5;
  if (inspectedFileCount <= 200) return 12;
  return 25;
}

export function calculateAuditUsefulness(entry: AuditRuntimeLedgerEntry) {
  const findingsCount = Math.max(0, entry.findingsCount);
  const criticalCount = Math.max(0, entry.criticalCount);
  const majorCount = Math.max(0, entry.majorCount);
  const minorCount = Math.max(0, findingsCount - criticalCount - majorCount);
  const criticalFindingsConfirmed = entry.accuracyStatus === "confirmed" ? criticalCount : 0;
  const majorFindingsConfirmed = entry.accuracyStatus === "confirmed" ? majorCount : 0;
  const minorFindingsConfirmed = entry.accuracyStatus === "confirmed" ? minorCount : 0;
  const falsePositiveFindings = entry.accuracyStatus === "false_positive" ? findingsCount : 0;

  return (
    criticalFindingsConfirmed * 5 +
    majorFindingsConfirmed * 2 +
    minorFindingsConfirmed -
    falsePositiveFindings * 2 -
    entry.durationMs / 30_000
  );
}

export function calculateAuditAccuracy(entries: readonly AuditRuntimeLedgerEntry[]) {
  const confirmedFindings = entries
    .filter((entry) => entry.accuracyStatus === "confirmed")
    .reduce((total, entry) => total + Math.max(0, entry.findingsCount), 0);
  const falsePositiveFindings = entries
    .filter((entry) => entry.accuracyStatus === "false_positive")
    .reduce((total, entry) => total + Math.max(0, entry.findingsCount), 0);

  return confirmedFindings / Math.max(1, confirmedFindings + falsePositiveFindings);
}

export function calculateAuditSpeedScore(entry: AuditRuntimeLedgerEntry): AuditRuntimeScoreBreakdown {
  const terminalCommandCount = entry.terminalCommands.length;
  const forbiddenCommandCount = entry.forbiddenCommandsAttempted.length;
  const inspectedFileCountPenalty = calculateInspectedFileCountPenalty(entry.inspectedFiles.length);
  const durationPenalty = Math.min(40, entry.durationMs / 1000);
  const terminalCommandPenalty = terminalCommandCount * 4;
  const forbiddenCommandPenalty = forbiddenCommandCount * 25;
  const falsePositivePenalty =
    entry.accuracyStatus === "false_positive" ? Math.min(30, Math.max(10, entry.findingsCount * 10)) : 0;
  const cacheHitBonus = entry.cacheHit
    ? (entry.terminalCommands.length === 0 ? 10 : 0) + (entry.inspectedFiles.length === 0 ? 5 : 0)
    : 0;
  const confirmedFindingBonus =
    entry.accuracyStatus === "confirmed"
      ? Math.min(
          15,
          entry.criticalCount * 5 + entry.majorCount * 2 + Math.max(0, entry.findingsCount - entry.criticalCount - entry.majorCount),
        )
      : 0;
  const score = clampAuditScore(
    100 -
      durationPenalty -
      terminalCommandPenalty -
      forbiddenCommandPenalty -
      inspectedFileCountPenalty -
      falsePositivePenalty +
      cacheHitBonus +
      confirmedFindingBonus,
  );

  return {
    score: round(score),
    durationPenalty: round(durationPenalty),
    terminalCommandPenalty,
    forbiddenCommandPenalty,
    inspectedFileCountPenalty,
    falsePositivePenalty,
    cacheHitBonus,
    confirmedFindingBonus,
  };
}

export function summarizeAuditRuntime(
  entries: readonly AuditRuntimeLedgerEntry[],
  options: { generatedAt?: number; ledgerPath?: string; limit?: number } = {},
): AuditRuntimeSummary {
  const limit = options.limit ?? 10;
  const grouped = new Map<string, AuditRuntimeLedgerEntry[]>();

  for (const entry of entries) {
    const existing = grouped.get(entry.auditName) ?? [];
    existing.push(entry);
    grouped.set(entry.auditName, existing);
  }

  const auditScores: AuditRuntimeAuditAggregate[] = Array.from(grouped.entries()).map(([auditName, auditEntries]) => {
    const totalRuns = auditEntries.length;
    const totalDurationMs = auditEntries.reduce((total, entry) => total + entry.durationMs, 0);
    const speedScoreTotal = auditEntries.reduce((total, entry) => total + calculateAuditSpeedScore(entry).score, 0);
    const confirmedFindings = auditEntries
      .filter((entry) => entry.accuracyStatus === "confirmed")
      .reduce((total, entry) => total + entry.findingsCount, 0);
    const falsePositiveFindings = auditEntries
      .filter((entry) => entry.accuracyStatus === "false_positive")
      .reduce((total, entry) => total + entry.findingsCount, 0);
    const terminalRuns = auditEntries.filter((entry) => entry.terminalCommands.length > 0).length;

    return {
      auditName,
      totalRuns,
      latestRunAt: Math.max(...auditEntries.map((entry) => entry.endedAt)),
      totalDurationMs: round(totalDurationMs),
      averageDurationMs: round(totalDurationMs / totalRuns),
      maxDurationMs: Math.max(...auditEntries.map((entry) => entry.durationMs)),
      totalTerminalCommands: auditEntries.reduce((total, entry) => total + entry.terminalCommands.length, 0),
      terminalRunRate: round(terminalRuns / totalRuns),
      forbiddenCommandCount: auditEntries.reduce((total, entry) => total + entry.forbiddenCommandsAttempted.length, 0),
      inspectedFileCount: Math.max(...auditEntries.map((entry) => entry.inspectedFiles.length)),
      cacheHits: auditEntries.filter((entry) => entry.cacheHit).length,
      cacheHitRate: round(auditEntries.filter((entry) => entry.cacheHit).length / totalRuns),
      findingsCount: auditEntries.reduce((total, entry) => total + entry.findingsCount, 0),
      criticalCount: auditEntries.reduce((total, entry) => total + entry.criticalCount, 0),
      majorCount: auditEntries.reduce((total, entry) => total + entry.majorCount, 0),
      confirmedFindings,
      falsePositiveFindings,
      accuracy: round(confirmedFindings / Math.max(1, confirmedFindings + falsePositiveFindings)),
      usefulness: round(auditEntries.reduce((total, entry) => total + calculateAuditUsefulness(entry), 0)),
      averageSpeedScore: round(speedScoreTotal / totalRuns),
      resourceClasses: uniqueSorted(auditEntries.map((entry) => entry.resourceClass)) as AuditRuntimeAuditAggregate["resourceClasses"],
    };
  });

  const totalRuns = entries.length;
  const speedScoreTotal = entries.reduce((total, entry) => total + calculateAuditSpeedScore(entry).score, 0);
  const cacheHits = entries.filter((entry) => entry.cacheHit).length;
  const sortByDuration = [...auditScores].sort((a, b) => b.averageDurationMs - a.averageDurationMs || b.maxDurationMs - a.maxDurationMs);
  const sortByUsefulness = [...auditScores].sort((a, b) => b.usefulness - a.usefulness || b.averageSpeedScore - a.averageSpeedScore);
  const sortByFalsePositives = [...auditScores].sort(
    (a, b) => b.falsePositiveFindings - a.falsePositiveFindings || a.averageSpeedScore - b.averageSpeedScore,
  );
  const sortByTerminal = [...auditScores].sort(
    (a, b) => b.terminalRunRate - a.terminalRunRate || b.totalTerminalCommands - a.totalTerminalCommands,
  );

  return {
    generatedAt: options.generatedAt ?? Date.now(),
    ledgerPath: options.ledgerPath ?? AUDIT_RUNTIME_LEDGER_PATH,
    totalRuns,
    totalAudits: auditScores.length,
    overallSpeedScore: round(totalRuns > 0 ? speedScoreTotal / totalRuns : 100),
    accuracy: round(calculateAuditAccuracy(entries)),
    usefulness: round(entries.reduce((total, entry) => total + calculateAuditUsefulness(entry), 0)),
    slowestAudits: sortByDuration.slice(0, limit),
    mostUsefulAudits: sortByUsefulness.slice(0, limit),
    leastUsefulAudits: [...sortByUsefulness].reverse().slice(0, limit),
    mostFalsePositiveAudits: sortByFalsePositives.slice(0, limit),
    terminalHeavyAudits: sortByTerminal.slice(0, limit),
    auditScores: [...auditScores].sort((a, b) => a.auditName.localeCompare(b.auditName)),
    cacheStats: {
      hits: cacheHits,
      misses: totalRuns - cacheHits,
      hitRate: round(totalRuns > 0 ? cacheHits / totalRuns : 0),
    },
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
