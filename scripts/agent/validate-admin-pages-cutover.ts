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
  packageJson: read("package.json"),
  contract: read("src/lib/admin/admin-page-data-contract.ts"),
  loader: read("src/lib/server/admin-page-data-loader.ts"),
  overviewPage: read("src/app/admin/page.tsx"),
  usersPage: read("src/app/admin/users/page.tsx"),
  userPage: read("src/app/admin/user/[userId]/page.tsx"),
  overviewRoute: read("src/app/api/admin/overview/route.ts"),
  usersRoute: read("src/app/api/admin/users/route.ts"),
  userRoute: read("src/app/api/admin/user/[userId]/route.ts"),
  overviewContract: read("src/lib/admin-overview.ts"),
  analyticsContracts: read("src/lib/admin-analytics-contracts.ts"),
  analyticsPage: read("src/app/admin/analytics/page.tsx"),
  analyticsHelpers: read("src/app/admin/analytics/AnalyticsHelpers.tsx"),
  analyticsState: read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
  analyticsAudienceTab: read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx"),
  analyticsCommerceTab: read("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx"),
  analyticsOperationsTab: read("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
};

const failures: string[] = [];

assert(files.packageJson.includes('"check:admin-pages-cutover"'), "package.json must expose check:admin-pages-cutover.", failures);
assert(files.contract.includes("AdminOverviewPageData") && files.contract.includes("AdminUserDetailPageData"), "Admin page data contract must define overview and per-user page types.", failures);
assert(files.loader.includes("buildAdminOverviewPageData") && files.loader.includes("buildAdminUsersPageData") && files.loader.includes("buildAdminUserDetailPageData"), "Admin page data loader must expose the canonical page builders.", failures);
assert(files.overviewContract.includes("truthSnapshot?: AdminUserTruthSnapshot"), "Admin overview response must expose the canonical truth snapshot.", failures);
assert(files.overviewRoute.includes("truthSnapshot: userTruthSnapshot"), "Admin overview route must return the canonical truth snapshot.", failures);
assert(files.usersRoute.includes("truthSnapshot"), "Admin users route must include the canonical truth snapshot in the summary payload.", failures);
assert(files.userRoute.includes("behaviorTruthRollup"), "Per-user route must return the canonical behavior truth rollup.", failures);

assert(files.overviewPage.includes("buildAdminOverviewPageData"), "Admin Overview page must use the shared page-data loader.", failures);
assert(files.overviewPage.includes("pageData.truthLabel") && files.overviewPage.includes("pageData.platformPulse"), "Admin Overview page must read truth labels and metrics from pageData.", failures);
assert(!files.overviewPage.includes("const serverUpdateLabel ="), "Admin Overview page must not define server-update truth inline.", failures);
assert(!files.overviewPage.includes("const truthLabel ="), "Admin Overview page must not define truth labels inline.", failures);

assert(files.usersPage.includes("buildAdminUsersPageData"), "User Management page must use the shared page-data loader.", failures);
assert(
  (files.usersPage.includes("pageData.kpiCards") || files.usersPage.includes("(summary?.kpiCards ?? []).map"))
    && files.usersPage.includes("pageData.subtitle"),
  "User Management page must render shared KPI cards and subtitle from canonical page data or summary contract.",
  failures,
);
assert(files.usersPage.includes("summary?.truthSnapshot") || files.usersPage.includes("pageData.truthSnapshot"), "User Management page must remain anchored to the canonical truth snapshot.", failures);

assert(files.userPage.includes("buildAdminUserDetailPageData"), "Per-user page must use the shared page-data loader.", failures);
assert(files.userPage.includes("pageData.commerce") && files.userPage.includes("pageData.behavior"), "Per-user page must consume canonical commerce and behavior page data.", failures);
assert(files.userPage.includes("behaviorTruthRollup"), "Per-user page must render the canonical behavior truth rollup.", failures);
for (const inlineFormula of [
  "const purchaseTransactions =",
  "purchaseTransactions.reduce(",
  "const totalSpentUsd =",
  "const adjustedProfitUsd =",
  "const bonusValueUsd =",
  "const bonusGumDrops =",
  "const paypalFeeUsd =",
  "const netRevenueUsd =",
  "const deliveredGumDrops =",
  "const effectiveUsdPer100Gd =",
  "const averageOrderUsd =",
]) {
  assert(!files.userPage.includes(inlineFormula), `Per-user page must not compute business metrics inline: ${inlineFormula}`, failures);
}

assert(files.analyticsContracts.includes("ADMIN_ANALYTICS_MODULE_CONTRACT_REGISTRY"), "Analytics contract registry must remain canonical.", failures);
assert(
  files.analyticsState.includes("resolveAdminAnalyticsDisplayState") && files.analyticsState.includes("resolveAdminAnalyticsWaitingCopy"),
  "Analytics state must use the shared analytics contract helpers.",
  failures,
);
assert(files.analyticsPage.includes("useAdminAnalyticsState"), "Analytics page must render through the shared analytics state.", failures);
for (const [label, source] of [
  ["Analytics helpers", files.analyticsHelpers],
  ["Audience tab", files.analyticsAudienceTab],
  ["Commerce tab", files.analyticsCommerceTab],
  ["Operations tab", files.analyticsOperationsTab],
] as const) {
  assert(!source.includes("const conversionRate ="), `${label} must not define conversion formulas inline.`, failures);
  assert(!source.includes("const returnedUsers ="), `${label} must not define returner formulas inline.`, failures);
  assert(!source.includes("const watchTime"), `${label} must not define watch-time truth inline.`, failures);
  assert(
    source.includes("resolveAdminAnalytics") || source.includes("buildAnalyticsTruthBadge") || label === "Analytics helpers",
    `${label} must consume registered analytics contract helpers.`,
    failures,
  );
}

if (failures.length > 0) {
  console.error("Admin pages cutover validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin pages cutover validation passed.");
