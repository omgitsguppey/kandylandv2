import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  AUDIT_RUNTIME_LEDGER_PATH,
  AUDIT_RUNTIME_SUMMARY_PATH,
  parseAuditRuntimeLedgerLine,
  type AuditRuntimeAuditAggregate,
  type AuditRuntimeLedgerEntry,
} from "../../src/lib/agent-audit/audit-runtime-contract";
import { calculateAuditSpeedScore, summarizeAuditRuntime } from "../../src/lib/agent-audit/audit-speed-score";
import { readAuditCacheIndex, summarizeAuditCacheIndex } from "../../src/lib/agent-audit/audit-cache";

const root = process.cwd();

function readLedgerEntries() {
  const ledgerPath = join(root, AUDIT_RUNTIME_LEDGER_PATH);
  if (!existsSync(ledgerPath)) return [];

  const failures: string[] = [];
  const entries = readFileSync(ledgerPath, "utf8")
    .split(/\r?\n/u)
    .map((line, index) => {
      const parsed = parseAuditRuntimeLedgerLine(line, index + 1);
      if (parsed.error) failures.push(parsed.error);
      return parsed.entry;
    })
    .filter((entry): entry is AuditRuntimeLedgerEntry => Boolean(entry));

  if (failures.length > 0) {
    throw new Error(`Audit runtime ledger is invalid:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  }

  return entries;
}

function writeSummary(entries: AuditRuntimeLedgerEntry[]) {
  const summary = summarizeAuditRuntime(entries);
  const summaryPath = join(root, AUDIT_RUNTIME_SUMMARY_PATH);
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

function printSummary(entries: AuditRuntimeLedgerEntry[]) {
  const summary = writeSummary(entries);
  console.log(`Audit runtime score: ${summary.overallSpeedScore}/100`);
  console.log(`Runs: ${summary.totalRuns}; audits: ${summary.totalAudits}; accuracy: ${summary.accuracy}; usefulness: ${summary.usefulness}`);
  const cacheSummary = summarizeAuditCacheIndex(readAuditCacheIndex(root));
  console.log(
    `Audit cache: ${cacheSummary.records} records; ${cacheSummary.cacheHits} hits; ${cacheSummary.commandsAvoided} commands avoided.`,
  );

  printAuditList("Slowest audits", summary.slowestAudits, (audit) => `${audit.averageDurationMs}ms avg, ${audit.maxDurationMs}ms max`);
  printAuditList("Most useful audits", summary.mostUsefulAudits, (audit) => `usefulness ${audit.usefulness}`);
  printAuditList("Least useful audits", summary.leastUsefulAudits, (audit) => `usefulness ${audit.usefulness}`);
  printAuditList("Most false-positive audits", summary.mostFalsePositiveAudits, (audit) => `${audit.falsePositiveFindings} false-positive findings`);
  printAuditList("Terminal-heavy audits", summary.terminalHeavyAudits, (audit) => `${audit.totalTerminalCommands} terminal commands`);

  if (entries.length > 0) {
    const latest = entries[entries.length - 1];
    console.log(
      `Latest run: ${latest.auditName} scored ${calculateAuditSpeedScore(latest).score}/100 over ${latest.durationMs}ms.`,
    );
  }
}

function printAuditList(
  title: string,
  audits: AuditRuntimeAuditAggregate[],
  detail: (audit: AuditRuntimeAuditAggregate) => string,
) {
  console.log(`\n${title}:`);
  if (audits.length === 0) {
    console.log("- none");
    return;
  }
  for (const audit of audits.slice(0, 5)) {
    console.log(`- ${audit.auditName}: ${detail(audit)}, speed ${audit.averageSpeedScore}/100, runs ${audit.totalRuns}`);
  }
}

try {
  const ledgerPath = join(root, AUDIT_RUNTIME_LEDGER_PATH);
  if (!existsSync(ledgerPath)) {
    mkdirSync(dirname(ledgerPath), { recursive: true });
    writeFileSync(ledgerPath, "");
  }
  printSummary(readLedgerEntries());
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
