import { listValidatorScopeFiles } from "./validate-agent-takeover-safety-check";
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

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const walletFrame = readRequired("src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx");
const walletPackagePicker = readRequired("src/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker.tsx");
const walletCheckoutPanel = readRequired("src/components/creative-tim/kandydrops/wallet/KandyWalletCheckoutPanel.tsx");
const paymentModuleSymmetry = readRequired("agent/state/payment-module-symmetry.generated.json");
const formatter = readRequired("src/lib/gumdrop-formatting.ts");
const formatterTest = readRequired("tests/unit/lib/gumdrop-formatting.spec.ts");
const modalTest = readRequired("tests/unit/purchase-modal-density.spec.tsx");

if (packageJson.scripts?.["check:wallet-density"] !== "tsx scripts/agent/validate-wallet-density.ts") {
  failures.push("package.json must expose check:wallet-density.");
}

for (const expected of [
  "data-wallet-density=\"public-beta-compact\"",
  "data-wallet-balance-chip=\"split-source\"",
  "data-wallet-package-subcopy=\"removed\"",
  "data-wallet-bonus-chip-theme=\"brand-purple\"",
]) {
  requireIncludes(walletFrame, expected, "Canonical wallet modal frame density");
}

for (const expected of [
  "data-payment-module-density=\"compact-v2\"",
  "Reward balance",
  "Paid balance",
  "GumDrops",
  "data-purchase-row-zone=\"icon\"",
  "data-purchase-row-zone=\"copy\"",
  "data-purchase-row-zone=\"price\"",
  "data-purchase-promo-slot=\"reserved\"",
  "grid-cols-[2.75rem_minmax(0,1fr)]",
  "<Button",
  'variant="ghost"',
  "max-w-[7.6rem]",
]) {
  requireIncludes(walletPackagePicker, expected, "Canonical wallet package picker density");
}

for (const expected of [
  "data-wallet-purchase-path=\"three-stage\"",
  "data-wallet-purchase-slot=\"selection\"",
  "data-wallet-purchase-slot=\"review\"",
  "data-wallet-purchase-slot=\"provider\"",
]) {
  requireIncludes(walletCheckoutPanel, expected, "Canonical wallet checkout density");
}

for (const forbidden of [
  "Paid source:",
  "paid bonus GD",
  "Reward GumDrops stay separate.",
]) {
  requireNotIncludes(walletCheckoutPanel, forbidden, "Wallet checkout must not expose paid-source explanatory subcopy");
}

for (const expected of [
  "data-payment-module-density=\"compact-v2\"",
  "resolveWalletBalanceSplit(userProfile)",
  "formatCompactGd(walletBalanceSplit.freeGd)",
  "formatCompactGd(walletBalanceSplit.paidGd)",
]) {
  requireIncludes(purchaseModal, expected, "PurchaseModal compact wallet density");
}

for (const expected of [
  "+50 bonus GD",
  "+100 bonus GD",
  "+500 bonus GD",
  "2x bonus GD",
]) {
  requireIncludes(paymentModuleSymmetry, expected, "Payment module symmetry density evidence");
}

for (const forbidden of [
  "border-emerald",
  "bg-emerald",
  "text-emerald",
  "customBundleEconomics",
  "${pkgEconomics.paidGumDrops.toLocaleString()} paid +",
  "${pkgEconomics.paidGumDrops.toLocaleString()} paid GumDrops",
  "paid + ${pkgEconomics.bonusGumDrops.toLocaleString()} bonus GumDrops",
  "paid bonus GD",
  "paid bundle bonus",
  "Paid bundle bonus",
  "2x Bonus GD",
  "GUMDROPS",
]) {
  requireNotIncludes(purchaseModal, forbidden, "PurchaseModal package row display");
}

for (const expected of [
  "Checkout is unavailable right now.",
  "bg-secondary",
  "text-foreground",
  "package_paid_drops",
  "package_bonus_drops",
  "PayPalButtons",
  "wallet_density: \"public-beta-compact\"",
]) {
  requireIncludes(purchaseModal, expected, "PurchaseModal source and checkout preservation");
}

for (const expected of [
  "formatCompactGd",
  "resolveWalletBalanceSplit",
  "readSourceAwareBalance",
  "normalized >= 10000",
  "Math.round(thousands)",
]) {
  requireIncludes(formatter, expected, "Compact GumDrop formatter");
}

for (const expected of [
  "[999, \"999\"]",
  "[1000, \"1k\"]",
  "[1500, \"1.5k\"]",
  "[1900, \"1.9k\"]",
  "[2000, \"2k\"]",
  "[5000, \"5k\"]",
  "[80962, \"81k\"]",
  "uses explicit source-aware purchased and reward balances",
  "canonical legacy fallback",
]) {
  requireIncludes(formatterTest, expected, "Compact GumDrop formatter tests");
}

for (const expected of [
  "Wallet balance: 76k reward GD, 5k paid GD",
  "Wallet balance: 0 reward GD, 1.5k paid GD",
  "not.toMatch(/\\d+ paid \\+ \\d+ bonus GumDrops/)",
  "not.toContain(\"80,962 balance\")",
]) {
  requireIncludes(modalTest, expected, "PurchaseModal density tests");
}

const walletDialogOwner = readRequired("src/components/creative-tim/ui/dialog.tsx");
requireIncludes(walletFrame, 'import { Dialog, DialogContent, DialogTitle } from "@/components/creative-tim/ui/dialog"', "Wallet shared modal owner binding");
requireIncludes(walletFrame, "<DialogContent", "Wallet shared modal content binding");
requireIncludes(walletDialogOwner, "max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]", "Shared wallet modal viewport and safe areas");
requireIncludes(walletDialogOwner, "overflow-y-auto", "Shared wallet modal scroll owner");

try {
  const protectedPaths = ["src/lib/gumdrop-ledger.ts", "src/lib/gumdrop-economics.ts", "src/lib/gumdrops-packages.ts"];
  const forbiddenDiff = listValidatorScopeFiles(root).filter((file) =>
    protectedPaths.includes(file) || file.startsWith("src/app/api/paypal/") || file.startsWith("src/app/api/wallet/"),
  ).join("\n");
  if (forbiddenDiff.length > 0) {
    failures.push(`Wallet density pass must not modify ledger/economics/package/payment flow files. Unexpected diff: ${forbiddenDiff}`);
  }
} catch (error) {
  failures.push(`Unable to inspect protected wallet/payment diffs: ${(error as Error).message}`);
}

if (failures.length > 0) {
  console.error("Wallet density validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wallet density validation passed.");
