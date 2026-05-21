import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildDebugOperatorCockpit,
  validateDebugOperatorCockpit,
  type DebugOperatorAiCriticFindingInput,
  type DebugOperatorLaneInput,
  type DebugOperatorPlaybookInput,
  type DebugOperatorWarningInput,
} from "../../src/lib/debug/debug-operator-cockpit";
import type { SelfHealingRefreshQueueEntry } from "../../src/lib/agent-score/self-healing-refresh-queue";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/debug-operator-cockpit.generated.json";
const DOC_PATH = "docs/agent-truth/debug-operator-cockpit.md";

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, unknown> {
  const source = read(path);
  if (!source) return {};
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function recordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)))
    : [];
}

function refreshQueue(): SelfHealingRefreshQueueEntry[] {
  return recordArray(readJson("agent/state/self-healing-refresh-queue.generated.json").queue).map((entry) => ({
    artifact: stringValue(entry.artifact, "unknown_artifact"),
    staleReason: stringValue(entry.staleReason, "unknown"),
    refreshCommand: stringValue(entry.refreshCommand),
    scoreImpactEstimate: numberValue(entry.scoreImpactEstimate),
    owner: stringValue(entry.owner, "repo") as SelfHealingRefreshQueueEntry["owner"],
    dependencyOrder: numberValue(entry.dependencyOrder),
    canRunAutomatically: entry.canRunAutomatically === true,
    blockedReason: stringValue(entry.blockedReason),
    source: stringValue(entry.source, "refresh_plan") as SelfHealingRefreshQueueEntry["source"],
    expectedOutcome: stringValue(entry.expectedOutcome),
  }));
}

function criticalWarnings(): DebugOperatorWarningInput[] {
  return recordArray(readJson("agent/state/debug-backlog-engine.generated.json").backlog)
    .filter((item) => ["critical", "p0", "p1"].includes(stringValue(item.severity)))
    .filter((item) => ["open", "blocked_manual", "blocked_external"].includes(stringValue(item.status)))
    .slice(0, 10)
    .map((item) => ({
      id: stringValue(item.id, "debug-backlog-item"),
      severity: stringValue(item.severity, "p1"),
      owner: stringValue(item.owner, "debug"),
      message: stringValue(item.title, "Debug warning"),
      nextAction: stringValue(item.exactNextAction, "Run npm run check:debug-backlog-engine."),
      truthState: stringValue(item.evidenceStatus) === "unknown" ? "unknown" : "degraded",
    }));
}

function aiCriticFindings(): DebugOperatorAiCriticFindingInput[] {
  return recordArray(readJson("agent/state/ai-debug-critic.generated.json").findings).slice(0, 8).map((finding) => ({
    id: stringValue(finding.id, "ai-critic-finding"),
    severity: stringValue(finding.severity, "required"),
    title: stringValue(finding.title, "AI critic finding"),
    requiredFix: stringValue(finding.detail, "Run npm run check:ai-debug-critic."),
  }));
}

function recoveryPlaybooks(): DebugOperatorPlaybookInput[] {
  return recordArray(readJson("agent/state/debug-recovery-playbooks.generated.json").playbooks).slice(0, 6).map((playbook) => ({
    id: stringValue(playbook.id, "debug-recovery-playbook"),
    title: stringValue(playbook.title, "Debug recovery playbook"),
    triggerPatterns: stringArray(playbook.triggerPatterns),
    commands: stringArray(playbook.commands),
    validators: stringArray(playbook.validators),
    forbiddenActions: stringArray(playbook.forbiddenActions),
  }));
}

function adminTruthStatus() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const blockers = stringArray(score.launchBlockers);
  const adminBlocker = blockers.find((entry) => /admin truth|sample evidence/i.test(entry));
  return {
    state: adminBlocker ? "unknown" as const : "live" as const,
    label: adminBlocker ?? "Admin truth sample has no loaded blocker.",
    nextAction: adminBlocker
      ? "Attach a redacted first-party admin truth sample, then run npm run check:beta-score."
      : "Run npm run check:admin-debug-control-tower.",
  };
}

