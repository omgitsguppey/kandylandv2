import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

type Severity = "p0" | "p1" | "p2";
type TruthRole = "product_truth" | "evidence_only" | "admin_display" | "legacy_recovery" | "supporting_index";
type CostLane = "cloud_run" | "cloud_sql" | "gemini_cloud_assist" | "route_4xx";
type Route4xxClassification = "expected_product_4xx" | "unexpected_tracking_client_4xx";

export type IdentityMapEntry = {
  id: string;
  lane: "guest" | "anonymous_visitor" | "session" | "user" | "identity_link" | "admin_snapshot";
  source: string;
  fields: string[];
  collectionOrPath: string;
  truthRole: TruthRole;
  transferCandidate: boolean;
  notes: string;
};

export type TransferGap = {
  id: string;
  severity: Severity;
  owner: string;
  currentState: string;
  expectedState: string;
  evidence: string[];
  action: string;
};

export type LegacyRecoveryEntry = {
  id: string;
  source: string;
  truthRole: TruthRole;
  recoveryUse: string;
  transferRule: string;
  risks: string[];
};

export type WatchTimeEntry = {
  id: string;
  source: string;
  truthRole: TruthRole;
  runtimePlaybackTruth: boolean;
  pageOpenTimeAllowed: boolean;
  notes: string;
};

export type SourceTruthEntry = {
  id: string;
  source: string;
  truthRole: TruthRole;
  uiConsumer: string;
  productTruthAllowed: boolean;
  notes: string;
};

export type CostFinding = {
  id: string;
  lane: CostLane;
  severity: Severity;
  status: string;
  owner: string;
  filePath: string;
  detail: string;
  action: string;
  evidence: string[];
  classification?: Route4xxClassification;
};

