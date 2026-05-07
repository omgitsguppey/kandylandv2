import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition: unknown, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

const files = {
  overviewRoute: read("src/app/api/admin/overview/route.ts"),
  usersRoute: read("src/app/api/admin/users/route.ts"),
  userRoute: read("src/app/api/admin/user/[userId]/route.ts"),
  usersPage: read("src/app/admin/users/page.tsx"),
  userPage: read("src/app/admin/user/[userId]/page.tsx"),
  truthState: read("src/lib/admin-truth-state.ts"),
  truthBadge: read("src/components/Admin/AdminTruthBadge.tsx"),
  analyticsHelpers: read("src/app/admin/analytics/AnalyticsHelpers.tsx"),
  aiHelpers: read("src/app/admin/ai/AiHelpers.tsx"),
  adminStatsBar: read("src/components/Admin/AdminStatsBar.tsx"),
  adminModuleVerificationCard: read("src/components/Admin/AdminModuleVerificationCard.tsx"),
  debugPrimitives: read("src/app/admin/debug/components/DebugPrimitives.tsx"),
  snapshotContract: read("src/lib/admin-user-truth-contract.ts"),
  snapshotServer: read("src/lib/server/admin-user-truth-snapshot.ts"),
  rollupContract: read("src/lib/behavioral/user-score-contract.ts"),
  rollupServer: read("src/lib/server/user-behavior-truth-rollup.ts"),
  eventFact: read("src/lib/behavioral/event-fact-contract.ts"),
  eventNormalizer: read("src/lib/behavioral/event-fact-normalizer.ts"),
  metricFact: read("src/lib/behavioral/metric-fact-contract.ts"),
  metricMaterializer: read("src/lib/server/metric-fact-materializer.ts"),
  legacyRegistry: read("src/lib/legacy/admin-analytics-legacy-registry.ts"),
  betaTracker: read("scripts/agent/validate-beta-update-tracker.ts"),
  packageJson: read("package.json"),
};

const failures: string[] = [];

