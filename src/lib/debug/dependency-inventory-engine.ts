import type {
  CompleteDependencyInventory,
  DependencyFreshnessEntry,
  DependencyGroup,
  DependencyGroupKey,
  DependencyInventoryEntry,
  DependencySourcePackage,
  DependencyType,
  ExpectedAbsentDependency,
  ExpectedAbsentStatus,
  OverrideTruthEntry,
  PackageLockfileLike,
  PackageManifestLike,
  PackageSourceInventory,
  RuntimeConnectivityChecks,
  ValidatorAndScriptDependency,
} from "@/lib/debug/dependency-inventory-contract";
import { buildExternalDependencyMap } from "@/lib/debug/external-dependency-map";

export type CompleteDependencyInventoryInput = {
  rootPackage?: PackageManifestLike;
  rootLockfile?: PackageLockfileLike;
  functionsPackage?: PackageManifestLike;
  functionsLockfile?: PackageLockfileLike;
  sourceFiles?: Record<string, boolean>;
  envExampleText?: string;
  runtimeChecks?: {
    firestoreConnectivity?: "live" | "failed" | "unknown";
    lastTelemetryPingAtUtc?: string | null;
  };
  packageFreshness?: {
    rootPackageUpdatedAtUtc?: string | null;
    functionsPackageUpdatedAtUtc?: string | null;
  };
  generatedAtUtc?: string;
  nodeVersion?: string;
};

const GROUP_LABELS: Record<DependencyGroupKey, string> = {
  framework: "Framework / runtime",
  react_ui_design: "React / UI / design",
  forms_validation: "Forms / validation",
  firebase_google: "Firebase / Google",
  functions_cloud: "Functions / Cloud",
  payments: "Payments",
  analytics_telemetry: "Analytics / telemetry",
  ai_model_providers: "AI / model providers",
  pwa_push: "PWA / push",
  testing_qa: "Testing / QA",
  build_dev: "Build / dev",
  agent_repo_tooling: "Agent / repo tooling",
  security_overrides: "Security / overrides",
  storage_media_image: "Storage / media / image",
  data_sql_warehouse: "Data / SQL / warehouse",
  utilities: "Utilities",
  unknown_other: "Unknown / other",
};

export function classifyDependencyGroup(packageName: string): DependencyGroupKey {
  const name = packageName.toLowerCase();
  if (["next", "react", "react-dom", "server-only", "@next/third-parties"].includes(name)) return "framework";
  if (name.includes("radix") || name.includes("lucide") || name.includes("tailwind") || name.includes("framer") || name.includes("recharts") || name.includes("embla") || name.includes("skeleton") || name.includes("sonner") || name.includes("canvas-confetti")) return "react_ui_design";
  if (name.includes("hookform") || name.includes("zod")) return "forms_validation";
  if (name.includes("firebase") || name.includes("google-auth") || name === "google-gax") return "firebase_google";
  if (name.includes("functions-framework") || name.includes("firebase-functions")) return "functions_cloud";
  if (name.includes("paypal")) return "payments";
  if (name.includes("posthog") || name.includes("analytics") || name.includes("ga4")) return "analytics_telemetry";
  if (name.includes("vertex") || name.includes("gemini") || name.includes("openai")) return "ai_model_providers";
  if (name.includes("vapid") || name.includes("web-push")) return "pwa_push";
  if (name.includes("vitest") || name.includes("playwright") || name.includes("cypress") || name.includes("puppeteer") || name.includes("storybook") || name.includes("testing-library") || name.includes("axe") || name === "msw" || name === "happy-dom") return "testing_qa";
  if (name.includes("eslint") || name === "vite" || name === "tsx" || name === "typescript" || name === "postcss" || name === "esbuild" || name === "cross-env" || name === "dotenv") return "build_dev";
  if (name.includes("dependency-cruiser") || name.includes("knip") || name.includes("syncpack") || name.includes("ast-grep") || name.includes("npm-check-updates") || name.includes("madge") || name.includes("ts-morph") || name.includes("firebase-tools")) return "agent_repo_tooling";
  if (name.includes("dompurify") || name.includes("brace-expansion") || name.includes("picomatch") || name.includes("path-to-regexp") || name.includes("protobufjs") || name.includes("minimatch") || name.includes("ajv")) return "security_overrides";
  if (name.includes("storage") || name.includes("image") || name.includes("canvas")) return "storage_media_image";
  if (name.includes("bigquery") || name.includes("cloud-sql") || name.includes("dataconnect")) return "data_sql_warehouse";
  if (name === "clsx" || name === "date-fns" || name === "destr" || name === "es-toolkit" || name === "tailwind-merge" || name === "lodash" || name === "yaml" || name === "smol-toml" || name === "basic-ftp" || name === "flat-cache") return "utilities";
  return "unknown_other";
}

