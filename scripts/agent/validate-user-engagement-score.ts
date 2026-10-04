import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { readSourceAst, findSourceFunction, someSourceNode, sourceExpressionIs, hasRenderedExpression, getReturnedLiteralRecord, literalRecordProperty, readBehavioralAdminConsumers, readActiveEngagementCalibration } from "./validate-behavioral-truth-source";

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

const { usersRender, hasDirectoryVerdict, hasDetailVerdict, hasDetailReasons, verdictRender, explanationAst } = readBehavioralAdminConsumers();

[
  "export { logNorm };",
  "export function recencyDecay(",
  "normalizedActionCount7d",
  "unwrappedCount30d",
  "validWatchMinutes30d",
  "purchaseCount90d",
  "activeDays7d",
  "freeGdEarned30d",
  "computeEngagementScoreFromSignals",
  "\"dormant\"",
  "\"light\"",
  "\"active\"",
  "\"engaged\"",
  "\"power\"",
  "topReasons",
].forEach((fragment) => {
  assert(engagementHelper.includes(fragment), `User engagement helper is missing ${fragment}.`, failures);
});

const calibrationControls = readActiveEngagementCalibration();
for (const control of calibrationControls.signals) assert(control.pass, "Canonical engagement weight and active signal binding must agree for " + control.signal + ".", failures);
assert(calibrationControls.usesCanonicalOwner, "Engagement must call the existing canonical calibration owner.", failures);

const rollupAst = readSourceAst("src/lib/user-behavior-rollup-contract.ts");
assert(someSourceNode(rollupAst, node => ts.isTypeAliasDeclaration(node) && node.name.text === "UserBehaviorEngagementScore" && someSourceNode(node.type, child => ts.isTypeReferenceNode(child) && child.typeName.getText() === "UserEngagementScoreResult"))
  && someSourceNode(rollupAst, node => ts.isPropertySignature(node) && node.name.getText() === "engagement" && node.type?.getText() === "UserBehaviorEngagementScore"), "User behavior rollup contract must retain its canonical engagement result plus truth posture.", failures);
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

const returnCard = getReturnedLiteralRecord(readSourceAst("src/app/api/admin/users/route.ts"), "buildAdminUsersKpiCards", "id", "returned_7d");
assert(literalRecordProperty(returnCard, "label") === "Returned in last 7 days" && literalRecordProperty(returnCard, "scope") === "rolling_7d", "The canonical returned_7d producer must show its seven-day window.", failures);
assert(/logged in, visited, or .*tracked activity in the last 7 days/i.test(literalRecordProperty(returnCard, "explanation") ?? ""), "The canonical return card must explain its qualifying tracked activity.", failures);
assert(hasDirectoryVerdict("engagement"), "The rendered User Management directory must show the canonical engagement verdict first.", failures);
// The old top-tracked cards were retired in favor of the canonical paged score leaderboard.
// Directory verdicts and Detail reasons remain required at their current rendered owners.

assert(userDetailPage.includes('label: "Engagement"'), "User detail summary must expose the engagement verdict card.", failures);
assert(userDetailPage.includes("Engagement verdict"), "User detail must render the engagement verdict block.", failures);
assert(hasDetailVerdict("engagement") && hasDetailReasons("engagement"), "User detail must render the canonical engagement verdict and top three reasons through its shared Card.", failures);
assert(hasDetailVerdict("engagement"), "User detail must show the canonical engagement verdict by default.", failures);

if (failures.length > 0) {
  console.error("User engagement score validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User engagement score validation passed.");
