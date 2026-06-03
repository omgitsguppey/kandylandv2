import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type Severity = "P0" | "P1" | "P2";

type AuditIssue = {
  severity: Severity;
  title: string;
  evidence: string[];
  recommendedAction: string;
};

type SurfaceReport = {
  key: string;
  component: string;
  route: string;
  expectedSource: string;
  actualSource: string;
  sourceMetadataPresent: boolean;
  actionTarget: string | null;
  targetExists: boolean;
  status: string;
  issues: AuditIssue[];
  recommendedAction: string;
};

const root = process.cwd();
const outputPath = "agent/state/user-facing-feature-connection-audit.generated.json";
const outputFullPath = join(root, outputPath);
const failures: string[] = [];

const files = {
  hub: "src/components/Creators/CreatorDashboardSettingsHub.tsx",
  broadcasts: "src/components/Creators/CreatorBroadcastManager.tsx",
  requestsManager: "src/components/Creators/CreatorRequestsManager.tsx",
  bookingsManager: "src/components/Creators/CreatorBookingsManager.tsx",
  fanPassManager: "src/components/Creators/CreatorFanPassManager.tsx",
  guidance: "src/components/Creators/CreatorPaidGdGuidanceCard.tsx",
  settingsRoute: "src/app/api/creator/settings/route.ts",
  chatPage: "src/app/dashboard/chat/page.tsx",
  creatorDashboardPage: "src/app/dashboard/creator/page.tsx",
  creatorRequestsRoute: "src/app/api/creator/requests/route.ts",
  creatorBookingsRoute: "src/app/api/creator/bookings/route.ts",
  creatorSubscriptionsRoute: "src/app/api/creator/subscriptions/route.ts",
  creatorBroadcastRoute: "src/app/api/creator/broadcasts/route.ts",
  doc: "docs/agent-truth/user-facing-feature-connection-audit.md",
  packageJson: "package.json",
};

const allowedSettingsCollections = new Set([
  "users",
  "creator_ledger_accruals",
  "creator_payout_requests",
  "creator_subscriptions",
  "creator_custom_requests",
  "creator_call_bookings",
  "creator_relationships",
  "creator_relationships_ops",
  "drops",
]);

function read(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function routeExists(relativePath: string) {
  return existsSync(join(root, relativePath));
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function walkFiles(relativePath: string, output: string[] = []) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return output;
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    const child = `${relativePath}/${entry.name}`;
    if (entry.isDirectory()) {
      walkFiles(child, output);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/u.test(entry.name)) {
      output.push(child);
    }
  }
  return output;
}

function issue(severity: Severity, title: string, evidence: string[], recommendedAction: string): AuditIssue {
  return { severity, title, evidence, recommendedAction };
}

function countIssues(surfaces: SurfaceReport[], extra: AuditIssue[], severity: Severity) {
  return surfaces.flatMap((surface) => surface.issues).concat(extra).filter((entry) => entry.severity === severity).length;
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) failures.push(`${label} must not include "${forbidden}".`);
}

