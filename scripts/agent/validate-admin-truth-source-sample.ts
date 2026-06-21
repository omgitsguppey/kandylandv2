import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type AdminTruthSourceSampleReport = {
  generatedAtUtc: string;
  reportKey: "admin-truth-source-sample";
  currentHead: string;
  sourceCommit: string;
  status: "source_ready_admin_truth_sample" | "partial_admin_truth_source_sample" | "failed";
  passed: boolean;
  adminDebugControlTowerModelPresent: boolean;
  adminDebugRoutePresent: boolean;
  routeDiagnosticsPresent: boolean;
  debugEvidenceContractPresent: boolean;
  summaryCardsPresent: boolean;
  productionSampleAttached: boolean;
  formalRuntimeSampleAttached: boolean;
  formalAdminTruthSamplePassed: boolean;
  sourceTruthLabelsPresent: boolean;
  sourceTruthStatus: "source_backed" | "missing" | "unknown";
  telemetryHealthLaneStatus: "complete" | "partial" | "missing";
  degradedOrUnavailableLanes: Array<{
    lane: string;
    status: string;
    nextAction: string;
  }>;
  criticalAdminTruthIssueCount: number;
  fakeHealthyStateDetected: boolean;
  launchGateImpact: "partial_source_admin_truth_only";
  formalEvidenceImpact: "source_admin_truth_wiring_only";
  evidence: string[];
  nextAction: string;
  summary: {
    adminTruthSourceReady: boolean;
    telemetryLaneCount: number;
    degradedOrUnavailableLaneCount: number;
    criticalAdminTruthIssueCount: number;
    productionSampleAttached: boolean;
    formalRuntimeSampleAttached: boolean;
    formalAdminTruthSamplePassed: boolean;
  };
};

