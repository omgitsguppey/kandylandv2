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

function changedFiles() {
  try {
    return execSync("git diff --name-only HEAD", { cwd: root, encoding: "utf8" })
      .split(/\r?\n/u)
      .map((entry) => entry.trim().replace(/\\/gu, "/"))
      .filter(Boolean);
  } catch (error) {
    failures.push(`Unable to inspect git diff: ${(error as Error).message}`);
    return [];
  }
}

const packageJson = readRequired("package.json");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const promoContract = readRequired("src/lib/wallet/purchase-promo-contract.ts");
const report = readRequired("agent/state/payment-module-symmetry.generated.json");
const doc = readRequired("docs/agent-truth/payment-module-symmetry.md");
const packages = readRequired("src/lib/gumdrops-packages.ts");
const test = readRequired("tests/unit/payment-module-symmetry.spec.ts");
const currentChanges = changedFiles();
const paymentModuleEvidence = purchaseModal + report + promoContract;

if (packageJson && !JSON.parse(packageJson).scripts?.["check:payment-module-symmetry"]) {
  failures.push("package.json must expose check:payment-module-symmetry.");
}

for (const expected of [
  "function PurchasePackageRow",
  "function PurchasePromoBadge",
  "function PurchasePriceBlock",
  "function PurchaseModalHeader",
  "data-payment-module-density=\"compact-v2\"",
  "data-purchase-row-zone=\"icon\"",
  "data-purchase-row-zone=\"copy\"",
  "data-purchase-row-zone=\"price\"",
  "data-purchase-promo-slot=\"reserved\"",
  "Paid GD",
  "whitespace-nowrap",
  "max-w-[6.4rem]",
  "leading-none",
  "grid-cols-[2rem_minmax(0,1fr)_6.6rem]",
  "min-h-[3.45rem]",
  "mt-2 pt-1.5 pb-0.5 border-t",
  "style={{ layout: \"vertical\", color: \"white\", shape: \"pill\", label: \"paypal\", height: 45 }}",
  "fundingSource={FUNDING.PAYPAL}",
  "expectedDrops: selectedPackage.drops",
]) {
  requireIncludes(purchaseModal, expected, "PurchaseModal payment symmetry");
}

for (const expected of [
  "+50 bonus GD",
  "+100 bonus GD",
  "+500 bonus GD",
  "2x bonus GD",
]) {
  requireIncludes(paymentModuleEvidence, expected, "Payment module copy evidence");
}

for (const forbidden of [
  "GUMDROPS",
  "paid bonus GD",
  "paid bundle bonus",
  "Paid bundle bonus",
  "2x Bonus GD",
  "border-emerald",
  "bg-emerald",
  "text-emerald",
]) {
  requireNotIncludes(purchaseModal, forbidden, "PurchaseModal payment symmetry");
}

for (const expected of [
  "export type PurchasePromoKind",
  "\"bonus\"",
  "\"sale\"",
  "\"discount\"",
  "\"subscription\"",
  "\"best_value\"",
  "\"limited\"",
  "\"starter\"",
  "label",
  "tone",
  "priority",
  "compactLabel",
  "shouldShowOnMobile",
  "maxWidthClassName",
]) {
  requireIncludes(promoContract, expected, "Purchase promo display contract");
}

for (const expected of [
  "drops: 100, priceUsd: 1",
  "drops: 550, priceUsd: 5",
  "drops: 1100, priceUsd: 10",
  "drops: 2500, priceUsd: 20",
]) {
  requireIncludes(packages, expected, "GumDrop package pricing");
}

for (const expected of [
  "\"paymentRuntimeUntouched\": true",
  "\"walletCreditingUntouched\": true",
  "\"gumdropMathUntouched\": true",
  "\"pricingAndBonusAmountsUnchanged\": true",
  "Refined payment module copy, symmetry, and mobile density.",
  "Shortened GumDrop bonus labels for cleaner package rows.",
  "Kept PayPal, wallet crediting, pricing, and GumDrop math unchanged.",
]) {
  requireIncludes(report + doc, expected, "Payment module symmetry evidence");
}

for (const expected of [
  "src/app/api/paypal/create/route.ts",
  "src/app/api/paypal/capture/route.ts",
  "src/app/api/wallet/packages/route.ts",
  "src/lib/server/paypal.ts",
  "src/lib/gumdrop-ledger.ts",
  "src/lib/gumdrop-source-of-funds.ts",
  "src/lib/gumdrops-packages.ts",
]) {
  requireIncludes(test, expected, "Payment module symmetry test protected path list");
}

requireRegex(
  purchaseModal,
  /amount=\{pkgEconomics\.paidGumDrops\}[\s\S]*label=\{pkg\.label\}[\s\S]*price=\{pkg\.price\}[\s\S]*promo=\{resolvePurchaseBonusPromoOffer\(pkgEconomics\.bonusGumDrops\)\}/,
  "Fixed purchase package rows",
);
requireRegex(
  purchaseModal,
  /amount=\{deriveGumdropEconomics\(customDrops, \(customDrops \/ 1000\) \* 5\)\.paidGumDrops\}[\s\S]*label="King Size Bundle"[\s\S]*promo=\{resolveBundlePromoOffer\(customDrops >= 5000\)\}/,
  "Bundle purchase package row",
);

if (existsSync(join(root, "src/components/PurchaseModal.tsx.bak"))) {
  failures.push("src/components/PurchaseModal.tsx.bak must be removed or classified outside active source.");
}

const protectedRuntimePaths = [
  "src/app/api/paypal/create/route.ts",
  "src/app/api/paypal/capture/route.ts",
  "src/app/api/wallet/packages/route.ts",
  "src/lib/server/paypal.ts",
  "src/components/PayPalProvider.tsx",
  "src/lib/gumdrop-ledger.ts",
  "src/lib/gumdrop-source-of-funds.ts",
  "src/lib/gumdrop-economics.ts",
  "src/lib/gumdrops-packages.ts",
];
const protectedChanges = currentChanges.filter((entry) => protectedRuntimePaths.includes(entry));
if (protectedChanges.length > 0) {
  failures.push(`Protected payment/wallet/GumDrop runtime files changed: ${protectedChanges.join(", ")}`);
}

const chatOrNavChanges = currentChanges.filter((entry) =>
  /(^|\/)(Chat|chat|Navbar|TopNav|BottomNav|Navigation)(\/|\.|$)/u.test(entry)
  || /src\/components\/layout\/(TopNav|BottomNav)\.tsx/u.test(entry),
);
if (chatOrNavChanges.length > 0) {
  failures.push(`Chat/nav files changed in payment module symmetry pass: ${chatOrNavChanges.join(", ")}`);
}

if (failures.length > 0) {
  console.error("Payment module symmetry validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Payment module symmetry validator passed.");