const hub = read(files.hub);
const broadcasts = read(files.broadcasts);
const requestsManager = read(files.requestsManager);
const bookingsManager = read(files.bookingsManager);
const fanPassManager = read(files.fanPassManager);
const guidance = read(files.guidance);
const settingsRoute = read(files.settingsRoute);
const broadcastRoute = read(files.creatorBroadcastRoute);
const requestsRoute = read(files.creatorRequestsRoute);
const bookingsRoute = read(files.creatorBookingsRoute);
const subscriptionsRoute = read(files.creatorSubscriptionsRoute);
const doc = read(files.doc);
const packageJson = read(files.packageJson);
const creatorFiles = walkFiles("src/components/Creators");
const creatorSource = creatorFiles.map((file) => read(file)).join("\n");
const settingsCollections = Array.from(settingsRoute.matchAll(/adminDb\.collection\("([^"]+)"\)/gu)).map((match) => match[1]);
const unexpectedSettingsCollections = settingsCollections.filter((collection) => !allowedSettingsCollections.has(collection));
const newCreatorLoops = creatorSource.match(/\b(setInterval|onSnapshot)\b/gu) ?? [];

const surfaces: SurfaceReport[] = [
  {
    key: "public_profile",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator profile route and creator settings identity",
    actualSource: "buildCreatorPublicHref + /api/creators/[username]",
    sourceMetadataPresent: hub.includes("buildCreatorPublicHref"),
    actionTarget: "/creators/[username] or /dashboard/profile",
    targetExists: routeExists("src/app/creators/[username]/page.tsx") || routeExists("src/app/creators/[username]/CreatorProfileClient.tsx"),
    status: "connected",
    issues: [],
    recommendedAction: "Keep public profile target tied to creator profile routing.",
  },
  {
    key: "broadcasts",
    component: files.broadcasts,
    route: "/dashboard/creator",
    expectedSource: "creator_broadcasts route and collection",
    actualSource: "/api/creator/broadcasts",
    sourceMetadataPresent: broadcasts.includes("canReadBroadcasts") && broadcasts.includes("loadRequestIdRef"),
    actionTarget: "/api/creator/broadcasts",
    targetExists: routeExists(files.creatorBroadcastRoute),
    status: "connected_with_race_guard",
    issues: [],
    recommendedAction: "Keep broadcasts disabled for restricted/read-only projection states.",
  },
  {
    key: "fan_pass",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator settings + creator_subscriptions count",
    actualSource: "/api/creator/settings statsEvidence.sources.subscriptions + /api/creator/subscriptions subscriber rows",
    sourceMetadataPresent: hub.includes("statsEvidence?.sources.subscriptions") && fanPassManager.includes("/api/creator/subscriptions"),
    actionTarget: "/api/creator/subscriptions?creatorId=:creatorId",
    targetExists: routeExists(files.creatorSubscriptionsRoute),
    status: "subscriber_visibility_readonly",
    issues: [
      issue("P2", "Fan Pass dashboard is subscriber visibility only", ["CreatorFanPassManager renders read-only subscriber rows and no membership mutation buttons."], "Keep membership changes on the public creator experience flow."),
    ],
    recommendedAction: "Do not mark Fan Pass as purchase/action connected from this dashboard card.",
  },
  {
    key: "messages",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator settings + /dashboard/chat route",
    actualSource: "messagingEnabled/messagingRestricted + /dashboard/chat",
    sourceMetadataPresent: hub.includes("messageSectionHref"),
    actionTarget: "/dashboard/chat",
    targetExists: routeExists(files.chatPage),
    status: "route_connected",
    issues: [],
    recommendedAction: "Keep chat internals unchanged and only link when messaging is enabled and unrestricted.",
  },
  {
    key: "requests",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator_custom_requests aggregate count",
    actualSource: "/api/creator/settings statsEvidence.sources.customRequests + /api/creator/requests GET/PUT",
    sourceMetadataPresent: hub.includes("statsEvidence?.sources.customRequests") && requestsManager.includes("/api/creator/requests"),
    actionTarget: "/api/creator/requests",
    targetExists: routeExists(files.creatorRequestsRoute),
    status: "connected_management_panel",
    issues: [],
    recommendedAction: "Keep request management tied to the existing creator request GET/PUT route with read-only and pending guards.",
  },
  {
    key: "bookings",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator_call_bookings aggregate count + availability windows",
    actualSource: "/api/creator/settings statsEvidence.sources.callBookings + /api/creator/bookings GET/PUT",
    sourceMetadataPresent: hub.includes("statsEvidence?.sources.callBookings") && bookingsManager.includes("/api/creator/bookings"),
    actionTarget: "/api/creator/bookings",
    targetExists: routeExists(files.creatorBookingsRoute),
    status: "connected_management_panel",
    issues: [],
    recommendedAction: "Keep booking management tied to the existing creator booking GET/PUT route with read-only and pending guards.",
  },
  {
    key: "availability",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator settings document",
    actualSource: "/api/creator/settings creatorSettings.availabilityWindows",
    sourceMetadataPresent: hub.includes("settings?.creatorSettings ? \"canonical\""),
    actionTarget: null,
    targetExists: routeExists(files.creatorDashboardPage),
    status: "configuration_only",
    issues: [],
    recommendedAction: "Do not render a self-loop Open section link until a dedicated settings editor target exists.",
  },
  {
    key: "earnings",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator_ledger_accruals and creator_payout_requests",
    actualSource: "/api/creator/settings statsEvidence ledgerAccruals/pendingPayouts",
    sourceMetadataPresent: hub.includes("statsEvidence?.sources.ledgerAccruals") && hub.includes("statsEvidence?.sources.pendingPayouts"),
    actionTarget: null,
    targetExists: routeExists("src/app/api/creator/payouts/route.ts"),
    status: "source_connected_inline_only",
    issues: [],
    recommendedAction: "Keep zero earnings as needs review until sum-only aggregates have a sample count or positive value.",
  },
  {
    key: "audience",
    component: files.hub,
    route: "/dashboard/creator",
    expectedSource: "creator_relationships_ops and user profile",
    actualSource: "/api/creator/settings statsEvidence relationshipsOps/userProfile",
    sourceMetadataPresent: hub.includes("statsEvidence?.sources.relationshipsOps") && hub.includes("statsEvidence?.sources.userProfile"),
    actionTarget: null,
    targetExists: routeExists("src/app/api/creator/relationships/route.ts"),
    status: "source_connected_inline_only",
    issues: [],
    recommendedAction: "Keep audience metrics tied to source evidence metadata.",
  },
];

const raceConditionFindings: AuditIssue[] = [];
if (!hub.includes("dashboardRequestIdRef")) {
  raceConditionFindings.push(issue("P1", "Creator dashboard settings fetch can stale-overwrite state", [files.hub], "Guard settings fetches by request id and creator identity."));
}
if (!broadcasts.includes("loadRequestIdRef")) {
  raceConditionFindings.push(issue("P1", "Broadcast history fetch can stale-overwrite state", [files.broadcasts], "Guard broadcast fetches by request id and creator identity."));
}
if (!broadcasts.includes("if (!canSendBroadcast)") || !broadcasts.includes("if (sending)")) {
  raceConditionFindings.push(issue("P0", "Broadcast send lacks mutation pending/read-only guard", [files.broadcasts], "Block read-only/restricted sends and duplicate sends before network calls."));
}

const costBleedFindings: AuditIssue[] = [];
if (newCreatorLoops.length > 0) {
  costBleedFindings.push(issue("P0", "Creator components include polling or realtime listeners", newCreatorLoops, "Remove setInterval/onSnapshot from creator dashboard connection surfaces."));
}
if (unexpectedSettingsCollections.length > 0) {
  costBleedFindings.push(issue("P1", "Creator settings route reads unexpected collections", unexpectedSettingsCollections, "Do not add broad reads beyond the known settings summary sources without a new cost contract."));
}
if (!broadcastRoute.includes("CREATOR_BROADCASTS_READ_LIMIT")) {
  costBleedFindings.push(issue("P1", "Broadcast route/list lacks bounded read evidence", [files.creatorBroadcastRoute], "Keep broadcast list reads bounded."));
}

const selfLoopLinkFindings: AuditIssue[] = [];
if (hub.includes('href: "/dashboard/creator"') || hub.includes('href="/dashboard/creator"')) {
  selfLoopLinkFindings.push(issue("P1", "Creator dashboard contains self-loop Open section links", [files.hub], "Remove self-loop links for inline-only sections."));
}

if (hub.includes('state: stats ? "live" : "unavailable"')) {
  failures.push("CreatorDashboardSettingsHub must not use stats object presence alone as a live source.");
}
if (settingsRoute.includes("request.json()")) {
  failures.push("creator/settings PUT must use readBoundedJsonBody instead of request.json().");
}
if (broadcastRoute.includes("request.json()")) {
  failures.push("creator/broadcasts POST must use readBoundedJsonBody instead of request.json().");
}
if (requestsRoute.includes("request.json()")) {
  failures.push("creator/requests POST and PUT must use readBoundedJsonBody instead of request.json().");
}
if (bookingsRoute.includes("request.json()")) {
  failures.push("creator/bookings POST and PUT must use readBoundedJsonBody instead of request.json().");
}
if (subscriptionsRoute.includes("request.json()")) {
  failures.push("creator/subscriptions POST must use readBoundedJsonBody instead of request.json().");
}
if (selfLoopLinkFindings.length > 0) {
  failures.push("CreatorDashboardSettingsHub must not keep /dashboard/creator self-loop Open section links.");
}
if (!hub.includes("creatorSectionStateFromEvidence") || !hub.includes("statsEvidence")) {
  failures.push("CreatorDashboardSettingsHub must map section state from statsEvidence metadata.");
}
if (!hub.includes("messageSectionHref") || !hub.includes('"/dashboard/chat"')) {
  failures.push("Messages must link to /dashboard/chat only through a restricted-aware target.");
}
if (!hub.includes("CreatorRequestsManager") || !hub.includes("<CreatorRequestsManager")) {
  failures.push("Requests section is connected only when CreatorRequestsManager is imported and rendered.");
}
if (!hub.includes("const activeManager") || !hub.includes("data-creator-active-manager")) {
  failures.push("CreatorDashboardSettingsHub must expose the active manager and avoid mounting every manager at once.");
}
for (const expectedGate of [
  'openSection === "broadcasts"',
  'openSection === "requests"',
  'openSection === "bookings"',
  'openSection === "fan_pass"',
]) {
  if (!hub.includes(expectedGate)) {
    failures.push(`CreatorDashboardSettingsHub must gate manager rendering with ${expectedGate}.`);
  }
}
if (!requestsManager.includes("readOnly") || !requestsManager.includes("Read-only projection")) {
  failures.push("CreatorRequestsManager must guard creator request mutations in read-only projection mode.");
}
if (!requestsManager.includes("pendingActionId")) {
  failures.push("CreatorRequestsManager must include a pendingActionId double-submit guard.");
}
if (!requestsManager.includes("encodeURIComponent(creatorId)")) {
  failures.push("CreatorRequestsManager must include the target creatorId in its fetch URL or prove projection context in tests.");
}
if (!hub.includes("CreatorBookingsManager") || !hub.includes("<CreatorBookingsManager")) {
  failures.push("Bookings section is connected only when CreatorBookingsManager is imported and rendered.");
}
if (!bookingsManager.includes("readOnly") || !bookingsManager.includes("Read-only projection")) {
  failures.push("CreatorBookingsManager must guard booking mutations in read-only projection mode.");
}
if (!bookingsManager.includes("pendingActionId")) {
  failures.push("CreatorBookingsManager must include a pendingActionId double-submit guard.");
}
if (!bookingsManager.includes("encodeURIComponent(creatorId)")) {
  failures.push("CreatorBookingsManager must include the target creatorId in its fetch URL.");
}
if (!hub.includes("CreatorFanPassManager") || !hub.includes("<CreatorFanPassManager")) {
  failures.push("Fan Pass subscriber visibility is connected only when CreatorFanPassManager is imported and rendered.");
}
if (!fanPassManager.includes("data-creator-fan-pass-read-only=\"true\"")) {
  failures.push("CreatorFanPassManager must expose read-only subscriber visibility.");
}
if (!fanPassManager.includes("Subscriber visibility unavailable for this context.")) {
  failures.push("CreatorFanPassManager must show an unavailable warning when the route returns fan_subscription_status.");
}
if (fanPassManager.includes('method: "POST"') || fanPassManager.includes(">Subscribe<") || fanPassManager.includes(">Cancel<")) {
  failures.push("CreatorFanPassManager must not expose Fan Pass membership mutation controls.");
}
if (!fanPassManager.includes("encodeURIComponent(creatorId)")) {
  failures.push("CreatorFanPassManager must include the target creatorId in its fetch URL.");
}
if (/\b(setInterval|onSnapshot)\b/u.test([requestsManager, bookingsManager, fanPassManager].join("\n"))) {
  failures.push("Creator dashboard managers must not introduce setInterval or onSnapshot.");
}
for (const expectedViewMode of [
  "creator_subscriber_visibility",
  "subscriber_visibility_projection",
  "fan_subscription_status",
]) {
  if (!subscriptionsRoute.includes(expectedViewMode)) {
    failures.push(`creator/subscriptions GET must return viewMode ${expectedViewMode}.`);
  }
}
if (!subscriptionsRoute.includes("caller.uid === creatorId") || !subscriptionsRoute.includes("CREATOR_SUBSCRIPTIONS_READ_LIMIT")) {
  failures.push("creator/subscriptions GET must expose bounded creator-owned subscriber visibility without requiring admin projection.");
}
if (!hub.includes("data-creator-chat-route-connected") || !hub.includes("messageSectionHref ?")) {
  failures.push("Messages must expose route connection truth and hide the chat link when disabled or restricted.");
}
if (!hub.includes("subscriptionPriceGd > 0") || !hub.includes("creatorRestrictions.subscriptionsRestricted === true")) {
  failures.push("Fan Pass state must require unrestricted settings and positive price.");
}
if (hub.includes('fanPassManagementState: "connected"')) {
  failures.push("Fan Pass management must not be marked as a purchase/action connection.");
}
if (hub.includes('bookingsManagementState: "connected"') && !hub.includes("CreatorBookingsManager")) {
  failures.push("Bookings management must not be marked connected without CreatorBookingsManager.");
}
if (!broadcasts.includes("canReadBroadcasts") || !broadcasts.includes("canSendBroadcast")) {
  failures.push("CreatorBroadcastManager must gate fetch/send by enabled, restricted, read-only, and creator id state.");
}
if (!broadcasts.includes("if (!canSendBroadcast)") || !broadcasts.includes("if (sending)")) {
  failures.push("CreatorBroadcastManager must block read-only/restricted and duplicate sends before network actions.");
}
if (newCreatorLoops.length > 0) {
  failures.push("Creator components must not introduce setInterval or onSnapshot.");
}
if (unexpectedSettingsCollections.length > 0) {
  failures.push(`Creator settings route added unexpected collection reads: ${unexpectedSettingsCollections.join(", ")}`);
}
for (const expected of [
  '"chat" | "fan_pass" | "request" | "booking" | "paid_media"',
  "Reward GumDrops do not count toward Fan Pass",
  "Paid GumDrops are required",
  "not reward balance",
]) {
  requireIncludes(guidance, expected, "CreatorPaidGdGuidanceCard");
}
requireNotIncludes(guidance, "Reward GumDrops can", "CreatorPaidGdGuidanceCard");
for (const expected of [
  "Artifact: `agent/state/user-facing-feature-connection-audit.generated.json`",
  "Validator: `npm run check:user-facing-feature-connection-audit`",
  "No new collection scans were added.",
  "Do not restore `/dashboard/creator` self-loop",
]) {
  requireIncludes(doc, expected, files.doc);
}
requireIncludes(packageJson, "\"check:user-facing-feature-connection-audit\"", "package.json");

const allExtraFindings = [...raceConditionFindings, ...costBleedFindings, ...selfLoopLinkFindings];
const fakeLiveRisks = (hub.includes('state: stats ? "live" : "unavailable"') ? 1 : 0)
  + (hub.includes("Paid chat is live.") && !hub.includes("messageSectionHref") ? 1 : 0);
const disconnectedSurfaces = surfaces.filter((surface) => surface.status.includes("inline_only") || surface.status.includes("configuration_only") || surface.status.includes("guidance_only")).length;
const connectedSurfaces = surfaces.length - disconnectedSurfaces;
const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "user-facing-feature-connection-audit",
  currentHead: currentHead(),
  summary: {
    surfacesScanned: surfaces.length,
    connectedSurfaces,
    disconnectedSurfaces,
    fakeLiveRisks,
    raceConditionRisks: raceConditionFindings.length,
    costBleedRisks: costBleedFindings.length,
    selfLoopLinks: selfLoopLinkFindings.length,
    p0Count: countIssues(surfaces, allExtraFindings, "P0"),
    p1Count: countIssues(surfaces, allExtraFindings, "P1"),
    p2Count: countIssues(surfaces, allExtraFindings, "P2"),
  },
  surfaces,
  raceConditionFindings,
  costBleedFindings,
  selfLoopLinkFindings,
  recommendedFixOrder: [
  "Keep statsEvidence as the dashboard source-state contract.",
  "Keep dashboard managers lazy-mounted by active section to avoid page-load cost bleed.",
  "Keep CreatorRequestsManager wired to /api/creator/requests and disabled in read-only projection mode.",
  "Keep CreatorBookingsManager wired to /api/creator/bookings and disabled in read-only projection mode.",
    "Keep CreatorFanPassManager read-only and separate from fan-side membership mutations.",
    "Keep broadcast fetches disabled when broadcasts are blocked, unavailable, or read-only.",
    "Run focused creator dashboard and settings route tests after creator-facing connection changes.",
  ],
};

mkdirSync(dirname(outputFullPath), { recursive: true });
writeFileSync(outputFullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error("User-facing feature connection audit validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log([
  "User-facing feature connection audit validation passed.",
  `surfaces=${report.summary.surfacesScanned}`,
  `fakeLiveRisks=${report.summary.fakeLiveRisks}`,
  `raceRisks=${report.summary.raceConditionRisks}`,
  `costRisks=${report.summary.costBleedRisks}`,
  `selfLoops=${report.summary.selfLoopLinks}`,
].join(" "));
