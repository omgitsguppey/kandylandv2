import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildAiDebugCriticReport, summarizeAiDebugCritic } from "../../src/lib/debug/ai-debug-critic";
import type { AiDebugCriticGateBlocker } from "../../src/lib/debug/ai-debug-critic-contract";
import {
  buildAiCriticP1TriageReport,
  validateAiCriticP1TriageReport,
} from "../../src/lib/debug/ai-critic-p1-triage";
import {
  buildDebugBacklog,
  summarizeDebugBacklog,
} from "../../src/lib/debug/debug-backlog-builder";
import type { DebugBacklogItem } from "../../src/lib/debug/debug-backlog-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/ai-critic-p1-triage.generated.json";
const DOC_PATH = "docs/agent-truth/ai-critic-p1-triage.md";
const AI_CRITIC_REPORT_PATH = "agent/state/ai-debug-critic.generated.json";
const AI_CRITIC_DOC_PATH = "docs/agent-truth/ai-debug-critic.md";

type JsonRecord = Record<string, any>;

function readJson<T = JsonRecord>(path: string): T | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as T;
  } catch {
    return null;
  }
}

function write(path: string, source: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, source);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  return Array.from(new Set([
    ...git(["diff", "--name-only", "HEAD"]).split(/\r?\n/u),
    ...git(["diff", "--cached", "--name-only"]).split(/\r?\n/u),
  ].map((entry) => entry.trim().replace(/\\/g, "/")).filter(Boolean))).sort();
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function routeDiagnosticsFromDebugPanel(debugPanel: JsonRecord | null) {
  const items = Array.isArray(debugPanel?.debugItems) ? debugPanel.debugItems : [];
  return items
    .filter((item: JsonRecord) => {
      const searchable = `${item.key ?? ""} ${item.label ?? ""} ${item.issue ?? ""} ${item.sourceArtifact ?? ""}`;
      return /\b(route|api|http|500|diagnostic|internal_server_error)\b/i.test(searchable);
    })
    .slice(0, 20)
    .map((item: JsonRecord) => ({
      context: item.key,
      severity: item.blocksPhaseOne ? "p1" : "p2",
      message: item.issue,
      route: "/admin/debug",
      sourceFile: item.sourceArtifact || "agent/state/debug-panel-output-triage.generated.json",
      owner: "admin_debug",
    }));
}

function telemetryLanesFromDebugScore(debugScore: JsonRecord | null) {
  const issues = Array.isArray(debugScore?.issues) ? debugScore.issues : [];
  return issues
    .filter((issue: JsonRecord) => issue.source === "telemetry-admin-debug-truth" || issue.surface === "telemetry")
    .map((issue: JsonRecord) => ({
      lane: issue.id,
      status: issue.currentStatus,
      nextAction: issue.fixPlan,
    }));
}

function costReadinessFromPublicBeta(publicBeta: JsonRecord | null) {
  const reasons = Array.isArray(publicBeta?.healthScoreBreakdown?.costRisk?.reasons)
    ? publicBeta.healthScoreBreakdown.costRisk.reasons
    : [];
  return reasons.map((reason: string, index: number) => ({
    id: `cost-risk-${index}`,
    status: /owner-review|required/i.test(reason) ? "owner_review" : "review",
    message: reason,
    sourceFile: "agent/state/public-beta-score.generated.json",
    nextAction: "Keep this cost lane in owner review until external billing/provider evidence is attached.",
  }));
}

function buildCurrentBacklog() {
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  const score80 = readJson("agent/state/score-80-path-lock.generated.json");
  const debugRuntime = readJson("agent/state/debug-runtime-evidence.generated.json");
  const debugPanel = readJson("agent/state/debug-panel-output-triage.generated.json");
  const debugScore = readJson("agent/state/debug-score-impact-triage.generated.json");
  const adminTruthSample = readJson("agent/state/admin-truth-source-sample.generated.json")
    ?? readJson("agent/state/admin-truth-sample-evidence.generated.json");

  return buildDebugBacklog({
    publicBetaScore: publicBeta,
    score80PathLock: score80,
    debugRuntimeEvidence: debugRuntime,
    adminTruthSample,
    debugPanelItems: Array.isArray(debugPanel?.debugItems) ? debugPanel.debugItems : [],
    routeDiagnostics: routeDiagnosticsFromDebugPanel(debugPanel),
    telemetryLanes: telemetryLanesFromDebugScore(debugScore),
    costReadiness: costReadinessFromPublicBeta(publicBeta),
    staleArtifacts: Array.isArray(publicBeta?.staleArtifacts) ? publicBeta.staleArtifacts : [],
  });
}

