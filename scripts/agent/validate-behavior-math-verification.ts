import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { buildBehaviorMathReport } from "@/lib/behavioral/behavior-math-engine";
import {
  buildLegacyBehaviorRecoveryPlan,
  LEGACY_BEHAVIOR_RECOVERY_START_DATE,
} from "@/lib/behavioral/legacy-behavior-recovery";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/behavior-math-verification.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/behavior-math-verification.md");
const ENGINE_PATH = path.join(ROOT, "src/lib/behavioral/behavior-math-engine.ts");
const RECOVERY_PATH = path.join(ROOT, "src/lib/behavioral/legacy-behavior-recovery.ts");

type Finding = {
  severity: "error" | "warning";
  message: string;
};

function readText(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function getChangedFiles() {
  try {
    const output = execSync("git diff --name-only HEAD", { cwd: ROOT, encoding: "utf8" });
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDoc(filePath: string, report: ReturnType<typeof buildBehaviorMathReport>, recovery: ReturnType<typeof buildLegacyBehaviorRecoveryPlan>) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `# Behavior Math Verification

Status: ${report.debugOutput.behaviorMathHealth}

## Source Rules

- Disabled tracking events are excluded from behavior metrics.
- Linked guest activity is attributed once to the resolved signed-in user.
- Legacy unknown records are quarantined until dry-run recovery classifies confidence and duplicate risk.
- Watch time uses watch-session rollup evidence only; page time and visibility duration do not become watch time.
- Purchase intent remains a behavior signal; purchase truth stays server-owned.

## Fixture Counts

- Raw events: ${report.summary.rawEvents}
- Eligible events: ${report.summary.eligibleEvents}
- Disabled excluded: ${report.summary.disabledEventsExcluded}
- Legacy unknown excluded: ${report.summary.legacyUnknownExcluded}
- Duplicates deduped: ${report.summary.duplicateEventsDeduped}
- Page-time watch exclusions: ${report.summary.watchTimeFromPageTimeExcluded}
- Linked guest events attributed to users: ${report.summary.linkedGuestEventsAttributedToUsers}

## Debug Output

- Behavior math health: ${report.debugOutput.behaviorMathHealth}
- Disabled tracking handling: ${report.debugOutput.disabledTrackingHandling}
- Legacy recovery readiness: ${report.debugOutput.legacyRecoveryReadiness}
- Watch time truth: ${report.debugOutput.watchTimeTruth}
- Per-user confidence: ${JSON.stringify(report.debugOutput.perUserConfidence)}

## Legacy Recovery

- Start date: ${recovery.startDate}
- Mode: ${recovery.mode}
- Production reads: ${String(recovery.readsProduction)}
- Mutations allowed: ${String(recovery.mutationsAllowed)}
- In-window records: ${recovery.summary.inWindowRecords}
`);
}

const report = buildBehaviorMathReport({
  events: [
    {
      eventId: "guest-page-1",
      eventName: "semantic_page_viewed",
      eventType: "page_view",
      timestampMs: Date.parse("2026-05-20T10:00:00.000Z"),
      sessionId: "session-guest",
      anonymousVisitorId: "guest-1",
      identityState: "guest_only",
      trackingState: "enabled",
      durationMs: 60_000,
    },
    {
      eventId: "guest-page-1",
      eventName: "semantic_page_viewed",
      eventType: "page_view",
      timestampMs: Date.parse("2026-05-20T10:00:00.000Z"),
      sessionId: "session-guest",
      anonymousVisitorId: "guest-1",
      userId: "user-1",
      identityState: "guest_linked_to_user",
      trackingState: "enabled",
      durationMs: 60_000,
    },
    {
      eventId: "disabled-click",
      eventName: "semantic_target_clicked",
      eventType: "click",
      timestampMs: Date.parse("2026-05-20T10:01:00.000Z"),
      sessionId: "session-disabled",
      anonymousVisitorId: "guest-disabled",
      identityState: "guest_only",
      trackingState: "disabled",
    },
    {
      eventId: "legacy-unknown",
      eventName: "creator_profile_viewed",
      eventType: "page_view",
      timestampMs: Date.parse("2026-03-04T10:01:00.000Z"),
      identityState: "unknown_legacy",
      trackingState: "unknown",
      targetCreatorId: "creator-1",
    },
    {
      eventId: "watch-page-duration",
      eventName: "semantic_page_engaged",
      eventType: "visibility",
      timestampMs: Date.parse("2026-05-20T10:02:00.000Z"),
      sessionId: "session-user",
      userId: "user-1",
      identityState: "user_only",
      trackingState: "enabled",
      durationMs: 120_000,
    },
    {
      eventId: "watch-runtime",
      eventName: "watch_session_completed",
      eventType: "watch",
      timestampMs: Date.parse("2026-05-20T10:03:00.000Z"),
      sessionId: "session-user",
      userId: "user-1",
      identityState: "user_only",
      trackingState: "enabled",
      watchTimeMs: 45_000,
      watchScoreSource: "watch_session_rollup",
    },
    {
      eventId: "purchase-intent",
      eventName: "begin_checkout",
      eventType: "click",
      timestampMs: Date.parse("2026-05-20T10:04:00.000Z"),
      sessionId: "session-user",
      userId: "user-1",
      identityState: "user_only",
      trackingState: "enabled",
    },
  ],
  identityLinks: [
    {
      guestId: "guest-1",
      userId: "user-1",
      sessionId: "session-guest",
      identityLinkId: "identity-link-1",
    },
  ],
});

const recovery = buildLegacyBehaviorRecoveryPlan({
  records: [
    {
      id: "legacy-known",
      eventName: "creator_profile_viewed",
      timestampMs: Date.parse("2026-03-01T00:00:00.000Z"),
      userId: "user-1",
      sessionId: "session-1",
    },
    {
      id: "legacy-weak",
      eventName: "mystery_interaction",
      timestampMs: Date.parse("2026-03-05T00:00:00.000Z"),
    },
  ],
});

const findings: Finding[] = [];
const engineSource = readText(ENGINE_PATH);
const recoverySource = readText(RECOVERY_PATH);
const changedFiles = getChangedFiles();

if (report.summary.duplicateEventsDeduped !== 1 || report.perGuest["guest-1"]) {
  findings.push({ severity: "error", message: "linked guest/user activity double counts instead of resolving once to the signed-in user" });
}

if (report.summary.disabledEventsExcluded !== 1 || report.perGuest["guest-disabled"]) {
  findings.push({ severity: "error", message: "disabled tracking sends behavior metrics" });
}

if (report.summary.legacyUnknownExcluded !== 1 || report.perUser["legacy-unknown"]) {
  findings.push({ severity: "error", message: "unknown legacy behavior is counted as known user behavior" });
}

if (/behaviorScore\s*[:=]\s*(?:100|1\b|0\b)|hardcoded_behavior_score|fake_behavior_score/.test(engineSource)) {
  findings.push({ severity: "error", message: "behavior score can be hardcoded" });
}

if (LEGACY_BEHAVIOR_RECOVERY_START_DATE !== "2026-03-01" || recovery.mode !== "dry_run_only" || recovery.mutationsAllowed !== false || !recoverySource.includes("readsProduction: false")) {
  findings.push({ severity: "error", message: "March 1 recovery lacks a dry-run/no-mutation contract" });
}

const user = report.perUser["user-1"];
if (!user || Object.values(user.metrics).some((metric) => !metric.confidence)) {
  findings.push({ severity: "error", message: "per-user math lacks confidence labels" });
}

if (report.summary.watchTimeFromPageTimeExcluded !== 1 || user?.metrics.watchTimeMs.value !== 45_000 || !engineSource.includes("watch_session_rollup")) {
  findings.push({ severity: "error", message: "watch time can use page time instead of watch-session rollups" });
}

if (report.debugOutput.behaviorMathHealth !== "verified_local_contract" || !report.debugOutput.perUserConfidence["user-1"]) {
  findings.push({ severity: "error", message: "debug output for behavior math health is missing" });
}

for (const protectedFile of changedFiles) {
  if (/^(src\/components\/Chat\/|src\/app\/chat\/|src\/components\/Navbar|src\/components\/.*Nav|src\/app\/api\/paypal\/|src\/lib\/gumdrop|src\/lib\/server\/creator-experiences)/.test(protectedFile)) {
    findings.push({ severity: "error", message: `protected chat/nav/payment/GumDrop surface changed: ${protectedFile}` });
  }
}

const artifact = {
  generatedAt: new Date().toISOString(),
  source: "local_static_validator",
  overallScore: findings.some((finding) => finding.severity === "error") ? 0 : 100,
  overallStatus: findings.some((finding) => finding.severity === "error") ? "fail" : "live",
  status: findings.some((finding) => finding.severity === "error") ? "fail" : "live",
  productionReads: false,
  liveBackfill: false,
  findingCount: findings.length,
  criticalCount: findings.filter((finding) => finding.severity === "error").length,
  report,
  recovery,
  findings,
};

writeJson(STATE_PATH, artifact);
writeDoc(DOC_PATH, report, recovery);

if (findings.some((finding) => finding.severity === "error")) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  reportPath: path.relative(ROOT, STATE_PATH).replace(/\\/g, "/"),
  docPath: path.relative(ROOT, DOC_PATH).replace(/\\/g, "/"),
  summary: report.summary,
}, null, 2));
