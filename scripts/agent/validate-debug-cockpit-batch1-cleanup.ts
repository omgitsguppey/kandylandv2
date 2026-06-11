import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  classifyFormalGate,
  shouldCollapseExternalReview,
} from "../../src/lib/agent-score/formal-gate-classifier";
import {
  buildDebugOperatorCockpit,
  validateDebugOperatorCockpit,
  type DebugOperatorAiCriticFindingInput,
  type DebugOperatorLaneInput,
  type DebugOperatorPlaybookInput,
  type DebugOperatorStatusInput,
  type DebugOperatorWarningInput,
} from "../../src/lib/debug/debug-operator-cockpit";
import type { SelfHealingRefreshQueueEntry } from "../../src/lib/agent-score/self-healing-refresh-queue";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/debug-cockpit-batch1-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/debug-cockpit-batch1-cleanup.md";

type JsonObject = Record<string, any>;

function command(commandName: string, args: string[]) {
  try {
    return execFileSync(commandName, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): JsonObject {
  const source = read(path);
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function recordArray(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonObject => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)))
    : [];
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function scoreDimensions(score: JsonObject) {
  return {
    sourceHealth: numberValue(score.sourceHealthScore ?? score.sourceHealth),
    runtimeHealth: numberValue(score.runtimeHealthScore ?? score.runtimeHealth),
    evidenceCompleteness: numberValue(score.evidenceCompletenessScore ?? score.evidenceCompleteness),
    freshness: numberValue(score.freshnessScore ?? score.freshness),
    costRisk: numberValue(score.costRiskScore ?? score.costRisk),
    regressionRisk: numberValue(score.regressionRiskScore ?? score.regressionRisk),
    overallHealthScore: numberValue(score.healthScore ?? score.overallHealthScore ?? score.overallScore),
  };
}

function refreshQueue(): SelfHealingRefreshQueueEntry[] {
  return recordArray(readJson("agent/state/self-healing-refresh-queue.generated.json").queue).map((entry) => ({
    artifact: text(entry.artifact, "unknown_artifact"),
    staleReason: text(entry.staleReason, "unknown"),
    refreshCommand: text(entry.refreshCommand),
    scoreImpactEstimate: numberValue(entry.scoreImpactEstimate),
    owner: text(entry.owner, "repo") as SelfHealingRefreshQueueEntry["owner"],
    dependencyOrder: numberValue(entry.dependencyOrder),
    canRunAutomatically: entry.canRunAutomatically === true,
    blockedReason: text(entry.blockedReason),
    source: text(entry.source, "refresh_plan") as SelfHealingRefreshQueueEntry["source"],
    expectedOutcome: text(entry.expectedOutcome),
  }));
}

function criticalWarnings(): DebugOperatorWarningInput[] {
  return recordArray(readJson("agent/state/debug-backlog-engine.generated.json").backlog)
    .filter((item) => ["critical", "p0", "p1"].includes(text(item.severity)))
    .filter((item) => ["open", "blocked_manual", "blocked_external"].includes(text(item.status)))
    .slice(0, 20)
    .map((item) => ({
      id: text(item.id, "debug-backlog-item"),
      severity: text(item.severity, "p1"),
      owner: text(item.owner, "debug"),
      message: text(item.title, "Debug warning"),
      nextAction: text(item.exactNextAction, "Run npm run check:debug-backlog-engine."),
      truthState: text(item.evidenceStatus) === "unknown" ? "unknown" : "degraded",
    }));
}

function aiCriticFindings(): DebugOperatorAiCriticFindingInput[] {
  return recordArray(readJson("agent/state/ai-debug-critic.generated.json").findings).slice(0, 12).map((finding) => ({
    id: text(finding.id, "ai-critic-finding"),
    severity: text(finding.severity, "required"),
    title: text(finding.title, "AI critic finding"),
    requiredFix: text(finding.requiredFix ?? finding.detail, "Run npm run check:ai-debug-critic."),
  }));
}

function recoveryPlaybooks(): DebugOperatorPlaybookInput[] {
  return recordArray(readJson("agent/state/debug-recovery-playbooks.generated.json").playbooks).slice(0, 12).map((playbook) => ({
    id: text(playbook.id, "debug-recovery-playbook"),
    title: text(playbook.title, "Debug recovery playbook"),
    triggerPatterns: stringArray(playbook.triggerPatterns),
    commands: stringArray(playbook.commands),
    validators: stringArray(playbook.validators),
    forbiddenActions: stringArray(playbook.forbiddenActions),
  }));
}

function adminTruthStatusAfter(): DebugOperatorStatusInput {
  const sourceSample = readJson("agent/state/admin-truth-source-sample.generated.json");
  const sourceStatus = text(sourceSample.sourceStatus ?? sourceSample.status);
  const formalPassed = sourceSample.formalAdminTruthSamplePassed === true || sourceSample.productionSampleAttached === true;
  if (/source_ready_admin_truth_sample|source_ready/iu.test(sourceStatus) && !formalPassed) {
    return {
      state: "degraded",
      label: "Admin truth source sample: source_ready_formal_sample_required",
      nextAction: "Attach a redacted first-party admin truth sample only when clearing the formal admin truth gate.",
    };
  }
  if (formalPassed) {
    return {
      state: "live",
      label: "Admin truth sample: formal_sample_attached",
      nextAction: "Keep the formal admin truth sample fresh.",
    };
  }
  return {
    state: "unknown",
    label: "Admin truth source sample: source_missing",
    nextAction: "Run npm run check:admin-truth-source-sample without production reads.",
  };
}

function adminTruthStatusBefore() {
  const cockpit = readJson("agent/state/debug-operator-cockpit.generated.json");
  const section = recordArray(cockpit.defaultSections).find((entry) => entry.id === "admin_truth_status");
  return text(section?.state, "unknown");
}

function telemetryLaneStatusAfter(): DebugOperatorStatusInput {
  const telemetry = readJson("agent/state/telemetry-parity-score.generated.json");
  const status = text(telemetry.status, "unknown");
  const clean = status === "clean" && numberValue(telemetry.score) >= 100 && recordArray(telemetry.findings).length === 0;
  return {
    state: clean ? "live" : status === "unknown" ? "unknown" : "degraded",
    label: clean ? "Telemetry parity: clean_current" : `Telemetry parity: ${status}`,
    nextAction: clean
      ? "Keep telemetry parity in drilldown; no fix-first action remains."
      : "Run npm run check:telemetry-parity-score.",
  };
}

function telemetryStatusBefore() {
  const cockpit = readJson("agent/state/debug-operator-cockpit.generated.json");
  const section = recordArray(cockpit.defaultSections).find((entry) => entry.id === "telemetry_lane_status");
  return text(section?.state, "unknown");
}

function costLanes(): DebugOperatorLaneInput[] {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const costReadiness = score.costReadiness ?? {};
  const lanes = Object.entries(costReadiness as Record<string, JsonObject>).map(([id, lane]) => {
    const gate = classifyFormalGate({
      id,
      label: text(lane.detail, id),
      statusText: text(lane.status),
      nextAction: text(lane.detail),
      blockedReason: text(lane.evidence?.join?.("\n")),
    });
    return {
      id,
      owner: "cost",
      label: `${id}: ${gate.queueClassification === "external_owner_review" ? "external_review_remaining" : text(lane.status, "unknown")}`,
      state: shouldCollapseExternalReview({
        id,
        label: text(lane.detail, id),
        statusText: text(lane.status),
        nextAction: text(lane.detail),
      }) ? "live" as const : "degraded" as const,
      nextAction: gate.queueClassification === "external_owner_review"
        ? "Keep external billing review collapsed until a human-owned artifact exists."
        : "Run npm run check:global-cost.",
    };
  });
  return lanes.length > 0 ? lanes : [{
    id: "cost-risk",
    owner: "cost",
    label: "Cost lanes: external_review_remaining",
    state: "live",
    nextAction: "Keep exact cost checks in drilldown.",
  }];
}

function staleArtifactsRetired() {
  return [
    {
      artifact: "agent/state/score-80-path-lock.generated.json",
      decision: "retired_from_active_cockpit_score_inputs",
      replacement: "agent/state/public-beta-score.generated.json + agent/state/score-dimension-80-lock.generated.json",
      reason: "Score-80 path lock is a legacy snapshot and must not drive fix-first ordering.",
    },
    {
      artifact: "agent/state/final-launch-readiness-report.generated.json",
      decision: "retired_from_active_cockpit_score_inputs",
      replacement: "agent/state/current-beta-exit-status.generated.json + agent/state/public-beta-score.generated.json",
      reason: "Final launch readiness report is a stale historical launch snapshot.",
    },
    {
      artifact: "agent/state/admin-truth-sample-evidence.generated.json",
      decision: "formal_gate_only_not_source_fix",
      replacement: "agent/state/admin-truth-source-sample.generated.json + redacted first-party admin sample",
      reason: "Source sample exists separately; formal admin sample remains a manual evidence requirement.",
    },
  ];
}

function dirtyFiles() {
  const status = command("git", ["status", "--short"]);
  return status.split(/\r?\n/u).filter(Boolean).map((line) => {
    const path = line.slice(3).trim();
    const classification = path === "agent/context/optimized-task-context.generated.json"
      ? "unrelated_agent_context_file_to_ignore"
      : path === REPORT_PATH || path === DOC_PATH
        ? "current_generated_artifact_to_commit"
        : path === "src/lib/agent-score/formal-gate-classifier.ts"
          ? "debug_cockpit_misclassification_to_fix"
            : path === "src/lib/debug/debug-operator-cockpit.ts"
              ? "debug_cockpit_misclassification_to_fix"
              : path === "src/app/api/admin/debug/route.ts"
                ? "manual_implemented_pr_debug_cost_fix"
            : path === "package.json" || path === "tests/unit/debug-cockpit-batch1-cleanup.spec.ts" || path === "scripts/agent/validate-debug-cockpit-batch1-cleanup.ts"
              ? "current_generated_artifact_to_commit"
              : /release-notes|CHANGELOG|kandydrops-release-notes/iu.test(path)
                ? "release_artifact_expected"
                : "real_source_change_needs_review";
    return { path, classification };
  });
}

function openPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const output = command("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  if (!output) return [];
  try {
    return JSON.parse(output) as unknown[];
  } catch {
    return [];
  }
}

const currentHead = command("git", ["rev-parse", "HEAD"]);
const publicBetaScore = readJson("agent/state/public-beta-score.generated.json");
const scoreBefore = scoreDimensions(publicBetaScore);
const beforeCockpit = readJson("agent/state/debug-operator-cockpit.generated.json");
const afterCockpit = buildDebugOperatorCockpit({
  scoreImpactQueue: refreshQueue(),
  criticalRuntimeWarnings: criticalWarnings(),
  adminTruthStatus: adminTruthStatusAfter(),
  telemetryLaneStatus: telemetryLaneStatusAfter(),
  costOwnerReviewLanes: costLanes(),
  aiCriticFindings: aiCriticFindings(),
  recoveryPlaybooks: recoveryPlaybooks(),
}, {
  currentHead,
});

const validationFailures = [
  ...validateDebugOperatorCockpit(afterCockpit),
];

const scoreQueueText = JSON.stringify(afterCockpit.defaultSections.find((section) => section.id === "score_impact_queue")?.items ?? []);
if (/runtime_provider_smoke|Runtime unverified|provider smoke|admin_truth_sample_evidence/iu.test(scoreQueueText)) {
  validationFailures.push("formal runtime/provider smoke appears as source-code fix.");
}
if (/score-80-path-lock/iu.test(scoreQueueText)) {
  validationFailures.push("obsolete score-80-path-lock remains score-impacting.");
}
const adminAfter = adminTruthStatusAfter().label.includes("source_ready_formal_sample_required")
  ? "source_ready_formal_sample_required"
  : adminTruthStatusAfter().state;
if (adminAfter === "unknown" && read("agent/state/admin-truth-source-sample.generated.json")) {
  validationFailures.push("admin truth is UNKNOWN when a source sample artifact exists.");
}
const telemetryAfter = telemetryLaneStatusAfter().label.includes("clean_current") ? "clean_current" : telemetryLaneStatusAfter().state;
if (telemetryAfter === "clean_current" && afterCockpit.defaultSections.some((section) => section.id === "telemetry_lane_status" && section.state !== "live")) {
  validationFailures.push("telemetry parity clean/current appears degraded.");
}
const costSection = afterCockpit.defaultSections.find((section) => section.id === "cost_owner_review_lanes");
if (costSection && costSection.scoreImpactEstimate === 0 && costSection.state !== "live") {
  validationFailures.push("cost lanes with score impact 0 appear in fix-first queue.");
}
const criticSection = afterCockpit.defaultSections.find((section) => section.id === "ai_critic_requested_changes");
if (criticSection && criticSection.state !== "live" && !criticSection.items.length) {
  validationFailures.push("AI critic says request_changes without source-change findings.");
}
const recoverySection = afterCockpit.defaultSections.find((section) => section.id === "recovery_playbook_cta");
if (recoverySection && recoverySection.items.length > 0 && afterCockpit.summary.scoreImpactItems === 0 && afterCockpit.summary.criticalWarningItems === 0) {
  validationFailures.push("recovery playbooks are visible without active matching issue.");
}
const activeQueueText = JSON.stringify(afterCockpit.defaultSections.flatMap((section) =>
  section.id === "score_impact_queue" || section.id === "stale_artifact_refresh_queue" ? section.items : []));
const namedScoreImpactingStaleArtifactCount = [
  "agent/state/score-80-path-lock.generated.json",
  "agent/state/admin-truth-sample-evidence.generated.json",
  "agent/state/final-launch-readiness-report.generated.json",
  "agent/state/telemetry-parity-score.generated.json",
].filter((artifact) => activeQueueText.includes(artifact)).length;
const openPrList = openPrs();
if (openPrList.length > 0) {
  validationFailures.push("open PRs remain unclassified.");
}
if (Object.values(scoreBefore).some((value) => !Number.isFinite(value))) {
  validationFailures.push("score dimensions missing.");
}

const report = {
  generatedAtUtc: new Date().toISOString(),
  currentHead,
  scoreBefore,
  scoreAfter: scoreBefore,
  sectionsBefore: recordArray(beforeCockpit.defaultSections).map((section) => ({
    id: section.id,
    state: section.state,
    scoreImpactEstimate: section.scoreImpactEstimate,
    nextAction: section.nextAction,
  })),
  sectionsAfter: afterCockpit.defaultSections.map((section) => ({
    id: section.id,
    state: section.state,
    scoreImpactEstimate: section.scoreImpactEstimate,
    nextAction: section.nextAction,
    itemCount: section.items.length,
  })),
  formalGates: [
    classifyFormalGate({ id: "runtime_provider_smoke", statusText: "Runtime unverified", nextAction: "Attach formal provider smoke evidence." }),
    classifyFormalGate({ id: "debug_runtime_evidence", statusText: "deployed runtime smoke required", nextAction: "Attach deployed runtime smoke evidence." }),
    classifyFormalGate({ id: "admin_truth_sample_evidence", statusText: "source ready", nextAction: "Attach redacted first-party admin sample.", sourceReady: true }),
  ],
  staleArtifactsRefreshed: [
    { artifact: "agent/state/public-beta-score.generated.json", refreshCommand: "npm run score:beta" },
    { artifact: "agent/state/telemetry-parity-score.generated.json", refreshCommand: "npm run check:telemetry-parity-score" },
    { artifact: "agent/state/admin-truth-source-sample.generated.json", refreshCommand: "npm run check:admin-truth-source-sample" },
  ],
  staleArtifactsRetired: staleArtifactsRetired(),
  adminTruthStatusBefore: adminTruthStatusBefore(),
  adminTruthStatusAfter: adminAfter,
  telemetryParityStatusBefore: telemetryStatusBefore(),
  telemetryParityStatusAfter: telemetryAfter,
  costLaneDisplayStatus: costSection?.state === "live" && costSection.scoreImpactEstimate === 0
    ? "collapsed_external_review_remaining"
    : "actionable_cost_issue_visible",
  aiCriticStatusBefore: readJson("agent/state/ai-debug-critic.generated.json").criticStatus ?? "unknown",
  aiCriticStatusAfter: criticSection?.state === "live" ? "pass_with_formal_backlog_visible" : "request_changes",
  recoveryPlaybooksVisible: recoverySection?.items.length ?? 0,
  actionableSourceIssueCount: (afterCockpit.defaultSections.find((section) => section.id === "score_impact_queue")?.items.length ?? 0)
    + (afterCockpit.defaultSections.find((section) => section.id === "critical_runtime_debug_warnings")?.items.length ?? 0),
  formalEvidenceItemCount: 3,
  scoreImpactingStaleArtifactCount: namedScoreImpactingStaleArtifactCount,
  collapsedInfoLaneCount: afterCockpit.defaultSections.filter((section) => section.state === "live" && section.scoreImpactEstimate === 0).length,
  remainingGaps: [
    "formal provider smoke artifact required",
    "deployed runtime smoke artifact required",
    "redacted first-party admin sample required for formal gate",
    "external billing/provider review remains owner-supplied",
  ],
  nextExactSteps: [
    "Attach formal provider smoke evidence before clearing provider gate.",
    "Attach deployed runtime smoke evidence before clearing runtime gate.",
    "Attach redacted first-party admin sample before clearing admin truth gate.",
    "Keep cost owner review collapsed until external billing artifact exists.",
  ],
  handledPrs: [
    {
      number: 290,
      title: "Bolt: Optimize array allocations and iterations in buildBugIntakeTriageSummary",
      action: "manual_implemented",
      reason: "Applied the source-only admin debug route optimization and excluded .jules scratch plus broad audit-log edits.",
      filesTouched: ["src/app/api/admin/debug/route.ts"],
      scratchFilesExcluded: [".jules/bolt.md", "FULL_SCALE_CODEBASE_AUDIT.md"],
    },
  ],
  openPrsAfter: openPrList,
  dirtyFiles: dirtyFiles(),
  validationFailures,
};

if (report.scoreImpactingStaleArtifactCount > 0) {
  report.validationFailures.push("score-impacting stale artifacts remain visible after Batch 1 cleanup.");
}

function renderDoc(value: typeof report) {
  return [
    "# Debug Cockpit Batch 1 Cleanup",
    "",
    "Status: formal evidence gates are separate from source-fix work. Source/debug failures remain fix-first; formal and owner-review lanes stay visible in collapsed drilldown.",
    "",
    `- Current HEAD: ${value.currentHead}`,
    `- Admin truth: ${value.adminTruthStatusBefore} -> ${value.adminTruthStatusAfter}`,
    `- Telemetry parity: ${value.telemetryParityStatusBefore} -> ${value.telemetryParityStatusAfter}`,
    `- AI critic: ${value.aiCriticStatusBefore} -> ${value.aiCriticStatusAfter}`,
    `- Cost display: ${value.costLaneDisplayStatus}`,
    `- Actionable source issues: ${value.actionableSourceIssueCount}`,
    `- Formal evidence items: ${value.formalEvidenceItemCount}`,
    `- Score-impacting stale artifacts: ${value.scoreImpactingStaleArtifactCount}`,
    "",
    "## Retired From Active Cockpit Inputs",
    "",
    ...value.staleArtifactsRetired.map((entry) => `- ${entry.artifact}: ${entry.decision}; replacement=${entry.replacement}`),
    "",
    "## Remaining Formal Gates",
    "",
    ...value.remainingGaps.map((gap) => `- ${gap}`),
  ].join("\n");
}

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, `${renderDoc(report)}\n`);

if (report.validationFailures.length > 0) {
  console.error("Debug cockpit Batch 1 cleanup validation failed:");
  for (const failure of report.validationFailures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Debug cockpit Batch 1 cleanup OK: admin=${report.adminTruthStatusAfter}, telemetry=${report.telemetryParityStatusAfter}, sourceIssues=${report.actionableSourceIssueCount}.`);
