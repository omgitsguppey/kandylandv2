import { classifyOwnerFromName, readJson, type ValidationResult } from "./config-hardening-shared";

export type PackageScriptCategory =
  | "build"
  | "test"
  | "lint"
  | "score"
  | "release"
  | "validator"
  | "artifact"
  | "dev"
  | "dependency"
  | "unknown";

export type PackageScriptEntry = {
  scriptName: string;
  command: string;
  ownerLane: string;
  category: PackageScriptCategory;
  duplicateOf: string | null;
  supersededBy: string | null;
  requiredForExit: boolean;
  costRisk: "low" | "medium" | "high";
  runtimeRisk: "none" | "source_only" | "provider_or_deploy_risk";
};

export type PackageScriptConsolidationReport = {
  generatedAtUtc: string;
  totalScripts: number;
  scripts: PackageScriptEntry[];
  duplicateAliases: PackageScriptEntry[];
  canonicalExitScripts: string[];
  staleFastLoopScripts: string[];
  releaseDeployRiskScripts: string[];
  scoreScriptsWithoutFreshnessOwner: string[];
  remainingGaps: string[];
};

type PackageJson = { scripts?: Record<string, string> };

function categoryFor(name: string, command: string): PackageScriptCategory {
  if (name.startsWith("check:")) return "validator";
  if (name.startsWith("score:")) return "score";
  if (name.includes("release") || command.includes("release")) return "release";
  if (name.includes("build")) return "build";
  if (name.includes("test") || command.includes("vitest")) return "test";
  if (name.includes("lint") || command.includes("eslint")) return "lint";
  if (name.includes("dev") || name === "start") return "dev";
  if (name.includes("agent") || command.includes("agent/state")) return "artifact";
  if (name.includes("depend") || command.includes("npm audit")) return "dependency";
  return "artifact";
}

function runtimeRisk(command: string) {
  return /(firebase\s+deploy|gcloud|bq\s|paypal|curl\s+https?:)/iu.test(command)
    ? "provider_or_deploy_risk" as const
    : "source_only" as const;
}

export function buildPackageScriptConsolidationReport(options: { generatedAtUtc?: string } = {}): PackageScriptConsolidationReport {
  const packageJson = readJson<PackageJson>("package.json", {});
  const scripts = packageJson.scripts || {};
  const commandOwner = new Map<string, string>();
  const entries = Object.entries(scripts).map(([scriptName, command]) => {
    const normalizedCommand = command.replace(/\s+/gu, " ").trim();
    const duplicateOf = commandOwner.get(normalizedCommand) || null;
    if (!duplicateOf) commandOwner.set(normalizedCommand, scriptName);
    const category = categoryFor(scriptName, command);
    return {
      scriptName,
      command,
      ownerLane: classifyOwnerFromName(`${scriptName} ${command}`),
      category,
      duplicateOf,
      supersededBy: duplicateOf,
      requiredForExit: [
        "score:beta",
        "check:beta-score",
        "check:current-beta-exit-status",
        "check:release-notes",
        "typecheck",
      ].includes(scriptName),
      costRisk: /(playwright|cypress|lighthouse|firebase|gcloud|bq|deploy)/iu.test(command) ? "high" : category === "score" ? "medium" : "low",
      runtimeRisk: runtimeRisk(command),
    } satisfies PackageScriptEntry;
  });
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    totalScripts: entries.length,
    scripts: entries,
    duplicateAliases: entries.filter((entry) => entry.duplicateOf),
    canonicalExitScripts: entries.filter((entry) => entry.requiredForExit).map((entry) => entry.scriptName),
    staleFastLoopScripts: [],
    releaseDeployRiskScripts: entries
      .filter((entry) => entry.category === "release" && entry.runtimeRisk === "provider_or_deploy_risk")
      .map((entry) => entry.scriptName),
    scoreScriptsWithoutFreshnessOwner: entries
      .filter((entry) => entry.category === "score" && !entry.command.includes("score-") && !entry.command.includes("score:"))
      .map((entry) => entry.scriptName),
    remainingGaps: entries.filter((entry) => entry.duplicateOf).length
      ? ["Duplicate aliases are classified; retire only when existing callers are updated."]
      : ["No duplicate package script aliases found."],
  };
}

export function validatePackageScriptConsolidationReport(report: PackageScriptConsolidationReport): ValidationResult {
  const failures: string[] = [];
  if (report.scripts.some((entry) => entry.ownerLane === "unknown")) failures.push("package script added without owner");
  if (report.releaseDeployRiskScripts.length > 0) failures.push("release/build script can call provider/deploy unexpectedly");
  if (report.staleFastLoopScripts.length > 0) failures.push("stale validator remains in required fast loop");
  if (report.scoreScriptsWithoutFreshnessOwner.length > 0) failures.push("score script lacks current-head artifact policy");
  return { ok: failures.length === 0, failures, warnings: report.remainingGaps };
}
