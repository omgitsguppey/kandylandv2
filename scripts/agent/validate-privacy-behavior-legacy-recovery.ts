import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PRIVACY_BEHAVIOR_LEGACY_CLASSES } from "../../src/lib/legacy/legacy-normalization-contract";
import {
  PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE,
  buildPrivacyBehaviorLegacyRecoveryPlan,
} from "../../src/lib/legacy/privacy-behavior-legacy-recovery";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/privacy-behavior-legacy-recovery.generated.json";
const DOC_PATH = "docs/agent-truth/privacy-behavior-legacy-recovery.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const changed = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"]] as const) {
    const output = git([...args]);
    for (const line of output.split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      changed.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...changed].sort();
}

function includesAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

const changed = changedFiles();
const recoverySource = read("src/lib/legacy/privacy-behavior-legacy-recovery.ts");
const contractSource = read("src/lib/legacy/legacy-normalization-contract.ts");
const controlTowerSource = read("src/lib/admin-debug-control-tower.ts");
const failures: string[] = [];

const plan = buildPrivacyBehaviorLegacyRecoveryPlan({
  records: [
    {
      legacyId: "fixture_legacy_consent_unknown",
      legacyClass: "legacy_consent_unknown",
      legacySource: "legacy_cookie_banner_state",
      timestampMs: Date.parse("2026-03-01T00:00:00.000Z"),
      fields: { consentMode: "unknown", anonymousVisitorId: "guest-1" },
    },
    {
      legacyId: "fixture_legacy_guest_behavior_unknown",
      legacyClass: "legacy_guest_behavior_unknown",
      legacySource: "analytics_guest_batches",
      timestampMs: Date.parse("2026-03-02T00:00:00.000Z"),
      fields: { eventName: "unknown_legacy", anonymousVisitorId: "guest-2" },
    },
    {
      legacyId: "fixture_legacy_user_behavior_probable",
      legacyClass: "legacy_user_behavior_probable",
      legacySource: "analytics_event_facts",
      timestampMs: Date.parse("2026-03-03T00:00:00.000Z"),
      fields: { eventName: "creator_profile_viewed", userId: "user-1", sessionId: "session-1" },
    },
    {
      legacyId: "fixture_orphaned_guest_session",
      legacyClass: "orphaned_guest_session",
      legacySource: "analytics_sessions",
      timestampMs: Date.parse("2026-03-04T00:00:00.000Z"),
      fields: { sessionId: "session-orphan", anonymousVisitorId: "guest-orphan" },
    },
    {
      legacyId: "fixture_orphaned_user_event",
      legacyClass: "orphaned_user_event",
      legacySource: "analytics_event_facts",
      timestampMs: Date.parse("2026-03-05T00:00:00.000Z"),
      fields: { eventName: "drop_opened", userId: "user-1" },
    },
    {
      legacyId: "fixture_orphaned_materialized_metric",
      legacyClass: "orphaned_materialized_metric",
      legacySource: "analytics_users_rollup",
      timestampMs: Date.parse("2026-03-06T00:00:00.000Z"),
      fields: { metricId: "profile_views", userId: "user-1", count: 4 },
    },
    {
      legacyId: "fixture_orphaned_profile_drop_interaction",
      legacyClass: "orphaned_profile_drop_interaction",
      legacySource: "behavioral_timeline_facts",
      timestampMs: Date.parse("2026-03-07T00:00:00.000Z"),
      fields: { creatorId: "creator-1", dropId: "drop-1", sessionId: "session-3" },
    },
    {
      legacyId: "fixture_legacy_cookie_banner_state",
      legacyClass: "legacy_cookie_banner_state",
      legacySource: "legacy_cookie_banner_state",
      timestampMs: Date.parse("2026-03-08T00:00:00.000Z"),
      fields: { consentMode: "minimal_analytics", anonymousVisitorId: "guest-3" },
    },
  ],
});