export type AnalyticsIdentityTransferInventoryReport = {
  generatedAtUtc: string;
  reportKey: "analytics-identity-transfer-inventory";
  currentHead: string;
  summary: {
    guestIdentitySources: number;
    userIdentitySources: number;
    sessionSources: number;
    watchSessionSources: number;
    transferCandidates: number;
    legacyRecoverySources: number;
    uiConsumers: number;
    productTruthSources: number;
    evidenceOnlySources: number;
    cloudRunCostFindings: number;
    cloudSqlStatus: string;
    geminiCloudAssistStatus: string;
    route4xxFindings: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  identityMap: IdentityMapEntry[];
  transferGaps: TransferGap[];
  legacyRecoveryMap: LegacyRecoveryEntry[];
  watchTimeMap: WatchTimeEntry[];
  sourceTruthMap: SourceTruthEntry[];
  costFindings: CostFinding[];
  nextFixOrder: string[];
};

type SourceMap = Record<string, string>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/analytics-identity-transfer-inventory.generated.json";
const artifactPath = join(repoRoot, artifactRelativePath);
const docsRelativePath = "docs/agent-truth/analytics-identity-transfer-inventory.md";
const docsPath = join(repoRoot, docsRelativePath);

const inspectedSourceFiles = [
  "src/context/AuthContext.tsx",
  "src/lib/analytics/analytics-identity-link.ts",
  "src/app/api/analytics/identity-link/route.ts",
  "src/components/Analytics/DeepTracker.tsx",
  "src/lib/client-session.ts",
  "src/lib/analytics/analytics-event-contract.ts",
  "src/lib/analytics/identity-link-contract.ts",
  "src/app/api/analytics/ingest/route.ts",
  "src/app/api/analytics/ingest-identified/route.ts",
  "src/lib/server/analytics-identity-linking.ts",
  "src/lib/server/admin-analytics-data.ts",
  "src/lib/server/admin-analytics-materializers.ts",
  "src/types/admin-analytics.ts",
  "functions/src/analytics-core.ts",
  "functions/src/analytics-guest-batches.ts",
  "functions/src/analytics-semantics.ts",
  "functions/src/analytics-event-facts.ts",
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

function includesAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}


// Source readiness only: these checks do not prove deployed handoff or historical recovery.
function identityHandoffSourceFailures(sources: SourceMap) {
  const parse = (path: string) => ts.createSourceFile(path, sources[path] ?? "", ts.ScriptTarget.Latest, true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const calls = (node: ts.Node, source: ts.SourceFile, name: string) => {
    const found: ts.CallExpression[] = [];
    const visit = (child: ts.Node) => {
      if (ts.isCallExpression(child) && child.expression.getText(source) === name) found.push(child);
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };
  const property = (call: ts.CallExpression | undefined, source: ts.SourceFile, name: string) => {
    const argument = call?.arguments[0];
    if (!argument || !ts.isObjectLiteralExpression(argument)) return "";
    const member = argument.properties.find(member => ts.isPropertyAssignment(member) && member.name.getText(source) === name);
    return member && ts.isPropertyAssignment(member) ? member.initializer.getText(source) : "";
  };
  const auth = parse("src/context/AuthContext.tsx");
  const client = parse("src/lib/analytics/analytics-identity-link.ts");
  const route = parse("src/app/api/analytics/identity-link/route.ts");
  const identified = parse("src/app/api/analytics/ingest-identified/route.ts");
  let handoff: ts.Node | undefined;
  let payloadBuilder: ts.Node | undefined;
  let canonicalRoute = false;
  const findDeclarations = (node: ts.Node, source: ts.SourceFile) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "emitIdentityLinkContinuity"
      && node.initializer && ts.isCallExpression(node.initializer)) handoff = node.initializer.arguments[0];
    if (ts.isFunctionDeclaration(node) && node.name?.text === "buildIdentityLinkPayload") payloadBuilder = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "GUEST_USER_IDENTITY_TRANSFER_ROUTE"
      && node.initializer && ts.isStringLiteral(node.initializer)) canonicalRoute = node.initializer.text === "/api/analytics/identity-link";
    ts.forEachChild(node, child => findDeclarations(child, source));
  };
  findDeclarations(auth, auth);
  findDeclarations(client, client);
  const failures: string[] = [];
  if (!handoff || calls(handoff, auth, "buildIdentityLinkPayload").length !== 1
    || !calls(handoff, auth, "payload.submit").some(call => call.arguments[0]?.getText(auth) === "authFetch")
    || !calls(handoff, auth, "hasSubmittedIdentityLink").some(call => call.arguments[0]?.getText(auth) === "payload")) {
    failures.push("AuthContext handoff must build, lifecycle-guard and submit the canonical identity payload.");
  }
  for (const method of ["login", "signup", "session_restore"]) {
    if (!calls(auth, auth, "emitIdentityLinkContinuity").some(call => call.arguments[1]
      && ts.isStringLiteral(call.arguments[1]) && call.arguments[1].text === method)) {
      failures.push("AuthContext " + method + " handoff call is missing.");
    }
  }
  if (!canonicalRoute || !payloadBuilder || !calls(payloadBuilder, client, "fetcher")
    .some(call => call.arguments[0]?.getText(client) === "GUEST_USER_IDENTITY_TRANSFER_ROUTE")) {
    failures.push("Identity payload submit must target /api/analytics/identity-link.");
  }
  const upserts = calls(route, route, "upsertAnalyticsIdentityLink");
  const builds = calls(route, route, "buildIdentityLink");
  if (upserts.length !== 1 || property(upserts[0], route, "userId") !== "caller.uid"
    || builds.length !== 1 || property(builds[0], route, "userId") !== "caller.uid"
    || calls(route, route, "guardApiRequest").length !== 1) {
    failures.push("Canonical identity route must own the caller-bound association write.");
  }
  if (!calls(route, route, "restrictConsentMode").some(call => call.arguments[0]
      && ts.isCallExpression(call.arguments[0]) && call.arguments[0].expression.getText(route) === "resolveRequestConsentMode")
    || calls(route, route, "canPersistIdentityLink").length === 0) {
    failures.push("Canonical identity route must clamp declared consent to request consent.");
  }
  if (calls(identified, identified, "upsertAnalyticsIdentityLink").length > 0) {
    failures.push("Identified ingest must not duplicate the canonical association writer.");
  }
  const diagnosticFields = new Map<string, string>();
  let noAssociationStatus = false;
  const inspectDiagnostic = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node)) diagnosticFields.set(node.name.getText(identified), node.initializer.getText(identified));
    if (ts.isVariableDeclaration(node) && node.name.getText(identified) === "identityLinksCreated"
      && node.initializer?.getText(identified) === "0") noAssociationStatus = true;
    ts.forEachChild(node, inspectDiagnostic);
  };
  inspectDiagnostic(identified);
  if (!noAssociationStatus || diagnosticFields.get("diagnostic_only") !== "true"
    || diagnosticFields.get("metric_eligible") !== "false"
    || diagnosticFields.get("canonical_link_source") !== '"server_identity_link"') {
    failures.push("Observed identity ingest must retain diagnostic exclusion and zero-created compatibility status.");
  }
  return failures;
}

