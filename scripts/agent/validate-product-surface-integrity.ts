import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type ProductSurfaceSeverity = "P0" | "P1" | "P2" | "P3";

export type ProductSurfaceFinding = {
  id: string;
  severity: ProductSurfaceSeverity;
  title: string;
  filePath: string;
  line: number | null;
  evidence: string[];
  owner: string;
  action: "fixed" | "defer_needs_owner" | "archive_or_stale" | "debug_only" | "configuration_only";
  status: "current" | "deferred" | "fixed" | "stale_evidence" | "approved";
};

type SourceReportState = {
  path: string;
  command: string;
  exists: boolean;
  generatedAtUtc: string | null;
  currentHead: string | null;
  sourceState: "current" | "stale_head" | "fresh_without_head" | "missing" | "unknown";
};

export type ProductSurfaceIntegrityReport = {
  generatedAtUtc: string;
  reportKey: "product-surface-integrity";
  currentHead: string;
  summary: {
    sourceReportsRead: number;
    staleAuthorityRisks: number;
    fakeActionRisks: number;
    mobileUiContractRisks: number;
    debugCopyLeaks: number;
    costGuardrailRisks: number;
    connectionRisks: number;
    fixedThisPass: number;
    deferredWithOwner: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  sourceReports: SourceReportState[];
  staleAuthorityFindings: ProductSurfaceFinding[];
  fakeActionFindings: ProductSurfaceFinding[];
  mobileUiContractFindings: ProductSurfaceFinding[];
  debugCopyLeakFindings: ProductSurfaceFinding[];
  costGuardrailFindings: ProductSurfaceFinding[];
  connectionFindings: ProductSurfaceFinding[];
  fixesApplied: ProductSurfaceFinding[];
  deferredFindings: ProductSurfaceFinding[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/product-surface-integrity.generated.json";
const reportPath = join(repoRoot, reportRelativePath);

const sourceReportInputs = [
  { path: "agent/state/user-facing-feature-connection-audit.generated.json", command: "npm run check:user-facing-feature-connection-audit" },
  { path: "agent/state/speed-security-hardening.generated.json", command: "npm run score:speed-security" },
  { path: "agent/state/repo-spring-cleaning-rewire.generated.json", command: "npm run check:repo-spring-cleaning-rewire" },
  { path: "agent/state/debug-panel-output-triage.generated.json", command: "npm run check:debug-panel-output-triage" },
  { path: "agent/state/public-beta-score.generated.json", command: "npm run score:beta" },
] as const;

function toPosix(filePath: string) {
  return filePath.replace(/\\/gu, "/");
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function tryReadJson(relativePath: string): Record<string, unknown> | null {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function walk(relativePath: string, files: string[] = []) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return files;
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    const child = `${relativePath}/${entry.name}`;
    if (entry.isDirectory()) {
      if ([".next", "node_modules", "coverage"].includes(entry.name)) continue;
      walk(child, files);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/u.test(entry.name)) files.push(toPosix(child));
  }
  return files;
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return null;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function finding(
  id: string,
  severity: ProductSurfaceSeverity,
  title: string,
  filePath: string,
  line: number | null,
  evidence: string[],
  owner: string,
  action: ProductSurfaceFinding["action"],
  status: ProductSurfaceFinding["status"],
): ProductSurfaceFinding {
  return { id, severity, title, filePath, line, evidence, owner, action, status };
}

function getString(input: Record<string, unknown> | null, keys: string[]) {
  if (!input) return null;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function collectSourceReports(head: string): SourceReportState[] {
  return sourceReportInputs.map((input) => {
    const json = tryReadJson(input.path);
    if (!json) {
      return {
        path: input.path,
        command: input.command,
        exists: false,
        generatedAtUtc: null,
        currentHead: null,
        sourceState: "missing",
      };
    }
    const generatedAt = getString(json, ["generatedAtUtc", "generatedAt"]) ?? null;
    const reportHead = getString(json, ["currentHead", "currentCommit", "gitHead"]);
    const sourceState: SourceReportState["sourceState"] = reportHead
      ? reportHead === head
        ? "current"
        : "stale_head"
      : generatedAt
        ? "fresh_without_head"
        : "unknown";
    return {
      path: input.path,
      command: input.command,
      exists: true,
      generatedAtUtc: generatedAt,
      currentHead: reportHead,
      sourceState,
    };
  });
}

export function detectFakeActions(source: string) {
  return /href="#"|href: "\/dashboard\/creator"|href="\/dashboard\/creator"/u.test(source);
}

export function detectPrimaryDebugCopyLeak(source: string) {
  return /platform_pulse:30d|generated\.json|raw logs stay|Debug-only|(?:^|["'`])Source truth:|(?:^|["'`])Freshness:|(?:^|["'`])Samples:/u.test(source);
}

export function detectBodyLimitRequestJsonViolation(source: string) {
  const declaresBodyLimit = /bodyLimitBytes|BODY_LIMIT_BYTES|_BODY_LIMIT_BYTES|maxBytes:\s*[A-Z0-9_]+_BODY_LIMIT_BYTES/u.test(source);
  return declaresBodyLimit && /request\.json\(\)/u.test(source);
}

export function detectUnboundedPromiseMap(source: string) {
  if (!/Promise\.all(?:Settled)?\([\s\S]{0,180}\.map\s*\(/u.test(source)) return false;
  return ![
    "mapWithConcurrency",
    "bounded worker pool",
    "cost-bound: bounded Promise.all",
    "fixed-size Promise.all",
    "Array.from({ length: Math.min(limit, items.length) }",
  ].some((marker) => source.includes(marker));
}

function scanFakeActions(): ProductSurfaceFinding[] {
  return walk("src/app").concat(walk("src/components")).flatMap((filePath) => {
    const source = read(filePath);
    const evidence = ['href="#"'].filter((needle) => source.includes(needle));
    const creatorSelfLoopEvidence = [
      'href: "/dashboard/creator"',
      'href="/dashboard/creator"',
    ].filter((needle) => source.includes(needle));
    if (filePath === "src/components/Creators/CreatorDashboardSettingsHub.tsx") {
      evidence.push(...creatorSelfLoopEvidence);
    }
    if (evidence.length === 0) return [];
    return [
      finding(
        `fake_action_${filePath.replace(/[^a-z0-9]+/giu, "_")}`,
        "P1",
        "Primary UI contains a fake action target",
        filePath,
        lineOf(source, evidence[0] ?? "href"),
        evidence,
        "surface-owner",
        "fixed",
        "current",
      ),
    ];
  });
}

function scanPrimaryDebugCopyLeaks(): ProductSurfaceFinding[] {
  const scannedFiles = walk("src/app").concat(walk("src/components"));
  return scannedFiles.flatMap((filePath) => {
    if (filePath.includes("/api/")) return [];
    if (filePath.includes("/admin/debug/")) return [];
    const source = read(filePath);
    if (source.includes("data-product-surface-integrity-debug-detail")) return [];
    const evidence = [
      source.includes("platform_pulse:30d") ? "platform_pulse:30d" : null,
      source.includes("generated.json") ? "generated.json" : null,
      source.includes("raw logs stay") ? "raw logs stay" : null,
      source.includes("Debug-only") ? "Debug-only" : null,
      /(?:^|["'`])Source truth:/u.test(source) ? "Source truth:" : null,
      /(?:^|["'`])Freshness:/u.test(source) ? "Freshness:" : null,
      /(?:^|["'`])Samples:/u.test(source) ? "Samples:" : null,
    ].filter((needle): needle is string => Boolean(needle));
    if (evidence.length === 0) return [];
    return [
      finding(
        `debug_copy_${filePath.replace(/[^a-z0-9]+/giu, "_")}`,
        "P1",
        "Primary UI contains Debug/source-detail copy",
        filePath,
        lineOf(source, evidence[0] ?? "Source truth:"),
        evidence,
        "surface-owner",
        "fixed",
        "current",
      ),
    ];
  });
}

function scanBodyLimitRoutes(): ProductSurfaceFinding[] {
  return walk("src/app/api").flatMap((filePath) => {
    if (!filePath.endsWith("route.ts")) return [];
    const source = read(filePath);
    if (!detectBodyLimitRequestJsonViolation(source)) return [];
    return [
      finding(
        `body_limit_${filePath.replace(/[^a-z0-9]+/giu, "_")}`,
        "P1",
        "Route declares a body limit but still parses with request.json()",
        filePath,
        lineOf(source, "request.json()"),
        ["body limit marker", "request.json()"],
        "api-route-owner",
        "defer_needs_owner",
        "current",
      ),
    ];
  });
}

function scanPromiseFanout(): ProductSurfaceFinding[] {
  const files = walk("src/app").concat(walk("src/lib"), walk("functions/src"));
  return files.flatMap((filePath) => {
    const source = read(filePath);
    if (!detectUnboundedPromiseMap(source)) return [];
    return [
      finding(
        `fanout_${filePath.replace(/[^a-z0-9]+/giu, "_")}`,
        "P2",
        "Potential array fanout needs bounded worker pool review",
        filePath,
        lineOf(source, "Promise.all"),
        ["Promise.all(...map) or Promise.allSettled(...map)"],
        "cost-guardrail-owner",
        "defer_needs_owner",
        "deferred",
      ),
    ];
  });
}

function scanMobileUiContract(): ProductSurfaceFinding[] {
  const findings: ProductSurfaceFinding[] = [];
  const hubPath = "src/components/Creators/CreatorDashboardSettingsHub.tsx";
  const hub = read(hubPath);
  const managerGateEvidence = [
    "data-creator-active-manager",
    "activeManager",
    'openSection === "requests"',
    'openSection === "bookings"',
    'openSection === "fan_pass"',
    'openSection === "broadcasts"',
  ];
  const missingManagerGate = managerGateEvidence.filter((needle) => !hub.includes(needle));
  if (missingManagerGate.length > 0) {
    findings.push(finding(
      "creator_managers_not_lazy_mounted",
      "P1",
      "Creator dashboard managers are not gated by the active section",
      hubPath,
      null,
      missingManagerGate,
      "creator-dashboard-owner",
      "fixed",
      "current",
    ));
  }

  for (const filePath of walk("src/components/Creators")) {
    const source = read(filePath);
    if (/\b(setInterval|onSnapshot)\b/u.test(source)) {
      findings.push(finding(
        `creator_polling_${filePath.replace(/[^a-z0-9]+/giu, "_")}`,
        "P1",
        "Creator dashboard component adds polling or realtime listener",
        filePath,
        lineOf(source, "setInterval") ?? lineOf(source, "onSnapshot"),
        ["setInterval/onSnapshot"],
        "creator-dashboard-owner",
        "fixed",
        "current",
      ));
    }
  }

  const nestedScrollFiles = [
    "src/components/Admin/AdminSupportQueue.tsx",
    "src/components/Admin/TransactionHistoryModal.tsx",
  ];
  for (const filePath of nestedScrollFiles) {
    if (!existsSync(join(repoRoot, filePath))) continue;
    const source = read(filePath);
    const count = (source.match(/overflow-y-auto|overflow-auto/gu) ?? []).length;
    if (count > 1 && !source.includes("data-product-surface-integrity-scroll-approved")) {
      findings.push(finding(
        `nested_scroll_${filePath.replace(/[^a-z0-9]+/giu, "_")}`,
        "P2",
        "Admin mobile surface has multiple scroll regions that need owner review",
        filePath,
        lineOf(source, "overflow-y-auto") ?? lineOf(source, "overflow-auto"),
        [`${count} overflow scroll markers`],
        "admin-ui-owner",
        "defer_needs_owner",
        "deferred",
      ));
    }
  }

  return findings;
}

function collectSpeedSecurityFindings(): ProductSurfaceFinding[] {
  const json = tryReadJson("agent/state/speed-security-hardening.generated.json");
  const findings = Array.isArray(json?.findings) ? json.findings as Record<string, unknown>[] : [];
  const grouped = new Map<string, { count: number; first: Record<string, unknown> }>();
  for (const entry of findings) {
    const title = typeof entry.title === "string" ? entry.title : "Speed/security finding";
    const domain = typeof entry.domain === "string" ? entry.domain : "speed-security";
    const key = `${domain}:${title}`;
    const current = grouped.get(key);
    if (current) {
      current.count += 1;
    } else {
      grouped.set(key, { count: 1, first: entry });
    }
  }

  return Array.from(grouped.entries()).map(([key, value], index) => {
    const filePath = typeof value.first.filePath === "string" ? value.first.filePath : "agent/state/speed-security-hardening.generated.json";
    const line = typeof value.first.line === "number" ? value.first.line : null;
    const title = typeof value.first.title === "string" ? value.first.title : key;
    return finding(
      `speed_security_group_${index + 1}`,
      "P2",
      title,
      filePath,
      line,
      [`${value.count} current speed/security finding(s) in this group.`],
      "speed-security-owner",
      "defer_needs_owner",
      "deferred",
    );
  });
}

function collectStaleAuthorityFindings(sourceReports: SourceReportState[]): ProductSurfaceFinding[] {
  return sourceReports
    .filter((report) => report.sourceState === "stale_head" || report.sourceState === "missing")
    .map((report, index) => finding(
      `stale_report_${index + 1}`,
      "P2",
      report.sourceState === "missing" ? "Expected source report is missing" : "Generated report is stale relative to current HEAD",
      report.path,
      null,
      [report.command, report.currentHead ? `reportHead=${report.currentHead}` : "report missing or headless"],
      "report-owner",
      report.sourceState === "missing" ? "defer_needs_owner" : "archive_or_stale",
      report.sourceState === "missing" ? "deferred" : "stale_evidence",
    ));
}

function countSeverity(findings: ProductSurfaceFinding[], severity: ProductSurfaceSeverity) {
  return findings.filter((entry) => entry.severity === severity && entry.status !== "fixed").length;
}

export function buildProductSurfaceIntegrityReport(): ProductSurfaceIntegrityReport {
  const head = currentHead();
  const sourceReports = collectSourceReports(head);
  const staleAuthorityFindings = collectStaleAuthorityFindings(sourceReports);
  const fakeActionFindings = scanFakeActions();
  const debugCopyLeakFindings = scanPrimaryDebugCopyLeaks();
  const bodyLimitFindings = scanBodyLimitRoutes();
  const promiseFanoutFindings = scanPromiseFanout();
  const speedSecurityFindings = collectSpeedSecurityFindings();
  const mobileUiContractFindings = scanMobileUiContract();
  const connectionFindings: ProductSurfaceFinding[] = [];

  const fixesApplied: ProductSurfaceFinding[] = [
    finding(
      "product_surface_validator_added",
      "P2",
      "Product surface integrity report and validator added",
      "scripts/agent/validate-product-surface-integrity.ts",
      null,
      ["check:product-surface-integrity"],
      "repo-governance-owner",
      "fixed",
      "fixed",
    ),
    finding(
      "creator_primary_source_copy_removed",
      "P1",
      "Creator Dashboard primary cards no longer expose sourceTruth/freshness/sample counts",
      "src/components/Creators/CreatorDashboardSettingsHub.tsx",
      null,
      ["Dashboard data connected.", "data attrs retain source metadata"],
      "creator-dashboard-owner",
      "fixed",
      "fixed",
    ),
    finding(
      "stale_reports_demoted",
      "P2",
      "Stale generated reports are classified as evidence-only instead of live authority",
      reportRelativePath,
      null,
      ["staleAuthorityFindings", "nextFixOrder"],
      "report-owner",
      "fixed",
      "fixed",
    ),
  ];

  const costGuardrailFindings = bodyLimitFindings.concat(promiseFanoutFindings, speedSecurityFindings);
  const allCurrentFindings = staleAuthorityFindings
    .concat(fakeActionFindings, mobileUiContractFindings, debugCopyLeakFindings, costGuardrailFindings, connectionFindings);
  const deferredFindings = allCurrentFindings.filter((entry) => entry.status === "deferred" || entry.status === "stale_evidence");

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "product-surface-integrity",
    currentHead: head,
    summary: {
      sourceReportsRead: sourceReports.filter((entry) => entry.exists).length,
      staleAuthorityRisks: staleAuthorityFindings.length,
      fakeActionRisks: fakeActionFindings.length,
      mobileUiContractRisks: mobileUiContractFindings.length,
      debugCopyLeaks: debugCopyLeakFindings.length,
      costGuardrailRisks: costGuardrailFindings.length,
      connectionRisks: connectionFindings.length,
      fixedThisPass: fixesApplied.length,
      deferredWithOwner: deferredFindings.length,
      p0Count: countSeverity(allCurrentFindings, "P0"),
      p1Count: countSeverity(allCurrentFindings, "P1"),
      p2Count: countSeverity(allCurrentFindings, "P2"),
    },
    sourceReports,
    staleAuthorityFindings,
    fakeActionFindings,
    mobileUiContractFindings,
    debugCopyLeakFindings,
    costGuardrailFindings,
    connectionFindings,
    fixesApplied,
    deferredFindings,
    nextFixOrder: [
      "admin_route_body_limits: add readBoundedJsonBody to the admin routes still flagged by speed-security.",
      "repo_spring_cleaning_generated_reports: refresh or archive stale generated reports with their owning validators.",
      "cost_fanout_review: add bounded worker pools/source markers to current Promise.all map findings outside forbidden surfaces.",
      "admin_mobile_scroll_review: reduce nested scroll regions in Admin Support/transaction modal with source-approved scroll ownership.",
    ],
  };
}

export function validateProductSurfaceIntegrityReport(report: ProductSurfaceIntegrityReport) {
  const failures: string[] = [];
  const head = currentHead();
  if (report.reportKey !== "product-surface-integrity") failures.push("Report key must be product-surface-integrity.");
  if (report.currentHead !== head) failures.push(`product-surface-integrity.generated.json is stale. reportHead=${report.currentHead} currentHead=${head}`);
  if (report.nextFixOrder.length === 0) failures.push("Report must emit nextFixOrder.");
  if (report.fakeActionFindings.length > 0) failures.push("Primary UI still contains fake href/self-loop actions.");
  if (report.debugCopyLeakFindings.length > 0) failures.push("Primary UI still contains Debug/source-detail copy.");
  if (report.connectionFindings.some((entry) => entry.severity === "P0" || entry.severity === "P1")) {
    failures.push("P0/P1 connection findings must be fixed or demoted with owner evidence.");
  }
  if (report.mobileUiContractFindings.some((entry) => entry.severity === "P1" && entry.status !== "fixed")) {
    failures.push("P1 mobile UI contract findings must be fixed before signoff.");
  }
  if (report.costGuardrailFindings.some((entry) => entry.severity === "P1" && entry.status !== "deferred")) {
    failures.push("P1 cost guardrail findings must be fixed or owner-deferred.");
  }

  const packageJson = read("package.json");
  if (!packageJson.includes('"check:product-surface-integrity"')) {
    failures.push("package.json must expose check:product-surface-integrity.");
  }

  return failures;
}

function writeReport(report: ProductSurfaceIntegrityReport) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const report = buildProductSurfaceIntegrityReport();
  writeReport(report);
  const failures = validateProductSurfaceIntegrityReport(report);
  if (failures.length > 0) {
    console.error("Product surface integrity validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  const size = statSync(reportPath).size;
  console.log(
    `Product surface integrity validation passed. stale=${report.summary.staleAuthorityRisks} fakeActions=${report.summary.fakeActionRisks} debugLeaks=${report.summary.debugCopyLeaks} deferred=${report.summary.deferredWithOwner} bytes=${size}`,
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
