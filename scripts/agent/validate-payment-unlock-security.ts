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

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

const audit = parseJson("agent/state/payment-unlock-security-audit.generated.json");
const doc = readRequired("docs/agent-truth/payment-wallet-unlock-entitlement.md");
const packageJson = readRequired("package.json");
const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
const paypalCreate = readRequired("src/app/api/paypal/create/route.ts");
const paypalServer = readRequired("src/lib/server/paypal.ts");
const packages = readRequired("src/lib/gumdrops-packages.ts");
const economics = readRequired("src/lib/gumdrop-economics.ts");
const ledger = readRequired("src/lib/gumdrop-ledger.ts");
const unlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const contentRoute = readRequired("src/app/api/drops/content/route.ts");
const mediaAccessResolver = readRequired("src/lib/media/media-access-resolver.ts");
const adminBalance = readRequired("src/app/api/admin/balance/route.ts");
const requestGuard = readRequired("src/lib/server/request-guard.ts");
const requestOrigin = readRequired("src/lib/server/request-origin.ts");
const paypalTest = readRequired("tests/unit/paypal-capture-route.spec.ts");
const unlockTest = readRequired("tests/unit/drops-unlock-route.spec.ts");
const contentTest = readRequired("tests/unit/drops-content-route.spec.ts");
const adminBalanceTest = readRequired("tests/unit/admin-balance-route.spec.ts");
const ledgerTest = readRequired("tests/unit/gumdrop-ledger.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const expected of [
  "requireTrustedOrigin: true",
  "auth: \"user\"",
  "scopeToCaller: true",
  "resolveExpectedGumdropPrice",
  "paidAmountStr !== expectedPrice",
  "customId",
  "/^\\d+$/u",
  "capturedExpectedDrops !== expectedDrops",
  "paymentLocks",
  "existingLock.exists",
  "\"purchased\"",
  "rewardBalanceCreditGumDrops",
]) {
  requireIncludes(paypalCapture, expected, "PayPal capture route");
}

for (const expected of [
  "custom_id: `${input.userId}:${input.expectedDrops}`",
  "resolveExpectedGumdropPrice",
  "requireTrustedOrigin: true",
]) {
  requireIncludes(paypalCreate + paypalServer, expected, "PayPal create/order helpers");
}

for (const expected of [
  "FIXED_GUMDROP_PACKAGES",
  "resolveExpectedGumdropPrice",
  "isBundleGumdropAmount",
]) {
  requireIncludes(packages, expected, "Gum Drops package economics");
}

for (const expected of [
  "paidGumDrops",
  "bonusGumDrops",
  "grossRevenueCents",
  "bonusValueCents",
]) {
  requireIncludes(economics, expected, "Gum Drops economics");
}

for (const expected of [
  "input.type !== \"purchase_currency\"",
  "return 0",
  "type === \"admin_adjustment\"",
  "gumdropPurchaseBonusTotal",
]) {
  requireIncludes(ledger, expected, "Gum Drops ledger");
}

for (const expected of [
  "requireTrustedOrigin: true",
  "auth: \"user\"",
  "adminDb.runTransaction",
  "unlockedContent.has(dropId)",
  "spendSourceAwareGumdrops",
  "FieldValue.arrayUnion(dropId)",
  "purchasedAmountSpent",
  "rewardAmountSpent",
]) {
  requireIncludes(unlockRoute, expected, "Drop unlock route");
}

for (const expected of [
  "requireTrustedOrigin: true",
  "auth: \"user\"",
  "ownsDrop",
  "hasUnlockedDrop",
  "buildMediaAccessDeniedResponse(accessDecision)",
  "Cache-Control\", \"private, no-store\"",
]) {
  requireIncludes(contentRoute, expected, "Secure drop content route");
}
requireIncludes(
  mediaAccessResolver,
  'purchase_required: "This media requires an unlock before viewing."',
  "Canonical media access denial copy",
);

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "adjustedByUid",
  "adjustmentReason",
  "adjustmentSource",
  "auditedServerSide",
]) {
  requireIncludes(adminBalance, expected, "Admin balance route");
}

for (const expected of [
  "hasTrustedSiteOrigin",
  "Untrusted origin",
  "origin",
  "referer",
]) {
  requireIncludes(requestGuard + requestOrigin, expected, "Trusted-origin guard");
}

for (const expected of [
  "missing the server-created custom id",
  "does not match the requested package",
  "gumDropsPurchasedBalance: 550",
  "gumDropsRewardBalance: 0",
]) {
  requireIncludes(paypalTest, expected, "PayPal capture tests");
}

for (const expected of [
  "source-aware spend metadata",
  "already unlocked without writing another deduction",
  "purchasedAmountSpent: 1",
  "rewardAmountSpent: 6",
]) {
  requireIncludes(unlockTest, expected, "Drop unlock tests");
}

for (const expected of [
  "blocks locked content",
  "unlocked the drop",
  "drop creator as entitled",
]) {
  requireIncludes(contentTest, expected, "Secure content tests");
}

for (const expected of [
  "adjustedByUid",
  "adjustmentReason",
  "auditedServerSide",
]) {
  requireIncludes(adminBalanceTest, expected, "Admin balance tests");
}

for (const expected of [
  "does not count admin adjustments or reward credits as revenue purchases",
  "getTransactionRevenueCents",
]) {
  requireIncludes(ledgerTest, expected, "Ledger revenue tests");
}

for (const expected of [
  "payment-unlock-security-audit.generated.json",
  "payment-wallet-unlock-entitlement.md",
  "PayPal capture identity binding",
  "creator entitlement",
]) {
  requireIncludes(doc + JSON.stringify(audit), expected, "Payment/unlock audit and doctrine");
}

for (const expected of [
  "check:payment-unlock-security",
  "scripts/agent/validate-payment-unlock-security.ts",
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const expected of [
  "Payment Wallet Unlock Entitlement Launch Hardening",
  "PayPal capture identity binding",
  "payment-unlock-security-audit.generated.json",
]) {
  requireIncludes(auditLedger, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}

requireIncludes(repoLedger, "Payment wallet unlock entitlement", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Payment Wallet Unlock Entitlement", "EVERY_FILE_FUNCTION_CHECKLIST.md");

const surfaces = requireArray(audit.surfaces, "audit.surfaces", 6);
const expectedSurfaceKeys = [
  "paypal-create-order",
  "paypal-capture",
  "wallet-packages",
  "drop-unlock",
  "drop-content-entitlement",
  "admin-balance-adjustment",
  "gumdrop-ledger-revenue",
];
for (const key of expectedSurfaceKeys) {
  if (!surfaces.some((surface) => surface && typeof surface === "object" && (surface as Record<string, unknown>).key === key)) {
    failures.push(`audit.surfaces must include ${key}.`);
  }
}

if (failures.length > 0) {
  console.error("Payment/unlock security validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Payment/unlock security validation passed.");
