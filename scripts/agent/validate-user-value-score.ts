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

const valueHelper = read("src/lib/behavioral/user-value-score.ts");
const behaviorRollupContract = read("src/lib/user-behavior-rollup-contract.ts");
const behaviorRollupHelper = read("src/lib/server/user-behavior-rollup.ts");
const usersRoute = read("src/app/api/admin/users/route.ts");
const userDetailRoute = read("src/app/api/admin/user/[userId]/route.ts");
const usersPage = read("src/app/admin/users/page.tsx");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const adminTypes = read("src/types/admin-analytics.ts");

const failures: string[] = [];

[
  "totalSpendUsd",
  "purchaseCount",
  "paidGdPurchased",
  "bonusGdDelivered",
  "rewardGdEarned",
  "unwrapsAfterPurchase",
  "daysSinceLastPurchase",
  "repeatPurchaseLikelihood",
  "freeToPaidSignal",
  "valueScore",
  "valueTier",
  "spendComponent: logNorm(normalizedInput.totalSpendUsd, 500)",
  "purchaseCountComponent: logNorm(normalizedInput.purchaseCount, 20)",
  "recencyComponent: hasNoPurchase ? 0 : recencyDecay(",
  "postPurchaseUsageComponent: logNorm(normalizedInput.unwrapsAfterPurchase, 50)",
  "freeConversionComponent: clampUnit(Math.min(1, normalizedInput.freeGdEarned30d / 500) * (hasNoPurchase ? 1 : 0.4))",
  "0.45 * breakdown.spendComponent",
  "0.25 * breakdown.purchaseCountComponent",
  "0.12 * breakdown.recencyComponent",
  "0.10 * breakdown.postPurchaseUsageComponent",
  "0.08 * breakdown.freeConversionComponent",
  "\"observer\"",
  "\"warm\"",
  "\"buyer\"",
  "\"repeat_buyer\"",
  "\"VIP\"",
].forEach((fragment) => {
  assert(valueHelper.includes(fragment), `User value helper is missing ${fragment}.`, failures);
});

assert(behaviorRollupContract.includes("value: UserValueScoreResult;"), "User behavior rollup contract must carry the canonical value result.", failures);
assert(behaviorRollupHelper.includes("valueInput"), "User behavior rollup helper must accept canonical value input.", failures);
assert(behaviorRollupHelper.includes("computeUserValueScore"), "User behavior rollup helper must compute the canonical value score.", failures);

assert(usersRoute.includes("buildUserValueScoreInputFromActivityDays"), "Admin users route must derive value from bounded activity windows.", failures);
assert(usersRoute.includes("valueScore: value.valueScore"), "Admin users route must expose the canonical value score.", failures);
assert(usersRoute.includes("value,"), "Admin users route must expose the canonical value object.", failures);
assert(userDetailRoute.includes("buildUserValueScoreInputFromActivityDays"), "Admin user detail route must derive value from bounded activity windows.", failures);
assert(userDetailRoute.includes("valueScore: value.valueScore"), "Admin user detail route must expose the canonical value score.", failures);
assert(userDetailRoute.includes("value,"), "Admin user detail route must expose the canonical value object.", failures);

assert(adminTypes.includes("value?: UserValueScoreResult;"), "Admin analytics types must include the canonical value object.", failures);
assert(adminTypes.includes("valueScore?: number;"), "Admin analytics types must include the canonical value score.", failures);

assert(usersPage.includes("Value {value?.verdict || \"Observer\"}"), "User Management top tracked cards must surface the value verdict.", failures);
assert(usersPage.includes("value?.valueScore ?? 0"), "User Management cards must surface the canonical value score.", failures);
assert(userDetailPage.includes("Value verdict"), "User detail must render the value verdict block.", failures);
assert(userDetailPage.includes("Bonus GD stays separate from cash revenue."), "User detail must state that bonus GD is not cash revenue.", failures);
assert(userDetailPage.includes("(value?.topReasons ?? []).slice(0, 3)"), "User detail must surface the top three value reasons.", failures);

if (failures.length > 0) {
  console.error("User value score validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User value score validation passed.");
