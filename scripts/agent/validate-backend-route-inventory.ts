import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildBackendRouteInventoryReport,
  validateBackendRouteInventoryReport,
} from "@/lib/backend-hardening/backend-route-inventory";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/backend-route-inventory.generated.json";
const DOC_PATH = "docs/agent-truth/backend-route-inventory.md";

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

function renderDoc(report: ReturnType<typeof buildBackendRouteInventoryReport>) {
  const topRisks = report.entries
    .filter((entry) => entry.action !== "keep")
    .slice(0, 12)
    .map((entry) => `- ${entry.method} ${entry.routePath}: ${entry.action}; owner=${entry.canonicalServiceOwner}; risk=${entry.productionReadRisk}`);
  return [
    "# Backend Route Inventory",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Routes/functions audited: ${report.backendRoutesAudited}`,
    `- Missing owner: ${report.routesMissingOwner}`,
    `- Missing cost class: ${report.routesMissingCostClass}`,
    `- Unsafe unknowns: ${report.unsafeUnknowns.length}`,
    `- Raw internal-server-error routes reported: ${report.rawInternalServerErrorRoutes.length}`,
    "",
    "## Top Consolidation Risks",
    "",
    ...(topRisks.length ? topRisks : ["- none"]),
    "",
    "## Source Truth",
    "",
    "- Inventory is derived from `src/app/api/**/route.ts` and `functions/src/**/*.ts`.",
    "- It is a guardrail and report lane only; runtime routes do not import generated artifacts.",
    "",
  ].join("\n");
}

const report = buildBackendRouteInventoryReport({
  generatedAtUtc: new Date().toISOString(),
  currentHead: run("git", ["rev-parse", "--short", "HEAD"]) || "unknown",
});
const validation = validateBackendRouteInventoryReport(report);
const compactReport = {
  reportKey: report.reportKey,
  generatedAtUtc: report.generatedAtUtc,
  currentHead: report.currentHead,
  backendRoutesAudited: report.backendRoutesAudited,
  summary: report.summary,
  routesMissingOwner: report.routesMissingOwner,
  routesMissingCostClass: report.routesMissingCostClass,
  rawInternalServerErrorRouteCount: report.rawInternalServerErrorRoutes.length,
  unsafeUnknowns: report.unsafeUnknowns,
  duplicateRouteRisks: report.duplicateRouteRisks,
  routeIndex: report.entries.map((entry) => ({
    routePath: entry.routePath,
    method: entry.method,
    routeClass: entry.routeClass,
    ownerSystem: entry.ownerSystem,
    costClass: entry.costClass,
    canonicalServiceOwner: entry.canonicalServiceOwner,
    action: entry.action,
  })),
  validationFailures: validation.failures,
};
write(REPORT_PATH, JSON.stringify(compactReport));
write(DOC_PATH, renderDoc(report));

const failures = [...validation.failures];
if (lineCount(REPORT_PATH) > 500) failures.push(`${REPORT_PATH} exceeds 500 lines.`);
if (failures.length) {
  console.error("Backend route inventory validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Backend route inventory validation passed.");