function readInstalledVersion(lockfile: PackageLockfileLike | undefined, packageName: string) {
  return lockfile?.packages?.[`node_modules/${packageName}`]?.version;
}

function dependencyEntries(
  sourcePackage: DependencySourcePackage,
  dependencyType: DependencyType,
  source: Record<string, string> | undefined,
  lockfile: PackageLockfileLike | undefined,
): DependencyInventoryEntry[] {
  return Object.entries(source || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, declaredVersion]) => {
      const installedVersion = readInstalledVersion(lockfile, name);
      return {
        name,
        declaredVersion,
        sourcePackage,
        dependencyType,
        installedVersion,
        installedVersionState: installedVersion ? "from_lockfile" : "not_installed",
        direct: true as const,
        category: classifyDependencyGroup(name),
      };
    });
}

function flattenOverrideEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([name, override]) => {
    if (typeof override === "string") return [[name, override] as [string, string]];
    if (override && typeof override === "object") {
      return Object.entries(override as Record<string, unknown>).map(([childName, childOverride]) => [
        childName.includes("@") && !childName.startsWith("@") ? childName : childName,
        String(childOverride),
      ] as [string, string]);
    }
    return [[name, String(override)] as [string, string]];
  });
}

function overrideReason(name: string): OverrideTruthEntry["reason"] {
  const normalized = name.toLowerCase();
  if (["brace-expansion", "picomatch", "protobufjs", "path-to-regexp", "minimatch", "dompurify", "ajv", "flatted"].some((token) => normalized.includes(token))) return "security_pin";
  if (normalized.includes("google") || normalized.includes("firebase")) return "firebase_google_pin";
  if (normalized.includes("vite") || normalized.includes("hono") || normalized.includes("eslint")) return "compatibility_pin";
  return "transitive_pin";
}

function buildOverrides(sourcePackage: DependencySourcePackage, pkg: PackageManifestLike | undefined, directNames: Set<string>): OverrideTruthEntry[] {
  return flattenOverrideEntries(pkg?.overrides)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, overrideVersion]) => ({
      name,
      overrideVersion,
      sourcePackage,
      directDependency: directNames.has(name),
      reason: overrideReason(name),
    }));
}

export function detectFakePackageTimestamp(input: { timestampUtc?: string | null; sourceFile: string; generatedAtUtc: string }): DependencyFreshnessEntry {
  const timestamp = input.timestampUtc || null;
  const fakeTimestampDetected = Boolean(timestamp && /^1980-01-01T00:00:0[01]\.000Z$/u.test(timestamp));
  const status = fakeTimestampDetected ? "fake_default_timestamp" : timestamp ? "current" : "unavailable";
  return {
    sourceFile: input.sourceFile,
    gitModifiedTimeUtc: fakeTimestampDetected ? null : timestamp,
    generatedInventoryTimeUtc: input.generatedAtUtc,
    fakeTimestampDetected,
    timestampSource: timestamp ? "filesystem_mtime" : "unavailable",
    status,
    displayLabel: status === "current" && timestamp ? timestamp : "timestamp unavailable",
  };
}

export function classifyExpectedAbsentDependency(input: { name: string; installedVersion?: string; expectedBy: string; reason: string }): ExpectedAbsentDependency {
  let status: ExpectedAbsentStatus = "optional_provider_absent";
  if (input.installedVersion) status = "transitive_only";
  if (input.name === "@google-cloud/pubsub") status = input.installedVersion ? "transitive_only" : "intentionally_absent";
  if (input.name === "stripe") status = "intentionally_absent";
  return {
    name: input.name,
    expectedBy: input.expectedBy,
    reason: input.reason,
    status,
  };
}

