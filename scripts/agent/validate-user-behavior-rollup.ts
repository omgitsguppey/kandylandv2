import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const contract = readFileSync(join(repoRoot, "src/lib/user-behavior-rollup-contract.ts"), "utf8");
const helper = readFileSync(join(repoRoot, "src/lib/server/user-behavior-rollup.ts"), "utf8");
const usersRoute = readFileSync(join(repoRoot, "src/app/api/admin/users/route.ts"), "utf8");
const userDetailRoute = readFileSync(join(repoRoot, "src/app/api/admin/user/[userId]/route.ts"), "utf8");
const usersPage = readFileSync(join(repoRoot, "src/app/admin/users/page.tsx"), "utf8");
const userDetailPage = readFileSync(join(repoRoot, "src/app/admin/user/[userId]/page.tsx"), "utf8");
const analyticsTypes = readFileSync(join(repoRoot, "src/types/admin-analytics.ts"), "utf8");

const failures: string[] = [];

function requireIncludes(source: string, needle: string, message: string) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

[
  "userId",
  "totalActions",
  "views",
  "unwraps",
  "watchTimeMs",
  "purchasesCount",
  "revenueUsd",
  "paidGdPurchased",
  "rewardGdEarned",
  "onboardingCompleted",
  "authEvents",
  "pushEnabled",
  "lastSeenAt",
  "confidence",
  "source",
  "issues",
].forEach((field) => {
  requireIncludes(contract, field, `User behavior rollup contract must expose ${field}.`);
});

requireIncludes(helper, "watch_time_missing_despite_views", "Rollup helper must issue missing watch time when views exist.");
requireIncludes(helper, "missing_auth_stats_for_onboarded_user", "Rollup helper must issue missing auth stats for onboarded users.");
requireIncludes(helper, "commerce_source_missing", "Rollup helper must flag commerce source gaps.");
requireIncludes(helper, "source_degraded", "Rollup helper must preserve source degradation issues.");

requireIncludes(analyticsTypes, "behaviorRollup?: UserBehaviorRollup", "UserAnalytics must expose behaviorRollup.");
requireIncludes(usersRoute, "buildUserBehaviorRollup", "Admin users API must build canonical behavior rollups.");
requireIncludes(userDetailRoute, "buildUserBehaviorRollup", "Admin user detail API must build canonical behavior rollups.");
requireIncludes(usersPage, "behaviorRollup", "User Management cards must render canonical behavior rollups.");
requireIncludes(userDetailPage, "behaviorRollup", "Admin user detail page must render canonical behavior rollups.");
requireIncludes(usersPage, "data-user-behavior-rollup-source", "User Management cards must expose rollup source truth.");
requireIncludes(userDetailPage, "data-user-behavior-rollup-source", "User detail page must expose rollup source truth.");
requireIncludes(usersPage, "data-user-behavior-rollup-confidence", "User Management cards must expose rollup confidence truth.");
requireIncludes(userDetailPage, "data-user-behavior-rollup-confidence", "User detail page must expose rollup confidence truth.");

if (helper.includes("confidence: \"high\"") && helper.includes("source === \"unavailable\"")) {
  failures.push("Unavailable rollup sources must not be marked high confidence.");
}

if (failures.length > 0) {
  console.error("User behavior rollup validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User behavior rollup validation passed.");
