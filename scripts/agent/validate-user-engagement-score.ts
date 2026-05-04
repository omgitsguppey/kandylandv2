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

const engagementHelper = read("src/lib/behavioral/user-engagement-score.ts");
const behaviorRollupContract = read("src/lib/user-behavior-rollup-contract.ts");
const behaviorRollupHelper = read("src/lib/server/user-behavior-rollup.ts");
const usersRoute = read("src/app/api/admin/users/route.ts");
const userDetailRoute = read("src/app/api/admin/user/[userId]/route.ts");
const usersPage = read("src/app/admin/users/page.tsx");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const adminTypes = read("src/types/admin-analytics.ts");

const failures: string[] = [];

[
  "export function logNorm(",
  "export function recencyDecay(",
  "normalizedActionCount7d",
  "unwrappedCount30d",
  "validWatchMinutes30d",
  "purchaseCount90d",
  "activeDays7d",
  "freeGdEarned30d",
  "0.12 * breakdown.actionComponent",
  "0.23 * breakdown.unwrapComponent",
  "0.23 * breakdown.watchComponent",
  "0.20 * breakdown.purchaseComponent",
  "0.14 * breakdown.returnComponent",
  "0.08 * breakdown.freeIntentComponent",
  "\"dormant\"",
  "\"light\"",
  "\"active\"",
  "\"engaged\"",
  "\"power\"",
  "topReasons",
].forEach((fragment) => {
  assert(engagementHelper.includes(fragment), `User engagement helper is missing ${fragment}.`, failures);
});

assert(behaviorRollupContract.includes("engagement: UserEngagementScoreResult;"), "User behavior rollup contract must carry the canonical engagement result.", failures);
assert(behaviorRollupHelper.includes("engagementInput"), "User behavior rollup helper must accept canonical engagement input.", failures);
assert(behaviorRollupHelper.includes("computeUserEngagementScore"), "User behavior rollup helper must compute the canonical engagement score.", failures);

assert(usersRoute.includes("buildUserEngagementScoreInputFromActivityDays"), "Admin users route must derive engagement from bounded activity windows.", failures);
assert(usersRoute.includes("engagementScore: engagement.score"), "Admin users route must expose the canonical engagement score.", failures);
assert(usersRoute.includes("engagement,"), "Admin users route must expose the canonical engagement object.", failures);
assert(userDetailRoute.includes("buildUserEngagementScoreInputFromActivityDays"), "Admin user detail route must derive engagement from bounded activity windows.", failures);
assert(userDetailRoute.includes("engagementScore: engagement.score"), "Admin user detail route must expose the canonical engagement score.", failures);
assert(userDetailRoute.includes("engagement,"), "Admin user detail route must expose the canonical engagement object.", failures);

assert(adminTypes.includes("engagement?: UserEngagementScoreResult;"), "Admin analytics types must include the canonical engagement object.", failures);
assert(adminTypes.includes("returnedInLast7Days?: number;"), "Admin analytics summary types must expose the renamed returned-in-last-7-days field.", failures);

assert(usersPage.includes('title: "Returned in last 7 days"'), "User Management must rename the returner stat card.", failures);
assert(usersPage.includes("logged in, visited, or tracked"), "User Management must explain the returned-in-last-7-days rule.", failures);
assert(usersPage.includes("engagement?.verdict"), "User Management must show engagement verdicts by default.", failures);
assert(usersPage.includes("engagement?.topReasons?.[0]?.summary"), "User Management top tracked cards must surface an engagement reason summary.", failures);
assert(!usersPage.includes('title: "Returners"'), "Legacy Returners stat label must be removed from User Management.", failures);

assert(userDetailPage.includes('label: "Engagement"'), "User detail summary must expose the engagement verdict card.", failures);
assert(userDetailPage.includes("Engagement verdict"), "User detail must render the engagement verdict block.", failures);
assert(userDetailPage.includes("(engagement?.topReasons ?? []).slice(0, 3)"), "User detail must surface the top three engagement reasons.", failures);
assert(userDetailPage.includes("engagement?.verdict"), "User detail must show the engagement verdict by default.", failures);

if (failures.length > 0) {
  console.error("User engagement score validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User engagement score validation passed.");
