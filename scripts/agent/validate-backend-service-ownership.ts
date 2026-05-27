import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildBackendRouteInventoryReport } from "@/lib/backend-hardening/backend-route-inventory";
import {
  buildBackendServiceOwnershipReport,
  validateBackendServiceOwnershipReport,
} from "@/lib/backend-hardening/backend-service-ownership";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/backend-service-ownership.generated.json";
const DOC_PATH = "docs/agent-truth/backend-service-ownership.md";

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

function renderDoc(report: ReturnType<typeof buildBackendServiceOwnershipReport>) {
  return [
    "# Backend Service Ownership",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Canonical Services",
    "",
    ...report.services.map((service) => `- ${service.serviceName}: cost=${service.costClass}; debug=${service.debugLane}; validator=${service.validator}`),
    "",
    "## Rules",
    "",
    ...report.ownershipRules.map((rule) => `- ${rule}`),
    "",
    "## Gaps",
    "",
    `- Routes missing owner: ${report.routesMissingOwner.length}`,
    `- Routes missing validator: ${report.routesMissingValidator.length}`,
    "",
  ].join("\n");
}

const generatedAtUtc = new Date().toISOString();
const currentHead = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const inventory = buildBackendRouteInventoryReport({ generatedAtUtc, currentHead });
const report = buildBackendServiceOwnershipReport({ generatedAtUtc, currentHead, inventory });
const validation = validateBackendServiceOwnershipReport(report);
write(REPORT_PATH, JSON.stringify({ ...report, validationFailures: validation.failures }));
write(DOC_PATH, renderDoc(report));

const failures = [...validation.failures];
if (lineCount(REPORT_PATH) > 500) failures.push(`${REPORT_PATH} exceeds 500 lines.`);
if (failures.length) {
  console.error("Backend service ownership validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Backend service ownership validation passed.");
