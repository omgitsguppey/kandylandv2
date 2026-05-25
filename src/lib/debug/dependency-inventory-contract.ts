export type DependencySourcePackage = "root" | "functions";
export type DependencyType = "runtime" | "dev" | "optional" | "peer";

export type DependencyGroupKey =
  | "framework"
  | "react_ui_design"
  | "forms_validation"
  | "firebase_google"
  | "functions_cloud"
  | "payments"
  | "analytics_telemetry"
  | "ai_model_providers"
  | "pwa_push"
  | "testing_qa"
  | "build_dev"
  | "agent_repo_tooling"
  | "security_overrides"
  | "storage_media_image"
  | "data_sql_warehouse"
  | "utilities"
  | "unknown_other";

export type DependencyFreshnessStatus =
  | "current"
  | "unavailable"
  | "fake_default_timestamp"
  | "stale";

export type ExternalRuntimeVerificationStatus =
  | "verified_current"
  | "not_verified_here"
  | "source_ready"
  | "missing_config"
  | "unavailable";

export type ConfigPresenceStatus =
  | "declared"
  | "partially_declared"
  | "not_declared"
  | "not_required";

export type ExpectedAbsentStatus =
  | "intentionally_absent"
  | "transitive_only"
  | "missing_actionable"
  | "optional_provider_absent"
  | "unknown";

export type PackageSourceInventory = {
  name: string;
  path: string;
  sourceType: "package_manifest" | "lockfile" | "firebase_config" | "next_config" | "env_example";
  present: boolean;
  dependencies: DependencyInventoryEntry[];
  devDependencies: DependencyInventoryEntry[];
  optionalDependencies: DependencyInventoryEntry[];
  peerDependencies: DependencyInventoryEntry[];
  overrides: OverrideTruthEntry[];
};

export type DependencyInventoryEntry = {
  name: string;
  declaredVersion: string;
  sourcePackage: DependencySourcePackage;
  dependencyType: DependencyType;
  installedVersion?: string;
  installedVersionState: "from_lockfile" | "not_checked" | "not_installed" | "unknown";
  direct: true;
  category: DependencyGroupKey;
};

export type OverrideTruthEntry = {
  name: string;
  overrideVersion: string;
  sourcePackage: DependencySourcePackage;
  directDependency: boolean;
  reason: "security_pin" | "firebase_google_pin" | "transitive_pin" | "compatibility_pin" | "unknown";
};

export type ExternalServiceDependency = {
  serviceName: string;
  packageDependency: string | null;
  envKeysRequired: string[];
  envKeysOptional: string[];
  configPresenceStatus: ConfigPresenceStatus;
  runtimeVerificationStatus: ExternalRuntimeVerificationStatus;
  runtimeEvidenceSource: string;
  owner: string;
  scoreImpact: number;
  nextAction: string;
};

export type RuntimeConnectivityChecks = {
  firestoreConnectivity: {
    status: "live" | "failed" | "unknown";
    runtimeEvidenceSource: string;
  };
  lastTelemetryPing: {
    timestampUtc: string | null;
    status: "observed" | "missing" | "unknown";
    runtimeEvidenceSource: string;
  };
  providerConfigPresence: "declared" | "partial" | "unknown";
  providerRuntimeVerification: "not_verified_here";
  packagePresenceIsRuntimeHealth: false;
};

export type ValidatorAndScriptDependency = {
  scriptName: string;
  owningDependencyOrTool: string;
  requiredPackage: string | null;
  packagePresent: boolean;
  runtimeExternal: boolean;
  safeNoProviderCall: boolean;
};

export type ExpectedAbsentDependency = {
  name: string;
  expectedBy: string;
  reason: string;
  status: ExpectedAbsentStatus;
};

export type DependencyFreshnessEntry = {
  sourceFile: string;
  gitModifiedTimeUtc: string | null;
  generatedInventoryTimeUtc: string;
  fakeTimestampDetected: boolean;
  timestampSource: "filesystem_mtime" | "unavailable";
  status: DependencyFreshnessStatus;
  displayLabel: string;
};

export type DependencyGroup = {
  key: DependencyGroupKey;
  label: string;
  count: number;
  entries: DependencyInventoryEntry[];
  topEntries: string[];
};

export type CompleteDependencyInventory = {
  generatedAtUtc: string;
  nodeVersion: string;
  packageSources: PackageSourceInventory[];
  packageDependencies: DependencyInventoryEntry[];
  transitiveAndOverrideTruth: OverrideTruthEntry[];
  externalServiceDependencies: ExternalServiceDependency[];
  runtimeConnectivityChecks: RuntimeConnectivityChecks;
  validatorAndScriptDependencies: ValidatorAndScriptDependency[];
  expectedButAbsentDependencies: ExpectedAbsentDependency[];
  dependencyFreshness: DependencyFreshnessEntry[];
  groups: DependencyGroup[];
  totals: {
    rootRuntimeDeps: number;
    rootDevDeps: number;
    rootOptionalDeps: number;
    rootPeerDeps: number;
    functionsRuntimeDeps: number;
    functionsDevDeps: number;
    functionsOptionalDeps: number;
    functionsPeerDeps: number;
    rootOverrides: number;
    functionsOverrides: number;
    externalServices: number;
    expectedAbsentDependencies: number;
    unknownDirectDeps: number;
    runtimeDependencies: number;
    devDependencies: number;
    optionalDependencies: number;
    peerDependencies: number;
    functionsDependencies: number;
    overrideCount: number;
    unknownDisplayed: number;
  };
  packageCountReconciliation: {
    status: "pass" | "fail";
    missingDependencies: string[];
    missingOverrides: string[];
  };
  overrides: Array<{
    sourcePackage: DependencySourcePackage;
    count: number;
    names: string[];
  }>;
  notDirectDependencies: Array<{
    name: string;
    state: "transitive/not direct" | "absent";
    installedVersion?: string;
    expectedStatus?: ExpectedAbsentStatus;
  }>;
  freshnessState: "fresh" | "stale" | "unknown";
  rootPackageUpdatedAtUtc: string | null;
  functionsPackageUpdatedAtUtc: string | null;
  rootPackageTimestampLabel: string;
  functionsPackageTimestampLabel: string;
};

export type PackageManifestLike = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  overrides?: Record<string, unknown>;
  scripts?: Record<string, string>;
};

export type PackageLockfileLike = {
  packages?: Record<string, { version?: string }>;
};
