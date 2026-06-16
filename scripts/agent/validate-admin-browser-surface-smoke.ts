import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";

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
const OPTIONAL_EVIDENCE_DIR = process.env.ADMIN_BROWSER_SMOKE_EVIDENCE_DIR?.trim();
const ADMIN_LAYOUT_PATH = "src/app/admin/layout.tsx" as const;
const BROWSER_SMOKE_SPEC_PATH = "tests/ui-audits/admin-browser-surface-smoke.spec.ts" as const;
const BROWSER_SMOKE_SCRIPT_NAME = "check:admin-browser-surface-smoke:browser" as const;

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): Record<string, unknown> | null {
  const fullPath = join(ROOT, path);
  return readJsonFile(fullPath);
}

function readJsonFile(fullPath: string): Record<string, unknown> | null {
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "").trim()) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function normalizeEvidenceEntries(entries: unknown[]): AdminBrowserSurfaceEvidenceInput[] {
  return entries.filter((entry): entry is AdminBrowserSurfaceEvidenceInput =>
    Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
  );
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
  const evidence = normalizeEvidenceEntries(parsed.evidence);
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

function readEvidenceFragmentsFromDir() {
  if (!OPTIONAL_EVIDENCE_DIR) return undefined;
  const fullDir = isAbsolute(OPTIONAL_EVIDENCE_DIR) ? OPTIONAL_EVIDENCE_DIR : join(ROOT, OPTIONAL_EVIDENCE_DIR);
  if (!existsSync(fullDir)) return undefined;

  const evidence = readdirSync(fullDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => readJsonFile(join(fullDir, entry.name)))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  if (evidence.length === 0) return undefined;

  const checkedAtValues = evidence
    .map((entry) => typeof entry.checkedAtUtc === "string" ? entry.checkedAtUtc : undefined)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    evidence: normalizeEvidenceEntries(evidence),
    provenance: {
      inputPath: OPTIONAL_EVIDENCE_DIR,
      source: "local_in_app_browser" as const,
      capturedAtUtc: checkedAtValues.at(-1),
      noteCount: 1,
      notes: ["Loaded opt-in per-surface evidence fragments from ADMIN_BROWSER_SMOKE_EVIDENCE_DIR."],
    },
  };
}

function readEvidenceInputs() {
  const evidenceFile = readEvidenceFile();
  const evidenceFragments = readEvidenceFragmentsFromDir();
  if (!evidenceFragments || evidenceFragments.evidence.length === 0) return evidenceFile;
  if (!evidenceFile || evidenceFile.evidence.length === 0) return evidenceFragments;

  return {
    evidence: [...evidenceFile.evidence, ...evidenceFragments.evidence],
    provenance: {
      inputPath: `${evidenceFile.provenance.inputPath};${evidenceFragments.provenance.inputPath}`,
      source: "local_in_app_browser" as const,
      baseUrl: evidenceFile.provenance.baseUrl,
      capturedAtUtc: evidenceFragments.provenance.capturedAtUtc ?? evidenceFile.provenance.capturedAtUtc,
      noteCount: evidenceFile.provenance.noteCount + evidenceFragments.provenance.noteCount,
      notes: [...evidenceFile.provenance.notes, ...evidenceFragments.provenance.notes].slice(0, 5),
    },
  };
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function walkAdminPagePaths(dir = join(ROOT, "src/app/admin")): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(...walkAdminPagePaths(fullPath));
    } else if (entry.name === "page.tsx") {
      paths.push(relative(join(ROOT, "src/app"), fullPath).split(sep).join("/"));
    }
  }
  return paths.sort();
}

function adminRouteFromPagePath(pagePath: string) {
  const route = `/${pagePath.replace(/\/page\.tsx$/u, "")}`;
  return route.endsWith("/page.tsx") ? "/admin" : route;
}

function sourceAdminRoutes() {
  return walkAdminPagePaths().map(adminRouteFromPagePath).sort();
}

