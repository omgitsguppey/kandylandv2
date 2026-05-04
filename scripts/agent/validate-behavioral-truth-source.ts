import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

const confidenceHelper = read("src/lib/behavioral/behavioral-confidence.ts");
const truthHelper = read("src/lib/behavioral/behavioral-truth-source.ts");
const snapshotContract = read("src/lib/admin-user-metrics-contract.ts");
const snapshotHelper = read("src/lib/server/admin-user-metrics-snapshot.ts");
const rollupContract = read("src/lib/user-behavior-rollup-contract.ts");
const rollupHelper = read("src/lib/server/user-behavior-rollup.ts");
const overviewRoute = read("src/app/api/admin/overview/route.ts");
const usersRoute = read("src/app/api/admin/users/route.ts");
const userDetailRoute = read("src/app/api/admin/user/[userId]/route.ts");
const usersPage = read("src/app/admin/users/page.tsx");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const behaviorRuntime = read("functions/src/behavioral-intelligence-runtime.ts");
const behaviorTruthDoc = read("docs/agent-truth/behavioral-truth-source.md");
const watchTruthDoc = read("docs/agent-truth/watch-time-truth.md");
const audienceSnapshotDoc = read("docs/agent-truth/admin-analytics-audience-snapshot.md");

const failures: string[] = [];

[
  "admin_metrics: 5 * 60 * 1000",
  "user_detail_behavior: 30 * 60 * 1000",
  "recommendation_profile: 24 * 60 * 60 * 1000",
  "strategic_analytics: 72 * 60 * 60 * 1000",
].forEach((entry) => {
  assert(truthHelper.includes(entry), `Behavioral truth helper missing freshness threshold ${entry}.`, failures);
});

[
  "(0.35 * sourceAgreement)",
  "(0.25 * freshnessScore)",
  "(0.25 * sampleScore)",
  "(0.15 * schemaScore)",
  "issuePenalty = Math.min(0.6, Math.max(0, input.issueCount) * 0.12)",
  'if (score >= 90) return "verified"',
  'if (score >= 75) return "strong"',
  'if (score >= 50) return "usable"',
  'if (score >= 30) return "low"',
].forEach((fragment) => {
  assert(confidenceHelper.includes(fragment), `Behavioral confidence helper missing ${fragment}.`, failures);
});

[
  '"materialized_rollup"',
  '"event_facts"',
  '"user_profile_fields"',
  '"live_fallback"',
  '"legacy_fallback"',
].forEach((fragment) => {
  assert(truthHelper.includes(fragment), `Behavioral truth helper missing source hierarchy member ${fragment}.`, failures);
});

assert(snapshotContract.includes("truthSource"), "Admin user metrics snapshot contract must carry truthSource.", failures);
assert(snapshotContract.includes("confidenceScore"), "Admin user metrics snapshot contract must carry confidenceScore.", failures);
assert(snapshotContract.includes("confidenceLabel"), "Admin user metrics snapshot contract must carry confidenceLabel.", failures);
assert(snapshotContract.includes("issues"), "Admin user metrics snapshot contract must carry issues.", failures);
assert(snapshotHelper.includes("buildBehavioralTruthSummary"), "Admin user metrics snapshot helper must use behavioral truth summary.", failures);
assert(overviewRoute.includes("readAdminUserMetricsSnapshot"), "Admin overview must keep using the canonical user metrics snapshot reader.", failures);
assert(usersRoute.includes("buildAdminUserMetricsSnapshot"), "Admin users route must use the canonical user metrics snapshot builder.", failures);
assert(!usersRoute.includes("resolveSnapshotFreshness("), "Admin users route must not keep a local snapshot freshness fork.", failures);

