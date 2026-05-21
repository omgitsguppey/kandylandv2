import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  UI_VISUAL_SMOKE_REQUIRED_SURFACES,
  buildUiVisualSmokeMinimalReport,
  validateUiVisualSmokeMinimalReport,
  type UiVisualSmokeMinimalReport,
  type UiVisualSmokeSurfaceEvidence,
} from "../../src/lib/evidence/ui-visual-smoke-contract";

const ROOT = process.cwd();
const ARTIFACT_PATH = "agent/state/ui-visual-smoke-minimal.generated.json";
const DOC_PATH = "docs/agent-truth/ui-visual-smoke-minimal.md";
const TEMPLATE_PATH = "agent/evidence/ui-visual-smoke/template.json";
const OPTIONAL_EVIDENCE_PATH = "agent/evidence/ui-visual-smoke/evidence.json";

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): Record<string, unknown> | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readEvidenceSurfaces() {
  const parsed = readJson(OPTIONAL_EVIDENCE_PATH);
  if (!parsed || !Array.isArray(parsed.surfaces)) return undefined;
  return parsed.surfaces
    .filter((surface): surface is Partial<UiVisualSmokeSurfaceEvidence> =>
      Boolean(surface) && typeof surface === "object" && !Array.isArray(surface),
    )
    .map((surface) => ({
      ...surface,
      surfaceId: readString(surface.surfaceId),
      surfaceGroup: readString(surface.surfaceGroup),
      route: readString(surface.route),
      requiresVisualSmokeReason: readString(surface.requiresVisualSmokeReason),
      screenshotArtifactPath: readString(surface.screenshotArtifactPath),
      operatorConfirmed: readBoolean(surface.operatorConfirmed),
      operatorNote: readString(surface.operatorNote),
      blocksScoreForUiOnly: readBoolean(surface.blocksScoreForUiOnly),
    }));
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function assertScoreIntegration() {
  const scorer = readFileSync(join(ROOT, "scripts/agent/score-public-beta-readiness.ts"), "utf8");
  const core = readFileSync(join(ROOT, "src/lib/agent-score/core.ts"), "utf8");
  const failures: string[] = [];
  if (!scorer.includes("agent/state/ui-visual-smoke-minimal.generated.json")) {
    failures.push("score report does not inspect ui-visual-smoke-minimal generated artifact");
  }
  if (!scorer.includes("uiVisualSmoke.requiredSurfaces")) {
    failures.push("score report does not expose exact UI visual smoke surfaces");
  }
  if (!core.includes("operator-final checklist") || !core.includes("Non-UI runtime")) {
    failures.push("score report does not keep visual/manual smoke scoped outside non-UI evidence");
  }
  if (!core.includes("operatorFinalChecks") || !core.includes("visual confirmation handled outside Codex")) {
    failures.push("score report does not expose UI visual smoke as an operator-final checklist outside Codex");
  }
  return failures;
}

function assertChangedUiSurfacesCovered() {
  const failures: string[] = [];
  const requiredSurfaceIds = new Set<string>(UI_VISUAL_SMOKE_REQUIRED_SURFACES.map((surface) => surface.surfaceId));
  const expectedFromMobileResidual = [
    "user_dashboard_mobile",
    "wallet_mobile",
    "creator_dashboard_mobile",
    "creator_profile_mobile",
    "admin_debug_summary_mobile",
    "drops_user_library_mobile",
  ];
  for (const surfaceId of expectedFromMobileResidual) {
    if (!requiredSurfaceIds.has(surfaceId)) {
      failures.push(`changed UI surface is missing from visual smoke list: ${surfaceId}`);
    }
  }
  return failures;
}

function renderDoc(report: UiVisualSmokeMinimalReport) {
  return [
    "# UI Visual Smoke Minimal Lane",
    "",
    "Status: minimal UI-only visual smoke evidence lane. It defines the exact layout-sensitive surfaces that need screenshot or operator visual confirmation.",
    "",
    "This lane does not provide proof by itself. Missing evidence stays missing until an artifact exists.",
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Passed in Codex: ${report.passed}`,
    `- Required surface-device targets: ${report.summary.requiredSurfaceCount}`,
    `- Surface groups: ${report.summary.surfaceGroupCount}`,
    `- Operator-final pending surfaces: ${report.summary.missingSurfaceIds.join(", ") || "none"}`,
    `- Non-UI lanes blocked: ${report.nonUiLanesBlocked}`,
    `- Clears provider smoke: ${report.formalGateImpact.clearsProviderSmoke}`,
    `- Clears deployed runtime smoke: ${report.formalGateImpact.clearsDeployedRuntimeSmoke}`,
    "",
    "## Required Surfaces",
    "",
    ...report.surfaces.map((surface) =>
      `- ${surface.surfaceId}: route=${surface.route}; device=${surface.deviceBand}; status=${surface.status}; codexScoreBlocking=${surface.codexScoreBlocking}; reason=${surface.requiresVisualSmokeReason}`),
    "",
    "## Excluded By Default",
    "",
    "- Chat",
    "- Top nav",
    "- Bottom nav",
    "- Non-UI telemetry/admin/cost/source/provider/runtime lanes",
    "",
    "## Template",
    "",
    `- Template path: ${TEMPLATE_PATH}`,
    "- The template is not evidence and does not clear provider, runtime, admin, or Codex score gates.",
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n");
}

const currentHead = git(["rev-parse", "HEAD"]);
const report = buildUiVisualSmokeMinimalReport({
  currentHead,
  generatedAtUtc: new Date().toISOString(),
  surfaces: readEvidenceSurfaces(),
});
const failures = [
  ...validateUiVisualSmokeMinimalReport(report, { templateExists: existsSync(join(ROOT, TEMPLATE_PATH)) }),
  ...assertScoreIntegration(),
  ...assertChangedUiSurfacesCovered(),
];
const output = { ...report, validationFailures: failures };

write(ARTIFACT_PATH, `${JSON.stringify(output, null, 2)}\n`);
write(DOC_PATH, renderDoc(output));

if (failures.length > 0) {
  console.error(`UI visual smoke minimal lane failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `UI visual smoke minimal lane OK: status=${report.status}, requiredSurfaces=${report.summary.requiredSurfaceCount}, missing=${report.summary.missingSurfaceIds.length}.`,
);
