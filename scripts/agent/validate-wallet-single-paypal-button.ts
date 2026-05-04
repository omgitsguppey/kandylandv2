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

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const paypalProvider = readRequired("src/components/PayPalProvider.tsx");
const paypalCreate = readRequired("src/app/api/paypal/create/route.ts");
const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
const modalTest = readRequired("tests/unit/purchase-modal-density.spec.tsx");
const paymentDoc = readRequired("docs/agent-truth/payment-wallet-unlock-entitlement.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const repoMemory = readRequired("REPO_MEMORY_LEDGER.md");

if (packageJson.scripts?.["check:wallet-single-paypal-button"] !== "tsx scripts/agent/validate-wallet-single-paypal-button.ts") {
  failures.push("package.json must expose check:wallet-single-paypal-button.");
}

for (const expected of [
  "import { FUNDING, PayPalButtons, usePayPalScriptReducer } from \"@paypal/react-paypal-js\"",
  "fundingSource={FUNDING.PAYPAL}",
  "style={{ layout: \"vertical\", color: \"white\", shape: \"pill\", label: \"paypal\", height: 45 }}",
  "forceReRender={[selectedPriceKey, String(selectedPackage.drops), selectedPackage.label]}",
  "createOrder={async () =>",
  "onApprove={async (data) =>",
  "onError={(err) =>",
  "expectedDrops: selectedPackage.drops",
]) {
  requireIncludes(purchaseModal, expected, "PurchaseModal PayPal single-button checkout");
}

for (const expected of [
  "data-wallet-paypal-render-mode=\"single-funding-source\"",
  "data-wallet-paypal-funding-source=\"paypal\"",
  "data-wallet-paypal-buttons-visible=\"1\"",
  "data-wallet-checkout-density=\"single-button\"",
  "data-wallet-density=\"public-beta-compact\"",
  "h-[45px] w-full bg-white/10 rounded-full animate-pulse",
  "max-h-[58px]",
]) {
  requireIncludes(purchaseModal, expected, "PurchaseModal compact checkout markers");
}

for (const expected of [
  "stage: \"paypal_single_button_render\"",
  "fundingSource: \"paypal\"",
  "packageLabel: selectedPackage.label",
  "packageDrops: selectedPackage.drops",
  "packagePrice: selectedPackage.price",
]) {
  requireIncludes(purchaseModal, expected, "PayPal single-button render fallback reporting");
}

for (const expected of [
  "wallet_opened",
  "purchase_package_selected",
  "begin_checkout",
  "purchase",
  "gumdrops_purchase_completed",
  "gumdrops_purchase_failed",
  "wallet_closed_incomplete",
  "package_paid_drops",
  "package_bonus_drops",
  "startTimedFlow(CHECKOUT_FLOW_KEY",
  "consumeTimedFlow(CHECKOUT_FLOW_KEY",
]) {
  requireIncludes(purchaseModal, expected, "Wallet telemetry and timed checkout flow");
}

for (const expected of [
  "disableFunding: \"card,credit,paylater,venmo\"",
  "PayPalScriptProvider options={initialOptions}",
]) {
  requireIncludes(paypalProvider, expected, "Shared PayPal provider options");
}

for (const forbidden of [
  "Pay Later",
  "Debit or Credit Card",
  "FUNDING.PAYLATER",
  "FUNDING.CARD",
  "fundingSource={FUNDING.PAYLATER}",
  "fundingSource={FUNDING.CARD}",
  "shape: \"rect\", label: \"pay\", height: 48",
]) {
  requireNotIncludes(purchaseModal, forbidden, "PurchaseModal must not expose stacked PayPal funding copy/config");
}

requireRegex(
  purchaseModal,
  /<PayPalButtons[\s\S]*fundingSource=\{FUNDING\.PAYPAL\}[\s\S]*createOrder=\{async \(\) =>[\s\S]*onApprove=\{async \(data\) =>[\s\S]*onError=\{\(err\) =>/,
  "PayPalButtons must keep PayPal-only funding source plus create/approve/error callbacks",
);

const cssHidePatterns = [
  /paypal[^"\n]*(display:\s*none|visibility:\s*hidden|opacity:\s*0)/i,
  /iframe[^"\n]*(display:\s*none|visibility:\s*hidden|opacity:\s*0)/i,
  /querySelector(All)?\([^)]*paypal/i,
  /\.style\.(display|visibility|opacity)\s*=/i,
];

for (const pattern of cssHidePatterns) {
  if (pattern.test(purchaseModal + paypalProvider)) {
    failures.push(`Wallet PayPal checkout must not CSS-hide PayPal iframe/buttons. Matched ${pattern}.`);
  }
}

for (const expected of [
  "guardApiRequest",
  "requireTrustedOrigin: true",
  "resolveExpectedGumdropPrice",
]) {
  requireIncludes(paypalCreate, expected, "PayPal create route safety");
}

for (const expected of [
  "guardApiRequest",
  "requireTrustedOrigin: true",
  "paymentLocks",
  "buildPaidPurchaseBalanceCredit",
  "purchaseCredit.purchasedCreditGumDrops",
]) {
  requireIncludes(paypalCapture, expected, "PayPal capture route safety and source-of-funds truth");
}

for (const expected of [
  "FUNDING: { PAYPAL: \"paypal\" }",
  "mockState.paypalButtonsProps",
  "fundingSource).toBe(\"paypal\")",
  "createOrder).toEqual(expect.any(Function))",
  "onApprove).toEqual(expect.any(Function))",
  "onError).toEqual(expect.any(Function))",
  "forceReRender).toEqual([\"5.00\", \"550\", \"Sweet Pack\"])",
  "forceReRender).toEqual([\"1.00\", \"100\", \"Sugar Rush Pack\"])",
  "not.toMatch(/Pay Later|Debit or Credit Card|Credit Card/)",
]) {
  requireIncludes(modalTest, expected, "PurchaseModal single PayPal button tests");
}

for (const expected of [
  "Wallet v1 renders one PayPal checkout button on-page",
  "does not CSS-hide PayPal iframes or buttons",
  "Funding-source visibility is controlled through PayPal SDK configuration or PayPalButtons fundingSource",
  "PayPal may still offer eligible funding methods after buyer enters PayPal",
]) {
  requireIncludes(paymentDoc + readme + agents + repoMemory, expected, "Wallet single PayPal button doctrine docs");
}

try {
  const forbiddenDiff = execSync(
    "git diff --name-only -- src/app/api/paypal/create/route.ts src/app/api/paypal/capture/route.ts src/lib/gumdrop-ledger.ts src/lib/gumdrop-economics.ts src/lib/gumdrops-packages.ts",
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (forbiddenDiff.length > 0) {
    failures.push(`Wallet single-button pass must not modify payment API/economy/source-of-funds files. Unexpected diff: ${forbiddenDiff}`);
  }
} catch (error) {
  failures.push(`Unable to inspect protected payment/economy diffs: ${(error as Error).message}`);
}

if (failures.length > 0) {
  console.error("Wallet single PayPal button validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wallet single PayPal button validation passed.");
