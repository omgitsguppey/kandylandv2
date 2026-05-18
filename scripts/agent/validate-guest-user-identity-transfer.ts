import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "p0" | "p1" | "p2";
type CostLane = "cloud_run" | "cloud_sql" | "gemini_cloud_assist" | "route_4xx";

export type GuestUserIdentityTransferReport = {
  generatedAtUtc: string;
  reportKey: "guest-user-identity-transfer";
  currentHead: string;
  summary: {
    linkHelperCreated: boolean;
    identityLinkRouteCreated: boolean;
    authTransitionHookCreated: boolean;
    eventContractIdentityState: boolean;
    idempotentClientSubmission: boolean;
    routeRequiresAuth: boolean;
    historicalGuestEventsDuplicated: boolean;
    cloudRunCostFindings: number;
    cloudSqlStatus: string;
    geminiCloudAssistStatus: string;
    route4xxFindings: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  identitySemantics: Array<{
    id: string;
    state: "guest_only" | "user_only" | "guest_linked_to_user" | "unknown_legacy";
    actorType: "guest" | "authenticated_user" | "creator" | "admin" | "system";
    rule: string;
  }>;
  transferFindings: Array<{
    id: string;
    severity: Severity;
    owner: string;
    status: string;
    evidence: string[];
    action: string;
  }>;
  costFindings: Array<{
    id: string;
    lane: CostLane;
    severity: Severity;
    status: string;
    evidence: string[];
    action: string;
  }>;
  nextFixOrder: string[];
};

type SourceMap = Record<string, string>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/guest-user-identity-transfer.generated.json";
const artifactPath = join(repoRoot, artifactRelativePath);
const docsRelativePath = "docs/agent-truth/guest-user-identity-transfer.md";
const docsPath = join(repoRoot, docsRelativePath);

const inspectedSourceFiles = [
  "src/lib/analytics/analytics-identity-link.ts",
  "src/lib/analytics/analytics-event-contract.ts",
  "src/lib/analytics/identity-link-contract.ts",
  "src/context/AuthContext.tsx",
  "src/app/api/analytics/identity-link/route.ts",
  "src/app/api/analytics/ingest-identified/route.ts",
  "tests/unit/guest-user-identity-transfer.spec.ts",
];

function currentHead(root = repoRoot) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function readIfExists(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readSources(paths = inspectedSourceFiles): SourceMap {
  return Object.fromEntries(paths.map((path) => [path, readIfExists(path)]));
}

function countSeverity(findings: Array<{ severity: Severity }>, severity: Severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

export function buildGuestUserIdentityTransferReport(input: {
  currentHead: string;
  generatedAtUtc: string;
}): GuestUserIdentityTransferReport {
  const transferFindings: GuestUserIdentityTransferReport["transferFindings"] = [
    {
      id: "link-first-transfer",
      severity: "p2",
      owner: "analytics-identity",
      status: "implemented",
      evidence: ["src/lib/analytics/analytics-identity-link.ts", "src/app/api/analytics/identity-link/route.ts"],
      action: "Store only identity association records; do not rewrite guest events as user events.",
    },
    {
      id: "auth-transition-client-submit",
      severity: "p2",
      owner: "auth-client",
      status: "implemented",
      evidence: ["src/context/AuthContext.tsx"],
      action: "Submit one non-blocking identity link after login, signup, or session restore.",
    },
    {
      id: "event-fact-identity-state",
      severity: "p2",
      owner: "analytics-runtime-facts",
      status: "implemented",
      evidence: ["src/lib/analytics/analytics-event-contract.ts", "src/app/api/analytics/ingest-identified/route.ts"],
      action: "Preserve guest lineage on authenticated facts with identityState and identityLinkId fields.",
    },
  ];

  const costFindings: GuestUserIdentityTransferReport["costFindings"] = [
    {
      id: "cloud-run-bounded-link-write",
      lane: "cloud_run",
      severity: "p2",
      status: "bounded",
      evidence: ["MAX_IDENTITY_LINK_BODY_BYTES", "cost-bound: link-first transfer", "eligiblePastSessionIds.max(25)"],
      action: "Identity transfer writes the association and never scans historical guest batches during login.",
    },
    {
      id: "cloud-sql-not-runtime-transfer",
      lane: "cloud_sql",
      severity: "p2",
      status: "cloud_sql_not_detected_in_transfer_runtime",
      evidence: ["src/app/api/analytics/identity-link/route.ts", "agent/state/analytics-identity-transfer-inventory.generated.json"],
      action: "Keep Cloud SQL out of analytics identity transfer unless a future explicit runtime promotion exists.",
    },
    {
      id: "gemini-cloud-assist-not-involved",
      lane: "gemini_cloud_assist",
      severity: "p2",
      status: "gemini_cloud_assist_not_involved",
      evidence: ["src/lib/analytics/analytics-identity-link.ts", "src/app/api/analytics/identity-link/route.ts"],
      action: "Do not add model calls to identity transfer.",
    },
    {
      id: "expected-auth-4xx",
      lane: "route_4xx",
      severity: "p2",
      status: "expected_product_4xx",
      evidence: ["auth_required", "invalid_identity_link", "retryable: false"],
      action: "Auth-missing and invalid payload failures are typed and non-retried.",
    },
  ];

  const severityFindings = [...transferFindings, ...costFindings];
  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "guest-user-identity-transfer",
    currentHead: input.currentHead,
    summary: {
      linkHelperCreated: true,
      identityLinkRouteCreated: true,
      authTransitionHookCreated: true,
      eventContractIdentityState: true,
      idempotentClientSubmission: true,
      routeRequiresAuth: true,
      historicalGuestEventsDuplicated: false,
      cloudRunCostFindings: costFindings.filter((finding) => finding.lane === "cloud_run").length,
      cloudSqlStatus: "cloud_sql_not_detected_in_transfer_runtime",
      geminiCloudAssistStatus: "gemini_cloud_assist_not_involved",
      route4xxFindings: costFindings.filter((finding) => finding.lane === "route_4xx").length,
      p0Count: countSeverity(severityFindings, "p0"),
      p1Count: countSeverity(severityFindings, "p1"),
      p2Count: countSeverity(severityFindings, "p2"),
    },
    identitySemantics: [
      {
        id: "guest-only",
        state: "guest_only",
        actorType: "guest",
        rule: "Anonymous visitor/session activity remains guest-lane product truth.",
      },
      {
        id: "user-only",
        state: "user_only",
        actorType: "authenticated_user",
        rule: "Authenticated activity without guest lineage remains direct user activity.",
      },
      {
        id: "guest-linked-to-user",
        state: "guest_linked_to_user",
        actorType: "authenticated_user",
        rule: "Authenticated activity can carry preserved anonymous/session lineage through an identity link.",
      },
      {
        id: "unknown-legacy",
        state: "unknown_legacy",
        actorType: "system",
        rule: "Legacy or incomplete rows stay explicitly unknown until source evidence classifies them.",
      },
    ],
    transferFindings,
    costFindings,
    nextFixOrder: [
      "Run source-level checks against the new identity link route and event contract.",
      "Use linked identity lineage in future admin/user analytics consumers without rewriting guest rows.",
      "Keep provider/warehouse evidence separated from product identity truth.",
    ],
  };
}

export function validateGuestUserIdentityTransferReport(
  report: GuestUserIdentityTransferReport,
  sources: SourceMap,
  options: { currentHead?: string } = {},
) {
  const failures: string[] = [];
  const linkHelper = sources["src/lib/analytics/analytics-identity-link.ts"] ?? "";
  const eventContract = sources["src/lib/analytics/analytics-event-contract.ts"] ?? "";
  const authContext = sources["src/context/AuthContext.tsx"] ?? "";
  const route = sources["src/app/api/analytics/identity-link/route.ts"] ?? "";
  const identifiedIngest = sources["src/app/api/analytics/ingest-identified/route.ts"] ?? "";
  const tests = sources["tests/unit/guest-user-identity-transfer.spec.ts"] ?? "";

  if (report.reportKey !== "guest-user-identity-transfer") {
    failures.push("reportKey must be guest-user-identity-transfer.");
  }
  if (options.currentHead && report.currentHead !== options.currentHead) {
    failures.push("currentHead mismatch.");
  }
  if (!report.summary.linkHelperCreated || !linkHelper.includes("buildIdentityLink")) {
    failures.push("guest-to-user link helper missing.");
  }
  if (!linkHelper.includes("identityLinkId") || !linkHelper.includes("authTransitionId")) {
    failures.push("canonical identity ids are missing.");
  }
  if (!linkHelper.includes("createIdentityLinkStorageKey") || !linkHelper.includes("hasSubmittedIdentityLink")) {
    failures.push("link submission idempotency helper missing.");
  }
  if (!authContext.includes("hasSubmittedIdentityLink") || !authContext.includes("markIdentityLinkSubmitted")) {
    failures.push("auth transition can spam transfer route.");
  }
  if (!route.includes("auth: \"user\"") || !route.includes("requireAuthHeaderPresence: true") || !route.includes("auth_required")) {
    failures.push("transfer route must require authenticated user.");
  }
  if (!route.includes("cost-bound: link-first transfer") || route.includes("analytics_guest_batches") || route.includes("collectionGroup")) {
    failures.push("transfer route must be bounded and must not fan out through guest history.");
  }
  if (!eventContract.includes("ANALYTICS_IDENTITY_STATES") || !eventContract.includes("identityState")) {
    failures.push("identity_state missing from event contract.");
  }
  if (!identifiedIngest.includes("identityState") || !identifiedIngest.includes("sourceIdentity")) {
    failures.push("identified ingest does not preserve identity state on event facts.");
  }
  if (report.summary.historicalGuestEventsDuplicated !== false) {
    failures.push("linked guest history must not be represented as duplicate user events.");
  }
  if (!report.identitySemantics.some((entry) => entry.state === "guest_only") || !report.identitySemantics.some((entry) => entry.state === "guest_linked_to_user")) {
    failures.push("individual tracking semantics are incomplete.");
  }
  for (const lane of ["cloud_run", "cloud_sql", "gemini_cloud_assist", "route_4xx"] as const) {
    if (!report.costFindings.some((finding) => finding.lane === lane)) {
      failures.push(`${lane} cost status lane is missing.`);
    }
  }
  if (!report.summary.cloudSqlStatus || report.summary.cloudSqlStatus === "pass") {
    failures.push("Cloud SQL status must not be marked pass without runtime evidence.");
  }
  if (!report.summary.geminiCloudAssistStatus || report.summary.geminiCloudAssistStatus === "pass") {
    failures.push("Gemini/Cloud Assist status must not be marked pass without runtime evidence.");
  }
  for (const requiredTest of [
    "builds a deterministic guest-to-user link id",
    "uses local idempotency keys",
    "lets authenticated events carry guest lineage",
    "keeps guest events guest-only",
    "records transfer failures as non-blocking",
    "requires auth for the transfer route",
  ]) {
    if (!tests.includes(requiredTest)) {
      failures.push(`required test missing: ${requiredTest}`);
    }
  }
  if (report.nextFixOrder.length === 0) {
    failures.push("nextFixOrder must not be empty.");
  }

  return failures;
}

function renderMarkdown(report: GuestUserIdentityTransferReport) {
  const lines = [
    "# Guest-to-User Identity Transfer",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Link helper created: ${report.summary.linkHelperCreated}`,
    `- Identity link route created: ${report.summary.identityLinkRouteCreated}`,
    `- Auth transition hook created: ${report.summary.authTransitionHookCreated}`,
    `- Event contract identity state: ${report.summary.eventContractIdentityState}`,
    `- Idempotent client submission: ${report.summary.idempotentClientSubmission}`,
    `- Route requires auth: ${report.summary.routeRequiresAuth}`,
    `- Historical guest events duplicated: ${report.summary.historicalGuestEventsDuplicated}`,
    `- Cloud SQL status: ${report.summary.cloudSqlStatus}`,
    `- Gemini/Cloud Assist status: ${report.summary.geminiCloudAssistStatus}`,
    "",
    "## Identity Semantics",
    "",
    ...report.identitySemantics.map((entry) => `- ${entry.state}: ${entry.rule}`),
    "",
    "## Transfer Findings",
    "",
    ...report.transferFindings.map((finding) => `- ${finding.id} [${finding.severity}, ${finding.status}]: ${finding.action}`),
    "",
    "## Cost and 4xx",
    "",
    ...report.costFindings.map((finding) => `- ${finding.id} (${finding.lane}, ${finding.status}): ${finding.action}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function writeReport(report: GuestUserIdentityTransferReport) {
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, renderMarkdown(report));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = buildGuestUserIdentityTransferReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  const failures = validateGuestUserIdentityTransferReport(report, readSources(), { currentHead: report.currentHead });

  if (failures.length > 0) {
    console.error("Guest-to-user identity transfer validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  writeReport(report);
  console.log(`[guest-user-identity-transfer] wrote ${artifactRelativePath}`);
  console.log(`[guest-user-identity-transfer] wrote ${docsRelativePath}`);
}
