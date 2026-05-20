import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const reportPath = join(root, "agent/state/creator-broadcast-timeline-prep.generated.json");
const docPath = join(root, "docs/agent-truth/creator-broadcast-timeline-prep.md");

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function has(path: string) {
  return existsSync(join(root, path));
}

function gitOutput(command: string) {
  try {
    return execSync(command, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function finding(id: string, severity: "p0" | "p1" | "p2", file: string, summary: string, ok: boolean) {
  return {
    id,
    severity,
    file,
    summary,
    status: ok ? "pass" : "fail",
  };
}

const route = read("src/app/api/creator/broadcasts/route.ts");
const broadcastContract = has("src/lib/creator-broadcasts/broadcast-contract.ts")
  ? read("src/lib/creator-broadcasts/broadcast-contract.ts")
  : "";
const notificationContract = has("src/lib/notifications/creator-broadcast-notifications.ts")
  ? read("src/lib/notifications/creator-broadcast-notifications.ts")
  : "";
const timelineContract = has("src/lib/creator-profile/timeline-contract.ts")
  ? read("src/lib/creator-profile/timeline-contract.ts")
  : "";
const profileRoute = read("src/app/api/creators/[username]/route.ts");
const profileClient = read("src/app/creators/[username]/CreatorProfileClient.tsx");
const updatesFeed = read("src/components/Creators/CreatorUpdatesFeed.tsx");
const packageJson = read("package.json");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const changedFiles = gitOutput("git diff --name-only HEAD").split(/\r?\n/u).filter(Boolean);

const summary = {
  settingsControlPlanePresent: has("src/lib/creator-settings/creator-settings-contract.ts"),
  telemetryClosurePresent: has("src/lib/analytics/telemetry-dependency-graph.ts"),
  broadcastContractCreated: broadcastContract.includes("CreatorBroadcastAudience")
    && broadcastContract.includes("buildCreatorBroadcastSourceRecord")
    && broadcastContract.includes("sourceTruth: \"creator_broadcast_source_record\""),
  broadcastRoutePersistsSourceRecord: route.includes("buildCreatorBroadcastSourceRecord")
    && route.includes("batch.set(broadcastRef")
    && broadcastContract.includes("sourceTruth: \"creator_broadcast_source_record\"")
    && broadcastContract.includes("status = input.status ?? \"published\""),
  boundedNotificationFanout: route.includes("enqueueCreatorBroadcastNotifications")
    && notificationContract.includes("CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT = 250")
    && !route.includes("userIds: notificationUserIds"),
  canonicalFollowerRecipientSource: notificationContract.includes(`CREATOR_COLLECTIONS.relationships`)
    && notificationContract.includes(`where("following", "==", true)`)
    && notificationContract.includes(`where("notificationsEnabled", "==", true)`),
  fanPassRecipientSource: notificationContract.includes(`CREATOR_COLLECTIONS.subscriptions`)
    && notificationContract.includes(`where("status", "==", "active")`),
  notificationIdempotencyPresent: notificationContract.includes("buildCreatorBroadcastNotificationIdentity")
    && notificationContract.includes("buildNotificationDocumentId")
    && notificationContract.includes("idempotencyKey")
    && notificationContract.includes("dedupeKey"),
  audienceContractClear: broadcastContract.includes("\"followers\"")
    && broadcastContract.includes("\"fan_pass_subscribers\"")
    && broadcastContract.includes("\"followers_and_subscribers\"")
    && !route.includes("audience: \"all_fans\""),
  timelineContractCreated: timelineContract.includes("buildCreatorProfileTimeline")
    && timelineContract.includes("\"drop\"")
    && timelineContract.includes("\"broadcast\""),
  timelineExcludesDraftPending: timelineContract.includes("status !== \"published\"")
    && timelineContract.includes("status !== \"sent\"")
    && timelineContract.includes("status !== \"active\""),
  timelineMissingNotZero: timelineContract.includes("state: \"source_ready\"")
    && timelineContract.includes("\"empty\"")
    && timelineContract.includes("sourceTruth: \"creator_profile_timeline_contract\""),
  profileRouteExposesTimeline: profileRoute.includes("buildCreatorProfileTimeline")
    && profileRoute.includes("timeline")
    && profileRoute.includes("CREATOR_PROFILE_BROADCAST_LIMIT"),
  mobilePreviewHookPresent: profileClient.includes("timelineBroadcasts")
    && updatesFeed.includes("data-creator-profile-timeline-preview"),
  telemetryPresent: route.includes("trackServerEvent(\"creator_broadcast_created\"")
    && route.includes("notification_enqueue_count")
    && telemetryCatalog.includes("creator_broadcast_created"),
  packageScriptPresent: packageJson.includes("check:creator-broadcast-timeline-prep"),
  protectedNavChatUntouched: !changedFiles.some((file) => /src\/components\/Navigation\/|src\/components\/Chat\/|src\/app\/chat\//u.test(file.replaceAll("\\", "/"))),
};

const findings = [
  finding("control-plane-dependency", "p2", "src/lib/creator-settings/creator-settings-contract.ts", "Creator settings control plane is present and reused.", summary.settingsControlPlanePresent),
  finding("telemetry-closure-dependency", "p2", "src/lib/analytics/telemetry-dependency-graph.ts", "Telemetry dependency graph exists for this source-truth lane.", summary.telemetryClosurePresent),
  finding("broadcast-contract", "p1", "src/lib/creator-broadcasts/broadcast-contract.ts", "Creator broadcast source contract defines audience/status/timeline/source truth.", summary.broadcastContractCreated),
  finding("source-record", "p1", "src/app/api/creator/broadcasts/route.ts", "Broadcast route persists creator_broadcasts source records.", summary.broadcastRoutePersistsSourceRecord),
  finding("bounded-fanout", "p1", "src/lib/notifications/creator-broadcast-notifications.ts", "Follower notification fanout is bounded and not aggregate/unbounded.", summary.boundedNotificationFanout),
  finding("follower-source", "p1", "src/lib/notifications/creator-broadcast-notifications.ts", "Recipients resolve from canonical follower relationships with notification opt-in.", summary.canonicalFollowerRecipientSource),
  finding("subscriber-source", "p2", "src/lib/notifications/creator-broadcast-notifications.ts", "Fan Pass subscriber audience resolves from active creator subscriptions.", summary.fanPassRecipientSource),
  finding("idempotency", "p1", "src/lib/notifications/creator-broadcast-notifications.ts", "Per-recipient notification idempotency keys and deterministic document ids exist.", summary.notificationIdempotencyPresent),
  finding("audience", "p1", "src/lib/creator-broadcasts/broadcast-contract.ts", "Broadcast audiences use followers/subscribers terminology instead of legacy all_fans.", summary.audienceContractClear),
  finding("timeline-contract", "p1", "src/lib/creator-profile/timeline-contract.ts", "Creator profile timeline contract exists for drops and broadcasts.", summary.timelineContractCreated),
  finding("timeline-filtering", "p1", "src/lib/creator-profile/timeline-contract.ts", "Timeline excludes draft broadcasts and non-active/pending drops.", summary.timelineExcludesDraftPending),
  finding("timeline-state", "p1", "src/lib/creator-profile/timeline-contract.ts", "Timeline exposes source/empty/disabled states instead of treating missing data as zero.", summary.timelineMissingNotZero),
  finding("profile-route", "p2", "src/app/api/creators/[username]/route.ts", "Public creator profile route returns timeline source data.", summary.profileRouteExposesTimeline),
  finding("mobile-preview", "p2", "src/components/Creators/CreatorUpdatesFeed.tsx", "Creator profile has compact broadcast timeline preview hooks.", summary.mobilePreviewHookPresent),
  finding("telemetry", "p1", "src/app/api/creator/broadcasts/route.ts", "Broadcast creation and notification enqueue count are tracked.", summary.telemetryPresent),
  finding("package-script", "p2", "package.json", "Package script exists for this validator.", summary.packageScriptPresent),
  finding("protected-surfaces", "p1", "src/components/Navigation", "Navigation and chat files are untouched.", summary.protectedNavChatUntouched),
];

const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "creator-broadcast-timeline-prep",
  currentHead: gitOutput("git rev-parse HEAD") || "unknown",
  summary: {
    ...summary,
    p0Count: findings.filter((entry) => entry.severity === "p0" && entry.status === "fail").length,
    p1Count: findings.filter((entry) => entry.severity === "p1" && entry.status === "fail").length,
    p2Count: findings.filter((entry) => entry.severity === "p2" && entry.status === "fail").length,
  },
  dependencyFindings: findings.filter((entry) => entry.id.includes("dependency")),
  broadcastFindings: findings.filter((entry) => ["broadcast-contract", "source-record", "audience"].includes(entry.id)),
  notificationFindings: findings.filter((entry) => ["bounded-fanout", "follower-source", "subscriber-source", "idempotency"].includes(entry.id)),
  timelineFindings: findings.filter((entry) => entry.id.startsWith("timeline") || entry.id === "profile-route" || entry.id === "mobile-preview"),
  telemetryFindings: findings.filter((entry) => entry.id === "telemetry"),
  fixesApplied: [
    "Created a creator broadcast source contract with follower/subscriber audience normalization.",
    "Moved follower notification recipient selection and per-recipient idempotency into a shared helper.",
    "Prepared creator profile timeline data for approved drops and published broadcasts.",
  ],
  prCleanupActions: [],
  nextFixOrder: [
    "Add the final creator profile timeline UI once product approves feed composition.",
    "Promote notification queue processing if fanout grows beyond the bounded in-app batch limit.",
  ],
};

mkdirSync(dirname(reportPath), { recursive: true });
mkdirSync(dirname(docPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(docPath, [
  "# Creator Broadcast Timeline Prep",
  "",
  `Generated: ${report.generatedAtUtc}`,
  "",
  "## Summary",
  "",
  `- Broadcast contract created: ${summary.broadcastContractCreated}`,
  `- Bounded notification fanout: ${summary.boundedNotificationFanout}`,
  `- Notification idempotency present: ${summary.notificationIdempotencyPresent}`,
  `- Timeline contract created: ${summary.timelineContractCreated}`,
  `- Public profile timeline source ready: ${summary.profileRouteExposesTimeline}`,
  `- P0/P1/P2: ${report.summary.p0Count}/${report.summary.p1Count}/${report.summary.p2Count}`,
  "",
  "## Fixes Applied",
  "",
  ...report.fixesApplied.map((entry) => `- ${entry}`),
  "",
  "## Next Fix Order",
  "",
  ...report.nextFixOrder.map((entry) => `- ${entry}`),
  "",
].join("\n"));

const failures = findings.filter((entry) => entry.status === "fail" && (entry.severity === "p0" || entry.severity === "p1"));
if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report.summary, null, 2));
