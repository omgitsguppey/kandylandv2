import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildAiDebugCriticReport,
  summarizeAiDebugCritic,
  type AiDebugCriticGateBlocker,
} from "../../src/lib/debug/ai-debug-critic";
import type { DebugBacklogItem } from "../../src/lib/debug/debug-backlog-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/ai-debug-critic.generated.json";
const DOC_PATH = "docs/agent-truth/ai-debug-critic.md";

function readText(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson<T>(path: string): T | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
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

function getChangedFiles() {
  return Array.from(new Set([
    ...git(["diff", "--name-only", "HEAD"]).split(/\r?\n/u),
    ...git(["diff", "--cached", "--name-only"]).split(/\r?\n/u),
  ].map((line) => line.trim().replace(/\\/g, "/")).filter(Boolean))).sort();
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

function collectFormalArtifacts() {
  return [
    "agent/state/provider-smoke-evidence.generated.json",
    "agent/state/runtime-smoke-evidence.generated.json",
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
  ].filter((path) => existsSync(join(ROOT, path)));
}

function collectBetaBlockers(): AiDebugCriticGateBlocker[] {
  const score = readJson<Record<string, unknown>>("agent/state/public-beta-score.generated.json");
  const blockers: AiDebugCriticGateBlocker[] = [];
  const capDetails = Array.isArray(score?.capDetails) ? score.capDetails : [];
  for (const [index, value] of capDetails.entries()) {
    const text = String(value ?? "");
    const normalized = text.toLowerCase();
    if (normalized.includes("provider")) {
      blockers.push({
        id: `provider-smoke-${index}`,
        label: text,
        evidenceStatus: "formal_missing",
        requiredArtifact: "agent/state/provider-smoke-evidence.generated.json",
      });
    } else if (normalized.includes("runtime")) {
      blockers.push({
        id: `runtime-smoke-${index}`,
        label: text,
        evidenceStatus: "formal_missing",
        requiredArtifact: "agent/state/runtime-smoke-evidence.generated.json",
      });
    } else if (normalized.includes("admin truth")) {
      blockers.push({
        id: `admin-truth-${index}`,
        label: text,
        evidenceStatus: "formal_missing",
        requiredArtifact: "agent/state/admin-truth-sample-evidence.generated.json",
      });
    }
  }
  return blockers;
}

function collectBacklog() {
  const artifact = readJson<{ backlog?: DebugBacklogItem[] }>("agent/state/debug-backlog-engine.generated.json");
  return Array.isArray(artifact?.backlog) ? artifact.backlog : [];
}

function hasExternalAiProviderCall(source: string) {
  return /new\s+VertexAI|\.generateContent\s*\(|\.getGenerativeModel\s*\(|from\s+["']@google-cloud\/vertexai["']|require\(["']@google-cloud\/vertexai["']\)|new\s+OpenAI\s*\(/i.test(source);
}

function renderDoc(report: ReturnType<typeof buildAiDebugCriticReport>) {
  const summary = summarizeAiDebugCritic(report);
  const lines = [
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
    "## Required Checks",
    "",
    ...report.checks.map((check) => `- ${check.id}: ${check.label}`),
    "",
    "## Suggested Validators",
    "",
    ...report.suggestedValidators.map((command) => `- \`${command}\``),
    "",
    "## Findings",
    "",
    ...(report.findings.length > 0
      ? report.findings.map((finding) => `- ${finding.severity}: ${finding.title} (${finding.check}) - ${finding.requiredFix}`)
      : ["- No critic findings for the current scoped change."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

const changedFiles = getChangedFiles();
const sourceFiles = [
  "src/lib/debug/ai-debug-critic.ts",
  "src/lib/debug/ai-debug-critic-contract.ts",
  "scripts/agent/validate-ai-debug-critic.ts",
];
const sourceText = sourceFiles.filter((path) => existsSync(join(ROOT, path))).map(readText).join("\n");
const report = buildAiDebugCriticReport({
  changedFiles,
  proposedFixSummary: "Adds source-only AI debug critic checks without clearing runtime or provider gates.",
  debugBacklog: collectBacklog(),
  betaScoreBlockers: collectBetaBlockers(),
  doctrineIndex: readJson<{ surfaces?: string[] }>("agent/context/doctrine.index.json") ?? undefined,
  validatorMap: {
    suggestedValidators: [
      "npm run check:ai-debug-critic",
      "npm run check:debug-evidence-pipeline",
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
    changedTelemetryFiles: changedFiles.filter((path) => /^(src|functions)\//i.test(path) && /telemetry|analytics|event/i.test(path)),
  },
  costReadiness: {
    guardedCostPaths: changedFiles.filter((path) => path.includes("ai-debug-critic")),
  },
  evidenceStatus: {
    formalArtifacts: collectFormalArtifacts(),
    sourceOnlyClaims: [],
  },
  fileLineCounts: getLineCounts(changedFiles),
});

const failures: string[] = [];
const checkIds = new Set(report.checks.map((check) => check.id));
for (const required of [
  "no_fake_evidence",
  "no_formal_gate_cleared_without_artifact",
  "no_duplicate_systems",
  "no_chat_nav_touch_without_explicit_request",
  "no_payment_math_change_without_explicit_request",
  "no_monolith_growth_without_split_plan",
  "no_orphaned_telemetry",
  "no_new_cost_path_without_guard",
  "no_source_ready_as_runtime_proof",
]) {
  if (!checkIds.has(required as never)) failures.push(`critic check missing: ${required}`);
}

const fixture = buildAiDebugCriticReport({
  changedFiles: [
    "src/app/api/paypal/capture/route.ts",
    "src/components/Navigation/Navbar.tsx",
    "src/lib/debug/duplicate-debug-system.ts",
    "src/lib/analytics/orphaned-sidepath.ts",
    "src/components/LargePanel.tsx",
  ],
  proposedFixSummary: "Clears runtime provider smoke proof from source-only checks.",
  betaScoreBlockers: [{
    id: "provider",
    label: "Provider smoke",
    evidenceStatus: "formal_missing",
    requiredArtifact: "agent/state/provider-smoke-evidence.generated.json",
  }],
  evidenceStatus: { formalArtifacts: [], sourceOnlyClaims: ["provider smoke passed"] },
  telemetryGraph: { canonicalEventFiles: [], changedTelemetryFiles: ["src/lib/analytics/orphaned-sidepath.ts"] },
  fileLineCounts: { "src/components/LargePanel.tsx": 900 },
});
const fixtureChecks = new Set(fixture.findings.map((finding) => finding.check));
for (const expected of [
  "no_fake_evidence",
  "no_formal_gate_cleared_without_artifact",
  "no_duplicate_systems",
  "no_chat_nav_touch_without_explicit_request",
  "no_payment_math_change_without_explicit_request",
  "no_monolith_growth_without_split_plan",
  "no_orphaned_telemetry",
  "no_source_ready_as_runtime_proof",
]) {
  if (!fixtureChecks.has(expected as never)) failures.push(`fixture did not detect ${expected}`);
}
if (fixture.suggestedValidators.length === 0) failures.push("critic output lacks required validators.");
if (hasExternalAiProviderCall(sourceText)) failures.push("critic must not call external AI or provider SDKs.");
if (report.externalAiCallsAllowed !== false || report.sourceOnly !== true) failures.push("critic report must stay source-only and external-AI-disabled.");

write(REPORT_PATH, `${JSON.stringify({ ...report, summary: summarizeAiDebugCritic(report) }, null, 2)}\n`);
write(DOC_PATH, renderDoc(report));

if (failures.length > 0) {
  console.error("AI debug critic validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`AI debug critic passed: ${report.criticStatus}, ${report.findings.length} finding(s), ${report.suggestedValidators.length} validator(s).`);