const unknownConsent = plan.records.find((record) => record.legacyClass === "legacy_consent_unknown");
if (!unknownConsent
  || unknownConsent.candidateNormalizedRecord.consentMode !== "necessary_only"
  || unknownConsent.action !== "archive_only"
  || unknownConsent.forbiddenUsage.includes("full_behavioral_tracking") !== true) {
  failures.push("legacy consent unknown becomes full behavioral or is not archive-only.");
}
if (plan.records.some((record) => record.currentTruthEligible !== false)) {
  failures.push("orphaned legacy data counts as current truth.");
}
if (plan.mode !== "dry_run_only" || plan.records.some((record) => !record.dryRunOnly) || !recoverySource.includes("dry_run_only")) {
  failures.push("no dry-run flag.");
}
if (plan.mutationsAllowed !== false || plan.readsProduction !== false || plan.liveBackfill !== false) {
  failures.push("mutation, production read, or live backfill is possible.");
}
if (plan.recoveryStartDate !== "2026-03-01" || PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE !== "2026-03-01") {
  failures.push("no March 1 boundary.");
}
if (plan.records.some((record) => !record.duplicateRisk)) {
  failures.push("no duplicate risk.");
}
if (plan.records.some((record) => !record.confidence)) {
  failures.push("no confidence.");
}
if (!includesAll(contractSource, [
  "PRIVACY_BEHAVIOR_LEGACY_CLASSES",
  "legacy_consent_unknown",
  "orphaned_materialized_metric",
  "legacy_cookie_banner_state",
])) {
  failures.push("legacy normalization contract does not expose privacy/behavior recovery classes.");
}
if (!includesAll(controlTowerSource, [
  "privacy-behavior-legacy-recovery.generated.json",
  "npm run check:privacy-behavior-legacy-recovery",
])) {
  failures.push("debug/admin visibility is missing for privacy behavior legacy recovery.");
}
if (!plan.adminDebugVisibility
  || !plan.adminDebugVisibility.orphanCountsByClass
  || plan.adminDebugVisibility.cannotSafelyRecover.length === 0) {
  failures.push("debug/admin visibility lacks recovery readiness, orphan counts, or unsafe recovery list.");
}
if (!plan.debugBacklogIssues.some((issue) => issue.sourceRoute === "legacy://privacy-behavior-recovery")) {
  failures.push("legacy recovery gaps are not visible as debug backlog style issues.");
}
if (/(firebase-admin|adminDb|collection\s*\(|writeBatch|runTransaction|\.set\s*\(|\.update\s*\(|\.delete\s*\(|fetch\s*\(|backfill\s*\()/u.test(recoverySource)) {
  failures.push("recovery source contains production read/write/backfill call patterns.");
}

const protectedChanges = changed.filter((path) =>
  /^src\/components\/Navigation\//u.test(path)
  || /^src\/components\/Navbar/u.test(path)
  || /^src\/app\/dashboard\/chat/u.test(path)
  || /\/chat\//iu.test(path)
  || /paypal|payment|wallet|gumdrop/iu.test(path)
);
if (protectedChanges.length > 0) {
  failures.push(`protected chat/nav/payment files changed: ${protectedChanges.join(", ")}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  generatedAtUtc: new Date().toISOString(),
  source: "local_static_validator",
  reportKey: "privacy-behavior-legacy-recovery",
  currentHead: git(["rev-parse", "HEAD"]),
  overallStatus: failures.length === 0 ? "live" : "fail",
  overallScore: failures.length === 0 ? 100 : 0,
  productionReads: false,
  liveBackfill: false,
  mutationsAllowed: false,
  recoveryClasses: PRIVACY_BEHAVIOR_LEGACY_CLASSES,
  plan,
  protectedChanges,
  changedFiles: changed,
  findings: failures.map((message) => ({ severity: "error", message })),
};

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, [
  "# Privacy Behavior Legacy Recovery",
  "",
  `Generated: ${report.generatedAtUtc}`,
  "",
  "This is a dry-run recovery contract for legacy and orphaned privacy/behavior records from March 1, 2026 onward. It does not read production data, run live backfill, mutate records, or promote unknown legacy consent into full behavioral tracking.",
  "",
  "## Contract",
  "",
  `- Recovery start date: ${plan.recoveryStartDate}`,
  `- Mode: ${plan.mode}`,
  `- Production reads: ${String(plan.readsProduction)}`,
  `- Live backfill: ${String(plan.liveBackfill)}`,
  `- Mutations allowed: ${String(plan.mutationsAllowed)}`,
  `- Current truth eligible records: ${plan.summary.currentTruthEligibleCount}`,
  `- Requires user confirmation: ${plan.summary.requiresUserConfirmationCount}`,
  "",
  "## Legacy Classes",
  "",
  ...PRIVACY_BEHAVIOR_LEGACY_CLASSES.map((entry) => `- ${entry}`),
  "",
  "## Debug/Admin Visibility",
  "",
  `- Recovery readiness: ${plan.adminDebugVisibility.recoveryReadiness}`,
  `- Orphan counts: ${JSON.stringify(plan.summary.orphanCountsByClass)}`,
  `- Cannot safely recover: ${plan.adminDebugVisibility.cannotSafelyRecover.join(", ") || "none"}`,
  `- Unsafe reason: ${plan.adminDebugVisibility.unsafeRecoveryReason}`,
  "",
  "## Validation",
  "",
  ...(failures.length ? failures.map((failure) => `- FAIL: ${failure}`) : ["- Pass."]),
  "",
].join("\n"));

if (failures.length > 0) {
  console.error("Privacy behavior legacy recovery validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Privacy behavior legacy recovery passed: dry-run mapping, consent safety, orphan visibility, and mutation blocks are in place.");
