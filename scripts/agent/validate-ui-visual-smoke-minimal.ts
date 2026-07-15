import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  UI_VISUAL_SMOKE_REQUIRED_SURFACES,
  buildUiVisualSmokeMinimalReport,
  validateUiVisualSmokeMinimalReport,
  type UiVisualSmokeMinimalReport,
} from "../../src/lib/evidence/ui-visual-smoke-contract";
import { checkUiSurfaceCoverage } from "./check-ui-surface-coverage";

const ROOT = process.cwd();
const ARTIFACT_PATH = "agent/state/ui-visual-smoke-minimal.generated.json";
const DOC_PATH = "docs/agent-truth/ui-visual-smoke-minimal.md";

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
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
  if (!core.includes("deterministic UI surface coverage") || !core.includes("Non-UI runtime")) {
    failures.push("score report does not keep deterministic UI surface coverage scoped outside non-UI evidence");
  }
  if (!core.includes("operatorFinalChecks") || !core.includes("source-reported UI issue")) {
    failures.push("score report does not expose UI source coverage as the pre-browser proof lane");
  }
  return failures;
}

function assertDeterministicUiSourceCoverage() {
  const failures: string[] = [];
  try {
    checkUiSurfaceCoverage();
  } catch (error) {
    failures.push((error as Error).message);
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
    "# UI Surface Coverage Gate",
    "",
    "Status: deterministic source-owned UI surface coverage lane.",
    "",
    "This lane lets the codebase tell on itself before optional browser reproduction. Browser checks are follow-up only when a source/UI-surface check identifies a visual issue to reproduce.",
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Source checks passed: ${report.passed}`,
    `- Required surface-device targets: ${report.summary.requiredSurfaceCount}`,
    `- Surface groups: ${report.summary.surfaceGroupCount}`,
    `- Source gap surfaces: ${report.summary.missingSurfaceIds.join(", ") || "none"}`,
    `- Non-UI lanes blocked: ${report.nonUiLanesBlocked}`,
    `- Clears provider smoke: ${report.formalGateImpact.clearsProviderSmoke}`,
    `- Clears deployed runtime smoke: ${report.formalGateImpact.clearsDeployedRuntimeSmoke}`,
    "",
    "## Required Surfaces",
    "",
    ...report.surfaces.map((surface) =>
      `- ${surface.surfaceId}: route=${surface.route}; device=${surface.deviceBand}; status=${surface.status}; codexScoreBlocking=${surface.codexScoreBlocking}; reason=${surface.requiresVisualSmokeReason}`),
    "",
    "## Deterministic Checks",
    "",
    "- `npm run check:ui:coverage`",
    "- `npm run check:admin-browser-surface-smoke`",
    "- `npm run check:device-ui`",
    "",
    "## Not Cleared By This Lane",
    "",
    "- Provider proof",
    "- Deployed runtime smoke",
    "- Production admin truth samples",
    "- Payment or GumDrop treasury truth",
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
});
const failures = [
  ...validateUiVisualSmokeMinimalReport(report),
  ...assertScoreIntegration(),
  ...assertChangedUiSurfacesCovered(),
  ...assertDeterministicUiSourceCoverage(),
];
const output: UiVisualSmokeMinimalReport & { validationFailures: string[] } = failures.length > 0
  ? {
      ...report,
      status: "source_surface_checks_failed",
      passed: false,
      detail: `Deterministic UI source coverage validation failed with ${failures.length} issue(s).`,
      formalGateImpact: {
        ...report.formalGateImpact,
        clearsUiSurfaceCoverage: false,
      },
      nextExactSteps: failures.map((failure) => `Resolve UI source coverage validation failure: ${failure}`),
      validationFailures: failures,
    }
  : { ...report, validationFailures: [] };

write(ARTIFACT_PATH, `${JSON.stringify(output, null, 2)}\n`);
write(DOC_PATH, renderDoc(output));

if (failures.length > 0) {
  console.error(`UI visual smoke minimal lane failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `UI surface coverage gate OK: status=${report.status}, requiredSurfaces=${report.summary.requiredSurfaceCount}, sourceGaps=${report.summary.missingSurfaceIds.length}.`,
);
