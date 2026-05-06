import { execSync } from "node:child_process";
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

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireRegex(source: string, pattern: RegExp, label: string) {
  if (!pattern.test(source)) {
    failures.push(`${label} must match ${pattern}.`);
  }
}

const packageJson = readRequired("package.json");
const ledger = readRequired("src/lib/gumdrop-ledger.ts");
const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
const checkinRoute = readRequired("src/app/api/checkin/route.ts");
const dailyTasks = readRequired("src/lib/server/daily-tasks.ts");
const onboardingRoute = readRequired("src/app/api/user/complete-onboarding/route.ts");
const registerRoute = readRequired("src/app/api/user/register/route.ts");
const adminBalanceRoute = readRequired("src/app/api/admin/balance/route.ts");
const creatorExperiences = readRequired("src/lib/server/creator-experiences.ts");
const chatServer = readRequired("src/lib/server/chat.ts");
const subscriptionsRoute = readRequired("src/app/api/creator/subscriptions/route.ts");
const requestsRoute = readRequired("src/app/api/creator/requests/route.ts");
const bookingsRoute = readRequired("src/app/api/creator/bookings/route.ts");
const dropsUnlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const packageCatalog = readRequired("src/lib/gumdrops-packages.ts");
const ledgerTest = readRequired("tests/unit/gumdrop-ledger.spec.ts");
const paypalTest = readRequired("tests/unit/paypal-capture-route.spec.ts");
const purchaseModalStaticTest = readRequired("tests/unit/purchase-modal-source-of-funds-static.spec.ts");
const paymentValidator = readRequired("scripts/agent/validate-payment-unlock-security.ts");
const paymentDoc = readRequired("docs/agent-truth/payment-wallet-unlock-entitlement.md");
const platformEconomyDoc = readRequired("docs/agent-truth/gumdrop-source-of-funds-truth.md");
const recentCommerceFeedHelper = readRequired("src/lib/admin-analytics-recent-commerce-feed.ts");
const deterministicTruth = readRequired("src/lib/deterministic-admin-truth.ts");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const agents = readRequired("AGENTS.md");
const readme = readRequired("README.md");

for (const expected of [
  "buildPaidPurchaseBalanceCredit",
  "purchasedCreditGumDrops: deliveredGumDrops",
  "rewardCreditGumDrops: 0",
  "purchaseBonusGumDrops: bonusGumDrops",
  "paid_purchase_including_bonus",
  "gumdropRewardTotal: isRewardTransaction ? positiveAmount : 0",
  "gumdropPurchaseBonusTotal",
]) {
  requireIncludes(ledger, expected, "GumDrop ledger source-of-funds helper");
}

for (const expected of [
  "buildPaidPurchaseBalanceCredit",
  "purchaseCredit.purchasedCreditGumDrops",
  "\"purchased\"",
  "purchaseBonusGumDrops",
  "purchasedBalanceCreditGumDrops",
  "rewardBalanceCreditGumDrops",
  "purchaseSourceClassification",
  "packageId",
  "sourceOfFundsBreakdown",
  "idempotencyKey",
  "orderId",
]) {
  requireIncludes(paypalCapture, expected, "PayPal capture purchase source credit");
}
requireNotIncludes(
  paypalCapture,
  "creditSourceAwareGumdrops(nextSourceAwareBalance, economics.bonusGumDrops, \"reward\")",
  "PayPal capture",
);

for (const [label, source] of [
  ["check-in rewards", checkinRoute],
  ["daily task rewards", dailyTasks],
  ["onboarding rewards", onboardingRoute],
  ["registration/referral rewards", registerRoute],
  ["admin reward adjustments", adminBalanceRoute],
] as const) {
  requireIncludes(source, "creditSourceAwareGumdrops", label);
  requireIncludes(source, "\"reward\"", label);
}

for (const expected of [
  "purchasedOnly: true",
  "spendCreatorExperienceGumdrops",
  "spendSourceAwareGumdrops(current, amount, {",
]) {
  requireIncludes(creatorExperiences, expected, "Creator paid-only spend policies");
}
for (const source of [chatServer, subscriptionsRoute, requestsRoute, bookingsRoute]) {
  requireIncludes(source, "purchasedAmountSpent", "Creator/chat spend route source metadata");
  requireIncludes(source, "rewardAmountSpent", "Creator/chat spend route source metadata");
}
requireIncludes(dropsUnlockRoute, "spendSourceAwareGumdrops(sourceAwareBalance, unlockCost)", "Normal Drop unlock route");
requireNotIncludes(dropsUnlockRoute, "purchasedOnly: true", "Normal Drop unlock route");

