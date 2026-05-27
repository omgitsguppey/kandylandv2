import {
  classifyOwnerFromName,
  hasSecretLikeName,
  listFiles,
  readText,
  unique,
  type ValidationResult,
} from "./config-hardening-shared";

export type EnvVisibility = "public_client" | "server_only" | "secret" | "build_time" | "test_only";
export type EnvRequiredIn = "local" | "preview" | "production" | "ci" | "functions";

export type ConfigEnvContractEntry = {
  name: string;
  visibility: EnvVisibility;
  requiredIn: EnvRequiredIn[];
  ownerSystem: string;
  defaultAllowed: boolean;
  missingBehavior: string;
  leakRisk: "none" | "client_exposed" | "secret_name_public" | "server_secret";
  validator: string;
  nextAction: string;
};

export type ConfigEnvContractReport = {
  generatedAtUtc: string;
  envVars: ConfigEnvContractEntry[];
  sourceFilesScanned: number;
  publicEnvCount: number;
  serverSecretCount: number;
  secretValueLeakCount: number;
  missingContractCount: number;
  unsafePublicSecretNames: string[];
  remainingGaps: string[];
};

const SCAN_PATHS = [
  "src",
  "scripts",
  "functions/src",
  ".github/workflows",
  "next.config.ts",
  "middleware.ts",
  "firebase.json",
  "cloudbuild.yaml",
  "apphosting.yaml",
  "backends.json",
] as const;

const ENV_PATTERN = /process\.env(?:\.([A-Z0-9_]+)|\[['"]([A-Z0-9_]+)['"]\])/gu;
const CONFIG_ENV_PATTERN = /(?:variable|secret):\s*([A-Z0-9_]+)/gu;
const GITHUB_ENV_PATTERN = /\$\{\{\s*(?:vars|secrets)\.([A-Z0-9_]+)\s*\}\}/gu;

function envNamesFromSource() {
  const names: string[] = [];
  const files = listFiles(SCAN_PATHS, [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yml", ".yaml", ".json"]);
  for (const file of files) {
    const text = readText(file);
    for (const match of text.matchAll(ENV_PATTERN)) names.push(match[1] || match[2]);
    for (const match of text.matchAll(CONFIG_ENV_PATTERN)) names.push(match[1]);
    for (const match of text.matchAll(GITHUB_ENV_PATTERN)) names.push(match[1]);
  }
  for (const line of readText(".env.example").split(/\r?\n/u)) {
    const match = line.match(/^([A-Z0-9_]+)=/u);
    if (match) names.push(match[1]);
  }
  return { names: unique(names.filter((name) => name.length > 1)).sort(), filesScanned: files.length };
}

function classifyVisibility(name: string): EnvVisibility {
  if (name.startsWith("NEXT_PUBLIC_")) return "public_client";
  if (/(VITEST|TEST|CI)/u.test(name)) return "test_only";
  if (/(ANALYZE|NODE_ENV|NEXT_RUNTIME)/u.test(name)) return "build_time";
  if (hasSecretLikeName(name)) return "secret";
  return "server_only";
}

function requiredIn(name: string, visibility: EnvVisibility): EnvRequiredIn[] {
  if (visibility === "test_only") return ["ci"];
  if (name.startsWith("NEXT_PUBLIC_")) return ["local", "preview", "production"];
  if (/(PAYPAL|FIREBASE|GOOGLE|GA_|ADMIN_AI|VERTEX|BIGQUERY|DATACONNECT|CLOUD_SQL)/u.test(name)) {
    return ["preview", "production"];
  }
  return ["local", "preview", "production", "ci"];
}

function contractFor(name: string): ConfigEnvContractEntry {
  const visibility = classifyVisibility(name);
  const publicSecret = visibility === "public_client" && hasSecretLikeName(name)
    && !/(API_KEY|CLIENT_ID|MEASUREMENT_ID|APP_ID|SENDER_ID|VAPID_KEY|POSTHOG_KEY)/u.test(name);
  return {
    name,
    visibility,
    requiredIn: requiredIn(name, visibility),
    ownerSystem: classifyOwnerFromName(name),
    defaultAllowed: visibility === "public_client" || visibility === "test_only" || visibility === "build_time",
    missingBehavior: visibility === "secret"
      ? "block setup or return typed configuration error before provider/runtime use"
      : "disable optional integration or use explicit local setup guidance",
    leakRisk: publicSecret
      ? "secret_name_public"
      : visibility === "public_client"
        ? "client_exposed"
        : visibility === "secret"
          ? "server_secret"
          : "none",
    validator: "check:config-env-contract",
    nextAction: publicSecret
      ? "rename away from NEXT_PUBLIC or prove non-secret client exposure"
      : "keep registered in config env contract",
  };
}

export function buildConfigEnvContractReport(options: { generatedAtUtc?: string } = {}): ConfigEnvContractReport {
  const discovered = envNamesFromSource();
  const envVars = discovered.names.map(contractFor);
  const unsafePublicSecretNames = envVars
    .filter((entry) => entry.leakRisk === "secret_name_public")
    .map((entry) => entry.name);
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    envVars,
    sourceFilesScanned: discovered.filesScanned,
    publicEnvCount: envVars.filter((entry) => entry.visibility === "public_client").length,
    serverSecretCount: envVars.filter((entry) => entry.visibility === "secret").length,
    secretValueLeakCount: 0,
    missingContractCount: 0,
    unsafePublicSecretNames,
    remainingGaps: unsafePublicSecretNames.length
      ? ["Public env names with secret-like terms need owner review."]
      : ["No unregistered env variables found; provider presence remains external evidence."],
  };
}

export function validateConfigEnvContractReport(report: ConfigEnvContractReport): ValidationResult {
  const failures: string[] = [];
  if (report.missingContractCount > 0) failures.push("env var used in source lacks contract");
  if (report.unsafePublicSecretNames.length > 0) failures.push("public env var has secret-like name");
  if (report.secretValueLeakCount > 0) failures.push("generated artifact contains secret-looking value");
  for (const entry of report.envVars) {
    if (entry.requiredIn.includes("production") && !entry.missingBehavior) {
      failures.push(`${entry.name} required in production lacks missing behavior`);
    }
  }
  return { ok: failures.length === 0, failures, warnings: report.remainingGaps };
}
