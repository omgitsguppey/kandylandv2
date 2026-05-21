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
  summaryCardsPresent: boolean;
  productionSampleAttached: boolean;
  formalAdminTruthSamplePassed: boolean;
  sourceTruthLabelsPresent: boolean;
  fakeHealthyStateDetected: boolean;
  launchGateImpact: "does_not_clear_admin_truth_sample";
  formalEvidenceImpact: "source_admin_truth_wiring_only";
  evidence: string[];
  nextAction: string;
  summary: {
    adminTruthSourceReady: boolean;
    productionSampleAttached: boolean;
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
    && inputs.summaryCardsPresent
    && inputs.sourceTruthLabelsPresent
    && !inputs.fakeHealthyStateDetected;
  const passed = adminTruthSourceReady
    && inputs.productionSampleAttached === false
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
    launchGateImpact: "does_not_clear_admin_truth_sample",
    formalEvidenceImpact: "source_admin_truth_wiring_only",
    evidence: [
      `adminDebugControlTowerModelPresent=${inputs.adminDebugControlTowerModelPresent}`,
      `adminDebugRoutePresent=${inputs.adminDebugRoutePresent}`,
      `summaryCardsPresent=${inputs.summaryCardsPresent}`,
      `productionSampleAttached=${inputs.productionSampleAttached}`,
      `formalAdminTruthSamplePassed=${inputs.formalAdminTruthSamplePassed}`,
      `sourceTruthLabelsPresent=${inputs.sourceTruthLabelsPresent}`,
      `fakeHealthyStateDetected=${inputs.fakeHealthyStateDetected}`,
      "launchGateImpact=does_not_clear_admin_truth_sample",
    ],
    nextAction: "Attach a redacted production admin truth sample before clearing the formal admin truth evidence gate.",
    summary: {
      adminTruthSourceReady,
      productionSampleAttached: inputs.productionSampleAttached,
      formalAdminTruthSamplePassed: inputs.formalAdminTruthSamplePassed,
    },
  };
}

export function validateAdminTruthSourceSampleReport(report: AdminTruthSourceSampleReport) {
  const failures: string[] = [];
  if (report.reportKey !== "admin-truth-source-sample") failures.push("reportKey must be admin-truth-source-sample.");
  if (report.sourceCommit !== report.currentHead) failures.push("artifact must be tied to the latest code version.");
  if (report.productionSampleAttached !== false) failures.push("source sample must not claim production sample attachment.");
  if (report.formalAdminTruthSamplePassed !== false) failures.push("source sample must not clear formal admin truth sample.");
  if (report.launchGateImpact !== "does_not_clear_admin_truth_sample") failures.push("source sample must not clear admin truth sample gate.");
  if (report.fakeHealthyStateDetected) failures.push("admin truth source sample detected fake healthy state.");
  if (!report.sourceTruthLabelsPresent) failures.push("admin truth source labels are required.");
  return failures;
}

function buildFromRepo(head: string) {
  const controlTower = readText("src/lib/admin-debug-control-tower.ts");
  const route = readText("src/app/api/admin/debug/route.ts");
  const summaryCards = readText("src/lib/admin-debug-summary-cards.ts");
  const debugPage = readText("src/app/admin/debug/page.tsx");
  const joinedSource = controlTower + route + summaryCards;
  const fakeHealthyStateDetected = /missing["']?\s*\?\s*["'](?:healthy|live)["']|unknown["']?\s*\?\s*["'](?:healthy|live)["']/iu.test(joinedSource)
    || /truthState\s*:\s*["'](?:healthy|live)["'][^,\n]*(?:missing|unknown)/iu.test(joinedSource);
  return buildAdminTruthSourceSampleReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    adminDebugControlTowerModelPresent: controlTower.includes("buildAdminDebugControlTowerModel"),
    adminDebugRoutePresent: route.includes("GET") && route.includes("debug"),
    summaryCardsPresent: summaryCards.includes("source") || summaryCards.includes("truth"),
    productionSampleAttached: false,
    formalAdminTruthSamplePassed: false,
    sourceTruthLabelsPresent: /truthState|sourceTruth|source/i.test(controlTower + route + summaryCards + debugPage),
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
- Formal admin truth sample passed: ${report.formalAdminTruthSamplePassed}
- Launch gate impact: \`${report.launchGateImpact}\`

This is source wiring evidence only. It does not replace a redacted production admin truth sample.
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
