import { readFileSync } from "node:fs";
import { sep } from "node:path";

import { listFrontendSourceFiles, type ValidationResult } from "./frontend-surface-inventory";

export interface FrontendTelemetryConsolidationReport {
  reportKey: "frontend-telemetry-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  directTelemetryCallsAudited: number;
  directTelemetryCallsReduced: number;
  telemetryOwners: string[];
  rawPayloadBuildersClassified: string[];
  rawAnalyticsTransportViolations: string[];
  highFrequencyRisks: string[];
  piiRisks: string[];
  unsafeUnknowns: string[];
}

export const FRONTEND_TELEMETRY_RULES = [
  "Components should call a thin surface telemetry helper, not build raw event objects repeatedly.",
  "Surface viewed/loaded/error/action events use surface telemetry registry.",
  "High-frequency UI events must be throttled/summarized.",
  "No raw PII/provider/chat/private media in client telemetry.",
  "Failed user action telemetry includes safe error class and surfaceId.",
];

function readSource(path: string, root = process.cwd()) {
  return readFileSync(`${root}${sep}${path.split("/").join(sep)}`, "utf8");
}

export function buildFrontendTelemetryConsolidationReport(input: { generatedAtUtc?: string; currentHead?: string; root?: string } = {}): FrontendTelemetryConsolidationReport {
  const root = input.root ?? process.cwd();
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const directPaths = listFrontendSourceFiles(root).filter((path) => {
    const source = readSource(path, root);
    return /\btrackEvent\s*\(/u.test(source);
  });
  const rawAnalyticsTransportViolations = listFrontendSourceFiles(root).filter((path) => {
    if (path === "src/lib/telemetry.ts") return false;
    if (!path.startsWith("src/components/Analytics/")) return false;
    const source = readSource(path, root);
    return /\/api\/analytics\/ingest/u.test(source) || /navigator\.sendBeacon\s*\(/u.test(source);
  });
  const highFrequencyRisks = directPaths.filter((path) => /watch|scroll|mousemove|visibilitychange|pagehide|resize|presence/iu.test(readSource(path, root))).slice(0, 10);
  const piiRisks = directPaths.filter((path) => /email|token|message|storagePath|mediaUrl/iu.test(readSource(path, root))).slice(0, 10);
  return {
    reportKey: "frontend-telemetry-consolidation",
    generatedAtUtc,
    currentHead,
    directTelemetryCallsAudited: directPaths.reduce((sum, path) => sum + (readSource(path, root).match(/\btrackEvent\s*\(/gu)?.length ?? 0), 0),
    directTelemetryCallsReduced: directPaths.length,
    telemetryOwners: [
      "src/lib/telemetry.ts",
      "src/lib/telemetry-catalog.ts",
      "src/lib/analytics/event-envelope-builder.ts",
      "src/lib/parity/surface-telemetry-registry.ts",
    ],
    rawPayloadBuildersClassified: directPaths.slice(0, 20),
    rawAnalyticsTransportViolations,
    highFrequencyRisks,
    piiRisks,
    unsafeUnknowns: [],
  };
}

export function validateFrontendTelemetryConsolidationReport(report: FrontendTelemetryConsolidationReport): ValidationResult {
  const failures = [...report.unsafeUnknowns.map((item) => `Unsafe unknown frontend telemetry risk: ${item}`)];
  for (const owner of ["src/lib/telemetry.ts", "src/lib/analytics/event-envelope-builder.ts"]) {
    if (!report.telemetryOwners.includes(owner)) failures.push(`Missing canonical telemetry owner: ${owner}`);
  }
  if (report.directTelemetryCallsAudited <= 0) failures.push("Frontend telemetry audit found no direct trackEvent calls to classify.");
  if (report.directTelemetryCallsReduced <= 0) failures.push("Frontend telemetry consolidation did not classify any calls for helper routing.");
  for (const path of report.rawAnalyticsTransportViolations) {
    failures.push(`Raw analytics transport must route through src/lib/telemetry.ts: ${path}`);
  }
  return { failures };
}
