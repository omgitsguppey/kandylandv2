import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";
type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

export type CreatorDropStatusMetricsReport = {
  generatedAtUtc: string;
  reportKey: "creator-drop-status-metrics";
  currentHead: string;
  summary: {
    dependencyPresent: boolean;
    statusResolverReady: boolean;
    metricsResolverReady: boolean;
    creatorApiSafeFieldsReady: boolean;
    creatorCardStatusChipReady: boolean;
    inlineMetricsReady: boolean;
    metricsUnavailableNotZero: boolean;
    adminOnlyControlsHidden: boolean;
    mobileDensityCompact: boolean;
    protectedNavChatUntouched: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  statusFindings: Finding[];
  metricsFindings: Finding[];
  apiFindings: Finding[];
  uiFindings: Finding[];
  protectedSurfaceFindings: Finding[];
  fixesApplied: Finding[];
  nextFixOrder: string[];
};

export type CreatorDropStatusMetricsInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  sources: {
    packageJson: string;
    manager: string;
    apiRoute: string;
    statusResolver: string;
    metricsResolver: string;
    testSource: string;
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/creator-drop-status-metrics.generated.json";
const docsRelativePath = "docs/agent-truth/creator-drop-status-metrics.md";

const protectedPathPatterns = [
  /^src\/components\/Navigation\//u,
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /^src\/app\/dashboard\/chat\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function changedFiles() {
  const unstaged = execFileSync("git", ["diff", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged])).map((file) => file.replaceAll("\\", "/"));
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function countMissing(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function hasProtectedChange(files: string[]) {
  return files.some((file) => protectedPathPatterns.some((pattern) => pattern.test(file.replaceAll("\\", "/"))));
}

function containsAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

export function buildCreatorDropStatusMetricsReport(inputs: CreatorDropStatusMetricsInputs): CreatorDropStatusMetricsReport {
  const dependencyPresent = containsAll(inputs.sources.packageJson, ["check:creator-drop-status-metrics"])
    && inputs.sources.manager.includes("CreatorDropManager")
    && inputs.sources.apiRoute.includes("creator/drops");
  const statusResolverReady = containsAll(inputs.sources.statusResolver, [
    "admin_created",
    "creator_submitted",
    "draft",
    "pending_review",
    "needs_changes",
    "approved_live",
    "rejected",
    "expired",
    "archived",
    "unavailable",
    "canCreatorEdit",
    "canCreatorResubmit",
    "sourceTruth",
  ]);
  const metricsResolverReady = containsAll(inputs.sources.metricsResolver, [
    "views",
    "clicks",
    "unwraps",
    "source",
    "freshness",
    "provenZero",
    "Collecting",
  ]);
  const creatorApiSafeFieldsReady = containsAll(inputs.sources.apiRoute, [
    "resolveDropStatus",
    "resolveCreatorDropMetrics",
    "metrics: metrics.serialized",
    "statusResolution: status",
    "publicDiscovery",
    "rotationEligibility",
    "createdByRole",
    "assignedCreatorIds",
  ]);
  const creatorCardStatusChipReady = containsAll(inputs.sources.manager, [
    "resolveDropStatus(drop",
    "statusToneClassName",
    "data-creator-drop-card-status={status.creatorStatusKey}",
    "data-creator-drop-expired={String(status.isExpired)}",
  ]);
  const inlineMetricsReady = containsAll(inputs.sources.manager, [
    "resolveCreatorDropMetrics(drop)",
    "data-creator-drop-metrics-source={metrics.source}",
    "Views",
    "Clicks",
    "Unwraps",
  ]);
  const metricsUnavailableNotZero = inputs.sources.metricsResolver.includes('displayValue: "Collecting"')
    && inputs.sources.metricsResolver.includes("provenZero: false");
  const adminOnlyControlsHidden = !/(publish|approval|rotation|publicDiscovery).{0,40}(toggle|checkbox|button)/iu.test(inputs.sources.manager)
    && inputs.sources.manager.includes("Submit drop");
  const mobileDensityCompact = inputs.sources.manager.includes('data-creator-drop-mobile-density="compact"')
    && !/\btext-4xl\b|\bp-8\b|\brounded-3xl\b/u.test(inputs.sources.manager);
  const protectedNavChatUntouched = !hasProtectedChange(inputs.changedFiles);

  const dependencyFindings = [
    finding("dependency-present", dependencyPresent, "Creator drop manager, API, and package script are present.", "P0"),
  ];
  const statusFindings = [
    finding("status-resolver-ready", statusResolverReady, "Shared drop status resolver covers creator/admin/public lifecycle labels.", "P0"),
    finding("creator-card-status-chip", creatorCardStatusChipReady, "Creator drop cards render status chips and expired markers.", "P0"),
  ];
  const metricsFindings = [
    finding("metrics-resolver-ready", metricsResolverReady, "Shared metrics resolver covers views, clicks, unwraps, source, freshness, and proven zero.", "P0"),
    finding("metrics-unavailable-not-zero", metricsUnavailableNotZero, "Missing metrics display as collecting/unavailable instead of zero.", "P0"),
    finding("inline-metrics-ready", inlineMetricsReady, "Creator drop cards show compact inline metrics with source markers.", "P1"),
  ];
  const apiFindings = [
    finding("creator-api-safe-fields", creatorApiSafeFieldsReady, "Creator drops API returns safe lifecycle and metrics read fields.", "P0"),
  ];
  const uiFindings = [
    finding("admin-only-controls-hidden", adminOnlyControlsHidden, "Creator manager does not expose admin-only publish/approval/rotation controls.", "P0"),
    finding("mobile-density-compact", mobileDensityCompact, "Creator drop cards use compact mobile density without large card tokens.", "P1"),
  ];
  const protectedSurfaceFindings = [
    finding("protected-nav-chat-untouched", protectedNavChatUntouched, "Chat and navigation files were not changed.", "P0"),
  ];
  const fixesApplied = [
    finding("unit-test-covers-missing-metrics", inputs.sources.testSource.includes("missing metrics as zero"), "Unit tests cover missing metrics not displaying as zero.", "P1"),
    finding("unit-test-covers-expired", inputs.sources.testSource.includes("expired creator drop"), "Unit tests cover expired creator drop status.", "P1"),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...statusFindings,
    ...metricsFindings,
    ...apiFindings,
    ...uiFindings,
    ...protectedSurfaceFindings,
    ...fixesApplied,
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "creator-drop-status-metrics",
    currentHead: inputs.currentHead,
    summary: {
      dependencyPresent,
      statusResolverReady,
      metricsResolverReady,
      creatorApiSafeFieldsReady,
      creatorCardStatusChipReady,
      inlineMetricsReady,
      metricsUnavailableNotZero,
      adminOnlyControlsHidden,
      mobileDensityCompact,
      protectedNavChatUntouched,
      p0Count: countMissing(allFindings, "P0"),
      p1Count: countMissing(allFindings, "P1"),
      p2Count: countMissing(allFindings, "P2"),
    },
    dependencyFindings,
    statusFindings,
    metricsFindings,
    apiFindings,
    uiFindings,
    protectedSurfaceFindings,
    fixesApplied,
    nextFixOrder: [
      "Wire materialized event-fact summaries into creator drop metrics when that source is available.",
      "Add creator-safe drilldown for metric freshness after admin analytics exposes a bounded drop metric read model.",
      "Keep creator drop mutations approval-gated; only admin routes may publish, approve, rotate, or make drops public.",
    ],
  };
}

export function validateCreatorDropStatusMetricsReport(report: CreatorDropStatusMetricsReport | null) {
  const failures: string[] = [];
  if (!report) return ["creator drop status metrics report missing."];
  if (report.reportKey !== "creator-drop-status-metrics") failures.push("reportKey must be creator-drop-status-metrics.");
  if (!report.summary.dependencyPresent) failures.push("creator drop manager/API dependency missing.");
  if (!report.summary.statusResolverReady) failures.push("shared drop status resolver missing lifecycle states.");
  if (!report.summary.metricsResolverReady) failures.push("creator-facing metrics resolver missing source/freshness/provenZero.");
  if (!report.summary.creatorApiSafeFieldsReady) failures.push("creator drops API does not return safe status/metrics fields.");
  if (!report.summary.creatorCardStatusChipReady || !report.summary.inlineMetricsReady) failures.push("creator drop card lacks status chip or inline metrics.");
  if (!report.summary.metricsUnavailableNotZero) failures.push("metrics show zero without provenZero/source.");
  if (!report.summary.adminOnlyControlsHidden) failures.push("creator manager exposes admin-only publish/approval controls.");
  if (!report.summary.mobileDensityCompact) failures.push("creator drop card mobile density is too large or unmarked.");
  if (!report.summary.protectedNavChatUntouched) failures.push("chat/nav changed.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking creator drop status metrics findings remain.");
  return failures;
}

function readInputs(): CreatorDropStatusMetricsInputs {
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    sources: {
      packageJson: read("package.json"),
      manager: optionalRead("src/components/Creators/CreatorDropManager.tsx"),
      apiRoute: optionalRead("src/app/api/creator/drops/route.ts"),
      statusResolver: optionalRead("src/lib/drops/drop-status-resolver.ts"),
      metricsResolver: optionalRead("src/lib/drops/drop-metrics-resolver.ts"),
      testSource: optionalRead("tests/unit/creator-drop-status-metrics.spec.ts"),
    },
  };
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: CreatorDropStatusMetricsReport) {
  const lines = [
    "# Creator Drop Status Metrics",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Status resolver ready: ${report.summary.statusResolverReady ? "yes" : "no"}`,
    `- Metrics resolver ready: ${report.summary.metricsResolverReady ? "yes" : "no"}`,
    `- Creator API safe fields ready: ${report.summary.creatorApiSafeFieldsReady ? "yes" : "no"}`,
    `- Creator card status chip ready: ${report.summary.creatorCardStatusChipReady ? "yes" : "no"}`,
    `- Inline metrics ready: ${report.summary.inlineMetricsReady ? "yes" : "no"}`,
    `- Missing metrics avoid fake zero: ${report.summary.metricsUnavailableNotZero ? "yes" : "no"}`,
    `- Admin controls hidden: ${report.summary.adminOnlyControlsHidden ? "yes" : "no"}`,
    `- Mobile density compact: ${report.summary.mobileDensityCompact ? "yes" : "no"}`,
    "",
    "## Fixes Applied",
    "",
    ...[...report.statusFindings, ...report.metricsFindings, ...report.apiFindings, ...report.uiFindings].map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

function main() {
  const report = buildCreatorDropStatusMetricsReport(readInputs());
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);
  const failures = validateCreatorDropStatusMetricsReport(report);
  if (failures.length > 0) {
    console.error("[creator-drop-status-metrics] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[creator-drop-status-metrics] ok: p0=${report.summary.p0Count} p1=${report.summary.p1Count}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