function readLayoutSelectorContract() {
  const layoutSource = readFileSync(join(ROOT, ADMIN_LAYOUT_PATH), "utf8");
  return {
    ownerPath: ADMIN_LAYOUT_PATH,
    hasSurfaceAttribute: layoutSource.includes("data-admin-browser-surface="),
    hasRouteAttribute: layoutSource.includes("data-admin-browser-route="),
    hasGroupAttribute: layoutSource.includes("data-admin-browser-surface-group="),
    usesSurfaceResolver: layoutSource.includes("resolveAdminBrowserSurfaceForPathname"),
  };
}

function readBrowserHarnessContract() {
  const specPath = join(ROOT, BROWSER_SMOKE_SPEC_PATH);
  const specSource = existsSync(specPath) ? readFileSync(specPath, "utf8") : "";
  const packageJson = readJson("package.json");
  const scripts = packageJson && typeof packageJson.scripts === "object" && packageJson.scripts !== null
    ? packageJson.scripts as Record<string, unknown>
    : {};
  const browserScript = scripts[BROWSER_SMOKE_SCRIPT_NAME];

  return {
    ownerPath: BROWSER_SMOKE_SPEC_PATH,
    packageScriptName: BROWSER_SMOKE_SCRIPT_NAME,
    packageScriptPresent: typeof browserScript === "string"
      && browserScript.includes("playwright test")
      && browserScript.includes(BROWSER_SMOKE_SPEC_PATH),
    importsCanonicalSurfaceMap: specSource.includes("ADMIN_BROWSER_SURFACE_DEFINITIONS")
      && specSource.includes("src/lib/admin/admin-browser-surface-map"),
    gatedByExplicitEnv: specSource.includes('ADMIN_BROWSER_SMOKE === "1"')
      && specSource.includes("test.skip("),
    usesStorageStateEnv: specSource.includes("ADMIN_BROWSER_SMOKE_STORAGE_STATE")
      && specSource.includes("storageState"),
    supportsLocalFixtureSession: specSource.includes("ADMIN_BROWSER_SMOKE_FIXTURE_SESSION")
      && specSource.includes("adminUiTestSession=1")
      && specSource.includes("local_fixture_surface_verified"),
    usesCanonicalSelectors: specSource.includes("surface.authenticatedSelectors[0]"),
    usesBrowserSmokePath: specSource.includes("surface.browserSmokePath"),
    checksRouteAttribute: specSource.includes('toHaveAttribute("data-admin-browser-route", surface.route'),
    rejectsPublicHomeFallback: specSource.includes("public_home_kandydrops"),
    writesOptionalEvidenceDir: specSource.includes("ADMIN_BROWSER_SMOKE_EVIDENCE_DIR")
      && specSource.includes("writeSurfaceEvidence")
      && specSource.includes("mkdirSync")
      && specSource.includes("writeFileSync"),
  };
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
    `- Source admin pages: ${report.summary.sourceAdminPageCount}`,
    `- Layout selector contract present: ${report.summary.layoutSelectorContractPresent}`,
    `- Browser harness contract present: ${report.summary.browserHarnessContractPresent}`,
    `- Required authenticated surface/device checks: ${report.summary.requiredAuthenticatedSurfaceCount}`,
    `- Evidence entries: ${report.summary.evidenceCount}`,
    `- Authenticated checks present: ${report.summary.authenticatedSurfaceEvidenceCount}`,
    `- Local fixture checks present: ${report.summary.localFixtureSurfaceEvidenceCount}`,
    `- Account-free fixture checks covered: ${report.summary.accountFreeFixtureCoveredCount}`,
    `- Account-free fixture checks pending: ${report.summary.accountFreeFixturePendingCount}`,
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
      `- ${surface.surfaceId}: route=${surface.route}; smokePath=${surface.browserSmokePath}; devices=${surface.deviceBands.join(",")}; group=${surface.group}; selectors=${surface.authenticatedSelectors.join(" | ")}; markers=${surface.authenticatedVisibleMarkers.join(" | ")}; reason=${surface.browserSmokeReason}`),
    "",
    "## Source Route Coverage",
    "",
    ...(report.sourceAdminRoutes.length > 0
      ? report.sourceAdminRoutes.map((route) => `- ${route}`)
      : ["- none"]),
    "",
    "## Missing Source Routes",
    "",
    ...(report.missingSourceAdminRoutes.length > 0
      ? report.missingSourceAdminRoutes.map((route) => `- ${route}`)
      : ["- none"]),
    "",
    "## Extra Surface Routes",
    "",
    ...(report.extraSurfaceRoutes.length > 0
      ? report.extraSurfaceRoutes.map((route) => `- ${route}`)
      : ["- none"]),
    "",
    "## Layout Selector Contract",
    "",
    `- Owner: ${report.layoutSelectorContract.ownerPath}`,
    `- Surface attribute: ${report.layoutSelectorContract.hasSurfaceAttribute}`,
    `- Route attribute: ${report.layoutSelectorContract.hasRouteAttribute}`,
    `- Group attribute: ${report.layoutSelectorContract.hasGroupAttribute}`,
    `- Uses resolver: ${report.layoutSelectorContract.usesSurfaceResolver}`,
    "",
    "## Browser Harness Contract",
    "",
    `- Owner: ${report.browserHarnessContract.ownerPath}`,
    `- Package script: ${report.browserHarnessContract.packageScriptName}`,
    `- Package script present: ${report.browserHarnessContract.packageScriptPresent}`,
    `- Imports canonical surface map: ${report.browserHarnessContract.importsCanonicalSurfaceMap}`,
    `- Explicit env gate: ${report.browserHarnessContract.gatedByExplicitEnv}`,
    `- Uses storage state env: ${report.browserHarnessContract.usesStorageStateEnv}`,
    `- Supports local fixture session: ${report.browserHarnessContract.supportsLocalFixtureSession}`,
    `- Uses canonical selectors: ${report.browserHarnessContract.usesCanonicalSelectors}`,
    `- Uses browserSmokePath: ${report.browserHarnessContract.usesBrowserSmokePath}`,
    `- Checks route attribute: ${report.browserHarnessContract.checksRouteAttribute}`,
    `- Rejects public home fallback: ${report.browserHarnessContract.rejectsPublicHomeFallback}`,
    `- Writes optional evidence dir: ${report.browserHarnessContract.writesOptionalEvidenceDir}`,
    "",
    "## Missing Authenticated Browser Evidence",
    "",
    ...(report.missingAuthenticatedSurfaceIds.length > 0
      ? report.missingAuthenticatedSurfaceIds.map((surfaceId) => `- ${surfaceId}`)
      : ["- none"]),
    "",
    "## Missing Account-Free Fixture Evidence",
    "",
    ...(report.missingAccountFreeFixtureSurfaceIds.length > 0
      ? report.missingAccountFreeFixtureSurfaceIds.map((surfaceId) => `- ${surfaceId}`)
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
      route: surface.browserSmokePath,
      deviceBand,
      state: "manual_admin_auth_required",
      checkedAtUtc: "",
      urlAfterNavigation: "",
      selectorUsed: surface.authenticatedSelectors[0] ?? "",
      visibleMarker: "",
      screenshotArtifactPath: "",
      note: `Template entry only. Replace after real local browser or operator evidence exists. Expected selectors: ${surface.authenticatedSelectors.join(" | ")}. Expected markers: ${surface.authenticatedVisibleMarkers.join(" | ")}`,
    })),
  );
  write(TEMPLATE_PATH, `${JSON.stringify({
    schema: "admin_browser_surface_smoke_v1",
    instructions: "Copy to evidence.json only after local browser checks or operator screenshots exist. This template is not proof.",
    evidence: surfaces,
  })}\n`);
}

writeTemplate();
const evidenceFile = readEvidenceInputs();
const report = buildAdminBrowserSurfaceSmokeReport({
  currentHead: git(["rev-parse", "HEAD"]),
  generatedAtUtc: new Date().toISOString(),
  evidence: evidenceFile?.evidence,
  evidenceProvenance: evidenceFile?.provenance,
  sourceAdminRoutes: sourceAdminRoutes(),
  layoutSelectorContract: readLayoutSelectorContract(),
  browserHarnessContract: readBrowserHarnessContract(),
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