assert(rollupContract.includes("confidenceScore"), "User behavior rollup contract must carry confidenceScore.", failures);
assert(rollupContract.includes("sourceLabel"), "User behavior rollup contract must carry sourceLabel.", failures);
assert(rollupContract.includes("freshnessState"), "User behavior rollup contract must carry freshnessState.", failures);
assert(rollupHelper.includes("buildBehavioralTruthSummary"), "User behavior rollup helper must use behavioral truth summary.", failures);
assert(usersRoute.includes("buildUserBehaviorRollup"), "Admin users route must build canonical user behavior rollups.", failures);
assert(userDetailRoute.includes("buildUserBehaviorRollup"), "Admin user detail route must build canonical user behavior rollups.", failures);

assert(usersPage.includes('data-admin-users-stats-layout="compact-grid"'), "User Management must keep the compact stats grid marker.", failures);
assert(!usersPage.includes('value: summary ? `${summary.totalWatchHours ?? 0}h` : "[unavailable]"'), "Watch summary card must not render [unavailable] as a primary value.", failures);
assert(usersPage.includes("SUMMARY_PLACEHOLDER"), "User Management summary cards must use a compact placeholder instead of [unavailable].", failures);
assert(usersPage.includes("data-admin-users-metric-state"), "User Management metric cards must expose data-admin-users-metric-state.", failures);
assert(usersPage.includes("data-admin-users-metric-source"), "User Management metric cards must expose data-admin-users-metric-source.", failures);

assert(rollupHelper.includes("watch_time_missing_despite_views"), "Behavior rollup helper must flag watch_time_missing_despite_views.", failures);
assert(rollupHelper.includes('"legacy_page_duration"'), "Behavior rollup helper must keep labeled legacy page-duration fallback evidence.", failures);
assert(behaviorRuntime.includes('const STALE_AFTER_MS = 24 * 60 * 60 * 1000'), "Behavioral intelligence runtime must use 24h recommendation freshness.", failures);
assert(behaviorRuntime.includes("computeBehavioralTruthConfidence"), "Behavioral intelligence runtime must mirror the canonical confidence helper.", failures);
assert(behaviorRuntime.includes("(0.35 * sourceAgreement)"), "Behavioral intelligence runtime must keep the canonical source-agreement weight.", failures);
assert(behaviorRuntime.includes('const confidenceLabel = confidenceResult.label'), "Behavioral intelligence runtime must use the canonical confidence label mapping.", failures);

assert(userDetailPage.includes("Insufficient signal"), "User detail must keep the compact insufficient-signal state.", failures);
assert(userDetailPage.includes("fallback recommendation"), "User detail must clearly label fallback recommendations.", failures);
assert(userDetailPage.includes("behaviorRollup?.freshnessState"), "User detail truth badge must use behavior rollup freshness.", failures);

assert(!usersPage.includes("setInterval("), "User Management must not add polling via setInterval.", failures);
assert(!userDetailPage.includes("setInterval("), "Admin user detail must not add polling via setInterval.", failures);
assert(usersPage.includes('authFetch("/api/admin/users?mode=summary")'), "User Management summary lane must stay separate from list/detail loads.", failures);
assert(usersPage.includes('authFetch("/api/admin/users/realtime"'), "Realtime may upgrade the page, but static snapshots must remain the primary truth source.", failures);

assert(behaviorTruthDoc.includes("materialized_rollup"), "Behavioral truth doc must describe the canonical source hierarchy.", failures);
assert(behaviorTruthDoc.includes("0.35 * sourceAgreement"), "Behavioral truth doc must explain the confidence formula.", failures);
assert(watchTruthDoc.includes("watch-session rollups count as `event_facts`"), "Watch time doc must anchor watch sessions in the behavioral truth hierarchy.", failures);
assert(audienceSnapshotDoc.includes("Behavioral audience cards also inherit the canonical behavioral truth hierarchy"), "Audience snapshot doc must mention the shared behavioral hierarchy.", failures);

if (failures.length > 0) {
  console.error("Behavioral truth source validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Behavioral truth source validation passed.");
