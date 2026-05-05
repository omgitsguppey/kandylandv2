import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAuditCacheMetadata,
  evaluateAuditCache,
  readAuditCacheIndex,
  summarizeAuditCacheIndex,
  accuracyStatsForAudit,
} from "../../src/lib/agent-audit/audit-cache";
import { AUDIT_RUNTIME_LEDGER_PATH, parseAuditRuntimeLedgerLine, type AuditRuntimeLedgerEntry } from "../../src/lib/agent-audit/audit-runtime-contract";

const root = process.cwd();

function parseArgs(argv: string[]) {
  const parsed = {
    auditName: "",
    relevantFiles: [] as string[],
    validatorFiles: [] as string[],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index] ?? "";
    const equalsIndex = current.indexOf("=");
    const flag = equalsIndex >= 0 ? current.slice(0, equalsIndex) : current;
    const inlineValue = equalsIndex >= 0 ? current.slice(equalsIndex + 1) : undefined;
    const nextValue = () => inlineValue ?? argv[++index] ?? "";

    switch (flag) {
      case "--audit":
        parsed.auditName = nextValue();
        break;
      case "--relevant":
      case "--files":
        parsed.relevantFiles.push(...splitList(nextValue()));
        break;
      case "--validator":
      case "--validators":
        parsed.validatorFiles.push(...splitList(nextValue()));
        break;
      default:
        if (current.trim()) {
          parsed.relevantFiles.push(current);
        }
    }
  }

  return parsed;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readPackageScripts() {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  return packageJson.scripts ?? {};
}

function readLedgerEntries() {
  const ledgerPath = join(root, AUDIT_RUNTIME_LEDGER_PATH);
  if (!existsSync(ledgerPath)) return [];
  return readFileSync(ledgerPath, "utf8")
    .split(/\r?\n/u)
    .map((line, index) => parseAuditRuntimeLedgerLine(line, index + 1).entry)
    .filter((entry): entry is AuditRuntimeLedgerEntry => Boolean(entry));
}

const args = parseArgs(process.argv.slice(2));
const index = readAuditCacheIndex(root);
const summary = summarizeAuditCacheIndex(index);

if (!args.auditName) {
  console.log(`Audit cache records: ${summary.records}`);
  console.log(`Audit cache hits: ${summary.cacheHits}`);
  console.log(`Commands avoided: ${summary.commandsAvoided}`);
  process.exit(0);
}

const packageScripts = readPackageScripts();
const latestAuditRecord = Object.values(index.records)
  .filter((record) => record.auditName === args.auditName)
  .sort((left, right) => right.createdAt - left.createdAt)[0];
const metadata = buildAuditCacheMetadata({
  root,
  auditName: args.auditName,
  relevantFiles: args.relevantFiles.length > 0 ? args.relevantFiles : latestAuditRecord?.relevantFiles ?? [],
  validatorFiles: args.validatorFiles.length > 0 ? args.validatorFiles : latestAuditRecord?.validatorFiles ?? [],
  relevantPackageJsonScripts: packageScripts[args.auditName] ? { [args.auditName]: packageScripts[args.auditName] } : {},
});
const evaluation = evaluateAuditCache({
  index,
  metadata,
  accuracyStats: accuracyStatsForAudit(readLedgerEntries(), args.auditName),
});

console.log(`Audit: ${args.auditName}`);
console.log(`Cache key: ${metadata.cacheKey}`);
console.log(`Cache status: ${evaluation.valid ? "valid" : "invalid"}`);
console.log(`Reason: ${evaluation.reason}`);
if (evaluation.record) {
  console.log(`Created: ${new Date(evaluation.record.createdAt).toISOString()}`);
  console.log(`Result: ${evaluation.record.resultStatus}`);
  console.log(`Commands avoided: ${evaluation.record.commandsAvoided.length}`);
}