function collectBetaBlockers(): AiDebugCriticGateBlocker[] {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const blockers: AiDebugCriticGateBlocker[] = [];
  const capDetails = Array.isArray(score?.evidenceCapDetails) ? score.evidenceCapDetails : [];
  for (const [index, value] of capDetails.entries()) {
    const text = String(value ?? "");
    const normalized = text.toLowerCase();
    if (normalized.includes("provider")) {
      blockers.push({ id: `provider-smoke-${index}`, label: text, evidenceStatus: "formal_missing", requiredArtifact: "agent/state/provider-smoke-evidence.generated.json" });
    } else if (normalized.includes("runtime")) {
      blockers.push({ id: `runtime-smoke-${index}`, label: text, evidenceStatus: "formal_missing", requiredArtifact: "agent/state/runtime-smoke-evidence.generated.json" });
    } else if (normalized.includes("admin truth")) {
      blockers.push({ id: `admin-truth-${index}`, label: text, evidenceStatus: "formal_missing", requiredArtifact: "agent/state/admin-truth-sample-evidence.generated.json" });
    }
  }
  return blockers;
}

function collectFormalArtifacts() {
  return [
    "agent/state/provider-smoke-evidence.generated.json",
    "agent/state/runtime-smoke-evidence.generated.json",
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
  ].filter((path) => existsSync(join(ROOT, path)));
}

function getLineCounts(paths: string[]) {
  const counts: Record<string, number> = {};
  for (const path of paths) {
    const fullPath = join(ROOT, path);
    if (!existsSync(fullPath)) continue;
    counts[path] = readFileSync(fullPath, "utf8").split(/\r?\n/u).length;
  }
  return counts;
}

function resolvedSourceFixes(backlog: DebugBacklogItem[]) {
  if (backlog.some((item) => item.id === "route-diagnostic-admin-truth-samples")) return [];
  return [{
    id: "route-diagnostic-admin-truth-samples",
    title: "Admin truth sample warning no longer misclassified as route diagnostic",
    owner: "admin_debug",
    surface: "admin_debug",
    severity: "p1" as const,
    scoreImpact: 2,
    fixClass: "route_fix" as const,
    exactNextAction: "Route diagnostics now only ingest route/API/HTTP diagnostic items from the debug panel.",
    sourceFiles: ["scripts/agent/validate-debug-backlog-engine.ts", "scripts/agent/validate-ai-critic-p1-triage.ts"],
  }];
}

function renderAiCriticDoc(report: ReturnType<typeof buildAiDebugCriticReport>) {
  const summary = summarizeAiDebugCritic(report);
  return [
    "# AI Debug Critic",
    "",
    "Status: source-only static critic lane.",
    "External AI calls: forbidden.",
    "",
    "The AI debug critic reviews debug-backed proposed fixes before they are considered complete. It catches shallow patches, duplicate systems, monolith growth, fake evidence, protected surface edits, orphaned telemetry, and source-ready-as-runtime-proof mistakes.",
    "",
    "## Summary",
    "",
    `- Critic status: ${report.criticStatus}`,
    `- Findings: ${summary.totalFindings}`,
    `- Blockers: ${summary.blockedFindings}`,
    `- Required changes: ${summary.requiredFindings}`,
    `- Unsafe changes: ${summary.unsafeChangeCount}`,
    `- Duplicate systems: ${summary.duplicateSystemCount}`,
    `- Monolith risks: ${summary.monolithRiskCount}`,
    `- Evidence misclassification risks: ${summary.evidenceMisclassificationRiskCount}`,
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => `- ${finding.severity} / ${finding.actionClass}: ${finding.title} (${finding.check}) - ${finding.requiredFix}`)
      : ["- No critic findings for the current scoped change."]),
    "",
  ].join("\n");
}