function buildExpectedAbsent(rootLockfile?: PackageLockfileLike, functionsLockfile?: PackageLockfileLike): ExpectedAbsentDependency[] {
  const candidates = [
    { name: "@google-cloud/pubsub", expectedBy: "queue/future cloud messaging docs", reason: "Queue runtime uses Firestore-backed dispatch outcomes; Pub/Sub is not a direct dependency." },
    { name: "@google-cloud/storage", expectedBy: "Firebase Storage transitive SDK", reason: "Storage is provided through Firebase SDK/Admin transitive dependency unless promoted directly." },
    { name: "stripe", expectedBy: "payment provider guardrails", reason: "PayPal is the active payment provider; Stripe must remain absent unless a dedicated payment migration exists." },
    { name: "resend", expectedBy: "external email/SMS future provider", reason: "No active external email provider is required by the current runtime." },
    { name: "smtp", expectedBy: "external email/SMS future provider", reason: "SMTP config is optional/future and no package is expected." },
  ];
  return candidates.map((candidate) => classifyExpectedAbsentDependency({
    ...candidate,
    installedVersion: readInstalledVersion(rootLockfile, candidate.name) || readInstalledVersion(functionsLockfile, candidate.name),
  }));
}

function buildRuntimeChecks(input: CompleteDependencyInventoryInput): RuntimeConnectivityChecks {
  return {
    firestoreConnectivity: {
      status: input.runtimeChecks?.firestoreConnectivity || "unknown",
      runtimeEvidenceSource: "admin_debug_runtime_query",
    },
    lastTelemetryPing: {
      timestampUtc: input.runtimeChecks?.lastTelemetryPingAtUtc || null,
      status: input.runtimeChecks?.lastTelemetryPingAtUtc ? "observed" : "unknown",
      runtimeEvidenceSource: "server_diagnostics_latest_sample",
    },
    providerConfigPresence: input.envExampleText ? "declared" : "unknown",
    providerRuntimeVerification: "not_verified_here",
    packagePresenceIsRuntimeHealth: false,
  };
}

function buildValidatorDependencies(rootPackage: PackageManifestLike | undefined, allDirectNames: Set<string>): ValidatorAndScriptDependency[] {
  return Object.entries(rootPackage?.scripts || {})
    .filter(([name]) => name.startsWith("check:") || name.startsWith("score:") || name.startsWith("agent:"))
    .map(([scriptName, command]) => {
      const requiredPackage = command.includes("vitest")
        ? "vitest"
        : command.includes("tsx")
          ? "tsx"
          : command.includes("playwright")
            ? "playwright"
            : command.includes("firebase")
              ? "firebase-tools"
              : null;
      return {
        scriptName,
        owningDependencyOrTool: requiredPackage || "node/npm script",
        requiredPackage,
        packagePresent: requiredPackage ? allDirectNames.has(requiredPackage) : true,
        runtimeExternal: /firebase|gcloud|paypal|vertex|ga4|bigquery/iu.test(command),
        safeNoProviderCall: !/deploy|gcloud|provider call/iu.test(command),
      };
    });
}

function sourceInventory(name: string, sourceType: PackageSourceInventory["sourceType"], present: boolean): PackageSourceInventory {
  return {
    name,
    path: name,
    sourceType,
    present,
    dependencies: [],
    devDependencies: [],
    optionalDependencies: [],
    peerDependencies: [],
    overrides: [],
  };
}

export function reconcileDependencyCounts(inventory: CompleteDependencyInventory) {
  const expectedDependencyNames = new Set(inventory.packageDependencies.map((entry) => `${entry.sourcePackage}:${entry.dependencyType}:${entry.name}`));
  const actualDependencyNames = new Set(inventory.packageSources.flatMap((source) => [
    ...source.dependencies,
    ...source.devDependencies,
    ...source.optionalDependencies,
    ...source.peerDependencies,
  ]).map((entry) => `${entry.sourcePackage}:${entry.dependencyType}:${entry.name}`));
  const expectedOverrideNames = new Set(inventory.transitiveAndOverrideTruth.map((entry) => `${entry.sourcePackage}:${entry.name}`));
  const actualOverrideNames = new Set(inventory.packageSources.flatMap((source) => source.overrides).map((entry) => `${entry.sourcePackage}:${entry.name}`));
  const missingDependencies = Array.from(expectedDependencyNames).filter((name) => !actualDependencyNames.has(name));
  const missingOverrides = Array.from(expectedOverrideNames).filter((name) => !actualOverrideNames.has(name));
  return {
    status: missingDependencies.length === 0 && missingOverrides.length === 0 ? "pass" as const : "fail" as const,
    missingDependencies,
    missingOverrides,
  };
}

