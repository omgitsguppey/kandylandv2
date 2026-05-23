import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACTIVE_SETTINGS_VALIDATORS,
  DEPRECATED_SETTINGS_ARTIFACTS,
  SETTINGS_DEBUG_VALIDATOR_AUTHORITY_VERSION,
  SETTINGS_HEALTH_COMPONENTS,
  SETTINGS_HEALTH_DEBUG_LANE,
  SUPERSEDED_SETTINGS_VALIDATORS,
} from "@/lib/debug/settings-debug-validator-authority";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/settings-debug-validator-authority.generated.json";
const DOC_PATH = "docs/agent-truth/settings-debug-validator-authority.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson<T>(path: string): T {
  return JSON.parse(read(path)) as T;
}

function write(path: string, value: string) {
  const absolutePath = join(ROOT, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, value);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git([...args]).split(/\r?\n/u)) {
      const file = line.trim().replace(/\\/gu, "/");
      if (file) files.add(file);
    }
  }
  return [...files].sort();
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const packageJson = readJson<{ scripts?: Record<string, string> }>("package.json");
  const authority = readJson<{
    validators?: Record<string, { surface?: string; status?: string; packageScripts?: string[] }>;
    packageScripts?: Record<string, { surface?: string; status?: string; validators?: string[] }>;
  }>("agent/context/validator-authority.json");
  const validatorMap = readJson<{
    surfaces?: string[];
    bySurface?: Record<string, string[]>;
    validators?: Record<string, { surface?: string; status?: string; validators?: string[] }>;
  }>("agent/context/validator-map.json");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const settingsSurface = read("src/lib/settings/settings-surface-contract.ts");
  const clientPreferences = read("src/lib/settings/client-preferences-contract.ts");
  const publicBetaScore = read("agent/state/public-beta-score.generated.json");
  const debugBacklog = read("agent/state/debug-backlog-engine.generated.json");
  const refreshRegistry = read("src/lib/agent-score/refresh-registry.ts");

  const activeScripts = ACTIVE_SETTINGS_VALIDATORS.map((validator) => validator.script);
  const activePackageScripts = ACTIVE_SETTINGS_VALIDATORS.map((validator) => validator.packageScript);
  const componentOwnerValidators = ACTIVE_SETTINGS_VALIDATORS.filter((validator) => validator.id !== "settings_debug_validator_authority");
  const activeOwnedComponents = componentOwnerValidators.flatMap((validator) => validator.ownedComponents);
  const duplicateOwnedComponents = duplicateValues(activeOwnedComponents);
  const supersededScripts = SUPERSEDED_SETTINGS_VALIDATORS.map((validator) => validator.script);
  const deprecatedArtifacts = DEPRECATED_SETTINGS_ARTIFACTS.map((artifact) => artifact.artifactPath);
  const activeComponentIds = SETTINGS_HEALTH_COMPONENTS.map((component) => component.id);
  const componentValidators = SETTINGS_HEALTH_COMPONENTS.map((component) => component.activeValidator);
  const missingAuthorityScripts = [...activeScripts, ...supersededScripts].filter((script) => !authority.validators?.[script]);
  const missingAuthorityPackages = [...activePackageScripts, ...SUPERSEDED_SETTINGS_VALIDATORS.map((validator) => validator.packageScript)]
    .filter((script) => !authority.packageScripts?.[script]);
  const missingMapPackages = activePackageScripts.filter((script) => !validatorMap.validators?.[script]);
  const supersededNotMarked = SUPERSEDED_SETTINGS_VALIDATORS.filter((validator) =>
    authority.validators?.[validator.script]?.status !== "superseded"
    || authority.packageScripts?.[validator.packageScript]?.status !== "superseded"
  );
  const hiddenActiveValidators = componentValidators.filter((script) => !activePackageScripts.includes(script));
  const staleArtifactsAffectingScore = deprecatedArtifacts.filter((artifact) =>
    publicBetaScore.includes(artifact)
    || debugBacklog.includes(artifact)
    || refreshRegistry.includes(artifact)
  );
  const protectedChanges = changed.filter((file) =>
    /^src\/app\/dashboard\/chat\//u.test(file)
    || /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/api\/chat\//u.test(file)
    || /^src\/components\/Navigation\//u.test(file)
    || /(^|\/)(TopNav|BottomNav|Navbar)\.(tsx|ts|jsx|js)$/u.test(file)
    || /^src\/app\/api\/(paypal|wallet|payment|checkout)\b/iu.test(file)
    || /^src\/lib\/(paypal|payment|wallet|gumdrop|gumdrops|gumdrop-)/iu.test(file)
  );

  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:settings-debug-validator-authority"] === "tsx scripts/agent/validate-settings-debug-validator-authority.ts",
    contractVersionPresent: SETTINGS_DEBUG_VALIDATOR_AUTHORITY_VERSION === "2026.05.settings-debug-validator-authority.1",
    settingsHealthLaneCanonical: SETTINGS_HEALTH_DEBUG_LANE.laneId === "settings_health"
      && SETTINGS_HEALTH_DEBUG_LANE.label === "Settings health"
      && debugSummary.includes("settings_health")
      && debugSummary.includes("Settings health")
      && debugSummary.includes("SETTINGS_HEALTH_COMPONENTS")
      && settingsSurface.includes('laneId: "settings_health"')
      && clientPreferences.includes('laneId: "settings_health"'),
    noDuplicateDebugSettingsLanes: !debugSummary.includes("settings_connection_health")
      && !settingsSurface.includes("settings_connection_health")
      && !clientPreferences.includes("settings_connection_health"),
    activeValidatorsMapped: missingAuthorityScripts.length === 0
      && missingAuthorityPackages.length === 0
      && missingMapPackages.length === 0
      && validatorMap.surfaces?.includes("settings")
      && validatorMap.bySurface?.settings?.includes("check:settings-debug-validator-authority") === true,
    activeValidatorsHaveAuthority: duplicateOwnedComponents.length === 0
      && activeComponentIds.every((id) => activeOwnedComponents.includes(id)),
    supersededValidatorsMarked: supersededNotMarked.length === 0,
    staleArtifactsExcludedFromScore: staleArtifactsAffectingScore.length === 0,
    activeFailingValidatorNotHidden: hiddenActiveValidators.length === 0
      && componentValidators.every((script) => validatorMap.bySurface?.settings?.includes(script)),
    protectedSurfacesUntouched: protectedChanges.length === 0,
  };

  const failures: string[] = [];
  if (!checks.packageScriptPresent) failures.push("package script check:settings-debug-validator-authority is missing");
  if (!checks.contractVersionPresent) failures.push("settings debug validator authority contract version missing");
  if (!checks.settingsHealthLaneCanonical) failures.push("debug panel has multiple conflicting settings lanes");
  if (!checks.noDuplicateDebugSettingsLanes) failures.push("debug panel has multiple conflicting settings lanes");
  if (!checks.activeValidatorsMapped) failures.push("duplicate active settings validators overlap without authority");
  if (!checks.activeValidatorsHaveAuthority) failures.push("duplicate active settings validators overlap without authority");
  if (!checks.supersededValidatorsMarked) failures.push("superseded validator not marked superseded");
  if (!checks.staleArtifactsExcludedFromScore) failures.push("stale settings artifact still affects score");
  if (!checks.activeFailingValidatorNotHidden) failures.push("active failing validator hidden");
  if (!checks.protectedSurfacesUntouched) failures.push(`protected surfaces changed: ${protectedChanges.join(", ")}`);

  const report = {
    generatedAtUtc,
    currentHead,
    status: failures.length === 0 ? "passed" : "failed",
    version: SETTINGS_DEBUG_VALIDATOR_AUTHORITY_VERSION,
    lane: SETTINGS_HEALTH_DEBUG_LANE,
    activeValidators: ACTIVE_SETTINGS_VALIDATORS,
    supersededValidators: SUPERSEDED_SETTINGS_VALIDATORS,
    deprecatedArtifacts: DEPRECATED_SETTINGS_ARTIFACTS,
    settingsHealthComponents: SETTINGS_HEALTH_COMPONENTS,
    staleArtifactsAffectingScore,
    changedFiles: changed,
    checks,
    failures,
  };

  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, `# Settings Debug Validator Authority

Generated: ${generatedAtUtc}

## Status

${report.status}

## Settings Health Lane

- Lane: \`${SETTINGS_HEALTH_DEBUG_LANE.label}\`
- Source: \`${SETTINGS_HEALTH_DEBUG_LANE.sourceOfTruth}\`
- Raw details default: collapsed

## Active Validators

${ACTIVE_SETTINGS_VALIDATORS.map((validator) => `- \`${validator.packageScript}\` (${validator.id})`).join("\n")}

## Superseded Validators

${SUPERSEDED_SETTINGS_VALIDATORS.map((validator) => `- \`${validator.packageScript}\` superseded by ${validator.supersededBy?.map((script) => `\`${script}\``).join(", ")}`).join("\n")}

## Deprecated Artifacts

${DEPRECATED_SETTINGS_ARTIFACTS.map((artifact) => `- \`${artifact.artifactPath}\` -> ${artifact.scoreAuthority}`).join("\n")}

## Failures

${failures.length > 0 ? failures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`);

  if (failures.length > 0) {
    console.error(`Settings debug validator authority validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log("Settings debug validator authority validation passed.");
}

main();