requireRegex(
  purchaseModal,
  /<span[^>]*>\{pkg\.drops\.toLocaleString\(\)\}<\/span>/,
  "PurchaseModal fixed package visible headline",
);
requireRegex(
  purchaseModal,
  /<span[^>]*>\{customDrops\.toLocaleString\(\)\}<\/span>/,
  "PurchaseModal custom package visible headline",
);
requireIncludes(purchaseModal, "selectedPackage.drops", "PurchaseModal delivered total checkout framing");
for (const expected of ["drops: 100", "drops: 550", "drops: 1100", "drops: 2500"]) {
  requireIncludes(packageCatalog, expected, "GumDrop package catalog delivered total framing");
}

for (const expected of [
  "credits paid purchase base and bonus GumDrops into purchased source",
  "credits paid purchase packages without bonuses into purchased source only",
  "keeps daily and task rewards in reward source only",
  "lets creator paid-only spend use paid-pack bonus",
  "gumdropRewardTotal).toBe(0)",
  "gumdropPurchaseBonusTotal).toBe(50)",
]) {
  requireIncludes(ledgerTest, expected, "GumDrop ledger source tests");
}
for (const expected of [
  "paid-pack bonus GumDrops into paid-source backend balance",
  "gumDropsPurchasedBalance: 550",
  "gumDropsRewardBalance: 0",
  "purchaseSourceClassification: \"paid_purchase_including_bonus\"",
]) {
  requireIncludes(paypalTest, expected, "PayPal capture source-aware tests");
}
for (const expected of [
  "keeps visible package headlines framed around delivered GumDrop totals",
  "pkg\\.drops\\.toLocaleString",
  "customDrops\\.toLocaleString",
  "expectedDrops: selectedPackage.drops",
]) {
  requireIncludes(purchaseModalStaticTest, expected, "PurchaseModal visible display guard test");
}
for (const expected of [
  "gumDropsPurchasedBalance: 550",
  "gumDropsRewardBalance: 0",
]) {
  requireIncludes(paymentValidator, expected, "Payment/unlock security validator");
}

const doctrineNote = "Paid package bonus GumDrops are paid-source GumDrops.";
for (const [label, source] of [
  ["README user manual", readme],
  ["AGENTS AI context", agents],
  ["payment wallet source truth doc", paymentDoc],
  ["platform economy source truth doc", platformEconomyDoc],
  ["repo memory ledger", repoLedger],
  ["file/function checklist", checklist],
  ["full audit ledger", fullAudit],
] as const) {
  requireIncludes(source, doctrineNote, label);
}
requireIncludes(packageJson, "\"check:gumdrop-source-of-funds-truth\"", "package scripts");
for (const expected of [
  "\"reward_free\"",
  "\"paid\"",
  "\"paid_bonus\"",
  "\"creator_spend\"",
  "\"drop_unwrap\"",
  "sourceOfFunds",
  "amountDisplay",
]) {
  requireIncludes(recentCommerceFeedHelper, expected, "Recent Commerce Feed source-of-funds display model");
}
for (const expected of [
  "calculateGumdropValueBasis",
  "paidSourceGdIssued",
  "averageUsdPer100PaidSourceGd",
  "floorState",
]) {
  requireIncludes(deterministicTruth, expected, "Deterministic GumDrops value-basis helper");
}

try {
  const walletDiff = execSync(
    "git diff --name-only -- src/components/PurchaseModal.tsx src/components/GlobalPurchaseModal.tsx src/components/Wallet src/app/api/wallet",
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (walletDiff.length > 0) {
    failures.push(`Wallet UI/package surfaces must remain unchanged for this source fix. Unexpected diff: ${walletDiff}`);
  }
} catch (error) {
  failures.push(`Unable to inspect wallet UI diff: ${(error as Error).message}`);
}

if (failures.length > 0) {
  console.error("GumDrop source-of-funds truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("GumDrop source-of-funds truth validation passed.");
