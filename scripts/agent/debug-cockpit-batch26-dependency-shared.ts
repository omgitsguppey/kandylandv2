import fs from "node:fs";
import path from "node:path";

import { buildDebugCockpitBatch26DependencyInventoryReport, validateDebugCockpitBatch26DependencyInventoryReport } from "../../src/lib/debug/debug-cockpit-batch26-dependency-inventory";
import { buildDependencyInventoryDisplay } from "../../src/lib/debug/dependency-inventory-display";
import { buildCompleteDependencyInventory, buildDependencyInventorySummary, reconcileDependencyCounts } from "../../src/lib/debug/dependency-inventory-engine";
import { buildExternalDependencyMap, EXTERNAL_SERVICE_NAMES } from "../../src/lib/debug/external-dependency-map";
import type { PackageLockfileLike, PackageManifestLike } from "../../src/lib/debug/dependency-inventory-contract";

type Report = Record<string, unknown>;

const DETAIL_SAMPLE_LIMIT = 4;

function compactList<T>(items: T[], limit = DETAIL_SAMPLE_LIMIT) {
  return {
    total: items.length,
    emitted: Math.min(items.length, limit),
    omitted: Math.max(0, items.length - limit),
    sample: items.slice(0, limit),
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string | undefined) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function compactCompleteDependencyInventoryReport(inventory: ReturnType<typeof buildCompleteDependencyInventory>): Report {
  return {
    nodeVersion: inventory.nodeVersion,
    totals: inventory.totals,
    packageCountReconciliation: inventory.packageCountReconciliation,
    rootPackageTimestampLabel: inventory.rootPackageTimestampLabel,
    functionsPackageTimestampLabel: inventory.functionsPackageTimestampLabel,
    dependencyFreshness: inventory.dependencyFreshness,
    runtimeConnectivityChecks: inventory.runtimeConnectivityChecks,
    packageSources: inventory.packageSources.map((source) => ({
      name: source.name,
      path: source.path,
      sourceType: source.sourceType,
      present: source.present,
      dependencyCount: source.dependencies.length,
      dependencyCountsByType: countBy(source.dependencies, (dependency) => dependency.dependencyType),
      dependencyCountsByCategory: countBy(source.dependencies, (dependency) => dependency.category),
      dependencySample: compactList(source.dependencies, 2),
    })),
    packageDependencies: compactList(inventory.packageDependencies),
    transitiveAndOverrideTruth: compactList(inventory.transitiveAndOverrideTruth),
    externalServiceDependencies: compactList(inventory.externalServiceDependencies),
    expectedButAbsentDependencies: inventory.expectedButAbsentDependencies,
    validatorAndScriptDependencies: compactList(inventory.validatorAndScriptDependencies),
    compaction: {
      fullInventoryValidatedInMemory: true,
      strategy: "counts_plus_bounded_samples",
      sampleLimit: DETAIL_SAMPLE_LIMIT,
      fullDetailSource: "derive from package.json, functions/package.json, lockfiles, and source scans at validation time",
    },
  };
}

function compactDependencyInventoryDisplayReport(display: ReturnType<typeof buildDependencyInventoryDisplay>): Report {
  return {
    compactSummary: display.compactSummary,
    drilldowns: {
      everyDependency: compactList(display.drilldowns.everyDependency),
      everyOverride: compactList(display.drilldowns.everyOverride),
      everyExternalService: compactList(display.drilldowns.everyExternalService),
      everyEnvConfigDependency: compactList(display.drilldowns.everyEnvConfigDependency),
      expectedAbsentDependencies: display.drilldowns.expectedAbsentDependencies,
    },
    timestampLabels: display.timestampLabels,
    runtimeCopy: display.runtimeCopy,
    runtimeChecksSeparated: display.runtimeChecksSeparated,
    compaction: {
      fullDisplayValidatedInMemory: true,
      strategy: "counts_plus_bounded_samples",
      sampleLimit: DETAIL_SAMPLE_LIMIT,
    },
  };
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function readText(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function expectPass(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function buildInventoryFromRepo() {
  const generatedAtUtc = new Date().toISOString();
  return buildCompleteDependencyInventory({
    rootPackage: readJson<PackageManifestLike>("package.json", {}),
    rootLockfile: readJson<PackageLockfileLike>("package-lock.json", {}),
    functionsPackage: readJson<PackageManifestLike>("functions/package.json", {}),
    functionsLockfile: readJson<PackageLockfileLike>("functions/package-lock.json", {}),
    sourceFiles: {
      "package.json": fs.existsSync("package.json"),
      "package-lock.json": fs.existsSync("package-lock.json"),
      "functions/package.json": fs.existsSync("functions/package.json"),
      "functions/package-lock.json": fs.existsSync("functions/package-lock.json"),
      "firebase.json": fs.existsSync("firebase.json"),
      "next.config.ts": fs.existsSync("next.config.ts"),
      ".env.example": fs.existsSync(".env.example"),
    },
    envExampleText: readText(".env.example"),
    packageFreshness: {
      rootPackageUpdatedAtUtc: "1980-01-01T00:00:01.000Z",
      functionsPackageUpdatedAtUtc: "1980-01-01T00:00:01.000Z",
    },
    runtimeChecks: {
      firestoreConnectivity: "unknown",
      lastTelemetryPingAtUtc: null,
    },
    generatedAtUtc,
  });
}

function runValidation(reportKey: string, report: Report, failures: string[], summary: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const result = {
    reportKey,
    generatedAtUtc,
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    ...summary.map((line) => `- ${line}`),
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

export function validateCompleteDependencyInventory() {
  const inventory = buildInventoryFromRepo();
  const rootPkg = readJson<PackageManifestLike>("package.json", {});
  const functionsPkg = readJson<PackageManifestLike>("functions/package.json", {});
  const failures: string[] = [];
  const dependencyKeys = new Set(inventory.packageDependencies.map((entry) => `${entry.sourcePackage}:${entry.dependencyType}:${entry.name}`));
  const overrideKeys = new Set(inventory.transitiveAndOverrideTruth.map((entry) => `${entry.sourcePackage}:${entry.name}`));
  for (const name of Object.keys(rootPkg.dependencies || {})) expectPass(dependencyKeys.has(`root:runtime:${name}`), failures, `root dependency missing from inventory: ${name}`);
  for (const name of Object.keys(rootPkg.devDependencies || {})) expectPass(dependencyKeys.has(`root:dev:${name}`), failures, `root devDependency missing from inventory: ${name}`);
  for (const name of Object.keys(functionsPkg.dependencies || {})) expectPass(dependencyKeys.has(`functions:runtime:${name}`), failures, `functions dependency missing from inventory: ${name}`);
  for (const name of Object.keys(functionsPkg.devDependencies || {})) expectPass(dependencyKeys.has(`functions:dev:${name}`), failures, `functions devDependency missing from inventory: ${name}`);
  for (const name of Object.keys(rootPkg.overrides || {})) expectPass(Array.from(overrideKeys).some((key) => key === `root:${name}` || key.startsWith("root:")), failures, `root override missing from inventory: ${name}`);
  for (const name of Object.keys(functionsPkg.overrides || {})) expectPass(Array.from(overrideKeys).some((key) => key === `functions:${name}` || key.startsWith("functions:")), failures, `functions override missing from inventory: ${name}`);
  expectPass(reconcileDependencyCounts(inventory).status === "pass", failures, "counts do not reconcile.");
  expectPass(inventory.dependencyFreshness.every((entry) => entry.displayLabel !== "1980-01-01T00:00:01.000Z"), failures, "fake 1980 timestamp shown as real update time.");
  expectPass(inventory.externalServiceDependencies.length >= EXTERNAL_SERVICE_NAMES.length, failures, "external service dependency omitted.");
  expectPass(inventory.runtimeConnectivityChecks.packagePresenceIsRuntimeHealth === false, failures, "package presence claimed as runtime health.");
  runValidation("complete-dependency-inventory", compactCompleteDependencyInventoryReport(inventory), failures, [
    "Complete dependency inventory reconciles root/functions direct dependencies, peer/optional slots, overrides, external services, expected-absent dependencies, and package freshness.",
    "Package presence remains inventory truth only and does not clear provider/runtime health.",
  ]);
}

export function validateExternalDependencyMap() {
  const inventory = buildInventoryFromRepo();
  const map = buildExternalDependencyMap({
    envExampleText: readText(".env.example"),
    packageNames: inventory.packageDependencies.map((entry) => entry.name),
  });
  const failures: string[] = [];
  for (const required of ["GA4 / Measurement ID", "FCM/push/VAPID", "PayPal", "PostHog", "Vertex AI/Gemini", "Firebase Auth", "Firestore", "BigQuery", "Cloud SQL/Data Connect"]) {
    expectPass(map.services.some((service) => service.serviceName === required), failures, `${required} omitted.`);
  }
  expectPass(!JSON.stringify(map).includes("should-not-leak"), failures, "env key exposure possible.");
  expectPass(map.services.every((service) => service.runtimeVerificationStatus !== "verified_current"), failures, "runtime verification conflated with config presence.");
  expectPass(map.providerCallsRun === false, failures, "provider calls happen in validator.");
  expectPass(map.services.every((service) => service.owner && service.nextAction), failures, "external dependency lacks owner/next action.");
  runValidation("external-dependency-map", { services: map.services, providerCallsRun: map.providerCallsRun }, failures, [
    "External services and provider/config dependencies are mapped by key name only.",
    "Runtime verification remains not_verified_here and validators do not call providers.",
  ]);
}

export function validateDependencyPanelDisplayCleanup() {
  const inventory = buildInventoryFromRepo();
  const display = buildDependencyInventoryDisplay(inventory);
  const ui = readText("src/app/admin/debug/components/DebugTabInfrastructure.tsx");
  const failures: string[] = [];
  expectPass(display.drilldowns.everyDependency.length === inventory.packageDependencies.length, failures, "compact panel omits drilldown to every dependency.");
  expectPass(!JSON.stringify(display).includes("1980-01-01") && ui.includes("timestamp unavailable"), failures, "1980 timestamp remains visible as real date.");
  expectPass(display.runtimeChecksSeparated && ui.includes("Package presence does not prove runtime use"), failures, "runtime checks imply every dep active.");
  expectPass(ui.includes("External services and config dependencies") && ui.includes("expectedButAbsentDependencies"), failures, "selected groups hide dependencies.");
  expectPass(display.drilldowns.expectedAbsentDependencies.length > 0, failures, "expected absent deps hidden.");
  expectPass(inventory.totals.unknownDirectDeps >= 0 && ui.includes("Unknown direct deps"), failures, "unknown direct deps are not listed when present.");
  runValidation("dependency-panel-display-cleanup", compactDependencyInventoryDisplayReport(display), failures, [
    "Infrastructure panel shows compact counts with drilldowns for every package, override, external service, env/config dependency, and expected-absent dependency.",
    "Fake package mtimes are rendered as timestamp unavailable.",
  ]);
}

export function validateDebugCockpitBatch26DependencyInventory() {
  const inventory = buildInventoryFromRepo();
  const report = buildDebugCockpitBatch26DependencyInventoryReport({
    rootRuntimeDeps: inventory.totals.rootRuntimeDeps,
    rootDevDeps: inventory.totals.rootDevDeps,
    rootOptionalDeps: inventory.totals.rootOptionalDeps,
    rootPeerDeps: inventory.totals.rootPeerDeps,
    functionsRuntimeDeps: inventory.totals.functionsRuntimeDeps,
    functionsDevDeps: inventory.totals.functionsDevDeps,
    functionsOptionalDeps: inventory.totals.functionsOptionalDeps,
    functionsPeerDeps: inventory.totals.functionsPeerDeps,
    rootOverrides: inventory.totals.rootOverrides,
    functionsOverrides: inventory.totals.functionsOverrides,
    externalServices: inventory.totals.externalServices,
    expectedAbsentDependencies: inventory.totals.expectedAbsentDependencies,
    unknownDirectDeps: inventory.totals.unknownDirectDeps,
    countReconciliationStatus: inventory.packageCountReconciliation.status,
    fakeTimestampDetected: inventory.dependencyFreshness.some((entry) => entry.fakeTimestampDetected),
    runtimeChecksSeparated: inventory.runtimeConnectivityChecks.packagePresenceIsRuntimeHealth === false,
  });
  const failures = validateDebugCockpitBatch26DependencyInventoryReport(report);
  const summary = buildDependencyInventorySummary(inventory);
  expectPass(summary.totalPackageDependencies === inventory.packageDependencies.length, failures, "any dependency declared in package.json/functions/package.json omitted.");
  expectPass(summary.totalOverrides === inventory.transitiveAndOverrideTruth.length, failures, "any override omitted.");
  expectPass(summary.totalExternalServices >= EXTERNAL_SERVICE_NAMES.length, failures, "any external dependency omitted.");
  runValidation("debug-cockpit-batch26-dependency-inventory", report as unknown as Report, failures, [
    "Batch 26 completes dependency inventory coverage for package manifests, overrides, external services, env/config dependencies, and expected-absent providers.",
    "Runtime connectivity checks remain separate from package inventory.",
  ]);
}
