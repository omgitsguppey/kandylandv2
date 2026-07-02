import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildActivityVerificationReport,
  validateActivityVerificationReport,
  type ActivitySourceEvent,
} from "../../src/lib/analytics/activity-verification-engine";
import { FEATURE_REGISTRATION_REGISTRY } from "../../src/lib/features/feature-registration-registry";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/activity-verification-engine.generated.json";
const DOC_PATH = "docs/agent-truth/activity-verification-engine.md";

function run(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"]] as const) {
    for (const line of run("git", [...args]).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

const sourceBackedActivityFixtures: ActivitySourceEvent[] = [
  {
    featureId: "drops",
    eventName: "drop_card_impression",
    sourceKind: "source_backed_fixture",
    guestId: "fixture_guest_drops",
    userId: "fixture_user_drops",
    sessionId: "fixture_session_drops",
    identityLinkId: "fixture_identity_link_drops",
    identityConfidence: 0.95,
    materialized: true,
    debugVisible: true,
    sourcePath: "tests/unit/activity-verification-engine.spec.ts",
  },
  {
    featureId: "user_dashboard",
    eventName: "page_viewed",
    sourceKind: "source_backed_fixture",
    guestId: "fixture_guest_dashboard",
    userId: "fixture_user_dashboard",
    sessionId: "fixture_session_dashboard",
    identityLinkId: "fixture_identity_link_dashboard",
    identityConfidence: 0.9,
    materialized: true,
    debugVisible: true,
    sourcePath: "src/lib/features/feature-registration-registry.ts",
  },
  {
    featureId: "creator_profile",
    eventName: "creator_profile_viewed",
    sourceKind: "source_backed_fixture",
    guestId: "fixture_guest_creator",
    userId: "fixture_user_creator",
    sessionId: "fixture_session_creator",
    identityLinkId: "fixture_identity_link_creator",
    identityConfidence: 0.92,
    materialized: true,
    debugVisible: true,
    sourcePath: "src/lib/behavioral/behavior-math-engine.ts",
  },
];

function renderDoc(report: ReturnType<typeof buildActivityVerificationReport>) {
  const byStatus = report.features.map((feature) =>
    `- ${feature.featureId}: ${feature.verificationStatus}; confidence=${feature.confidenceScore}; scoreEligible=${feature.scoreEligible}; guest=${feature.guestActivitySeen}; user=${feature.userActivitySeen}; linked=${feature.guestToUserLinked}`,
  );
  return [
    "# Activity Verification Engine",
    "",
    `Status: ${report.status}`,
    "",
    "This source-only verification engine checks whether dry-run/source-backed guest and user activity paths have telemetry registration, consent permission, guest-to-user identity continuity, materializer output, debug visibility, and score eligibility. It does not read production data, fake activity, mutate legacy data, or clear formal provider/runtime/admin gates.",
    "",
    "## Summary",
    "",
    `- Total features: ${report.summary.totalFeatures}`,
    `- Verified by activity: ${report.summary.verifiedByActivity}`,
    `- Source-ready with no activity: ${report.summary.sourceReadyNoActivity}`,
    `- Blocked by consent: ${report.summary.blockedByConsent}`,
    `- Missing tracking: ${report.summary.missingTracking}`,
    `- Orphaned: ${report.summary.orphaned}`,
    `- Unknown legacy: ${report.summary.unknownLegacy}`,
    `- Debug backlog items: ${report.debugBacklogItems.length}`,
    `- Production reads required: ${report.productionReadsRequired}`,
    `- Fake activity used: ${report.fakeActivityUsed}`,
    "",
    "## Feature Status",
    "",
    ...byStatus,
    "",
    "## Backlog Connections",
    "",
    ...(report.debugBacklogItems.length
      ? report.debugBacklogItems.map((item) => `- ${item.id}: ${item.title}; next=${item.exactNextAction}`)
      : ["- None."]),
    "",
    "## Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- None."]),
    "",
  ].join("\n");
}