export function buildAnalyticsIdentityTransferInventoryReport(input: {
  currentHead: string;
  generatedAtUtc: string;
  sources?: SourceMap;
}): AnalyticsIdentityTransferInventoryReport {
  const handoffFailures = identityHandoffSourceFailures(input.sources ?? readSources());
  const identityMap: IdentityMapEntry[] = [
    {
      id: "client-anonymous-visitor-id",
      lane: "anonymous_visitor",
      source: "getClientAnalyticsIdentitySnapshot",
      fields: ["anonymousVisitorId", "sessionId", "consentState", "identityPersistenceAllowed"],
      collectionOrPath: "src/lib/client-session.ts",
      truthRole: "product_truth",
      transferCandidate: true,
      notes: "Durable anonymous subject is persisted only when consent allows it; denied consent returns no anonymous visitor id.",
    },
    {
      id: "deeptracker-guest-batch",
      lane: "guest",
      source: "DeepTracker guest queue",
      fields: ["anonymousVisitorId", "sessionId", "batchId", "events"],
      collectionOrPath: "src/components/Analytics/DeepTracker.tsx -> /api/analytics/ingest",
      truthRole: "product_truth",
      transferCandidate: true,
      notes: "Guest events are batched with client identity and must remain recoverable instead of being discarded at login.",
    },
    {
      id: "server-guest-session-cookie",
      lane: "session",
      source: "analytics guest ingest fallback",
      fields: ["sessionKey", "serverSessionKey", "clientSessionId", "anonymousVisitorId"],
      collectionOrPath: "analytics_sessions / analytics_guest_batches",
      truthRole: "product_truth",
      transferCandidate: true,
      notes: "Server anon session key is a transport fallback; canonical anonymous visitor id prefers the client anonymous subject when valid.",
    },
    {
      id: "identified-ingest-user",
      lane: "user",
      source: "identified analytics ingest",
      fields: ["caller.uid", "eventId", "eventName", "eventParams"],
      collectionOrPath: "src/app/api/analytics/ingest-identified/route.ts -> analytics_event_facts",
      truthRole: "product_truth",
      transferCandidate: true,
      notes: "Authenticated telemetry writes observed runtime facts; identity_linked is diagnostic only and does not create an association.",
    },
    {
      id: "identity-linked-bridge",
      lane: "identity_link",
      source: "AuthContext -> buildIdentityLinkPayload.submit -> /api/analytics/identity-link",
      fields: ["anonymousVisitorId", "sessionId", "userId", "linkedAt", "eligiblePastSessionIds", "method", "mergeAllowed"],
      collectionOrPath: "src/app/api/analytics/identity-link/route.ts -> analytics_identity_links / identity_lineage_indexes",
      truthRole: "supporting_index",
      transferCandidate: true,
      notes: "The canonical caller-bound, request-consent-gated route writes associations without scanning or rewriting old guest facts; source readiness does not prove deployed or historical continuity.",
    },
    {
      id: "admin-analytics-snapshots",
      lane: "admin_snapshot",
      source: "admin analytics materializers",
      fields: ["analytics_admin_metric_snapshots", "analytics_aggregate_stats", "sourceLabel", "freshness"],
      collectionOrPath: "src/lib/server/admin-analytics-data.ts",
      truthRole: "admin_display",
      transferCandidate: false,
      notes: "Admin snapshots are UI/display read models; they can expose linked context only when first-party source labels prove it.",
    },
  ];

  const transferGaps: TransferGap[] = [
    ...(handoffFailures.length > 0 ? [{
      id: "auth-handoff-source-chain-incomplete",
      severity: "p1" as const,
      owner: "analytics-identity",
      currentState: handoffFailures.join(" "),
      expectedState: "AuthContext submits login/signup/session-restore handoffs through the sole canonical caller-bound, request-consent-gated identity route.",
      evidence: ["src/context/AuthContext.tsx", "src/lib/analytics/analytics-identity-link.ts", "src/app/api/analytics/identity-link/route.ts", "src/app/api/analytics/ingest-identified/route.ts"],
      action: "Repair the failed source connection in its existing owner; do not add another handoff or association writer.",
    }] : []),
    {
      id: "guest-history-not-reclassified",
      severity: "p2",
      owner: "analytics-identity",
      currentState: "Guest events remain guest-lane facts in analytics_guest_batches and behavioral timeline facts.",
      expectedState: "Guest history should be recoverable through identity lineage without rewriting guest event actor lanes.",
      evidence: ["docs/agent-truth/analytics-actor-taxonomy.md", "docs/agent-truth/analytics-truth-layer-v2.md"],
      action: "Keep transfer implementation link-based and avoid backfilling guest rows into user rows.",
    },
    {
      id: "admin-consumer-linked-context-not-proven",
      severity: "p2",
      owner: "admin-analytics",
      currentState: "Admin display truth reads snapshots/hot caches and first-party facts, but this inventory does not prove every UI reads identity lineage.",
      expectedState: "Admin UI should show linked guest-to-user context only when source labels include identity lineage evidence.",
      evidence: ["src/lib/server/admin-analytics-data.ts", "src/types/admin-analytics.ts"],
      action: "After transfer wiring, add admin snapshot fields that distinguish direct user facts from linked guest context.",
    },
  ];

  const legacyRecoveryMap: LegacyRecoveryEntry[] = [
    {
      id: "legacy-event-facts",
      source: "analytics_event_facts",
      truthRole: "legacy_recovery",
      recoveryUse: "Backfillable event candidates when event name, actor lane, timestamp, and dedupe data are present.",
      transferRule: "Can join to a known user only through identity_linked or analytics_identity_links.",
      risks: ["older params may miss actor lane", "must not replace stronger current product truth"],
    },
    {
      id: "legacy-guest-batches",
      source: "analytics_guest_batches",
      truthRole: "legacy_recovery",
      recoveryUse: "Guest journey evidence and anonymous session context.",
      transferRule: "Remain guest facts; identity lineage can make them recoverable for a user without reclassifying them.",
      risks: ["directional interaction events", "consent/persistence state must be honored"],
    },
    {
      id: "legacy-watch-sessions",
      source: "analytics_watch_sessions / analytics_watch_assets / analytics_watch_observations",
      truthRole: "legacy_recovery",
      recoveryUse: "Viewer playback history and watch parity.",
      transferRule: "Can be associated to linked user context only when userId/sessionId or identity lineage proves the relationship.",
      risks: ["missing start/end pairs", "page-open duration is not watch truth"],
    },
    {
      id: "vendor-warehouse-evidence",
      source: "GA4 / BigQuery / PostHog",
      truthRole: "evidence_only",
      recoveryUse: "Directional parity, export health, and provider comparison.",
      transferRule: "Never promotes guest identity into product truth by itself.",
      risks: ["intraday incompleteness", "vendor identity drift", "not a runtime import target"],
    },
  ];

  const watchTimeMap: WatchTimeEntry[] = [
    {
      id: "watch-session-rollups",
      source: "analytics_watch_sessions",
      truthRole: "product_truth",
      runtimePlaybackTruth: true,
      pageOpenTimeAllowed: false,
      notes: "Canonical watch time comes from runtime viewer/watch sessions and playback/visibility observations.",
    },
    {
      id: "watch-assets-observations",
      source: "analytics_watch_assets / analytics_watch_observations",
      truthRole: "product_truth",
      runtimePlaybackTruth: true,
      pageOpenTimeAllowed: false,
      notes: "Asset observations support deduped/finalized playback time and missing-watch diagnostics.",
    },
    {
      id: "deeptracker-page-duration",
      source: "DeepTracker durationMs",
      truthRole: "evidence_only",
      runtimePlaybackTruth: false,
      pageOpenTimeAllowed: false,
      notes: "Page dwell can diagnose engagement but must not populate canonical watch time.",
    },
  ];

  const sourceTruthMap: SourceTruthEntry[] = [
    {
      id: "first-party-runtime-facts",
      source: "analytics_event_facts",
      truthRole: "product_truth",
      uiConsumer: "admin analytics, behavioral timeline, debug truth",
      productTruthAllowed: true,
      notes: "Canonical event facts are first-party product behavior truth when actor/source fields are present.",
    },
    {
      id: "first-party-guest-batches",
      source: "analytics_guest_batches",
      truthRole: "product_truth",
      uiConsumer: "live pulse, guest traffic, behavioral timeline",
      productTruthAllowed: true,
      notes: "Guest batches are product truth for anonymous behavior, not disposable pre-auth noise.",
    },
    {
      id: "identity-lineage-indexes",
      source: "analytics_identity_links / identity_lineage_indexes",
      truthRole: "supporting_index",
      uiConsumer: "future guest-to-user recovery views",
      productTruthAllowed: true,
      notes: "Lineage indexes link identities and must preserve original actor lanes.",
    },
    {
      id: "admin-snapshot-display",
      source: "analytics_admin_metric_snapshots / analytics_aggregate_stats",
      truthRole: "admin_display",
      uiConsumer: "Admin Analytics",
      productTruthAllowed: false,
      notes: "Snapshots are fast display truth and need source labels/freshness before UI can claim health.",
    },
    {
      id: "external-provider-evidence",
      source: "GA4 / BigQuery / PostHog",
      truthRole: "evidence_only",
      uiConsumer: "Debug parity and export evidence",
      productTruthAllowed: false,
      notes: "External analytics layers validate or compare; they do not define product identity truth.",
    },
  ];

  const costFindings: CostFinding[] = [
    {
      id: "analytics-ingest-cloud-run-bounded",
      lane: "cloud_run",
      severity: "p2",
      status: "source_inventory_complete",
      owner: "analytics-platform",
      filePath: "src/app/api/analytics/ingest/route.ts",
      detail: "Guest ingest has body-size, event-count, consent, idempotent batch, and transaction boundaries; future transfer must not add eager broad reads before validation.",
      action: "Keep identity transfer write-once per auth transition and avoid repeated 4xx retries or unbounded fanout.",
      evidence: ["MAX_ANALYTICS_BODY_BYTES", "events.max(200)", "existingBatchSnapshot", "requestAllowsAnonymousAnalytics"],
    },
    {
      id: "identified-ingest-cloud-run-bounded",
      lane: "cloud_run",
      severity: "p2",
      status: "source_inventory_complete",
      owner: "analytics-platform",
      filePath: "src/app/api/analytics/ingest-identified/route.ts",
      detail: "Identified ingest is auth-gated, rate-limited and validates observed event batches; identity_linked remains diagnostic and cannot write associations.",
      action: "Keep association writes in the existing caller-bound, request-consent-gated /api/analytics/identity-link route; retain bounded diagnostic ingest.",
      evidence: ["guardApiRequest", "PayloadSchema", "src/app/api/analytics/identity-link/route.ts", "identityLinksCreated"],
    },
    {
      id: "cloud-sql-agent-context-mirror-detected",
      lane: "cloud_sql",
      severity: "p2",
      status: "cloud_sql_agent_context_mirror_detected_no_product_runtime_dependency",
      owner: "platform-cost",
      filePath: "dataconnect/dataconnect.yaml",
      detail: "Cloud SQL/Data Connect appears as an agent-context mirror, not as an analytics identity transfer runtime dependency.",
      action: "Do not invent Cloud SQL fixes; verify billing/runtime status only in a cloud-cost owner pass.",
      evidence: ["dataconnect/dataconnect.yaml", "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md"],
    },
    {
      id: "gemini-cloud-assist-outside-transfer-lane",
      lane: "gemini_cloud_assist",
      severity: "p2",
      status: "vertex_admin_ai_detected_outside_analytics_identity_transfer",
      owner: "admin-ai",
      filePath: "src/lib/admin-ai-models.ts",
      detail: "Gemini/Vertex model references are admin/AI cover/debug lanes; no analytics identity transfer model call was found.",
      action: "Do not add AI calls to identity transfer. Keep provider checks in the admin AI cost lane.",
      evidence: ["src/lib/admin-ai-models.ts", "src/lib/admin-ai-debug-runtime.ts"],
    },
    {
      id: "analytics-expected-4xx",
      lane: "route_4xx",
      severity: "p2",
      status: "classified",
      owner: "analytics-platform",
      filePath: "src/app/api/analytics/ingest-identified/route.ts",
      detail: "401 unauthenticated and ignored invalid/payload-too-large analytics submissions are expected product 4xx/ignored paths.",
      action: "Clients should not retry auth-required or invalid analytics payloads indefinitely.",
      evidence: ["status: 401", "payload_too_large", "validation failed or empty payload"],
      classification: "expected_product_4xx",
    },
    {
      id: "analytics-unexpected-client-4xx-risk",
      lane: "route_4xx",
      severity: "p1",
      status: "owner_review_required",
      owner: "analytics-client",
      filePath: "src/components/Analytics/DeepTracker.tsx",
      detail: "Malformed identity/event payloads, stale route targets, or consent/identity mismatch would be unexpected tracking/client 4xx sources during transfer wiring.",
      action: "Transfer implementation should emit one idempotent identity_linked event and stop retries after typed ignored/auth failures.",
      evidence: ["buildGuestAnalyticsIngestPayload", "buildClientIdentityLinkRecord", "identity_linked"],
      classification: "unexpected_tracking_client_4xx",
    },
  ];

  const severityFindings = [...transferGaps, ...costFindings];
  const productTruthSources = sourceTruthMap.filter((entry) => entry.truthRole === "product_truth").length;
  const evidenceOnlySources = sourceTruthMap.filter((entry) => entry.truthRole === "evidence_only").length
    + legacyRecoveryMap.filter((entry) => entry.truthRole === "evidence_only").length;

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "analytics-identity-transfer-inventory",
    currentHead: input.currentHead,
    summary: {
      guestIdentitySources: identityMap.filter((entry) => entry.lane === "guest" || entry.lane === "anonymous_visitor").length,
      userIdentitySources: identityMap.filter((entry) => entry.lane === "user" || entry.lane === "identity_link").length,
      sessionSources: identityMap.filter((entry) => entry.lane === "session").length,
      watchSessionSources: watchTimeMap.length,
      transferCandidates: identityMap.filter((entry) => entry.transferCandidate).length,
      legacyRecoverySources: legacyRecoveryMap.length,
      uiConsumers: sourceTruthMap.filter((entry) => entry.uiConsumer.length > 0).length,
      productTruthSources,
      evidenceOnlySources,
      cloudRunCostFindings: costFindings.filter((entry) => entry.lane === "cloud_run").length,
      cloudSqlStatus: "cloud_sql_agent_context_mirror_detected_no_product_runtime_dependency",
      geminiCloudAssistStatus: "vertex_admin_ai_detected_outside_analytics_identity_transfer",
      route4xxFindings: costFindings.filter((entry) => entry.lane === "route_4xx").length,
      p0Count: countSeverity(severityFindings, "p0"),
      p1Count: countSeverity(severityFindings, "p1"),
      p2Count: countSeverity(severityFindings, "p2"),
    },
    identityMap,
    transferGaps,
    legacyRecoveryMap,
    watchTimeMap,
    sourceTruthMap,
    costFindings,
    nextFixOrder: [
      ...(handoffFailures.length > 0 ? ["Repair the reported existing AuthContext/client/canonical-route source connection."] : []),
      "Keep the source-checked AuthContext handoff and sole canonical association writer; deployed continuity and historical recovery still require their own current evidence.",
      "Verify admin/user analytics consumers label direct user facts versus consent-eligible linked guest context without double-counting or promoting missing data to zero.",
    ],
  };
}

