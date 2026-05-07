import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type ValidatorAuthorityStatus = "canonical" | "supporting" | "legacy" | "blocked";

type ValidatorAuthorityEntry = {
  status: ValidatorAuthorityStatus;
  reason: string;
};

type ValidatorAuthorityDocument = {
  defaultAffectedAuditBlockedStatuses?: ValidatorAuthorityStatus[];
  defaults?: Array<ValidatorAuthorityEntry & { match: string }>;
  overrides?: Record<string, ValidatorAuthorityEntry>;
};

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson<T>(relativePath: string) {
  return JSON.parse(read(relativePath)) as T;
}

function listValidatorFiles() {
  const agentValidators = readdirSync(join(root, "scripts/agent"))
    .filter((name) => /^validate-.*\.ts$/u.test(name))
    .map((name) => `scripts/agent/${name}`);
  const rootChecks = readdirSync(join(root, "scripts"))
    .filter((name) => /^check-.*\.ts$/u.test(name))
    .map((name) => `scripts/${name}`);

  return [...agentValidators, ...rootChecks].sort();
}

function matchesPattern(value: string, pattern: string) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "u").test(value);
}

function resolveAuthority(filePath: string, authority: ValidatorAuthorityDocument): ValidatorAuthorityEntry | null {
  const override = authority.overrides?.[filePath];
  if (override) {
    return override;
  }

  for (const entry of authority.defaults ?? []) {
    if (matchesPattern(filePath, entry.match)) {
      return {
        status: entry.status,
        reason: entry.reason,
      };
    }
  }

  return null;
}

function extractValidatorFilesFromPackageScript(script: string) {
  return Array.from(
    script.matchAll(/scripts\/(?:agent\/validate-[^"'`\s;&|]+\.ts|check-[^"'`\s;&|]+\.ts)/gu),
    (match) => match[0] ?? "",
  );
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

const authority = readJson<ValidatorAuthorityDocument>("agent/context/validator-authority.json");
const packageJson = readJson<{ scripts?: Record<string, string> }>("package.json");
const packageScripts = packageJson.scripts ?? {};
const validatorFiles = listValidatorFiles();

for (const filePath of validatorFiles) {
  const resolved = resolveAuthority(filePath, authority);
  if (!resolved) {
    failures.push(`Validator authority is missing a status for ${filePath}.`);
    continue;
  }
  if (!resolved.reason.trim()) {
    failures.push(`Validator authority reason is empty for ${filePath}.`);
  }
}

for (const [scriptName, scriptValue] of Object.entries(packageScripts)) {
  if (!scriptName.startsWith("check:")) {
    continue;
  }

  const validatorRefs = extractValidatorFilesFromPackageScript(scriptValue);
  for (const filePath of validatorRefs) {
    const resolved = resolveAuthority(filePath, authority);
    if (!resolved) {
      failures.push(`Package script ${scriptName} references ${filePath} without validator authority status.`);
      continue;
    }
    if (resolved.status === "blocked") {
      failures.push(`Package script ${scriptName} must not expose blocked validator ${filePath} as a normal check.`);
    }
  }
}

const affectedPlanSource = read("scripts/agent/plan-affected-audits.ts");
requireIncludes(
  affectedPlanSource,
  "validator-authority.json",
  "Affected audit planner",
);
requireIncludes(
  affectedPlanSource,
  "defaultAffectedAuditBlockedStatuses",
  "Affected audit planner",
);

const adminAnalyticsValidators = validatorFiles.filter((filePath) =>
  filePath.includes("admin-analytics"),
);
for (const filePath of adminAnalyticsValidators) {
  const source = read(filePath);
  const hasCanonicalReference =
    source.includes("src/lib/admin-analytics-contracts.ts")
    || source.includes("src/lib/server/admin-user-truth-snapshot.ts")
    || source.includes("src/lib/server/user-behavior-truth-rollup.ts")
    || source.includes("src/lib/analytics/admin-metric-snapshot.ts")
    || source.includes("src/hooks/useAdminAnalyticsSnapshot.ts")
    || source.includes("src/hooks/useAdminAnalyticsSnapshotRegistry.ts")
    || source.includes("src/lib/server/admin-analytics-snapshots.ts");
  if (!hasCanonicalReference) {
    failures.push(`${filePath} must reference a canonical snapshot or rollup contract.`);
  }
}

for (const [filePath, requiredNeedles] of Object.entries({
  "scripts/agent/validate-watch-time-rollup-truth.ts": [
    'watchScoreSource: "watch_session_rollup"',
    "watch_session_rollup",
    "legacy_page_duration",
  ],
  "scripts/agent/validate-purchase-telemetry-truth.ts": [
    'trackServerEvent("server_purchase_verified"',
    'sourceTruth: "server_purchase_transaction"',
    "server_purchase_verified",
  ],
  "scripts/agent/validate-unlock-telemetry-truth.ts": [
    'trackServerEvent("entitlement_granted"',
    'sourceTruth: "server"',
    "drop_unwrapped",
  ],
})) {
  const source = read(filePath);
  for (const needle of requiredNeedles) {
    requireIncludes(source, needle, filePath);
  }
}

if (failures.length > 0) {
  console.error("Validator authority validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Validator authority validation passed.");
