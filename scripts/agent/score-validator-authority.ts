import {
  type Json,
  nowIso,
  readText,
  writeJsonFile,
} from "./shared";
import {
  VALIDATOR_AUTHORITY_PATH,
  extractScriptFileRefs,
  listStandaloneValidatorFiles,
  listValidatorPackageScripts,
  readRootPackageScripts,
  readValidatorMap,
  resolvePackageScriptValidatorFiles,
  type ValidatorAuthorityDocument,
  type ValidatorAuthorityLevel,
  type ValidatorAuthorityPackageScriptEntry,
  type ValidatorAuthorityStatus,
  type ValidatorAuthorityValidatorEntry,
} from "./validator-authority-shared";

const BLOCKED_VALIDATORS = new Set<string>([
  "scripts/agent/validate-admin-debug-control-tower.ts",
  "scripts/check-admin-truth-contracts.ts",
]);

const LEGACY_VALIDATORS = new Set<string>([
  "scripts/check-admin-parity.ts",
]);

const SURFACE_DEFAULT_CONTRACTS: Record<string, string[]> = {
  "admin-debug": [
    "src/lib/admin-debug/control-tower-truth.ts",
    "src/lib/server/admin-debug-control-tower-loader.ts",
    "src/lib/server/admin-user-truth-snapshot.ts",
  ],
  "user-management": [
    "src/lib/admin-user-truth-contract.ts",
    "src/lib/server/admin-user-truth-snapshot.ts",
    "src/lib/server/user-behavior-truth-rollup.ts",
  ],
  telemetry: [
    "src/lib/runtime-facts/runtime-fact-contract.ts",
    "src/lib/runtime-facts/normalize-runtime-fact.ts",
    "src/lib/server/write-runtime-fact.ts",
    "src/lib/behavioral/metric-fact-contract.ts",
  ],
  "watch-time": [
    "src/hooks/useViewerWatchSession.ts",
    "src/lib/viewer-watch-session.ts",
    "src/app/api/viewer/watch-session/route.ts",
  ],
  wallet: [
    "src/app/api/paypal/capture/route.ts",
    "src/lib/server/gumdrop-ledger.ts",
    "src/lib/behavioral/metric-fact-contract.ts",
  ],
  drops: [
    "src/app/api/drops/unlock/route.ts",
    "src/lib/behavioral/metric-fact-contract.ts",
    "src/lib/viewer-watch-session.ts",
  ],
  "repo-governance": [
    "agent/context/validator-authority.json",
    "scripts/agent/plan-affected-audits.ts",
    "agent/context/validator-map.json",
  ],
  "ai-panel": [
    "src/app/admin/ai/hooks/useAdminAiState.tsx",
    "src/lib/admin-truth-state.ts",
    "src/lib/server/user-behavior-truth-rollup.ts",
  ],
  "agent-context": [
    "agent/context/validator-authority.json",
    "scripts/agent/plan-affected-audits.ts",
  ],
  "behavioral-intelligence": [
    "src/lib/behavioral/event-fact-contract.ts",
    "src/lib/behavioral/metric-fact-contract.ts",
    "src/lib/server/user-behavior-truth-rollup.ts",
  ],
  "speed-security": [
    "src/lib/release-notes/release-version-contract.ts",
    "public/kandydrops-release-notes.json",
    "src/components/PwaRuntimeBridge.tsx",
  ],
  moderation: [
    "src/lib/admin-truth-state.ts",
    "src/lib/server/debug-evidence-store.ts",
    "src/lib/server/user-behavior-truth-rollup.ts",
  ],
  "google-cost": [
    "src/lib/server/global-cost-surface-contract.ts",
    "src/lib/server/cloud-cost-contract.ts",
  ],
  "device-ui": [
    "src/lib/device-layout-contract.ts",
    "src/lib/admin-truth-state.ts",
  ],
  "creator-dashboard": [
    "src/lib/server/creator-admin-action-contract.ts",
    "src/lib/server/metric-fact-materializer.ts",
  ],
  viewer: [
    "src/hooks/useViewerWatchSession.ts",
    "src/lib/viewer-watch-session.ts",
    "src/app/api/viewer/watch-session/route.ts",
  ],
  "image-policy": [
    "src/lib/image-loading-policy.ts",
    "src/lib/server/admin-content-storage-safety.ts",
    "src/lib/server/api-cost-contract.ts",
  ],
  "legacy-phaseout": [
    "src/lib/legacy/admin-analytics-legacy-registry.ts",
    "agent/context/legacy-registry.json",
    "src/lib/materializers/materializer-source-policy.ts",
  ],
  support: [
    "src/app/api/notifications/route.ts",
    "src/lib/notification-contracts.ts",
  ],
  "generated-report-authority": [
    "src/lib/generated-reports/generated-report-contract.ts",
    "agent/state/generated-report-authority.generated.json",
    "agent/context/doctrine-registry.json",
  ],
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function inferSurface(scriptName: string, filePath: string, validatorMap: ReturnType<typeof readValidatorMap>) {
  const mappedSurface = validatorMap.validators?.[scriptName];
  if (mappedSurface) {
    return mappedSurface;
  }

  const haystack = `${scriptName} ${filePath}`.toLowerCase();
  if (haystack.includes("admin-analytics")) return "telemetry";
  if (haystack.includes("admin-debug") || haystack.includes("debug-control-tower")) return "admin-debug";
  if (haystack.includes("admin-user") || haystack.includes("user-behavior") || haystack.includes("user-value") || haystack.includes("user-engagement")) return "user-management";
  if (haystack.includes("watch-time") || haystack.includes("viewer")) return "watch-time";
  if (haystack.includes("purchase") || haystack.includes("gumdrop") || haystack.includes("wallet") || haystack.includes("economy")) return "wallet";
  if (haystack.includes("unlock") || haystack.includes("drop-preview") || haystack.includes("drop-cover") || haystack.includes("content-protection") || haystack.includes("drop-asset")) return "drops";
  if (haystack.includes("telemetry") || haystack.includes("analytics") || haystack.includes("runtime-facts") || haystack.includes("event-fact") || haystack.includes("materializers")) return "telemetry";
  if (haystack.includes("behavioral") || haystack.includes("recommendation") || haystack.includes("task-catalog")) return "behavioral-intelligence";
  if (haystack.includes("creator") || haystack.includes("fan-pass")) return "creator-dashboard";
  if (haystack.includes("admin-ai") || haystack.includes("review-badges")) return "ai-panel";
  if (haystack.includes("moderation") || haystack.includes("theft-risk")) return "moderation";
  if (haystack.includes("generated-report")) return "generated-report-authority";
  if (haystack.includes("legacy-phaseout") || haystack.includes("orphan") || haystack.includes("legacy-recovery")) return "legacy-phaseout";
  if (haystack.includes("image") || haystack.includes("content-media") || haystack.includes("drop-asset")) return "image-policy";
  if (haystack.includes("doctrine") || haystack.includes("validator-authority") || haystack.includes("affected-audit") || haystack.includes("agent-context") || haystack.includes("dependency-truth")) return "agent-context";
  if (haystack.includes("release") || haystack.includes("beta") || haystack.includes("hardening") || haystack.includes("security") || haystack.includes("pwa")) return "speed-security";
  if (haystack.includes("device") || haystack.includes("layout") || haystack.includes("hydration") || haystack.includes("design-system") || haystack.includes("mobile-shell")) return "device-ui";
  if (haystack.includes("cloud") || haystack.includes("google-cost")) return "google-cost";
  if (haystack.includes("support") || haystack.includes("notification")) return "support";
  return "repo-governance";
}

function inferStatus(filePath: string): ValidatorAuthorityStatus {
  if (BLOCKED_VALIDATORS.has(filePath)) return "blocked";
  if (LEGACY_VALIDATORS.has(filePath)) return "legacy";
  if (filePath.includes("/score-")) return "supporting";
  if (filePath.includes("/check-")) return "supporting";
  return "canonical";
}

function inferAuthority(filePath: string, status: ValidatorAuthorityStatus): ValidatorAuthorityLevel {
  if (status === "blocked") return "blocked_reference";
  if (status === "legacy") return "legacy_reference";
  if (filePath.includes("/score-")) return "supporting_score";
  if (status === "supporting") return "supporting_contract";
  return "canonical_contract";
}

function inferContracts(surface: string, filePath: string) {
  if (filePath.includes("payment-unlock-security")) {
    return unique([
      "src/app/api/paypal/capture/route.ts",
      "src/lib/server/gumdrop-ledger.ts",
      "src/app/api/drops/unlock/route.ts",
      "src/lib/behavioral/metric-fact-contract.ts",
    ]).sort((left, right) => left.localeCompare(right));
  }
  if (filePath.includes("viewer-file-tracking")) {
    return unique([
      "src/hooks/useViewerWatchSession.ts",
      "src/lib/viewer-watch-session.ts",
      "src/app/api/viewer/watch-session/route.ts",
      "src/lib/behavioral/metric-fact-contract.ts",
    ]).sort((left, right) => left.localeCompare(right));
  }
  const defaults = SURFACE_DEFAULT_CONTRACTS[surface] ?? [];
  if (filePath.includes("admin-analytics")) {
    return unique([
      "src/lib/admin-analytics-contracts.ts",
      "src/lib/server/admin-user-truth-snapshot.ts",
      "src/lib/server/user-behavior-truth-rollup.ts",
      ...defaults,
    ]).sort((left, right) => left.localeCompare(right));
  }
  if (filePath.includes("purchase") || filePath.includes("unlock") || filePath.includes("watch-time") || filePath.includes("viewer")) {
    return unique([
      "src/lib/behavioral/metric-fact-contract.ts",
      ...defaults,
    ]).sort((left, right) => left.localeCompare(right));
  }
  return unique(defaults).sort((left, right) => left.localeCompare(right));
}

function buildReason(status: ValidatorAuthorityStatus, surface: string, filePath: string) {
  if (status === "blocked") {
    return `${filePath} enforces superseded ${surface} behavior and is kept only as a blocked legacy reference.`;
  }
  if (status === "legacy") {
    return `${filePath} is retained for historical comparison only and must not drive default affected audits.`;
  }
  if (status === "supporting") {
    return `${filePath} supports canonical ${surface} contracts but does not define source truth by itself.`;
  }
  return `${filePath} is an active canonical validator for ${surface} contracts.`;
}

function buildValidatorEntries(
  packageScripts: Record<string, string>,
  validatorMap: ReturnType<typeof readValidatorMap>,
) {
  const validatorPackageScripts = listValidatorPackageScripts(packageScripts);
  const packageScriptToFiles = new Map<string, string[]>();
  for (const scriptName of validatorPackageScripts) {
    packageScriptToFiles.set(scriptName, resolvePackageScriptValidatorFiles(packageScripts, scriptName));
  }

  const standaloneValidatorFiles = listStandaloneValidatorFiles();
  const allFiles = unique([
    ...standaloneValidatorFiles,
    ...[...packageScriptToFiles.values()].flat(),
  ]).sort((left, right) => left.localeCompare(right));

  const fileToScripts = new Map<string, string[]>();
  for (const [scriptName, files] of packageScriptToFiles.entries()) {
    for (const filePath of files) {
      const bucket = fileToScripts.get(filePath) ?? [];
      bucket.push(scriptName);
      fileToScripts.set(filePath, bucket);
    }
  }

  const validators: Record<string, ValidatorAuthorityValidatorEntry> = {};
  for (const filePath of allFiles) {
    const scripts = unique(fileToScripts.get(filePath) ?? []);
    const surface = inferSurface(scripts[0] ?? "", filePath, validatorMap);
    const status = inferStatus(filePath);
    validators[filePath] = {
      surface,
      authority: inferAuthority(filePath, status),
      status,
      canonicalContracts: inferContracts(surface, filePath),
      packageScripts: scripts.sort((left, right) => left.localeCompare(right)),
      reason: buildReason(status, surface, filePath),
    };
  }

  return { validators, packageScriptToFiles };
}

function buildPackageScriptEntry(
  scriptName: string,
  validatorFiles: string[],
  validators: Record<string, ValidatorAuthorityValidatorEntry>,
  validatorMap: ReturnType<typeof readValidatorMap>,
): ValidatorAuthorityPackageScriptEntry {
  const statuses = validatorFiles.map((filePath) => validators[filePath]?.status ?? "supporting");
  const status: ValidatorAuthorityStatus = statuses.includes("blocked")
    ? "blocked"
    : statuses.includes("legacy")
      ? (statuses.every((value) => value === "legacy") ? "legacy" : "supporting")
      : statuses.includes("canonical")
        ? "canonical"
        : "supporting";
  const surface = inferSurface(scriptName, validatorFiles[0] ?? scriptName, validatorMap);
  const authority: ValidatorAuthorityLevel = status === "blocked"
    ? "blocked_reference"
    : status === "legacy"
      ? "legacy_reference"
      : scriptName.startsWith("score:")
        ? "supporting_score"
        : status === "canonical"
          ? "canonical_contract"
          : "supporting_contract";
  const canonicalContracts = unique(
    validatorFiles.flatMap((filePath) => validators[filePath]?.canonicalContracts ?? []),
  ).sort((left, right) => left.localeCompare(right));
  const legacyReference = scriptName.startsWith("legacy:");

  let reason = `${scriptName} aggregates ${surface} validator evidence.`;
  if (status === "blocked") {
    reason = `${scriptName} is a blocked legacy reference and must never run as a default truth gate.`;
  } else if (status === "legacy") {
    reason = `${scriptName} is a legacy reference and must stay out of default affected audits.`;
  } else if (status === "supporting") {
    reason = `${scriptName} is supporting evidence for canonical ${surface} contracts.`;
  } else if (scriptName.startsWith("score:")) {
    reason = `${scriptName} scores ${surface} evidence but does not replace the canonical validator lane.`;
  }

  return {
    surface,
    authority,
    status,
    canonicalContracts,
    validators: validatorFiles.sort((left, right) => left.localeCompare(right)),
    reason,
    legacyReference,
  };
}

function main() {
  const packageScripts = readRootPackageScripts();
  const validatorMap = readValidatorMap();
  const { validators, packageScriptToFiles } = buildValidatorEntries(packageScripts, validatorMap);

  const packageScriptEntries: Record<string, ValidatorAuthorityPackageScriptEntry> = {};
  for (const scriptName of listValidatorPackageScripts(packageScripts)) {
    const validatorFiles = packageScriptToFiles.get(scriptName) ?? [];
    packageScriptEntries[scriptName] = buildPackageScriptEntry(scriptName, validatorFiles, validators, validatorMap);
  }

  const summary: ValidatorAuthorityDocument["summary"] = {
    validatorCount: Object.keys(validators).length,
    packageScriptCount: Object.keys(packageScriptEntries).length,
    byStatus: {
      canonical: Object.values(validators).filter((entry) => entry.status === "canonical").length,
      supporting: Object.values(validators).filter((entry) => entry.status === "supporting").length,
      legacy: Object.values(validators).filter((entry) => entry.status === "legacy").length,
      blocked: Object.values(validators).filter((entry) => entry.status === "blocked").length,
    },
  };

  const document: ValidatorAuthorityDocument = {
    version: 2,
    updatedAt: nowIso(),
    defaultAffectedAuditBlockedStatuses: ["legacy", "blocked"],
    validators,
    packageScripts: packageScriptEntries,
    summary,
  };

  writeJsonFile(VALIDATOR_AUTHORITY_PATH, document as unknown as Json);
  console.log(`Validator authority scored to ${VALIDATOR_AUTHORITY_PATH}`);
  console.log(JSON.stringify(summary, null, 2));
}

main();