type BuildInputs = Omit<AdminTruthSourceSampleReport, "reportKey" | "sourceCommit" | "status" | "passed" | "launchGateImpact" | "formalEvidenceImpact" | "evidence" | "nextAction" | "summary">;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/admin-truth-source-sample.generated.json";
const DOC_PATH = "docs/agent-truth/admin-truth-source-sample.md";

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readText(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

export function buildAdminTruthSourceSampleReport(inputs: BuildInputs): AdminTruthSourceSampleReport {
  const adminTruthSourceReady = inputs.adminDebugControlTowerModelPresent
    && inputs.adminDebugRoutePresent
    && inputs.routeDiagnosticsPresent
    && inputs.debugEvidenceContractPresent
    && inputs.summaryCardsPresent
    && inputs.sourceTruthLabelsPresent
    && inputs.sourceTruthStatus === "source_backed"
    && inputs.telemetryHealthLaneStatus !== "missing"
    && inputs.degradedOrUnavailableLanes.length > 0
    && !inputs.fakeHealthyStateDetected;
  const passed = adminTruthSourceReady
    && inputs.productionSampleAttached === false
    && inputs.formalRuntimeSampleAttached === false
    && inputs.formalAdminTruthSamplePassed === false;
  const status = passed
    ? "source_ready_admin_truth_sample"
    : adminTruthSourceReady
      ? "partial_admin_truth_source_sample"
      : "failed";
  return {
    ...inputs,
    reportKey: "admin-truth-source-sample",
    sourceCommit: inputs.currentHead,
    status,
    passed,
    launchGateImpact: "partial_source_admin_truth_only",
    formalEvidenceImpact: "source_admin_truth_wiring_only",
    evidence: [
      `adminDebugControlTowerModelPresent=${inputs.adminDebugControlTowerModelPresent}`,
      `adminDebugRoutePresent=${inputs.adminDebugRoutePresent}`,
      `routeDiagnosticsPresent=${inputs.routeDiagnosticsPresent}`,
      `debugEvidenceContractPresent=${inputs.debugEvidenceContractPresent}`,
      `summaryCardsPresent=${inputs.summaryCardsPresent}`,
      `productionSampleAttached=${inputs.productionSampleAttached}`,
      `formalRuntimeSampleAttached=${inputs.formalRuntimeSampleAttached}`,
      `formalAdminTruthSamplePassed=${inputs.formalAdminTruthSamplePassed}`,
      `sourceTruthLabelsPresent=${inputs.sourceTruthLabelsPresent}`,
      `sourceTruthStatus=${inputs.sourceTruthStatus}`,
      `telemetryHealthLaneStatus=${inputs.telemetryHealthLaneStatus}`,
      `degradedOrUnavailableLaneCount=${inputs.degradedOrUnavailableLanes.length}`,
      `criticalAdminTruthIssueCount=${inputs.criticalAdminTruthIssueCount}`,
      `fakeHealthyStateDetected=${inputs.fakeHealthyStateDetected}`,
      "launchGateImpact=partial_source_admin_truth_only",
    ],
    nextAction: "Produce a redacted admin source activity sample before clearing the admin source activity gate.",
    summary: {
      adminTruthSourceReady,
      telemetryLaneCount: inputs.degradedOrUnavailableLanes.length,
      degradedOrUnavailableLaneCount: inputs.degradedOrUnavailableLanes.length,
      criticalAdminTruthIssueCount: inputs.criticalAdminTruthIssueCount,
      productionSampleAttached: inputs.productionSampleAttached,
      formalRuntimeSampleAttached: inputs.formalRuntimeSampleAttached,
      formalAdminTruthSamplePassed: inputs.formalAdminTruthSamplePassed,
    },
  };
}

export function validateAdminTruthSourceSampleReport(report: AdminTruthSourceSampleReport) {
  const failures: string[] = [];
  if (report.reportKey !== "admin-truth-source-sample") failures.push("reportKey must be admin-truth-source-sample.");
  if (report.sourceCommit !== report.currentHead) failures.push("artifact must be tied to the latest code version.");
  if (report.productionSampleAttached !== false) failures.push("source sample must not claim production sample attachment.");
  if (report.formalRuntimeSampleAttached !== false) failures.push("source sample must not claim deployed runtime evidence.");
  if (report.formalAdminTruthSamplePassed !== false) failures.push("source sample must not clear the admin source activity gate.");
  if (report.launchGateImpact !== "partial_source_admin_truth_only") failures.push("source sample must not clear admin source activity gate.");
  if (report.fakeHealthyStateDetected) failures.push("admin truth source sample detected fake healthy state.");
  if (!report.sourceTruthLabelsPresent) failures.push("admin truth source labels are required.");
  if (report.sourceTruthStatus !== "source_backed") failures.push("source truth fields must be included.");
  if (!report.routeDiagnosticsPresent) failures.push("route diagnostics source must be represented.");
  if (!report.debugEvidenceContractPresent) failures.push("debug evidence contract source must be represented.");
  if (report.degradedOrUnavailableLanes.length === 0) failures.push("admin truth source sample must list degraded or unavailable lanes.");
  if (report.degradedOrUnavailableLanes.some((lane) => /healthy|live/iu.test(lane.status))) {
    failures.push("unknown or unavailable lanes must not be marked healthy/live.");
  }
  if (report.criticalAdminTruthIssueCount > 0 && report.passed) {
    failures.push("critical admin truth issues must prevent the source sample from passing.");
  }
  return failures;
}

function buildFromRepo(head: string) {
  const controlTower = readText("src/lib/admin-debug-control-tower.ts");
  const route = readText("src/app/api/admin/debug/route.ts");
  const summaryCards = readText("src/lib/admin-debug-summary-cards.ts");
  const routeDiagnostics = readText("src/lib/server/route-diagnostics.ts");
  const debugEvidenceContract = readText("src/lib/debug-evidence-contract.ts");
  const debugPage = readText("src/app/admin/debug/page.tsx");
  const telemetryAdminDebugTruth = (() => {
    try {
      return JSON.parse(readText("agent/state/telemetry-admin-debug-truth.generated.json")) as {
        summary?: { p0Count?: number };
        lanes?: Array<{ id?: string; status?: string; nextAction?: string }>;
      };
    } catch {
      return null;
    }
  })();
  const degradedOrUnavailableLanes = (telemetryAdminDebugTruth?.lanes ?? [])
    .filter((lane) => /degraded|unavailable|config_missing|runtime_unproven|unknown|failed/iu.test(String(lane.status ?? "")))
    .map((lane) => ({
      lane: String(lane.id ?? "unknown"),
      status: String(lane.status ?? "unknown"),
      nextAction: String(lane.nextAction ?? "Refresh the admin telemetry health lane."),
    }));
  const joinedSource = controlTower + route + summaryCards;
  const fakeHealthyStateDetected = /missing["']?\s*\?\s*["'](?:healthy|live)["']|unknown["']?\s*\?\s*["'](?:healthy|live)["']/iu.test(joinedSource)
    || /truthState\s*:\s*["'](?:healthy|live)["'][^,\n]*(?:missing|unknown)/iu.test(joinedSource);
  return buildAdminTruthSourceSampleReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    adminDebugControlTowerModelPresent: controlTower.includes("buildAdminDebugControlTowerModel"),
    adminDebugRoutePresent: route.includes("GET") && route.includes("debug"),
    routeDiagnosticsPresent: routeDiagnostics.includes("recordRouteDiagnostic") && routeDiagnostics.includes("recordDebugEvidence"),
    debugEvidenceContractPresent: debugEvidenceContract.includes("DebugEvidenceRecord") && debugEvidenceContract.includes("DebugEvidenceAuditSummary"),
    summaryCardsPresent: summaryCards.includes("source") || summaryCards.includes("truth"),
    productionSampleAttached: false,
    formalRuntimeSampleAttached: false,
    formalAdminTruthSamplePassed: false,
    sourceTruthLabelsPresent: /truthState|sourceTruth|source/i.test(controlTower + route + summaryCards + debugPage),
    sourceTruthStatus: /truthState|sourceTruth|source/i.test(controlTower + route + summaryCards + debugPage) ? "source_backed" : "missing",
    telemetryHealthLaneStatus: degradedOrUnavailableLanes.length > 0
      ? "partial"
      : telemetryAdminDebugTruth?.lanes?.length
        ? "complete"
        : "missing",
    degradedOrUnavailableLanes,
    criticalAdminTruthIssueCount: Number(telemetryAdminDebugTruth?.summary?.p0Count ?? 0),
    fakeHealthyStateDetected,
  });
}