function telemetryLaneStatus() {
  const telemetry = readJson("agent/state/final-telemetry-closure-lock.generated.json");
  const status = stringValue(telemetry.overallStatus ?? telemetry.status, "unknown");
  return {
    state: status === "pass" ? "live" as const : status === "unknown" ? "unknown" as const : "degraded" as const,
    label: `Telemetry lane: ${status}`,
    nextAction: "Run npm run check:telemetry-dependency-graph.",
  };
}

function costLanes(): DebugOperatorLaneInput[] {
  return [
    {
      id: "google-cost",
      owner: "cost",
      label: "Google cost owner-review lane",
      state: "degraded",
      nextAction: "Run npm run check:global-cost.",
    },
  ];
}

function renderDoc(report: ReturnType<typeof buildDebugOperatorCockpit>) {
  return [
    "# Debug Operator Cockpit",
    "",
    "Status: admin debug information hierarchy. The cockpit summarizes what to fix next before raw report details.",
    "",
    `- Sections: ${report.summary.sectionCount}`,
    `- Score impact items: ${report.summary.scoreImpactItems}`,
    `- Stale refresh items: ${report.summary.staleRefreshItems}`,
    `- Critical warning items: ${report.summary.criticalWarningItems}`,
    `- AI critic findings: ${report.summary.aiCriticFindings}`,
    `- Recovery playbooks: ${report.summary.recoveryPlaybooks}`,
    "",
    "## Default Order",
    "",
    ...report.defaultSections.map((section, index) => [
      `### ${index + 1}. ${section.title}`,
      "",
      `- Owner: ${section.owner}`,
      `- State: ${section.state}`,
      `- Score impact estimate: ${section.scoreImpactEstimate}`,
      `- Next action: ${section.nextAction}`,
      "",
    ].join("\n")),
  ].join("\n");
}

const currentHead = git(["rev-parse", "HEAD"]);
const report = buildDebugOperatorCockpit({
  scoreImpactQueue: refreshQueue(),
  criticalRuntimeWarnings: criticalWarnings(),
  adminTruthStatus: adminTruthStatus(),
  telemetryLaneStatus: telemetryLaneStatus(),
  costOwnerReviewLanes: costLanes(),
  aiCriticFindings: aiCriticFindings(),
  recoveryPlaybooks: recoveryPlaybooks(),
}, {
  currentHead,
});
const failures = validateDebugOperatorCockpit(report);
const page = read("src/app/admin/debug/components/DebugControlTower.tsx");
const cockpitComponent = read("src/app/admin/debug/components/DebugOperatorCockpit.tsx");

if (!page.includes("<DebugOperatorCockpit cockpit={model?.operatorCockpit} />")) {
  failures.push("debug panel lacks operator cockpit default view.");
}
if (!cockpitComponent.includes("data-debug-raw-dump-default-open={String(cockpit.rawDumpDefaultOpen)}")) {
  failures.push("raw dumps default before summary.");
}
for (const expected of [
  "Score Impact Queue",
  "Critical Runtime + Debug Warnings",
  "Stale Artifact Refresh Queue",
  "Admin Truth Status",
  "Telemetry Lane Status",
  "Cost Owner-Review Lanes",
  "AI Critic Requested Changes",
  "Recovery Playbook CTA",
]) {
  if (!cockpitComponent.includes(expected) && !JSON.stringify(report).includes(expected)) {
    failures.push(`debug panel lacks ${expected}.`);
  }
}

const finalReport = {
  ...report,
  overallStatus: failures.length ? "fail" as const : "pass" as const,
  validationFailures: failures,
};

write(REPORT_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
write(DOC_PATH, renderDoc(finalReport));

if (failures.length > 0) {
  console.error("Debug operator cockpit validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Debug operator cockpit OK: ${finalReport.summary.sectionCount} sections, ${finalReport.summary.scoreImpactItems} score items.`);