const report = buildActivityVerificationReport({
  features: FEATURE_REGISTRATION_REGISTRY,
  sourceEvents: sourceBackedActivityFixtures,
  consentMode: "full_behavioral",
  currentHead: run("git", ["rev-parse", "HEAD"]),
});
const failures = [...validateActivityVerificationReport(report)];

const consentMismatch = buildActivityVerificationReport({
  features: [FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "drops")!],
  sourceEvents: [{ ...sourceBackedActivityFixtures[0], userId: undefined, identityLinkId: undefined }],
  consentMode: "minimal_analytics",
});
if (consentMismatch.features[0]?.verificationStatus !== "blocked_by_consent"
  || consentMismatch.debugBacklogItems.length === 0) {
  failures.push("consent mismatch was not flagged with a debug backlog item.");
}

const missingTracking = buildActivityVerificationReport({
  features: [{
    ...FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "drops")!,
    telemetryEvents: [],
    materializerLanes: [],
  }],
  sourceEvents: [{
    ...sourceBackedActivityFixtures[0],
    eventName: "unregistered_future_activity",
  }],
  consentMode: "full_behavioral",
});
if (missingTracking.features[0]?.verificationStatus !== "missing_tracking"
  || missingTracking.debugBacklogItems.length === 0) {
  failures.push("missing tracking did not create a debug backlog item.");
}

const weakIdentity = buildActivityVerificationReport({
  features: [FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "drops")!],
  sourceEvents: [{
    ...sourceBackedActivityFixtures[0],
    guestId: undefined,
    identityLinkId: undefined,
    identityConfidence: 0,
  }],
  consentMode: "full_behavioral",
});
if (weakIdentity.features[0]?.scoreEligible) {
  failures.push("user-level metric is score eligible without identity confidence.");
}

const sourceReadyOnly = buildActivityVerificationReport({
  features: [FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "drops")!],
  sourceEvents: [{
    ...sourceBackedActivityFixtures[0],
    sourceKind: "source_ready",
    sourcePath: "src/lib/features/feature-registration-registry.ts",
  }],
  consentMode: "full_behavioral",
});
if (sourceReadyOnly.features[0]?.verificationStatus !== "source_ready_no_activity"
  || sourceReadyOnly.features[0]?.scoreEligible
  || sourceReadyOnly.features[0]?.guestActivitySeen
  || sourceReadyOnly.features[0]?.userActivitySeen) {
  failures.push("source_ready events counted as observed user activity.");
}

const fakeActivity = buildActivityVerificationReport({
  features: [FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "drops")!],
  sourceEvents: [{
    ...sourceBackedActivityFixtures[0],
    sourceKind: "fake",
    sourcePath: "",
  }],
  consentMode: "full_behavioral",
});
if (!validateActivityVerificationReport(fakeActivity).includes("activity verification report must not use fake activity.")) {
  failures.push("fake activity was not rejected.");
}
if (fakeActivity.features[0]?.scoreEligible || fakeActivity.features[0]?.verificationStatus === "verified_by_activity") {
  failures.push("fake activity counted as verified source activity.");
}

const changed = changedFiles();
const protectedChanges = changed.filter((path) =>
  /(^|\/)(chat|Chat)\//u.test(path)
  || /(^|\/)(nav|Nav|navbar|Navbar|bottom|Bottom)/u.test(path)
  || /paypal|payment|gumdrop/i.test(path)
);
if (protectedChanges.length > 0) {
  failures.push(`protected chat/nav/payment/GumDrop files changed: ${protectedChanges.join(", ")}`);
}

const output = {
  ...report,
  status: failures.length > 0 ? "fail" as const : "pass" as const,
  changedFiles: changed,
  protectedChanges,
  validationFailures: failures,
};

write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
write(DOC_PATH, renderDoc(output));

if (failures.length > 0) {
  console.error(`Activity verification engine failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Activity verification engine passed: verified=${output.summary.verifiedByActivity}, sourceReady=${output.summary.sourceReadyNoActivity}, backlog=${output.debugBacklogItems.length}.`);