export function validateAnalyticsIdentityTransferInventoryReport(
  report: AnalyticsIdentityTransferInventoryReport,
  sources: SourceMap,
  options: { currentHead?: string } = {},
) {
  const failures: string[] = [];

  if (report.reportKey !== "analytics-identity-transfer-inventory") {
    failures.push("reportKey must be analytics-identity-transfer-inventory.");
  }
  if (options.currentHead && report.currentHead !== options.currentHead) {
    failures.push("currentHead mismatch.");
  }
  if (report.summary.guestIdentitySources < 2 || !report.identityMap.some((entry) => entry.lane === "guest")) {
    failures.push("guest identity sources are not fully listed.");
  }
  if (report.summary.userIdentitySources < 2 || !report.identityMap.some((entry) => entry.lane === "user")) {
    failures.push("user identity sources are not fully listed.");
  }
  if (report.summary.transferCandidates < 3 || report.transferGaps.length === 0) {
    failures.push("transfer candidates are missing.");
  }
  if (!report.sourceTruthMap.some((entry) => entry.truthRole === "product_truth" && entry.productTruthAllowed)) {
    failures.push("analytics product truth sources are not separated.");
  }
  if (!report.sourceTruthMap.some((entry) => entry.truthRole === "evidence_only" && !entry.productTruthAllowed)) {
    failures.push("analytics evidence-only layers are not separated.");
  }
  if (report.watchTimeMap.length === 0 || !report.watchTimeMap.some((entry) => entry.runtimePlaybackTruth && !entry.pageOpenTimeAllowed)) {
    failures.push("watch-time sources are not mapped to runtime playback truth.");
  }
  for (const lane of ["cloud_run", "cloud_sql", "gemini_cloud_assist", "route_4xx"] as const) {
    if (!report.costFindings.some((entry) => entry.lane === lane)) {
      failures.push(`${lane} cost status lane is missing.`);
    }
  }
  if (!report.summary.cloudSqlStatus || report.summary.cloudSqlStatus === "pass") {
    failures.push("Cloud SQL status must be explicit and must not be pass without runtime evidence.");
  }
  if (!report.summary.geminiCloudAssistStatus || report.summary.geminiCloudAssistStatus === "pass") {
    failures.push("Gemini/Cloud Assist status must be explicit and must not be pass without runtime evidence.");
  }
  if (!report.costFindings.some((entry) => entry.classification === "expected_product_4xx")) {
    failures.push("expected product 4xx classification is missing.");
  }
  if (!report.costFindings.some((entry) => entry.classification === "unexpected_tracking_client_4xx")) {
    failures.push("unexpected tracking/client 4xx classification is missing.");
  }
  if (report.nextFixOrder.length === 0) {
    failures.push("nextFixOrder must not be empty.");
  }

  failures.push(...identityHandoffSourceFailures(sources));

  const allSource = Object.values(sources).join("\n");
  if (!includesAny(allSource, ["anonymousVisitorId", "getClientAnalyticsIdentitySnapshot"])) {
    failures.push("source scan did not find anonymous visitor identity.");
  }
  if (!includesAny(allSource, ["identity_linked", "upsertAnalyticsIdentityLink"])) {
    failures.push("source scan did not find identity_linked bridge.");
  }
  if (!includesAny(allSource, ["analytics_guest_batches", "guestBatches"])) {
    failures.push("source scan did not find guest batch collection.");
  }
  if (!includesAny(allSource, ["analytics_event_facts", "runtimeFacts"])) {
    failures.push("source scan did not find event fact collection.");
  }

  return failures;
}

