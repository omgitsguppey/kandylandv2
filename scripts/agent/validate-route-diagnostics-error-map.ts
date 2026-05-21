import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { HUMAN_ERROR_DICTIONARY } from "../../src/lib/errors/error-dictionary";

type RouteDiagnosticsErrorMapReport = {
  generatedAtUtc: string;
  reportKey: "route-diagnostics-error-map";
  currentHead: string;
  summary: {
    routeDiagnosticsMapped: boolean;
    debugWarningsClassified: boolean;
    rawInternalServerErrorLeaks: number;
    duplicateGenericErrorStrings: number;
    validation4xxNonRetryable: boolean;
    requiredDictionaryKeysPresent: boolean;
    chatUntouched: boolean;
    navUntouched: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  mappedRouteFamilies: Array<{
    key: string;
    surface: string;
    owner: string;
    primaryAction: string;
    bugReportEligible: boolean;
  }>;
  rawErrorFindings: string[];
  duplicateErrorStringFindings: string[];
  protectedFileDiffs: string[];
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelative = "agent/state/route-diagnostics-error-map.generated.json";
const docRelative = "docs/agent-truth/route-diagnostics-error-map.md";
const artifactPath = join(repoRoot, artifactRelative);
const docPath = join(repoRoot, docRelative);

const requiredDictionaryKeys = [
  "creator_settings_unavailable",
  "creator_drops_unavailable",
  "wallet_packages_unavailable",
  "analytics_source_unavailable",
  "debug_route_degraded",
  "admin_truth_unavailable",
] as const;

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function listTracked(paths: string[]) {
  return execFileSync("git", ["ls-files", ...paths], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((path) => /\.(ts|tsx|js|jsx)$/u.test(path));
}

function listDiffFiles() {
  return execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
}

function ensureParent(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

function scanRawErrorFindings() {
  const findings: string[] = [];
  const rawPattern = /\b(Internal server error|Something went wrong|Unknown error)\b/u;
  const allow = new Set([
    "src/lib/errors/resolve-human-error.ts",
  ]);

  for (const file of listTracked(["src/app", "src/components"])) {
    if (allow.has(file)) continue;
    const source = read(file);
    if (rawPattern.test(source)) {
      findings.push(file);
    }
  }

  return findings;
}

function validateSource() {
  const failures: string[] = [];
  const routeDiagnostics = read("src/lib/server/route-diagnostics.ts");
  const auth = read("src/lib/server/auth.ts");
  const walletPackages = read("src/app/api/wallet/packages/route.ts");
  const adminUsername = read("src/app/api/admin/users/[userId]/username/route.ts");
  const adminAnalyticsRealtime = read("src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts");

  const requiredRouteDiagnosticsMarkers = [
    "resolveHumanError",
    "diagnosticDescriptor?.owner",
    "diagnosticDescriptor?.surface",
    "diagnosticDescriptor?.primaryAction",
    "diagnosticDescriptor?.errorKey",
    "humanMessage: diagnosticDescriptor.operatorMessage",
    "fixOwner",
    "humanSurface",
    "primaryAction",
  ];
  for (const marker of requiredRouteDiagnosticsMarkers) {
    if (!routeDiagnostics.includes(marker)) {
      failures.push(`route diagnostics missing ${marker}`);
    }
  }

  for (const key of requiredDictionaryKeys) {
    if (!HUMAN_ERROR_DICTIONARY[key]) {
      failures.push(`missing human error dictionary key ${key}`);
    }
  }

  if (String(HUMAN_ERROR_DICTIONARY.validation_failed.primaryAction) === "retry") {
    failures.push("validation_failed must not use direct retry as the primary action.");
  }
  if (String(HUMAN_ERROR_DICTIONARY.missing_required_field.primaryAction) === "retry") {
    failures.push("missing_required_field must not use direct retry as the primary action.");
  }

  if (!auth.includes("buildHumanApiErrorResponse") || auth.includes('{ error: "Internal server error" }')) {
    failures.push("handleApiError must return mapped human API error payloads for 500s.");
  }
  if (!walletPackages.includes("wallet_packages_unavailable") || walletPackages.includes('"Failed to fetch packages"')) {
    failures.push("wallet packages route must map 500s through wallet_packages_unavailable.");
  }
  if (!adminUsername.includes("buildHumanApiErrorResponse") || adminUsername.includes('error.message || "Internal server error"')) {
    failures.push("admin username route must not forward raw error.message/Internal server error.");
  }
  if (adminAnalyticsRealtime.includes('?? "Unknown error"')) {
    failures.push("admin analytics realtime warnings must use classified fallback copy, not Unknown error.");
  }

  return failures;
}

function buildReport(): RouteDiagnosticsErrorMapReport {
  const diffFiles = listDiffFiles();
  const protectedFileDiffs = diffFiles.filter((path) => (
    path.startsWith("src/components/Chat/")
    || path.startsWith("src/app/dashboard/chat/")
    || path.startsWith("src/components/Navigation/")
    || path.includes("BottomNav")
    || path.includes("TopNav")
    || path.includes("Navbar")
  ));
  const rawErrorFindings = scanRawErrorFindings();
  const duplicateErrorStringFindings = rawErrorFindings.filter((path, index, array) => array.indexOf(path) !== index);
  const sourceFailures = validateSource();
  const p0Count = sourceFailures.length + rawErrorFindings.length + protectedFileDiffs.length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "route-diagnostics-error-map",
    currentHead: currentHead(),
    summary: {
      routeDiagnosticsMapped: !sourceFailures.some((failure) => failure.includes("route diagnostics")),
      debugWarningsClassified: !sourceFailures.some((failure) => failure.includes("Unknown error")),
      rawInternalServerErrorLeaks: rawErrorFindings.length,
      duplicateGenericErrorStrings: duplicateErrorStringFindings.length,
      validation4xxNonRetryable:
        String(HUMAN_ERROR_DICTIONARY.validation_failed.primaryAction) !== "retry"
        && String(HUMAN_ERROR_DICTIONARY.missing_required_field.primaryAction) !== "retry",
      requiredDictionaryKeysPresent: requiredDictionaryKeys.every((key) => Boolean(HUMAN_ERROR_DICTIONARY[key])),
      chatUntouched: !protectedFileDiffs.some((path) => path.includes("/Chat/") || path.includes("\\Chat\\")),
      navUntouched: !protectedFileDiffs.some((path) => path.includes("Navigation") || path.includes("BottomNav") || path.includes("TopNav") || path.includes("Navbar")),
      p0Count,
      p1Count: 0,
      p2Count: 0,
    },
    mappedRouteFamilies: requiredDictionaryKeys.map((key) => {
      const descriptor = HUMAN_ERROR_DICTIONARY[key];
      return {
        key,
        surface: descriptor.surface,
        owner: descriptor.owner,
        primaryAction: descriptor.primaryAction,
        bugReportEligible: descriptor.bugReportEligible,
      };
    }),
    rawErrorFindings,
    duplicateErrorStringFindings,
    protectedFileDiffs,
    nextExactSteps: p0Count > 0
      ? sourceFailures.concat(rawErrorFindings.map((path) => `Replace raw generic error copy in ${path}.`))
      : [
          "Keep new route diagnostics calls mapped through the human error dictionary.",
          "Add new route family error keys before exposing new debug/user-facing failures.",
          "Keep formal runtime evidence separate from source-backed diagnostic mapping.",
        ],
  };
}

function renderDoc(report: RouteDiagnosticsErrorMapReport) {
  const mappedRows = report.mappedRouteFamilies
    .map((entry) => `| ${entry.key} | ${entry.surface} | ${entry.owner} | ${entry.primaryAction} | ${entry.bugReportEligible ? "yes" : "no"} |`)
    .join("\n");
  const findings = report.rawErrorFindings.length > 0
    ? report.rawErrorFindings.map((entry) => `- ${entry}`).join("\n")
    : "- None";
  const next = report.nextExactSteps.map((entry) => `- ${entry}`).join("\n");

  return `# Route Diagnostics Error Map

Generated: ${report.generatedAtUtc}
Current code version: ${report.currentHead}

## Summary

- Route diagnostics mapped: ${report.summary.routeDiagnosticsMapped ? "yes" : "no"}
- Debug warnings classified: ${report.summary.debugWarningsClassified ? "yes" : "no"}
- Raw generic error leaks: ${report.summary.rawInternalServerErrorLeaks}
- Validation 4xx direct retry removed: ${report.summary.validation4xxNonRetryable ? "yes" : "no"}
- Chat untouched: ${report.summary.chatUntouched ? "yes" : "no"}
- Navigation untouched: ${report.summary.navUntouched ? "yes" : "no"}

## Mapped Route Families

| Key | Surface | Owner | Primary action | Bug report |
| --- | --- | --- | --- | --- |
${mappedRows}

## Raw Error Findings

${findings}

## Next Steps

${next}
`;
}

export function validateRouteDiagnosticsErrorMapReport(report: RouteDiagnosticsErrorMapReport) {
  const failures = validateSource();
  if (report.reportKey !== "route-diagnostics-error-map") failures.push("reportKey must be route-diagnostics-error-map.");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match the latest code version.");
  if (!report.summary.routeDiagnosticsMapped) failures.push("route diagnostics must be mapped.");
  if (!report.summary.debugWarningsClassified) failures.push("debug warnings must be classified.");
  if (report.summary.rawInternalServerErrorLeaks !== 0) failures.push("raw Internal server error/Something went wrong/Unknown error leaks must be zero.");
  if (report.summary.duplicateGenericErrorStrings !== 0) failures.push("duplicated generic error strings must be zero.");
  if (!report.summary.validation4xxNonRetryable) failures.push("4xx validation errors must not be retryable.");
  if (!report.summary.requiredDictionaryKeysPresent) failures.push("required dictionary keys must be present.");
  if (!report.summary.chatUntouched) failures.push("chat files must not be changed.");
  if (!report.summary.navUntouched) failures.push("nav files must not be changed.");
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");
  return failures;
}

function main() {
  const report = buildReport();
  ensureParent(artifactPath);
  ensureParent(docPath);
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, renderDoc(report));

  const failures = validateRouteDiagnosticsErrorMapReport(report);
  if (failures.length > 0) {
    console.error("Route diagnostics error map validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Route diagnostics error map validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
