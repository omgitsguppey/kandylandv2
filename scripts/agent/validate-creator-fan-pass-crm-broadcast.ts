import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/creator-fan-pass-crm-broadcast.generated.json";

type Finding = {
  id: string;
  status: "fixed" | "verified" | "deferred";
  severity: "p0" | "p1" | "p2";
  file: string;
  summary: string;
};

export type CreatorFanPassCrmBroadcastReport = {
  generatedAtUtc: string;
  reportKey: "creator-fan-pass-crm-broadcast";
  currentHead: string;
  summary: {
    subscriberIdentityHydrated: boolean;
    rawUserIdsHidden: boolean;
    fanPassCrmMobileEnabled: boolean;
    broadcastAudienceExplicit: boolean;
    followersCopyRemoved: boolean;
    subscriptionHydrationBounded: boolean;
    privacyRedactionPreserved: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  sourceFindings: Finding[];
  uiFindings: Finding[];
  broadcastFindings: Finding[];
  privacyFindings: Finding[];
  doctrineChanges: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function currentHead() {
  return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function finding(id: string, severity: Finding["severity"], file: string, summary: string): Finding {
  return { id, status: "fixed", severity, file, summary };
}

export function buildCreatorFanPassCrmBroadcastReport(): CreatorFanPassCrmBroadcastReport {
  const workspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const fanPassManager = read("src/components/Creators/CreatorFanPassManager.tsx");
  const broadcastManager = read("src/components/Creators/CreatorBroadcastManager.tsx");
  const subscriberRow = read("src/components/Creators/FanPassSubscriberRow.tsx");
  const subscriptionsRoute = read("src/app/api/creator/subscriptions/route.ts");
  const broadcastsRoute = read("src/app/api/creator/broadcasts/route.ts");
  const doctrine = read("docs/agent-truth/creator-fan-pass-crm-broadcast.md");
  const sourceHealthDoc = read("docs/agent-truth/creator-settings-source-health.md");
  const overviewDoc = read("docs/agent-truth/creator-dashboard-overview-stats.md");

  const failures: Finding[] = [];
  const sourceFindings: Finding[] = [];
  const uiFindings: Finding[] = [];
  const broadcastFindings: Finding[] = [];
  const privacyFindings: Finding[] = [];
  const doctrineChanges: Finding[] = [];
  const add = (bucket: Finding[], item: Finding, ok: boolean) => {
    if (ok) {
      bucket.push(item);
    } else {
      failures.push({ ...item, status: "deferred" });
    }
  };

  const subscriberIdentityHydrated = includesAll(subscriptionsRoute, [
    "hydrateCreatorSubscriberRows",
    "fanUsername",
    "fanDisplayName",
    "fanPhotoURL",
    "fanIdentitySource",
    "subscription_snapshot",
    "user_profile",
  ]);
  const rawUserIdsHidden = !workspace.includes("subscription.userId || subscription.id")
    && !fanPassManager.includes("shortUserId(subscriber.userId)")
    && includesAll(subscriberRow, ["data-raw-user-id-hidden=\"true\"", "maskedFanId", "fanLabel"]);
  const fanPassCrmMobileEnabled = workspace.includes('data-fan-pass-crm="mobile_v1"')
    && fanPassManager.includes('data-fan-pass-crm="mobile_v1"')
    && workspace.includes("Fan Pass CRM")
    && fanPassManager.includes("Fan Pass CRM");
  const broadcastAudienceExplicit = includesAll(workspace, [
    'data-broadcast-audience="all_fans"',
    'data-broadcast-copy-audited="true"',
    "Audience: Fans",
    "Message your fans...",
    "data-broadcast-capability-source",
  ]) && includesAll(broadcastsRoute, [
    "CREATOR_BROADCAST_SUPPORTED_AUDIENCE",
    "supportedAudience",
    "unsupported_broadcast_audience",
    "all_fans",
  ]);
  const followersCopyRemoved = !/all followers|blast to all followers|Write a blast|for followers/iu.test(`${workspace}\n${broadcastManager}`);
  const subscriptionHydrationBounded = includesAll(subscriptionsRoute, [
    "SUBSCRIBER_IDENTITY_HYDRATION_CHUNK_SIZE",
    "adminDb!.getAll(...refs)",
    "CREATOR_SUBSCRIPTIONS_READ_LIMIT",
    "identityHydrationCostBound",
  ]);
  const privacyRedactionPreserved = includesAll(subscriptionsRoute, [
    "identityFieldsRedacted: true",
    "userIdDebug: includeDebugUserId",
  ]) && !subscriberRow.includes("email") && !workspace.includes("email");
  const doctrineConflictFree = includesAll(doctrine, [
    "Creator Dashboard subscriber rows are CRM rows",
    "Raw user IDs are debug/admin-only",
    "Broadcast audience must be explicit",
    "Fans, not followers",
  ]) && overviewDoc.includes("overview label is Followers")
    && !sourceHealthDoc.includes("all followers");

  add(sourceFindings, finding("subscriber-identity-hydration", "p1", "src/app/api/creator/subscriptions/route.ts", "Subscriber rows hydrate safe fan identity fields."), subscriberIdentityHydrated);
  add(uiFindings, finding("raw-user-id-hidden", "p1", "src/components/Creators/FanPassSubscriberRow.tsx", "Normal creator UI does not use raw user ids as subscriber labels."), rawUserIdsHidden);
  add(uiFindings, finding("mobile-crm-enabled", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Fan Pass CRM renders as a compact mobile module."), fanPassCrmMobileEnabled);
  add(broadcastFindings, finding("broadcast-audience-explicit", "p1", "src/app/api/creator/broadcasts/route.ts", "Broadcast route and UI expose an explicit all_fans audience."), broadcastAudienceExplicit);
  add(broadcastFindings, finding("followers-copy-removed", "p1", "src/components/Dashboard/CreatorWorkspacePanel.tsx", "Creator-facing broadcast copy uses Fans instead of followers/blast language."), followersCopyRemoved);
  add(sourceFindings, finding("subscription-hydration-bounded", "p1", "src/app/api/creator/subscriptions/route.ts", "Subscriber identity hydration is bounded and chunked."), subscriptionHydrationBounded);
  add(privacyFindings, finding("privacy-redaction", "p1", "src/app/api/creator/subscriptions/route.ts", "Private email is not exposed and raw user ids are debug/projection-only."), privacyRedactionPreserved);
  add(doctrineChanges, finding("crm-broadcast-doctrine", "p1", "docs/agent-truth/creator-fan-pass-crm-broadcast.md", "Doctrine locks CRM identity, privacy, Fans language, and explicit broadcast audiences."), doctrineConflictFree);

  const p0Count = failures.filter((item) => item.severity === "p0").length;
  const p1Count = failures.filter((item) => item.severity === "p1").length;
  const p2Count = failures.filter((item) => item.severity === "p2").length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-fan-pass-crm-broadcast",
    currentHead: currentHead(),
    summary: {
      subscriberIdentityHydrated,
      rawUserIdsHidden,
      fanPassCrmMobileEnabled,
      broadcastAudienceExplicit,
      followersCopyRemoved,
      subscriptionHydrationBounded,
      privacyRedactionPreserved,
      p0Count,
      p1Count,
      p2Count,
    },
    sourceFindings,
    uiFindings,
    broadcastFindings,
    privacyFindings,
    doctrineChanges,
    fixesApplied: [
      "Hydrated creator subscriber rows with safe fan identity fields.",
      "Replaced raw subscriber id labels with compact Fan Pass CRM rows.",
      "Changed creator broadcast semantics to explicit Audience: Fans and rejected unsupported audiences.",
    ],
    prCleanupActions: [],
    nextFixOrder: [
      "Attach mobile screenshot evidence for Fan Pass CRM after deployment.",
      "Add selectable Fan Pass subscriber or segment audiences only after route delivery semantics are implemented.",
    ],
  };
}

export function validateCreatorFanPassCrmBroadcastReport(report: CreatorFanPassCrmBroadcastReport) {
  const failures: string[] = [];
  if (report.reportKey !== "creator-fan-pass-crm-broadcast") failures.push("reportKey must be creator-fan-pass-crm-broadcast");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD");
  if (!report.summary.subscriberIdentityHydrated) failures.push("subscriber API must hydrate safe fan identity fields");
  if (!report.summary.rawUserIdsHidden) failures.push("raw subscriber user ids can appear in normal creator UI");
  if (!report.summary.fanPassCrmMobileEnabled) failures.push("mobile Fan Pass CRM marker missing");
  if (!report.summary.broadcastAudienceExplicit) failures.push("broadcast audience is not explicit");
  if (!report.summary.followersCopyRemoved) failures.push("creator broadcast UI still uses followers/blast copy");
  if (!report.summary.subscriptionHydrationBounded) failures.push("subscriber identity hydration is not bounded/chunked");
  if (!report.summary.privacyRedactionPreserved) failures.push("subscriber privacy redaction is not preserved");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("P0/P1 Creator Fan Pass CRM blockers remain");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

if (process.argv[1] && process.argv[1].endsWith("validate-creator-fan-pass-crm-broadcast.ts")) {
  const report = buildCreatorFanPassCrmBroadcastReport();
  writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const failures = validateCreatorFanPassCrmBroadcastReport(report);
  if (failures.length > 0) {
    console.error("Creator Fan Pass CRM/Broadcast validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("Creator Fan Pass CRM/Broadcast validation passed.");
}
