import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildBackendCostConsolidationReport,
  validateBackendCostConsolidationReport,
} from "@/lib/backend-hardening/backend-cost-consolidation";
import { buildBackendRouteInventoryReport } from "@/lib/backend-hardening/backend-route-inventory";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/backend-cost-consolidation.generated.json";
const DOC_PATH = "docs/agent-truth/backend-cost-consolidation.md";

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function lineCount(path: string) {
  return existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), "utf8").split(/\r?\n/u).length : 0;
}

function renderDoc(report: ReturnType<typeof buildBackendCostConsolidationReport>) {
  return [
    "# Backend Cost Consolidation",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Policy",
    "",
    `- Admin/debug default mode: ${report.adminDebugDefaultMode}`,
    `- Raw drilldown policy: ${report.rawDrilldownPolicy}`,
    `- Non-critical analytics refresh: ${report.nonCriticalAnalyticsRefresh}`,
    `- Realtime policy: ${report.realtimePolicy}`,
    `- Diagnostics policy: ${report.diagnosticsPolicy}`,
    "",
    "## Cost Risks Reduced",
    "",
    ...report.costRisksReduced.map((risk) => `- ${risk}`),
    "",
    "## Top Cost Risks",
    "",
    ...(report.topCostRisks.length ? report.topCostRisks.map((risk) => `- ${risk}`) : ["- none"]),
    "",
  ].join("\n");
}

const generatedAtUtc = new Date().toISOString();
const currentHead = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const inventory = buildBackendRouteInventoryReport({ generatedAtUtc, currentHead });
const report = buildBackendCostConsolidationReport({ generatedAtUtc, currentHead, inventory });
const validation = validateBackendCostConsolidationReport(report);
write(REPORT_PATH, JSON.stringify({ ...report, validationFailures: validation.failures }));
write(DOC_PATH, renderDoc(report));

const failures = [...validation.failures];
if (lineCount(REPORT_PATH) > 500) failures.push(`${REPORT_PATH} exceeds 500 lines.`);
if (failures.length) {
  console.error("Backend cost consolidation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Backend cost consolidation validation passed.");
