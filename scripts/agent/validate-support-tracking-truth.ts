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

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const supportInbox = readRequired("src/components/Support/SupportInbox.tsx");
const reportBugButton = readRequired("src/components/Feedback/ReportBugButton.tsx");
const supportThreadsRoute = readRequired("src/app/api/support/threads/route.ts");
const supportThreadRoute = readRequired("src/app/api/support/threads/[threadId]/route.ts");
const adminSupportThreadsRoute = readRequired("src/app/api/admin/support/threads/route.ts");
const adminSupportThreadRoute = readRequired("src/app/api/admin/support/threads/[threadId]/route.ts");
const adminSupportThreadMessagesRoute = readRequired("src/app/api/admin/support/threads/[threadId]/messages/route.ts");
const feedbackRoute = readRequired("src/app/api/tasks/feedback/route.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const behavioralContract = readRequired("src/lib/behavioral/event-fact-contract.ts");
const behavioralNormalizer = readRequired("src/lib/behavioral/normalize-event-fact.ts");
const identifiedIngestRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const ingestTests = readRequired("tests/unit/analytics-ingest-identified-route.spec.ts");
const supportRouteTests = readRequired("tests/unit/support-threads-route.spec.ts");
const feedbackRouteTests = readRequired("tests/unit/tasks-feedback-route.spec.ts");

if (packageJson.scripts?.["check:support-tracking-truth"] !== "tsx scripts/agent/validate-support-tracking-truth.ts") {
  failures.push("package.json must expose check:support-tracking-truth.");
}

requireIncludes(telemetryCatalog, 'eventName: "support_ticket_created"', "Telemetry catalog");
requireIncludes(telemetryCatalog, 'aliases: ["support_ticket_submitted"]', "Telemetry catalog support alias");
requireIncludes(telemetryCatalog, 'eventName: "support_reply_viewed"', "Telemetry catalog");
requireIncludes(telemetryCatalog, 'eventName: "support_reply_sent"', "Telemetry catalog");
requireIncludes(telemetryCatalog, 'aliases: ["support_thread_replied"]', "Telemetry catalog support reply alias");
requireIncludes(telemetryCatalog, 'eventName: "bug_report_submitted"', "Telemetry catalog");
requireIncludes(telemetryCatalog, 'aliases: ["feedback_submitted"]', "Telemetry catalog bug report alias");

requireIncludes(behavioralContract, '"support_reply_viewed"', "Behavioral event contract");
requireIncludes(behavioralContract, '"support_reply_sent"', "Behavioral event contract");
requireIncludes(behavioralNormalizer, 'support_reply_viewed: { normalizedAction: "support_reply_viewed"', "Behavioral event normalizer");
requireIncludes(behavioralNormalizer, 'support_reply_sent: { normalizedAction: "support_reply_sent"', "Behavioral event normalizer");

requireIncludes(supportInbox, 'trackEvent("support_reply_viewed"', "Support inbox");
requireExcludes(supportInbox, 'trackEvent("support_ticket_submitted"', "Support inbox");
requireExcludes(supportInbox, 'trackEvent("support_thread_replied"', "Support inbox");
requireExcludes(supportInbox, 'trackEvent("bug_report_submitted"', "Support inbox");

requireIncludes(supportThreadsRoute, 'trackServerEvent("support_ticket_created"', "Support threads route");
requireIncludes(supportThreadRoute, 'trackServerEvent("support_reply_sent"', "Support thread route");
requireIncludes(feedbackRoute, 'trackServerEvent("bug_report_submitted"', "Feedback route");
requireIncludes(feedbackRoute, 'recordCanonicalTaskEvent(uid, email || uid, "feedback_submitted"', "Feedback route task sync");

requireExcludes(adminSupportThreadsRoute, 'trackServerEvent("support_ticket_created"', "Admin support list route");
requireExcludes(adminSupportThreadRoute, 'trackServerEvent("support_reply_sent"', "Admin support detail route");
requireExcludes(adminSupportThreadMessagesRoute, 'trackServerEvent("support_reply_sent"', "Admin support messages route");

requireIncludes(identifiedIngestRoute, "normalizeIdentifiedMetricEventFact", "Identified ingest route");
requireIncludes(ingestTests, 'eventName: "support_ticket_created"', "Identified ingest support tests");
requireIncludes(ingestTests, 'eventName: "bug_report_submitted"', "Identified ingest bug report tests");
requireIncludes(supportRouteTests, 'trackServerEvent).toHaveBeenCalledWith("support_ticket_created"', "Support route tests");
requireIncludes(supportRouteTests, 'trackServerEvent).toHaveBeenCalledWith("support_reply_sent"', "Support route tests");
requireIncludes(feedbackRouteTests, 'trackServerEvent).toHaveBeenCalledWith("bug_report_submitted"', "Feedback route tests");

if (failures.length > 0) {
  console.error("Support tracking truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Support tracking truth validator passed.");
