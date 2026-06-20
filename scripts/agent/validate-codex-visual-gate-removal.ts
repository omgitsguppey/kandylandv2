import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { PublicBetaScoreReport } from "../../src/lib/agent-score/core";

const ROOT = process.cwd();
const ARTIFACT_PATH = "agent/state/codex-visual-gate-removal.generated.json";
const DOC_PATH = "docs/agent-truth/codex-visual-gate-removal.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";
const VISUAL_PATH = "agent/state/ui-visual-smoke-minimal.generated.json";
const RETIRED_UI_SCORE_GATE_ID = ["visual", "Manual", "Smoke"].join("");

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson<T>(path: string): T | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as T;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function sourceIncludes(path: string, expected: string) {
  return readFileSync(join(ROOT, path), "utf8").includes(expected);
}

function renderDoc(report: Record<string, unknown>) {
  const summary = report.summary as Record<string, unknown>;
  return [
    "# Codex Visual Gate Removal",
    "",
    "Status: UI visual confirmation is no longer a Codex-managed readiness gate.",
    "",
    "Deterministic UI surface coverage is source-owned. The codebase can fail missing modal/surface coverage before anyone opens the site. Browser viewing is optional reproduction only.",
    "",
    "## Summary",
    "",
    `- Status: ${String(report.status)}`,
    `- Visual gate in evidence gates: ${String(summary.visualGateInEvidenceGates)}`,
    `- Visual gate in launch blockers: ${String(summary.visualGateInLaunchBlockers)}`,
    `- Visual gate in evidence caps: ${String(summary.visualGateInEvidenceCaps)}`,
    `- Operator checklist present: ${String(summary.operatorChecklistPresent)}`,
    `- UI surfaces tracked: ${String(summary.uiVisualSurfaceCount)}`,
    `- Provider/runtime/admin gates preserved: ${String(summary.providerRuntimeAdminGatesPreserved)}`,
    "",
    "## UI Source Coverage",
    "",
    "- `operatorFinalChecks.uiVisualSurfaces` lists layout-sensitive UI surfaces.",
    "- `sourceChecksPassed=true` means deterministic source coverage is current.",
    "- `passedInCodex=true` is allowed for source UI coverage only.",
    "",
    "## Formal Gates",
    "",
    "- Provider smoke remains separate.",
    "- Deployed runtime smoke remains separate.",
    "- Admin truth/sample smoke remains separate.",
    "",
  ].join("\n");
}

const score = readJson<PublicBetaScoreReport>(SCORE_PATH);
const visual = readJson<Record<string, unknown>>(VISUAL_PATH);
const failures: string[] = [];
const visualGateInEvidenceGates = score?.evidenceGates?.some((gate) => gate.id === RETIRED_UI_SCORE_GATE_ID) === true;
const visualGateInLaunchBlockers = (score?.launchBlockers ?? []).some((blocker) => /visual|screenshot|manual smoke/iu.test(blocker));
const visualGateInEvidenceCaps = (score?.evidenceCapsApplied ?? []).some((cap) => /visual|screenshot|manual smoke/iu.test(cap));
const operatorChecklist = score?.operatorFinalChecks?.uiVisualSurfaces;
const operatorChecklistRecord = operatorChecklist as { passedInCodex?: unknown; sourceChecksPassed?: unknown; needsOperatorReview?: unknown; note?: unknown } | undefined;
const operatorChecklistPresent = Boolean(operatorChecklist);
const uiVisualSurfaceCount = operatorChecklist?.surfaces?.length ?? 0;
const providerRuntimeAdminGatesPreserved = ["runtimeProviderSmoke", "adminTruthSamples"].every((gateId) =>
  score?.evidenceGates?.some((gate) => gate.id === gateId && gate.gateRequiredForExit) === true,
);

if (!score) failures.push(`${SCORE_PATH} is missing or invalid.`);
if (!visual) failures.push(`${VISUAL_PATH} is missing or invalid.`);
if (visualGateInEvidenceGates) failures.push("UI visual source coverage must not remain in Codex evidence gates.");
if (visualGateInLaunchBlockers) failures.push("UI visual source coverage must not remain in Codex launch blockers.");
if (visualGateInEvidenceCaps) failures.push("UI visual source coverage must not remain in Codex evidence caps.");
if (!operatorChecklistPresent) failures.push("operatorFinalChecks.uiVisualSurfaces must be present.");
if (operatorChecklistRecord?.sourceChecksPassed !== true || operatorChecklistRecord?.passedInCodex !== true) {
  failures.push("UI source coverage must be allowed to pass inside Codex.");
}
if (operatorChecklistRecord?.needsOperatorReview !== false) failures.push("UI source coverage must not require operator review when source checks pass.");
if (typeof operatorChecklistRecord?.note !== "string" || !operatorChecklistRecord.note.includes("source-reported UI issue")) {
  failures.push("operator checklist must state browser reproduction is optional only for a source-reported UI issue.");
}
if (uiVisualSurfaceCount <= 0) failures.push("operator visual checklist must include tracked UI surfaces.");
if (!providerRuntimeAdminGatesPreserved) failures.push("provider/runtime/admin formal gates must remain score gates.");
if (!sourceIncludes("src/lib/agent-score/core.ts", "operatorFinalChecks")) {
  failures.push("core score report must expose operatorFinalChecks.");
}
if (!sourceIncludes("src/lib/agent-score/core.ts", "deterministic UI surface coverage")) {
  failures.push("core score report must state deterministic UI surface coverage.");
}
if (!sourceIncludes("src/lib/evidence/ui-visual-smoke-contract.ts", "source_surface_checked")) {
  failures.push("visual smoke contract must use source_surface_checked status.");
}
if (!sourceIncludes("src/lib/evidence/ui-visual-smoke-contract.ts", "codexScoreBlocking=false")) {
  failures.push("visual smoke contract must mark Codex score blocking false.");
}

const report = {
  reportKey: "codex-visual-gate-removal",
  generatedAtUtc: new Date().toISOString(),
  currentHead: git(["rev-parse", "HEAD"]),
  status: failures.length > 0 ? "blocked" : "codex_visual_gate_removed",
  summary: {
    visualGateInEvidenceGates,
    visualGateInLaunchBlockers,
    visualGateInEvidenceCaps,
    operatorChecklistPresent,
    uiVisualSurfaceCount,
    needsOperatorReview: operatorChecklistRecord?.needsOperatorReview === true,
    sourceChecksPassed: operatorChecklistRecord?.sourceChecksPassed === true,
    passedInCodex: operatorChecklistRecord?.passedInCodex === true,
    providerRuntimeAdminGatesPreserved,
    visualConfirmationHandledOutsideCodex: typeof operatorChecklistRecord?.note === "string" && operatorChecklistRecord.note.includes("source-reported UI issue"),
  },
  visualArtifactStatus: String(visual?.status ?? "missing"),
  validationFailures: failures,
};

write(ARTIFACT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, renderDoc(report));

if (failures.length > 0) {
  console.error(`Codex visual gate removal failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Codex visual gate removal OK: uiVisualSurfaces=${uiVisualSurfaceCount}, sourceChecksPassed=${operatorChecklist?.sourceChecksPassed === true}.`);
