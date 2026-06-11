import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  ADMIN_BROWSER_SURFACE_DEFINITIONS,
  buildAdminBrowserSurfaceSmokeReport,
  validateAdminBrowserSurfaceSmokeReport,
  type AdminBrowserSurfaceEvidenceInput,
  type AdminBrowserSurfaceEvidenceProvenance,
  type AdminBrowserSurfaceSmokeReport,
} from "../../src/lib/evidence/admin-browser-surface-smoke-contract";

const ROOT = process.cwd();
const ARTIFACT_PATH = "agent/state/admin-browser-surface-smoke.generated.json";
const DOC_PATH = "docs/agent-truth/admin-browser-surface-smoke.md";
const TEMPLATE_PATH = "agent/evidence/admin-browser-surface-smoke/template.json";
const OPTIONAL_EVIDENCE_PATH = "agent/evidence/admin-browser-surface-smoke/evidence.json";

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

function toEvidenceSource(value: unknown): AdminBrowserSurfaceEvidenceProvenance["source"] {
  return value === "local_in_app_browser" || value === "operator_screenshot" || value === "manual_external"
    ? value
    : "unknown";
}

function readEvidenceFile() {
  const parsed = readJson(OPTIONAL_EVIDENCE_PATH);
  if (!parsed || !Array.isArray(parsed.evidence)) return undefined;
  const notes = Array.isArray(parsed.notes)
    ? parsed.notes.filter((note): note is string => typeof note === "string")
    : [];
  const evidence = parsed.evidence.filter((entry): entry is AdminBrowserSurfaceEvidenceInput =>
    Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
  );
  return {
    evidence,
    provenance: {
      inputPath: OPTIONAL_EVIDENCE_PATH,
      source: toEvidenceSource(parsed.source),
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : undefined,
      capturedAtUtc: typeof parsed.capturedAtUtc === "string" ? parsed.capturedAtUtc : undefined,
      noteCount: notes.length,
      notes,
    },
  };
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function renderDoc(report: AdminBrowserSurfaceSmokeReport) {
  return [
    "# Admin Browser Surface Smoke",
    "",
    "Status: compact local browser evidence boundary for admin surfaces.",
    "",
    "This report is not production admin truth, provider smoke, deployed runtime smoke, or GumDrop/payment proof.",
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Passed in source validation: ${report.passed}`,
    `- Admin surfaces: ${report.summary.adminSurfaceCount}`,
    `- Route targets: ${report.summary.routeCount}`,
    `- Required authenticated surface/device checks: ${report.summary.requiredAuthenticatedSurfaceCount}`,
    `- Evidence entries: ${report.summary.evidenceCount}`,
    `- Authenticated checks present: ${report.summary.authenticatedSurfaceEvidenceCount}`,
    `- Unauthenticated boundary checks present: ${report.summary.unauthBoundaryEvidenceCount}`,
    `- Unauthenticated redirect checks present: ${report.summary.unauthRedirectEvidenceCount}`,
    `- Evidence source: ${report.evidenceProvenance.source}`,
    `- Evidence mode: ${report.evidenceProvenance.evidenceMode}`,
    `- Evidence base URL: ${report.evidenceProvenance.baseUrl ?? "none"}`,
    `- Evidence captured at: ${report.evidenceProvenance.capturedAtUtc ?? "none"}`,
    `- Protected surfaces: ${report.protectedSurfaceIds.join(", ")}`,
    "",
    "## Surfaces",
    "",
    ...report.surfaces.map((surface) =>
      `- ${surface.surfaceId}: route=${surface.route}; devices=${surface.deviceBands.join(",")}; group=${surface.group}; markers=${surface.authenticatedVisibleMarkers.join(" | ")}; reason=${surface.browserSmokeReason}`),
    "",
    "## Missing Authenticated Browser Evidence",
    "",
    ...(report.missingAuthenticatedSurfaceIds.length > 0
      ? report.missingAuthenticatedSurfaceIds.map((surfaceId) => `- ${surfaceId}`)
      : ["- none"]),
    "",
    "## Does Not Prove",
    "",
    ...report.doesNotProve.map((entry) => `- ${entry}`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n");
}

function writeTemplate() {
  const surfaces = ADMIN_BROWSER_SURFACE_DEFINITIONS.flatMap((surface) =>
    surface.deviceBands.map((deviceBand) => ({
      surfaceId: surface.surfaceId,
      route: surface.route,
      deviceBand,
      state: "manual_admin_auth_required",
      checkedAtUtc: "",
      urlAfterNavigation: "",
      visibleMarker: "",
      screenshotArtifactPath: "",
      note: `Template entry only. Replace after real local browser or operator evidence exists. Expected markers: ${surface.authenticatedVisibleMarkers.join(" | ")}`,
    })),
  );
  write(TEMPLATE_PATH, `${JSON.stringify({
    schema: "admin_browser_surface_smoke_v1",
    instructions: "Copy to evidence.json only after local browser checks or operator screenshots exist. This template is not proof.",
    evidence: surfaces,
  })}\n`);
}

writeTemplate();
const evidenceFile = readEvidenceFile();
const report = buildAdminBrowserSurfaceSmokeReport({
  currentHead: git(["rev-parse", "HEAD"]),
  generatedAtUtc: new Date().toISOString(),
  evidence: evidenceFile?.evidence,
  evidenceProvenance: evidenceFile?.provenance,
});
const failures = validateAdminBrowserSurfaceSmokeReport(report);
const output: AdminBrowserSurfaceSmokeReport = {
  ...report,
  validationFailures: failures,
};

write(ARTIFACT_PATH, `${JSON.stringify(output)}\n`);
write(DOC_PATH, renderDoc(output));

if (failures.length > 0) {
  console.error(`Admin browser surface smoke validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Admin browser surface smoke OK: status=${report.status}, surfaces=${report.summary.adminSurfaceCount}, authenticatedPending=${report.summary.manualAdminAuthRequiredCount}.`,
);
