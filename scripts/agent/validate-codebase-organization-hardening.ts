import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildCodebaseOrganizationHardeningSummary,
  validateCodebaseOrganizationHardeningSummary,
  type CodebaseOrganizationHardeningSummary,
} from "@/lib/codebase-hardening/codebase-organization-hardening";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/codebase-organization-hardening.generated.json";
const DOC_PATH = "docs/agent-truth/codebase-organization-hardening.md";

type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function packageScripts() {
  const packageJson = readJson("package.json");
  return packageJson.scripts && typeof packageJson.scripts === "object" && !Array.isArray(packageJson.scripts)
    ? packageJson.scripts as Record<string, string>
    : {};
}

function openPullRequests() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title"]);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Array<{ number?: unknown; title?: unknown }>;
  } catch {
    return [{ number: 0, title: "gh pr list parse failed" }];
  }
}

function renderDoc(report: CodebaseOrganizationHardeningSummary) {
  return [
    "# Codebase Organization Hardening",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    "",
    "This source-only guard requires new limbs to declare body system, feature/surface, route, telemetry, normalizer, metrics, journey, debug, score, cost, legacy alias policy, and validator ownership before they can become canonical.",
    "",
    "## Rules",
    "",
    ...report.rules.map((rule) => `- ${rule.ruleId}: ${rule.subject}; validator=${rule.validator}; fields=${rule.requiredFields.join(", ")}`),
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFiles.length ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PRs",
    "",
    ...(report.openPullRequests.length ? report.openPullRequests.map((pr) => `- #${String(pr.number)} ${String(pr.title)}: ${pr.classification}`) : ["- none"]),
    "",
  ].join("\n");
}

export function buildAndWriteCodebaseOrganizationHardeningSummary() {
  const report = buildCodebaseOrganizationHardeningSummary({
    packageScripts: packageScripts(),
    dirtyFiles: currentDirtyFiles(),
    openPullRequests: openPullRequests(),
  });
  write(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));
  return report;
}

function main() {
  const report = buildAndWriteCodebaseOrganizationHardeningSummary();
  const failures = validateCodebaseOrganizationHardeningSummary(report);
  if (failures.length > 0) {
    console.error(`Codebase organization hardening failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Codebase organization hardening validated: rules=${report.rules.length}, openPrs=${report.openPullRequests.length}.`);
}

if (require.main === module) {
  main();
}
