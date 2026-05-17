import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Severity = "p0" | "p1" | "p2";
type FindingStatus = "fixed" | "verified" | "deferred" | "owner_review";

type InventoryFinding = {
  id: string;
  severity: Severity;
  status: FindingStatus;
  owner: string;
  surface: string;
  filePath: string;
  detail: string;
  action: string;
};

export type CreatorDashboardErrorCostInventoryReport = {
  generatedAtUtc: string;
  reportKey: "creator-dashboard-error-cost-inventory";
  currentHead: string;
  summary: {
    creatorDashboardErrorsFound: number;
    creatorDashboardErrorsFixed: number;
    expected4xxCount: number;
    unexpected4xxCount: number;
    unexpected4xxFixed: number;
    cloudRunCostFindings: number;
    cloudSqlCostFindings: number;
    geminiCloudAssistCostFindings: number;
    deferredAdminBackend: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  creatorDashboardFindings: InventoryFinding[];
  route4xxFindings: InventoryFinding[];
  cloudRunCostFindings: InventoryFinding[];
  cloudSqlCostFindings: InventoryFinding[];
  geminiCloudAssistCostFindings: InventoryFinding[];
  fixesApplied: InventoryFinding[];
  deferredFindings: InventoryFinding[];
  nextFixOrder: string[];
};

type SourceMap = Record<string, string>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactPath = join(repoRoot, "agent/state/creator-dashboard-error-cost-inventory.generated.json");
const docsPath = join(repoRoot, "docs/agent-truth/creator-dashboard-error-cost-inventory.md");

const managerFiles = [
  "src/components/Creators/CreatorDashboardSettingsHub.tsx",
  "src/components/Creators/CreatorRequestsManager.tsx",
  "src/components/Creators/CreatorBookingsManager.tsx",
  "src/components/Creators/CreatorFanPassManager.tsx",
  "src/components/Creators/CreatorBroadcastManager.tsx",
];

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readIfExists(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function changedPaths() {
  return execFileSync("git", ["status", "--short"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/^"|"$/g, ""));
}

function finding(
  id: string,
  severity: Severity,
  status: FindingStatus,
  owner: string,
  surface: string,
  filePath: string,
  detail: string,
  action: string,
): InventoryFinding {
  return { id, severity, status, owner, surface, filePath, detail, action };
}

export function buildCreatorDashboardErrorCostInventoryReport(input: {
  currentHead: string;
  generatedAtUtc: string;
}): CreatorDashboardErrorCostInventoryReport {
  const creatorDashboardFindings = [
    finding(
      "plain-admin-dashboard-fetch",
      "p1",
      "fixed",
      "creator-ui",
      "creator-dashboard",
      "src/components/Creators/CreatorDashboardSettingsHub.tsx",
      "Plain admin accounts no longer load /api/creator/settings unless they are in creator view-as projection.",
      "Keep creator dashboard loads scoped to creator accounts or admin projection.",
    ),
    finding(
      "broadcast-refresh-loading-guard",
      "p2",
      "fixed",
      "creator-ui",
      "creator-dashboard",
      "src/components/Creators/CreatorBroadcastManager.tsx",
      "Broadcast refresh is disabled while broadcast history is already loading.",
      "Keep duplicate dashboard reads blocked during loading.",
    ),
    finding(
      "creator-manager-state-coverage",
      "p2",
      "verified",
      "creator-ui",
      "creator-dashboard",
      "src/components/Creators",
      "Requests, bookings, Fan Pass, and broadcasts expose loading, empty, error, disabled, and read-only or pending states.",
      "Continue using lazy manager mounts and explicit state copy.",
    ),
  ];

  const route4xxFindings = [
    finding(
      "expected-auth-and-role-4xx",
      "p2",
      "verified",
      "server-truth",
      "creator-api",
      "src/app/api/creator",
      "Creator routes intentionally return 401/403 for auth, role, and read-only projection boundaries.",
      "UI should show calm unavailable or read-only copy for expected auth and projection failures.",
    ),
    finding(
      "expected-validation-and-conflict-4xx",
      "p2",
      "verified",
      "server-truth",
      "creator-api",
      "src/app/api/creator",
      "Creator requests, bookings, and subscriptions return typed 400/402/409/413 responses for invalid input, paid-GD shortfall, unavailable features, slot conflicts, and bounded body failures.",
      "Keep expected business failures typed and human-readable.",
    ),
    finding(
      "unexpected-admin-self-load-4xx",
      "p1",
      "fixed",
      "creator-ui",
      "creator-dashboard",
      "src/components/Creators/CreatorDashboardSettingsHub.tsx",
      "The creator dashboard previously treated role=admin as load-eligible without projection, which could surface creator settings 4xx as a page error.",
      "Plain admin accounts now stay on the creator-unavailable state unless view-as projection is active.",
    ),
  ];

  const cloudRunCostFindings = [
    finding(
      "apphosting-run-config-present",
      "p2",
      "verified",
      "platform-cost",
      "cloud-run",
      "apphosting.yaml",
      "Source config includes App Hosting concurrency, minInstances, and maxInstances. This pass did not change deployment config.",
      "Review provider metrics before changing runtime capacity.",
    ),
    finding(
      "creator-dashboard-duplicate-read-reduction",
      "p2",
      "fixed",
      "creator-ui",
      "creator-dashboard",
      "src/components/Creators",
      "Creator dashboard duplicate read risk was reduced by blocking admin self-loads and refresh clicks during active broadcast loading.",
      "Keep manager fetches lazy and guarded by creator id, enabled, restricted, loading, and read-only state.",
    ),
  ];

  const cloudSqlCostFindings = [
    finding(
      "cloud-sql-agent-mirror-only",
      "p2",
      "deferred",
      "platform-cost",
      "cloud-sql",
      "dataconnect/dataconnect.yaml",
      "Source doctrine and Data Connect config classify Cloud SQL as an agent-context mirror; no creator dashboard runtime SQL path was found in this pass.",
      "Owner should confirm provider-side Cloud SQL billing/state before treating the mirror as cost-safe.",
    ),
  ];

  const geminiCloudAssistCostFindings = [
    finding(
      "admin-ai-cost-surface-out-of-scope",
      "p2",
      "owner_review",
      "admin-ai",
      "gemini-cloud-assist-vertex",
      "src/lib/server/api-cost-contract.ts",
      "Vertex/Gemini and AI cover/description surfaces are admin/provider cost lanes and were inventoried source-only; no creator dashboard AI call path was found.",
      "Review admin AI budgets in the admin AI lane, not this creator dashboard pass.",
    ),
  ];

  const fixesApplied = [
    creatorDashboardFindings[0],
    creatorDashboardFindings[1],
    route4xxFindings[2],
    cloudRunCostFindings[1],
  ];
  const deferredFindings = [
    ...cloudSqlCostFindings,
    ...geminiCloudAssistCostFindings,
    cloudRunCostFindings[0],
  ];
  const allFindings = [
    ...creatorDashboardFindings,
    ...route4xxFindings,
    ...cloudRunCostFindings,
    ...cloudSqlCostFindings,
    ...geminiCloudAssistCostFindings,
  ];

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "creator-dashboard-error-cost-inventory",
    currentHead: input.currentHead,
    summary: {
      creatorDashboardErrorsFound: 2,
      creatorDashboardErrorsFixed: 2,
      expected4xxCount: 2,
      unexpected4xxCount: 1,
      unexpected4xxFixed: 1,
      cloudRunCostFindings: cloudRunCostFindings.length,
      cloudSqlCostFindings: cloudSqlCostFindings.length,
      geminiCloudAssistCostFindings: geminiCloudAssistCostFindings.length,
      deferredAdminBackend: 1,
      p0Count: allFindings.filter((entry) => entry.severity === "p0").length,
      p1Count: allFindings.filter((entry) => entry.severity === "p1").length,
      p2Count: allFindings.filter((entry) => entry.severity === "p2").length,
    },
    creatorDashboardFindings,
    route4xxFindings,
    cloudRunCostFindings,
    cloudSqlCostFindings,
    geminiCloudAssistCostFindings,
    fixesApplied,
    deferredFindings,
    nextFixOrder: [
      "Confirm Cloud SQL/Data Connect provider billing and active connection state outside this source-only pass.",
      "Review App Hosting request/error metrics before any Cloud Run/App Hosting capacity change.",
      "Run the admin AI cost lane before changing Gemini, Cloud Assist, Vertex, or AI cover generation behavior.",
    ],
  };
}

function includesAny(source: string, values: string[]) {
  return values.some((value) => source.includes(value));
}

export function validateCreatorDashboardErrorCostInventoryReport(
  report: CreatorDashboardErrorCostInventoryReport | null,
  sources: SourceMap,
  options: { currentHead: string; changedPaths?: string[] },
) {
  const failures: string[] = [];
  if (!report) return ["creator-dashboard-error-cost-inventory artifact missing"];
  if (report.reportKey !== "creator-dashboard-error-cost-inventory") {
    failures.push("reportKey must be creator-dashboard-error-cost-inventory.");
  }
  if (report.currentHead !== options.currentHead) {
    failures.push(`creator dashboard inventory currentHead must match git HEAD (${options.currentHead}).`);
  }
  if (report.creatorDashboardFindings.length < 3) {
    failures.push("creator dashboard managers are not covered.");
  }
  if (report.cloudRunCostFindings.length === 0) {
    failures.push("Cloud Run inventory missing.");
  }
  if (report.cloudSqlCostFindings.length === 0) {
    failures.push("Cloud SQL inventory missing.");
  }
  if (report.geminiCloudAssistCostFindings.length === 0) {
    failures.push("Gemini/Cloud Assist inventory missing.");
  }
  if (report.nextFixOrder.length === 0) {
    failures.push("nextFixOrder must not be empty.");
  }
  for (const finding of report.route4xxFindings.filter((entry) => entry.id.includes("unexpected"))) {
    if (!finding.owner || !finding.action) {
      failures.push(`unexpected 4xx finding ${finding.id} lacks owner/action.`);
    }
  }

  const hub = sources["src/components/Creators/CreatorDashboardSettingsHub.tsx"] ?? "";
  if (!hub.includes('Boolean(viewAsState || userProfile?.role === "creator")')) {
    failures.push("CreatorDashboardSettingsHub must not load creator settings for plain admin accounts outside projection.");
  }
  if (!hub.includes("if (!canLoadCreatorDashboard)") || !hub.includes("setSettings(null)") || !hub.includes("setError(null)")) {
    failures.push("CreatorDashboardSettingsHub must short-circuit when creator dashboard cannot load.");
  }
  if (hub.includes('userProfile?.role === "admin"')) {
    failures.push("CreatorDashboardSettingsHub must not use role=admin as creator dashboard load eligibility.");
  }

  const managerExpectations: Array<[string, string[], string[]]> = [
    ["src/components/Creators/CreatorRequestsManager.tsx", ["canLoadRequests = Boolean(creatorId", "pendingActionIdRef", "loading", "error", "No open requests."], ["authFetch(requestsUrl)"]],
    ["src/components/Creators/CreatorBookingsManager.tsx", ["canLoadBookings = Boolean(creatorId", "pendingActionIdRef", "loading", "error", "No bookings"], ["authFetch(bookingsUrl)"]],
    ["src/components/Creators/CreatorFanPassManager.tsx", ["canLoadSubscribers = Boolean(creatorId", "loading", "error", "No subscribers yet."], ["authFetch(subscribersUrl)"]],
    ["src/components/Creators/CreatorBroadcastManager.tsx", ["canReadBroadcasts", "sending", "loading", "error", "No broadcasts yet", "disabled={!canReadBroadcasts || loading}"], ["authFetch(`/api/creator/broadcasts${query}`)"]],
  ];
  for (const [filePath, required, fetchNeedles] of managerExpectations) {
    const source = sources[filePath] ?? "";
    for (const value of required) {
      if (!source.includes(value)) {
        failures.push(`${filePath} missing manager state guard: ${value}`);
      }
    }
    if (!includesAny(source, fetchNeedles)) {
      failures.push(`${filePath} missing expected bounded route fetch.`);
    }
  }

  const apphosting = sources["apphosting.yaml"] ?? "";
  if (!apphosting.includes("concurrency:") || !apphosting.includes("minInstances:") || !apphosting.includes("maxInstances:")) {
    failures.push("Cloud Run/App Hosting inventory must include concurrency, minInstances, and maxInstances source.");
  }
  const dataconnect = sources["dataconnect/dataconnect.yaml"] ?? "";
  if (!dataconnect.includes("Cloud SQL") || !dataconnect.includes("kandydrops-db")) {
    failures.push("Cloud SQL inventory must include Data Connect/Cloud SQL target source.");
  }
  const apiCost = sources["src/lib/server/api-cost-contract.ts"] ?? "";
  if (!apiCost.includes("Vertex/Gemini") && !apiCost.includes("Gemini")) {
    failures.push("Gemini/Cloud Assist inventory must include API cost contract source.");
  }

  for (const changedPath of options.changedPaths ?? []) {
    if (
      changedPath.startsWith("src/app/api/admin/")
      || changedPath.startsWith("src/app/admin/")
      || changedPath.startsWith("src/components/Admin/")
      || changedPath.startsWith("src/lib/server/admin-")
      || changedPath.startsWith("src/lib/admin-")
    ) {
      failures.push(`Forbidden admin runtime file changed: ${changedPath}`);
    }
  }

  return failures;
}

function readWorkspaceSources(): SourceMap {
  const paths = [
    ...managerFiles,
    "apphosting.yaml",
    "dataconnect/dataconnect.yaml",
    "src/lib/server/api-cost-contract.ts",
  ];
  return Object.fromEntries(paths.map((path) => [path, readIfExists(path)]));
}

function writeDocs(report: CreatorDashboardErrorCostInventoryReport) {
  const lines = [
    "# Creator Dashboard Error And Cost Inventory",
    "",
    "Artifact: `agent/state/creator-dashboard-error-cost-inventory.generated.json`",
    "Validator: `npm run check:creator-dashboard-error-cost-inventory`",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current source head: \`${report.currentHead}\``,
    "",
    "## Summary",
    "",
    `- Creator dashboard errors found/fixed: ${report.summary.creatorDashboardErrorsFound}/${report.summary.creatorDashboardErrorsFixed}.`,
    `- Expected 4xx groups: ${report.summary.expected4xxCount}.`,
    `- Unexpected 4xx groups found/fixed: ${report.summary.unexpected4xxCount}/${report.summary.unexpected4xxFixed}.`,
    `- Cloud Run cost findings: ${report.summary.cloudRunCostFindings}.`,
    `- Cloud SQL cost findings: ${report.summary.cloudSqlCostFindings}.`,
    `- Gemini/Cloud Assist/Vertex cost findings: ${report.summary.geminiCloudAssistCostFindings}.`,
    "",
    "## Creator Dashboard",
    "",
    ...report.creatorDashboardFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "Creator Dashboard managers remain lazy-mounted by active section. Requests, bookings, Fan Pass, and broadcasts keep loading, empty, error, disabled, and read-only or pending states. Plain admin accounts no longer call creator settings unless admin view-as projection is active.",
    "",
    "## 4xx Classification",
    "",
    ...report.route4xxFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "Expected 4xx states include auth required, invalid input, insufficient paid GumDrops, unavailable creator features, slot unavailable, read-only projection, and disabled creator settings. Unexpected frontend-caused 4xx from plain admin self-load was fixed.",
    "",
    "## Cost Inventory",
    "",
    "### Cloud Run / App Hosting",
    "",
    ...report.cloudRunCostFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "### Cloud SQL",
    "",
    ...report.cloudSqlCostFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "### Gemini / Cloud Assist / Vertex",
    "",
    ...report.geminiCloudAssistCostFindings.map((entry) => `- ${entry.id} [${entry.status}]: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(docsPath, `${lines.join("\n")}\n`);
}

function main() {
  const report = buildCreatorDashboardErrorCostInventoryReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeDocs(report);

  const failures = validateCreatorDashboardErrorCostInventoryReport(report, readWorkspaceSources(), {
    currentHead: currentHead(),
    changedPaths: changedPaths(),
  });
  if (failures.length > 0) {
    console.error("Creator dashboard error/cost inventory validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Creator dashboard error/cost inventory passed. fixed=${report.summary.creatorDashboardErrorsFixed} ` +
      `expected4xx=${report.summary.expected4xxCount} cloudRun=${report.summary.cloudRunCostFindings} ` +
      `cloudSql=${report.summary.cloudSqlCostFindings} ai=${report.summary.geminiCloudAssistCostFindings}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