function renderDoc(report: AdminTruthSourceSampleReport) {
  return `# Admin Truth Source Sample

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Status: \`${report.status}\`
- Admin truth source ready: ${report.summary.adminTruthSourceReady}
- Production sample attached: ${report.productionSampleAttached}
- Deployed runtime evidence attached: ${report.formalRuntimeSampleAttached}
- Admin source sample gate passed: ${report.formalAdminTruthSamplePassed}
- Launch gate impact: \`${report.launchGateImpact}\`
- Telemetry health lane status: \`${report.telemetryHealthLaneStatus}\`
- Degraded/unavailable lanes: ${report.degradedOrUnavailableLanes.length}
- Critical admin truth issues: ${report.criticalAdminTruthIssueCount}

This is source wiring evidence only. It points to the bounded redacted admin source activity sample still needed for the admin source activity gate.

## Degraded Or Unavailable Lanes

${report.degradedOrUnavailableLanes.map((lane) => `- ${lane.lane}: ${lane.status}. Next: ${lane.nextAction}`).join("\n")}
`;
}

function main() {
  const head = currentHead();
  const report = buildFromRepo(head);
  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report), "utf8");
  const failures = validateAdminTruthSourceSampleReport(report);
  if (failures.length > 0) {
    console.error("Admin truth source sample validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Admin truth source sample passed: status=${report.status}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
