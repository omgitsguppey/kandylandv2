import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getPackageScripts, readJsonFile } from "./shared";

type CutoverReport = {
  status: "pass" | "warning" | "fail";
  score: number;
  checks: Array<{ id: string; pass: boolean; detail: string }>;
  criticalBlockers: string[];
  exactValidatorsToRun: string[];
};

const REPORT_PATH = "agent/state/guest-user-analytics-cutover.generated.json";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readRequired(relativePath: string) {
  const fullPath = join(process.cwd(), relativePath);
  assert(existsSync(fullPath), `Missing required file: ${relativePath}`);
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(source: string, expected: string, label: string) {
  assert(source.includes(expected), `${label} must include "${expected}"`);
}

function assertNotIncludes(source: string, unexpected: string, label: string) {
  assert(!source.includes(unexpected), `${label} must not include "${unexpected}"`);
}

function main() {
  const scripts = getPackageScripts("package.json");
  assert(scripts["score:guest-user-analytics"], "package.json is missing score:guest-user-analytics");
  assert(scripts["check:guest-user-analytics"], "package.json is missing check:guest-user-analytics");
  assert(scripts["check:guest-analytics-lock"], "package.json is missing check:guest-analytics-lock");

  const report = readJsonFile<CutoverReport>(REPORT_PATH);
  assert(Array.isArray(report.checks) && report.checks.length >= 9, "cutover report is incomplete");
  assert(report.criticalBlockers.length === 0, `critical blockers remain:\n- ${report.criticalBlockers.join("\n- ")}`);
  assert(report.score >= 80, `cutover score too low: ${report.score}`);
  assert(report.status !== "fail", "cutover status is fail");
  assert(report.exactValidatorsToRun.includes("npm run check:guest-user-analytics"), "report must include exact validator command");

  const deepTracker = readRequired("src/components/Analytics/DeepTracker.tsx");
  const clientSession = readRequired("src/lib/client-session.ts");
  const guestIngest = readRequired("src/app/api/analytics/ingest/route.ts");
  const ingestContract = readRequired("src/lib/analytics/ingest-contract.ts");
  const identifiedIngest = readRequired("src/app/api/analytics/ingest-identified/route.ts");
  const realtimeRoute = readRequired("src/app/api/admin/analytics/realtime/route.ts");
  const realtimeSummary = readRequired("functions/src/analytics-realtime-summary.ts");
  const livePulse = readRequired("src/lib/admin-analytics-live-pulse.ts");
  const adminAnalyticsPage = readRequired("src/app/admin/analytics/page.tsx");
  const operationsTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
  const identityLinking = readRequired("src/lib/server/analytics-identity-linking.ts");
  const unitIdentity = readRequired("tests/unit/guest-analytics-identity.spec.ts");
  const unitIngest = readRequired("tests/unit/analytics-ingest-route.spec.ts");
  const unitLivePulse = readRequired("tests/unit/admin-analytics-live-pulse.spec.ts");
  const doc = readRequired("docs/agent-truth/guest-user-analytics-cutover.md");

  for (const expected of [
    "getClientAnalyticsIdentitySnapshot",
    "anonymousVisitorId: identity.anonymousVisitorId ?? undefined",
    "stableBatch?.signature === signature",
    "clearStableGuestAnalyticsBatchAfterSuccess",
    "semanticEventName",
  ]) {
    assertIncludes(deepTracker, expected, "DeepTracker guest ingest lock");
  }

  for (const expected of [
    "getAnonymousVisitorId",
    "getClientAnalyticsIdentitySnapshot",
    "buildClientIdentityLinkRecord",
    "rememberClientIdentityLink",
    "canPersistAnalyticsIdentity",
    "return consentState !== \"denied\"",
  ]) {
    assertIncludes(clientSession, expected, "Client analytics identity lock");
  }

  for (const expected of [
    "resolveCanonicalGuestAnonymousVisitorId",
    "serverSessionKey: sessionKey",
    "anonymousVisitorId: canonicalAnonymousVisitorId",
    "clientSessionId: sessionId || null",
    "buildAnalyticsIngestDedupeKey({ sessionKey, batchId })",
    "transaction.get(guestBatchRef)",
    "deduped: true,",
    "writeBehavioralTimelineProjection",
    "behavioralTimelineProjectionFacts",
    'queueMode: "written_with_outbox"',
    'materializer: "user_index_materializer_requests_v3"',
    "requestsEnqueued",
  ]) {
    assertIncludes(guestIngest, expected, "Guest ingest identity/dedupe lock");
  }
  assertNotIncludes(guestIngest, "describeGuestUserTrackingMaterialization", "Guest ingest retired missing-materializer adapter lock");
  assertNotIncludes(guestIngest, 'explicitState: "materializer_missing"', "Guest ingest stale missing-materializer state lock");
  assertNotIncludes(guestIngest, "deferred_non_priority", "Guest ingest fake deferred-materializer lock");
  assertNotIncludes(guestIngest, "analytics_guest_batches_daily", "Guest ingest nonexistent consumer lock");

  for (const expected of [
    "export const ANALYTICS_CLIENT_ID_PATTERN",
    "ANALYTICS_CLIENT_ID_PATTERN.test(candidate)",
    "export function resolveCanonicalGuestAnonymousVisitorId",
    "return input.sessionKey",
  ]) {
    assertIncludes(ingestContract, expected, "Shared guest ingest identity contract");
  }

  assertIncludes(identifiedIngest, "identity_linked", "Identified ingest identity-link lock");
  assertIncludes(identityLinking, "trackServerEvent(\"identity_linked\"", "Server identity-link lock");

  for (const expected of [
    "guestAnalyticsSnapshot",
    "guestSamplesAvailable",
    "sourceSampleCounts",
    "guestTruthState",
    "analytics_guest_batches",
  ]) {
    assertIncludes(realtimeRoute + realtimeSummary, expected, "Guest snapshot materialization lock");
  }

  for (const expected of [
    "guestSnapshotTruthState",
    "guestSnapshotSourceLabel",
    "guestSnapshotReason",
    "Guest unavailable",
    "Guest snapshot refresh due",
    "Guest samples unavailable",
  ]) {
    assertIncludes(livePulse + operationsTab + adminAnalyticsPage, expected, "Admin guest truth display lock");
  }

  assertNotIncludes(adminAnalyticsPage, "liveGuestActiveCount ?? 0", "Admin overview guest fake-zero lock");

  for (const expected of [
    "reuses a stable batch id",
    "omits anonymousVisitorId when identity persistence is denied",
    "prefers a valid client anonymous visitor id",
    "preserving the server session key",
    "queues the canonical user-index materializer",
    "ignores malformed guest semantic payloads",
    "materialized guest snapshot instead of GA estimates",
    "missing guest snapshot evidence as a live zero",
  ]) {
    assertIncludes(unitIdentity + unitIngest + unitLivePulse, expected, "Guest analytics targeted test lock");
  }

  for (const expected of [
    "Canonical guest identity hierarchy",
    "Server cookie role",
    "GA4 user_id hygiene",
    "Retry dedupe",
    "Semantic guest parity",
    "Materialized snapshot-first",
    "Admin truth display",
    "Cost boundaries",
    "check:guest-analytics-lock",
  ]) {
    assertIncludes(doc, expected, "Guest analytics source-of-truth doc");
  }

  console.log(`Guest/user analytics cutover validated: ${report.score}/100 (${report.status})`);
}

main();