export function buildDependencyInventorySummary(inventory: CompleteDependencyInventory) {
  return {
    totalPackageDependencies: inventory.packageDependencies.length,
    totalOverrides: inventory.transitiveAndOverrideTruth.length,
    totalExternalServices: inventory.externalServiceDependencies.length,
    expectedAbsentDependencies: inventory.expectedButAbsentDependencies.length,
    runtimeChecksSeparated: inventory.runtimeConnectivityChecks.packagePresenceIsRuntimeHealth === false,
    fakeTimestampDetected: inventory.dependencyFreshness.some((entry) => entry.fakeTimestampDetected),
  };
}

export function buildCompleteDependencyInventory(input: CompleteDependencyInventoryInput): CompleteDependencyInventory {
  const generatedAtUtc = input.generatedAtUtc || new Date().toISOString();
  const rootPackage = input.rootPackage || {};
  const functionsPackage = input.functionsPackage || {};
  const rootLockfile = input.rootLockfile || {};
  const functionsLockfile = input.functionsLockfile || {};

  const rootRuntime = dependencyEntries("root", "runtime", rootPackage.dependencies, rootLockfile);
  const rootDev = dependencyEntries("root", "dev", rootPackage.devDependencies, rootLockfile);
  const rootOptional = dependencyEntries("root", "optional", rootPackage.optionalDependencies, rootLockfile);
  const rootPeer = dependencyEntries("root", "peer", rootPackage.peerDependencies, rootLockfile);
  const functionsRuntime = dependencyEntries("functions", "runtime", functionsPackage.dependencies, functionsLockfile);
  const functionsDev = dependencyEntries("functions", "dev", functionsPackage.devDependencies, functionsLockfile);
  const functionsOptional = dependencyEntries("functions", "optional", functionsPackage.optionalDependencies, functionsLockfile);
  const functionsPeer = dependencyEntries("functions", "peer", functionsPackage.peerDependencies, functionsLockfile);
  const packageDependencies = [
    ...rootRuntime,
    ...rootDev,
    ...rootOptional,
    ...rootPeer,
    ...functionsRuntime,
    ...functionsDev,
    ...functionsOptional,
    ...functionsPeer,
  ];
  const allDirectNames = new Set(packageDependencies.map((entry) => entry.name));
  const rootOverrides = buildOverrides("root", rootPackage, allDirectNames);
  const functionsOverrides = buildOverrides("functions", functionsPackage, allDirectNames);
  const rootOverrideTopNames = Object.keys(rootPackage.overrides || {}).sort();
  const functionsOverrideTopNames = Object.keys(functionsPackage.overrides || {}).sort();
  const transitiveAndOverrideTruth = [...rootOverrides, ...functionsOverrides];
  const packageSources: PackageSourceInventory[] = [
    {
      name: "root package.json",
      path: "package.json",
      sourceType: "package_manifest",
      present: input.sourceFiles?.["package.json"] !== false,
      dependencies: rootRuntime,
      devDependencies: rootDev,
      optionalDependencies: rootOptional,
      peerDependencies: rootPeer,
      overrides: rootOverrides,
    },
    sourceInventory("root package-lock.json", "lockfile", input.sourceFiles?.["package-lock.json"] !== false),
    {
      name: "functions/package.json",
      path: "functions/package.json",
      sourceType: "package_manifest",
      present: input.sourceFiles?.["functions/package.json"] !== false,
      dependencies: functionsRuntime,
      devDependencies: functionsDev,
      optionalDependencies: functionsOptional,
      peerDependencies: functionsPeer,
      overrides: functionsOverrides,
    },
    sourceInventory("functions/package-lock.json", "lockfile", input.sourceFiles?.["functions/package-lock.json"] !== false),
    sourceInventory("firebase.json", "firebase_config", input.sourceFiles?.["firebase.json"] !== false),
    sourceInventory("next.config.ts", "next_config", input.sourceFiles?.["next.config.ts"] !== false),
    sourceInventory(".env.example", "env_example", input.sourceFiles?.[".env.example"] !== false),
  ];
  const groups = Array.from(packageDependencies.reduce((map, entry) => {
    const current = map.get(entry.category) || {
      key: entry.category,
      label: GROUP_LABELS[entry.category],
      count: 0,
      entries: [] as DependencyInventoryEntry[],
      topEntries: [] as string[],
    };
    current.count += 1;
    current.entries.push(entry);
    current.topEntries = current.entries.slice(0, 4).map((currentEntry) => currentEntry.name);
    map.set(entry.category, current);
    return map;
  }, new Map<DependencyGroupKey, DependencyGroup>()).values()).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  const expectedButAbsentDependencies = buildExpectedAbsent(rootLockfile, functionsLockfile);
  const externalMap = buildExternalDependencyMap({
    envExampleText: input.envExampleText,
    packageNames: Array.from(allDirectNames),
  });
  const rootFreshness = detectFakePackageTimestamp({
    sourceFile: "package.json",
    timestampUtc: input.packageFreshness?.rootPackageUpdatedAtUtc,
    generatedAtUtc,
  });
  const functionsFreshness = detectFakePackageTimestamp({
    sourceFile: "functions/package.json",
    timestampUtc: input.packageFreshness?.functionsPackageUpdatedAtUtc,
    generatedAtUtc,
  });
  const notDirectDependencies = expectedButAbsentDependencies.map((entry) => ({
    name: entry.name,
    state: entry.status === "transitive_only" ? "transitive/not direct" as const : "absent" as const,
    installedVersion: readInstalledVersion(rootLockfile, entry.name) || readInstalledVersion(functionsLockfile, entry.name),
    expectedStatus: entry.status,
  }));

  const inventory: CompleteDependencyInventory = {
    generatedAtUtc,
    nodeVersion: input.nodeVersion || process.version,
    packageSources,
    packageDependencies,
    transitiveAndOverrideTruth,
    externalServiceDependencies: externalMap.services,
    runtimeConnectivityChecks: buildRuntimeChecks(input),
    validatorAndScriptDependencies: buildValidatorDependencies(rootPackage, allDirectNames),
    expectedButAbsentDependencies,
    dependencyFreshness: [rootFreshness, functionsFreshness],
    groups,
    totals: {
      rootRuntimeDeps: rootRuntime.length,
      rootDevDeps: rootDev.length,
      rootOptionalDeps: rootOptional.length,
      rootPeerDeps: rootPeer.length,
      functionsRuntimeDeps: functionsRuntime.length,
      functionsDevDeps: functionsDev.length,
      functionsOptionalDeps: functionsOptional.length,
      functionsPeerDeps: functionsPeer.length,
      rootOverrides: rootOverrideTopNames.length,
      functionsOverrides: functionsOverrideTopNames.length,
      externalServices: externalMap.services.length,
      expectedAbsentDependencies: expectedButAbsentDependencies.length,
      unknownDirectDeps: packageDependencies.filter((entry) => entry.category === "unknown_other").length,
      runtimeDependencies: rootRuntime.length + functionsRuntime.length,
      devDependencies: rootDev.length + functionsDev.length,
      optionalDependencies: rootOptional.length + functionsOptional.length,
      peerDependencies: rootPeer.length + functionsPeer.length,
      functionsDependencies: functionsRuntime.length,
      overrideCount: rootOverrideTopNames.length + functionsOverrideTopNames.length,
      unknownDisplayed: packageDependencies.filter((entry) => entry.category === "unknown_other").length,
    },
    packageCountReconciliation: { status: "pass", missingDependencies: [], missingOverrides: [] },
    overrides: [
      { sourcePackage: "root", count: rootOverrideTopNames.length, names: rootOverrideTopNames },
      { sourcePackage: "functions", count: functionsOverrideTopNames.length, names: functionsOverrideTopNames },
    ],
    notDirectDependencies,
    freshnessState: rootFreshness.status === "stale" || functionsFreshness.status === "stale" ? "stale" : "fresh",
    rootPackageUpdatedAtUtc: rootFreshness.status === "current" ? rootFreshness.gitModifiedTimeUtc : null,
    functionsPackageUpdatedAtUtc: functionsFreshness.status === "current" ? functionsFreshness.gitModifiedTimeUtc : null,
    rootPackageTimestampLabel: rootFreshness.displayLabel,
    functionsPackageTimestampLabel: functionsFreshness.displayLabel,
  };
  inventory.packageCountReconciliation = reconcileDependencyCounts(inventory);
  return inventory;
}