function renderMarkdown(report: AnalyticsIdentityTransferInventoryReport) {
  const lines = [
    "# Analytics Identity Transfer Inventory",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Guest identity sources: ${report.summary.guestIdentitySources}`,
    `- User identity sources: ${report.summary.userIdentitySources}`,
    `- Session sources: ${report.summary.sessionSources}`,
    `- Watch session sources: ${report.summary.watchSessionSources}`,
    `- Transfer candidates: ${report.summary.transferCandidates}`,
    `- Product truth sources: ${report.summary.productTruthSources}`,
    `- Evidence-only sources: ${report.summary.evidenceOnlySources}`,
    `- Cloud SQL status: ${report.summary.cloudSqlStatus}`,
    `- Gemini/Cloud Assist status: ${report.summary.geminiCloudAssistStatus}`,
    `- Route 4xx findings: ${report.summary.route4xxFindings}`,
    "",
    "## Identity Map",
    "",
    ...report.identityMap.map((entry) => `- ${entry.id}: ${entry.collectionOrPath} (${entry.truthRole}) - ${entry.notes}`),
    "",
    "## Transfer Gaps",
    "",
    ...report.transferGaps.map((gap) => `- ${gap.id} [${gap.severity}]: ${gap.currentState} Next: ${gap.action}`),
    "",
    "## Product Truth vs Evidence",
    "",
    ...report.sourceTruthMap.map((entry) => `- ${entry.id}: ${entry.source} -> ${entry.truthRole}; UI consumer: ${entry.uiConsumer}; product truth allowed: ${entry.productTruthAllowed}`),
    "",
    "## Watch Time",
    "",
    ...report.watchTimeMap.map((entry) => `- ${entry.id}: runtime playback truth=${entry.runtimePlaybackTruth}; page-open allowed=${entry.pageOpenTimeAllowed}. ${entry.notes}`),
    "",
    "## Cost and 4xx",
    "",
    ...report.costFindings.map((entry) => `- ${entry.id} (${entry.lane}, ${entry.severity}, ${entry.status}): ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function writeReport(report: AnalyticsIdentityTransferInventoryReport) {
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, renderMarkdown(report));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = buildAnalyticsIdentityTransferInventoryReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  const failures = validateAnalyticsIdentityTransferInventoryReport(report, readSources(), { currentHead: report.currentHead });

  if (failures.length > 0) {
    console.error("Analytics identity transfer inventory validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  writeReport(report);
  console.log(`[analytics-identity-transfer-inventory] wrote ${artifactRelativePath}`);
  console.log(`[analytics-identity-transfer-inventory] wrote ${docsRelativePath}`);
}
