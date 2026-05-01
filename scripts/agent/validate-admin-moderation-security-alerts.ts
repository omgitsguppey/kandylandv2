import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
  }
}

const helper = readRequired("src/lib/admin-moderation-security-alerts.ts");
const hook = readRequired("src/hooks/useAdminModerationRealtime.ts");
const consoleSource = readRequired("src/components/Admin/AdminModerationConsole.tsx");
const alertsPanel = readRequired("src/components/Admin/AdminModerationSecurityAlerts.tsx");
const logAttemptRoute = readRequired("src/app/api/security/log-attempt/route.ts");
const doc = readRequired("docs/agent-truth/admin-moderation-security-alerts.md");
const tests = readRequired("tests/unit/admin-moderation-security-alerts.spec.ts");

for (const needle of [
  "normalizeAdminModerationSecurityAlert",
  "clusterAdminModerationSecurityAlerts",
  "BURST_BUCKET_MS",
  "confidence",
  "falsePositiveRisk",
  "sourceVerified",
  "serverConfirmed",
  "actionLabel",
  "contextLabel",
  "Source unknown",
]) {
  requireIncludes(helper, needle, "Admin moderation alert normalizer");
}

for (const needle of [
  "fetchAdminModerationJson<AdminModerationThreadsResponse>",
  "fetchAdminModerationJson<AdminModerationSecurityAlertsResponse>",
  "fetchAdminModerationJson<AdminModerationThreadDetailResponse>",
  "normalizeAdminModerationSecurityAlert",
  "clusterAdminModerationSecurityAlerts",
]) {
  requireIncludes(hook, needle, "Admin moderation realtime fallback hook");
}

for (const needle of [
  "statusLabel",
  "Loading",
  "Partial",
  "Degraded",
  "AdminModerationSecurityAlerts",
  "Creator chat review and server-backed security alerts.",
]) {
  requireIncludes(consoleSource, needle, "Admin moderation console status");
}

requireNotIncludes(consoleSource, "xl:h-[100vh]", "Admin moderation workspace containment");
requireNotIncludes(alertsPanel, "Suspected", "Security alert visible confidence copy");
requireNotIncludes(alertsPanel, "x Burst", "Security alert visible burst copy");

for (const needle of [
  "Source:",
  "actionLabel",
  "accuracyLabel",
  "priorityLabel",
  "sourceLabel",
]) {
  requireIncludes(alertsPanel, needle, "Admin moderation security alert panel");
}

for (const needle of [
  "confidence: descriptor.confidence",
  "serverConfirmed: true",
  "sourceVerified: true",
  "schemaVersion: 2",
  "security_confidence",
]) {
  requireIncludes(logAttemptRoute, needle, "Security log attempt route accuracy fields");
}

for (const needle of [
  "OWASP Logging Cheat Sheet",
  "NIST SP 800-61 Rev. 3",
  "Every alert row must carry severity, confidence, source, context, and next action",
  "Future agents must not reintroduce pure realtime-only moderation loading",
]) {
  requireIncludes(doc, needle, "Admin moderation security alert doctrine");
}

for (const needle of [
  "does not pretend unknown alert reasons are high-confidence detections",
  "clusters only same user/object/security bursts in a short window",
]) {
  requireIncludes(tests, needle, "Admin moderation security alert tests");
}

if (failures.length > 0) {
  console.error("Admin moderation security alert validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin moderation security alert validation passed.");