assert(files.packageJson.includes('"check:admin-truth-replacement"'), "package.json must expose check:admin-truth-replacement.", failures);
assert(files.snapshotContract.includes("sourceTruthBreakdown"), "Admin user truth snapshot must expose sourceTruthBreakdown.", failures);
assert(files.snapshotContract.includes("returnedLast7Days") && files.snapshotContract.includes("validWatchTimeMs"), "Admin user truth snapshot contract is incomplete.", failures);
assert(files.snapshotServer.includes("toAdminUserTruthSnapshot") && files.snapshotServer.includes("readAdminUserTruthSnapshot"), "Admin user truth snapshot server wrapper is missing.", failures);
assert(files.overviewRoute.includes("readAdminUserTruthSnapshot"), "Admin Overview must use admin-user-truth-snapshot.", failures);
assert(files.usersRoute.includes("buildAdminUserTruthSnapshot") || files.usersRoute.includes("toAdminUserTruthSnapshot"), "User Management must use admin-user-truth-snapshot.", failures);
assert(files.usersPage.includes("summary?.truthSnapshot") || files.usersPage.includes("metricsSnapshot"), "User Management must render the canonical snapshot payload.", failures);
assert(files.rollupContract.includes("recommendationConfidence") && files.rollupContract.includes("shouldHideRecommendations"), "User behavior truth contract is incomplete.", failures);
assert(files.rollupServer.includes("toUserBehaviorTruthRollup"), "Canonical per-user truth rollup wrapper is missing.", failures);
assert(files.userRoute.includes("buildUserBehaviorTruthRollup") || files.userRoute.includes("toUserBehaviorTruthRollup"), "Per-user route must use user-behavior-truth-rollup.", failures);
assert(files.userPage.includes("behaviorTruthRollup"), "Per-user page must read the canonical truth rollup first.", failures);
assert(files.metricFact.includes("purchase_verified") && files.metricFact.includes("watch_session_verified"), "Metric fact contract is incomplete.", failures);
assert(files.metricMaterializer.includes("server_transaction") && files.metricMaterializer.includes("server_entitlement"), "Metric fact materializer must enforce server purchase/unlock provenance.", failures);
assert(files.eventFact.includes("actorUserId") && files.eventFact.includes("metricEligible") && files.eventFact.includes("sourceReliability"), "Behavioral event fact contract must expose canonical actor/target/truth fields.", failures);
assert(files.eventNormalizer.includes("admin_projection") && files.eventNormalizer.includes("privacy_limited"), "Event fact normalizer must exclude admin projection and privacy-limited rows.", failures);
assert(files.legacyRegistry.includes('classification: "blocked"') && files.legacyRegistry.includes("src/lib/admin-analytics-live-runtime.ts"), "Legacy registry must block old live-runtime formulas.", failures);
assert(files.truthState.includes('"privacy_limited"') && files.truthState.includes('"legacy_fallback"') && files.truthState.includes('"blocked"'), "Admin truth state must expose the replacement truth states.", failures);
assert(files.truthBadge.includes("data-admin-truth-state"), "Admin truth badge must keep the explicit truth marker.", failures);
assert(files.aiHelpers.includes("AdminTruthBadge"), "Admin AI helpers must render canonical truth badges.", failures);
assert(files.adminStatsBar.includes("AdminTruthBadge"), "Admin stats bar must render canonical truth badges.", failures);
assert(files.adminModuleVerificationCard.includes("AdminTruthBadge"), "Admin module verification card must render canonical truth badges.", failures);
assert(files.debugPrimitives.includes("AdminTruthBadge"), "Admin debug primitives must render canonical truth badges.", failures);
assert(files.aiHelpers.includes("resolveAdminTruthState"), "Admin AI helpers must resolve AdminTruthState through the canonical helper.", failures);
assert(files.adminStatsBar.includes("resolveAdminTruthState"), "Admin stats bar must resolve AdminTruthState through the canonical helper.", failures);
assert(files.adminModuleVerificationCard.includes("resolveAdminTruthState"), "Admin module verification card must resolve AdminTruthState through the canonical helper.", failures);
assert(files.debugPrimitives.includes("resolveAdminTruthState"), "Admin debug primitives must resolve AdminTruthState through the canonical helper.", failures);
for (const [label, source] of [
  ["Admin analytics helpers", files.analyticsHelpers],
  ["Admin AI helpers", files.aiHelpers],
  ["Admin stats bar", files.adminStatsBar],
  ["Admin module verification card", files.adminModuleVerificationCard],
  ["Admin debug primitives", files.debugPrimitives],
] as const) {
  assert(!source.includes("AdminStatusBadge"), `${label} must not use AdminStatusBadge after the canonical truth-state cutover.`, failures);
  assert(!source.includes("stateFromTone("), `${label} must not define a local tone-to-truth map outside src/lib/admin-truth-state.ts.`, failures);
}
assert(!files.usersPage.includes("[unavailable]"), "User Management must not render [unavailable] as a metric value.", failures);
assert(files.userPage.includes("details") && files.userPage.includes("Insufficient signal"), "Per-user recommendations and math must stay collapsed unless confidence is sufficient.", failures);
assert(files.betaTracker.includes("check:beta-update-tracker"), "Beta release-note tracker must remain canonical.", failures);

const state = {
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "pass" : "fail",
  failures,
  classifiedPaths: [
    "src/lib/server/admin-user-truth-snapshot.ts",
    "src/lib/server/user-behavior-truth-rollup.ts",
    "src/lib/admin-overview.ts",
    "src/lib/admin-analytics-live-runtime.ts",
    "src/lib/server/analytics-metrics.ts",
    "scripts/release/update-public-changelog.ts",
  ],
};

fs.writeFileSync(
  path.join(repoRoot, "agent/state/admin-truth-replacement.generated.json"),
  `${JSON.stringify(state, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error("Admin truth replacement validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin truth replacement validation passed.");
