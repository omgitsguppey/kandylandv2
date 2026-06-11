import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildMonolithRiskRegistry,
  validateMonolithRiskRegistry,
  type MonolithRiskRegistryItem,
} from "../../src/lib/debug/monolith-risk-registry";
import {
  buildOrphanMetricRegistry,
  validateOrphanMetricRegistry,
  type OrphanMetricRegistryItem,
} from "../../src/lib/debug/orphan-metric-registry";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/monolith-orphan-metric-registry.generated.json";
const DOC_PATH = "docs/agent-truth/monolith-orphan-metric-registry.md";

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readText(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function changedFiles() {
  return Array.from(new Set([
    ...git(["diff", "--name-only", "HEAD"]).split(/\r?\n/u),
    ...git(["diff", "--cached", "--name-only"]).split(/\r?\n/u),
  ].map((entry) => entry.trim().replace(/\\/g, "/")).filter(Boolean))).sort();
}

function forbiddenTouched(files: string[]) {
  return files.filter((path) => {
    if (/^src\/components\/Chat\/|^src\/app\/chat\/|^src\/lib\/server\/chat\.ts/u.test(path)) return true;
    if (/Navbar|BottomNav|bottom-nav|top-nav/u.test(path)) return true;
    if (/paypal|wallet|gumdrop-ledger|gumdrop-economics|gumdrop-math|payment/u.test(path.toLowerCase())) return true;
    return false;
  });
}

function ensureControlTowerRegistration(failures: string[]) {
  const source = readText("src/lib/admin-debug-control-tower.ts");
  if (!source.includes("monolith-orphan-metric-registry.generated.json")) {
    failures.push("Admin Debug Control Tower does not register the monolith/orphan metric report.");
  }
  if (!source.includes("npm run check:monolith-orphan-metric-registry")) {
    failures.push("Admin Debug Control Tower does not expose the monolith/orphan metric validator command.");
  }
}

function summarizeMetrics(items: OrphanMetricRegistryItem[]) {
  return {
    total: items.length,
    linked: items.filter((item) => item.orphanStatus === "linked").length,
    sourceReadyEvidenceGap: items.filter((item) => item.orphanStatus === "source_ready_evidence_gap").length,
    archived: items.filter((item) => item.orphanStatus === "archived").length,
    uiWithoutSource: items.filter((item) => item.orphanStatus === "ui_without_source").length,
    producerWithoutConsumer: items.filter((item) => item.orphanStatus === "producer_without_consumer").length,
  };
}

function summarizeMonoliths(items: MonolithRiskRegistryItem[]) {
  return {
    total: items.length,
    highRisk: items.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length,
    critical: items.filter((item) => item.riskLevel === "critical").length,
  };
}

function buildFindings(metrics: OrphanMetricRegistryItem[], monoliths: MonolithRiskRegistryItem[]) {
  const findings = [
    ...metrics
      .filter((item) => item.orphanStatus !== "linked")
      .map((item) => ({
        id: `metric-${item.metricId}`,
        severity: item.orphanStatus === "source_ready_evidence_gap" ? "major" : "moderate",
        title: `${item.displayLabel} is not a fully linked live metric`,
        humanReadableWarning: item.nextAction,
        filePath: "src/lib/debug/orphan-metric-registry.ts",
        evidence: [
          `producer=${item.producer || "missing"}`,
          `consumer=${item.uiConsumer || item.scoreEvidenceConsumer || "missing"}`,
          `status=${item.orphanStatus}`,
        ],
      })),
    ...monoliths
      .filter((item) => item.riskLevel === "high" || item.riskLevel === "critical")
      .map((item) => ({
        id: `monolith-${item.filePath.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "")}`,
        severity: item.riskLevel === "critical" ? "major" : "moderate",
        title: `${item.filePath} is a ${item.riskLevel} monolith risk`,
        humanReadableWarning: item.nextAction,
        filePath: item.filePath,
        evidence: [
          `lineCount=${item.lineCount}`,
          `owner=${item.owner}`,
          `splitRecommendation=${item.splitRecommendation}`,
        ],
      })),
  ];
  return findings;
}

function renderDoc(report: {
  overallStatus: string;
  overallScore: number;
  metricSummary: ReturnType<typeof summarizeMetrics>;
  monolithSummary: ReturnType<typeof summarizeMonoliths>;
  metricRegistry: OrphanMetricRegistryItem[];
  monolithRegistry: MonolithRiskRegistryItem[];
}) {
  const unresolvedMetrics = report.metricRegistry.filter((item) => item.orphanStatus !== "linked");
  const highRiskMonoliths = report.monolithRegistry.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical");
  return [
    "# Monolith + Orphan Metric Registry",
    "",
    "Status: source-only debug registry. No production reads, live backfills, payment runtime changes, chat changes, or nav changes were performed.",
    "",
    "## Summary",
    "",
    `- Overall status: ${report.overallStatus}`,
    `- Overall score: ${report.overallScore}/100`,
    `- Metrics tracked: ${report.metricSummary.total}`,
    `- Fully linked metrics: ${report.metricSummary.linked}`,
    `- Source-ready/evidence-gap metrics: ${report.metricSummary.sourceReadyEvidenceGap}`,
    `- Archived/supporting evidence metrics: ${report.metricSummary.archived}`,
    `- Monoliths tracked: ${report.monolithSummary.total}`,
    `- High-risk monoliths: ${report.monolithSummary.highRisk}`,
    "",
    "## Unresolved Metric Actions",
    "",
    ...(unresolvedMetrics.length > 0
      ? unresolvedMetrics.map((item) => `- ${item.metricId}: ${item.orphanStatus}. ${item.nextAction}`)
      : ["- None."]),
    "",
    "## High-Risk Monolith Actions",
    "",
    ...highRiskMonoliths.map((item) => `- ${item.filePath}: owner=${item.owner}. ${item.nextAction}`),
    "",
    "## Validator",
    "",
    "- `npm run check:monolith-orphan-metric-registry`",
    "",
  ].join("\n");
}

const metricRegistry = buildOrphanMetricRegistry();
const monolithRegistry = buildMonolithRiskRegistry();
const validationFailures = [
  ...validateOrphanMetricRegistry(metricRegistry),
  ...validateMonolithRiskRegistry(monolithRegistry),
];

ensureControlTowerRegistration(validationFailures);

const protectedTouched = forbiddenTouched(changedFiles());
if (protectedTouched.length > 0) {
  validationFailures.push(`Protected chat/nav/payment/GumDrop files touched: ${protectedTouched.join(", ")}`);
}

const metricSummary = summarizeMetrics(metricRegistry);
const monolithSummary = summarizeMonoliths(monolithRegistry);
const findings = buildFindings(metricRegistry, monolithRegistry);
const overallScore = Math.max(0, 100 - metricSummary.sourceReadyEvidenceGap * 5 - metricSummary.uiWithoutSource * 20 - metricSummary.producerWithoutConsumer * 20 - monolithSummary.highRisk * 3);
const report = {
  generatedAt: new Date().toISOString(),
  sourceCommit: git(["rev-parse", "HEAD"]) || null,
  currentHead: git(["rev-parse", "HEAD"]) || null,
  overallStatus: validationFailures.length > 0 ? "fail" : "pass",
  overallScore,
  metricSummary,
  monolithSummary,
  findings,
  validationFailures,
  metricRegistry,
  monolithRegistry,
  nextActions: [
    "Keep source-ready runtime watch-time degraded until persisted runtime evidence exists.",
    "Split admin debug route by section-specific drilldown loaders before adding more evidence branches.",
    "Split admin analytics state by tab-specific hooks when the next metric source changes.",
  ],
};

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, renderDoc(report));

if (validationFailures.length > 0) {
  console.error("Monolith/orphan metric registry validation failed:");
  for (const failure of validationFailures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Monolith/orphan metric registry OK: ${metricSummary.total} metrics, ${monolithSummary.highRisk} high-risk monoliths.`);
