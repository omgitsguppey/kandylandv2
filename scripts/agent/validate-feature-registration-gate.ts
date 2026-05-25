import { execFileSync } from "node:child_process";
import { readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildFeatureRegistrationGateReport,
  validateFeatureRegistrationGate,
} from "../../src/lib/features/feature-registration-registry";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/feature-registration-gate.generated.json";
const DOC_PATH = "docs/agent-truth/feature-registration-gate.md";

function run(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function walkRoutes(dir: string, output: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkRoutes(fullPath, output);
    } else if (entry === "page.tsx" || entry === "route.ts") {
      output.push(fullPath.slice(ROOT.length + 1).replace(/\\/gu, "/"));
    }
  }
  return output;
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of run("git", [...args]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function renderDoc(report: ReturnType<typeof buildFeatureRegistrationGateReport>) {
  const featureRows = report.features.map((feature) =>
    `- ${feature.featureId}: owner=${feature.owner}; routes=${feature.routes.length}; events=${feature.telemetryEvents.length}; materializers=${feature.materializerLanes.length}; score=${feature.scoreDimensionsAffected.join(",")}`,
  );

  return [
    "# Feature Registration Gate",
    "",
    `Status: ${report.status}`,
    "",
    "New feature work must register routes, UI surfaces, telemetry events, consent requirements, identity requirements, materializer lanes, score impact, and debug owner before it is treated as complete. This reuses the existing telemetry catalog and behavior extensibility layer instead of creating a duplicate tracker.",
    "",
    "## Coverage",
    "",
    `- Registered features: ${report.features.length}`,
    `- App routes scanned: ${report.routeCoverage.totalRoutes}`,
    `- Mapped routes: ${report.routeCoverage.mappedRoutes.length}`,
    `- System/internal routes: ${report.routeCoverage.systemInternalRoutes.length}`,
    `- Unmapped routes: ${report.routeCoverage.unmappedRoutes.length}`,
    `- Telemetry events: ${report.telemetryCoverage.totalEvents}`,
    `- Unmapped telemetry events: ${report.telemetryCoverage.unmappedEvents.length}`,
    `- UI metrics: ${report.metricCoverage.totalMetrics}`,
    `- Orphan metrics: ${report.metricCoverage.orphanMetrics.length}`,
    "",
    "## Registered Features",
    "",
    ...featureRows,
    "",
    "## System/Internal Routes",
    "",
    ...(report.systemInternalRoutes.length ? report.systemInternalRoutes.map((route) => `- ${route}`) : ["- None."]),
    "",
    "## Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- None."]),
    "",
  ].join("\n");
}

const report = buildFeatureRegistrationGateReport({
  appRouteFiles: walkRoutes(join(ROOT, "src", "app")).sort(),
  currentHead: run("git", ["rev-parse", "HEAD"]),
});
const failures = validateFeatureRegistrationGate(report);
const changed = changedFiles();
const chatTelemetryAdminTruthScoped = changed.includes("src/lib/chat/chat-telemetry-contract.ts")
  && changed.includes("scripts/agent/validate-chat-telemetry-admin-truth.ts");
const allowedChatTelemetryAdminTruthFiles = new Set([
  "src/components/Chat/ChatExperience.tsx",
  "src/lib/chat/chat-telemetry-contract.ts",
]);
const mediaUploadLifecycleScoped = changed.includes("src/lib/media/media-upload-contract.ts")
  && changed.includes("src/lib/media/media-upload-telemetry.ts")
  && changed.includes("scripts/agent/validate-media-upload-lifecycle.ts");
const allowedMediaUploadLifecycleFiles = new Set([
  "src/app/api/chat/attachments/complete/route.ts",
  "src/app/api/chat/attachments/prepare/route.ts",
  "src/components/Chat/ChatExperience.tsx",
]);
const privateMediaAccessScoped = changed.includes("src/lib/media/media-access-contract.ts")
  && changed.includes("src/lib/media/media-access-resolver.ts")
  && changed.includes("scripts/agent/validate-private-media-access.ts");
const allowedPrivateMediaAccessFiles = new Set([
  "src/app/api/chat/attachments/complete/route.ts",
]);
const protectedChanges = changed.filter((path) =>
  (
    /(^|\/)(chat|Chat)\//u.test(path)
    && !(chatTelemetryAdminTruthScoped && allowedChatTelemetryAdminTruthFiles.has(path))
    && !(mediaUploadLifecycleScoped && allowedMediaUploadLifecycleFiles.has(path))
    && !(privateMediaAccessScoped && allowedPrivateMediaAccessFiles.has(path))
  )
  || /(^|\/)(nav|Nav|navbar|Navbar|bottom|Bottom)/u.test(path)
  || /paypal|payment|gumdrop/i.test(path)
);
if (protectedChanges.length > 0) {
  failures.push(`protected chat/nav/payment/GumDrop files changed: ${protectedChanges.join(", ")}`);
}

const output = {
  ...report,
  status: failures.length > 0 ? "fail" as const : "pass" as const,
  changedFiles: changed,
  protectedChanges,
  validationFailures: failures,
};

write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
write(DOC_PATH, renderDoc(output));

if (failures.length > 0) {
  console.error(`Feature registration gate failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Feature registration gate passed: features=${output.features.length}, routes=${output.routeCoverage.mappedRoutes.length}/${output.routeCoverage.totalRoutes}, telemetry=${output.telemetryCoverage.mappedEvents.length}/${output.telemetryCoverage.totalEvents}.`);