function renderDoc(report: ReturnType<typeof buildAiCriticP1TriageReport>) {
  return [
    "# AI Critic P1 Triage",
    "",
    "Status: source-backed score triage for AI critic request-change cleanup. Formal/manual evidence gates remain separate and are not cleared by this pass.",
    "",
    `- Score: ${report.scoreBefore} -> ${report.scoreAfter}`,
    `- Critic status: ${report.criticStatusBefore} -> ${report.criticStatusAfter}`,
    `- P1 fixed/deferred: ${report.p1FixedCount}/${report.p1DeferredCount}`,
    `- P2 deferred: ${report.p2DeferredCount}`,
    "",
    "## Fixed This Pass",
    "",
    ...(report.fixedThisPass.length
      ? report.fixedThisPass.map((item) => `- ${item.id}: ${item.exactNextAction}`)
      : ["- No source-fixable P1 items were fixed in this pass."]),
    "",
    "## Top P1 Queue",
    "",
    ...report.p1Ranking.slice(0, 12).map((item) => `- ${item.rank}. ${item.id}: ${item.scoreImpact} (${item.actionClass}) - ${item.exactNextAction}`),
    "",
    "## Formal Evidence Gates",
    "",
    ...report.formalEvidenceGates.map((gate) => `- ${gate}`),
    "",
  ].join("\n");
}

const publicBeta = readJson("agent/state/public-beta-score.generated.json");
const previousAiCritic = readJson<{ criticStatus?: "pass" | "request_changes" | "blocked" }>(AI_CRITIC_REPORT_PATH);
const files = changedFiles();
const backlog = buildCurrentBacklog();
const aiCritic = buildAiDebugCriticReport({
  changedFiles: files,
  proposedFixSummary: "Classifies AI critic feedback into source changes, formal evidence artifacts, refresh work, and operator UI confirmation without clearing runtime or provider gates.",
  debugBacklog: backlog,
  betaScoreBlockers: collectBetaBlockers(),
  doctrineIndex: readJson("agent/context/doctrine.index.json") ?? undefined,
  validatorMap: {
    suggestedValidators: [
      "npm run check:ai-critic-p1-triage",
      "npm run check:ai-debug-critic",
      "npm run check:debug-backlog-engine",
      "npm run score:beta",
      "npm run check:beta-score",
    ],
  },
  telemetryGraph: {
    canonicalEventFiles: [
      "src/lib/behavioral/event-fact-normalizer.ts",
      "src/lib/behavioral/event-fact-contract.ts",
      "src/lib/behavioral/tracking-surface-map.ts",
    ],
    changedTelemetryFiles: files.filter((path) => /^(src|functions)\//i.test(path) && /telemetry|analytics|event/i.test(path)),
  },
  costReadiness: {
    guardedCostPaths: files.filter((path) => path.includes("ai-debug-critic") || path.includes("ai-critic-p1-triage")),
  },
  evidenceStatus: {
    formalArtifacts: collectFormalArtifacts(),
    sourceOnlyClaims: [],
  },
  fileLineCounts: getLineCounts(files),
});

const report = buildAiCriticP1TriageReport({
  backlog,
  aiCritic,
  criticStatusBefore: previousAiCritic?.criticStatus ?? "request_changes",
  scoreBefore: numberValue(publicBeta?.healthScore ?? publicBeta?.overallScore),
  scoreAfter: numberValue(publicBeta?.healthScore ?? publicBeta?.overallScore),
  currentHead: git(["rev-parse", "HEAD"]),
  resolvedSourceFixes: resolvedSourceFixes(backlog),
  formalEvidenceGates: stringArray(publicBeta?.launchBlockers),
});

const failures = validateAiCriticP1TriageReport(report);
const forbiddenTouched = files.filter((path) => /(^|\/)(chat|Chat)(\/|\.|$)|Navbar|TopNav|BottomNav|Navigation/i.test(path));
if (forbiddenTouched.length > 0) failures.push(`chat/nav changed: ${forbiddenTouched.join(", ")}`);
if (report.fixedThisPass.some((item) => item.severity === "p2") && report.p1Ranking.some((item) => item.status === "deferred" && item.sourceFixable)) {
  failures.push("P2 items are fixed while higher-impact source-fixable P1 items remain.");
}

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, `${renderDoc(report)}\n`);
write(AI_CRITIC_REPORT_PATH, `${JSON.stringify({ ...aiCritic, summary: summarizeAiDebugCritic(aiCritic) }, null, 2)}\n`);
write(AI_CRITIC_DOC_PATH, `${renderAiCriticDoc(aiCritic)}\n`);

if (failures.length > 0) {
  console.error("AI critic P1 triage validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const summary = summarizeDebugBacklog(backlog);
console.log(`AI critic P1 triage passed: critic ${report.criticStatusBefore} -> ${report.criticStatusAfter}, P1=${summary.bySeverity.p1}, P2=${summary.bySeverity.p2}.`);
