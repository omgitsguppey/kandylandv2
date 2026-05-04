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
  "formatCompactGd(walletBalanceSplit.freeGd)} free GD",
  "formatCompactGd(walletBalanceSplit.paidGd)} paid GD",
  "aria-hidden=\"true\">|</span>",
  "resolveWalletBalanceSplit(userProfile)",
]) {
  requireIncludes(purchaseModal, expected, "PurchaseModal compact wallet density");
}

for (const forbidden of [
  "border-emerald",
  "bg-emerald",
  "text-emerald",
  "customBundleEconomics",
  "${pkgEconomics.paidGumDrops.toLocaleString()} paid +",
  "${pkgEconomics.paidGumDrops.toLocaleString()} paid GumDrops",
  "paid + ${pkgEconomics.bonusGumDrops.toLocaleString()} bonus GumDrops",
]) {
  requireNotIncludes(purchaseModal, forbidden, "PurchaseModal package row display");
}

for (const expected of [
  "border-brand-purple/30",
  "bg-brand-purple/15",
  "text-[#d7c4ff]",
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
  "76k free GD",
  "5k paid GD",
  "76k free GD\\s*\\|\\s*5k paid GD",
  "1.5k paid GD",
  "not.toMatch(/\\d+ paid \\+ \\d+ bonus GumDrops/)",
  "not.toContain(\"80,962 balance\")",
]) {
  requireIncludes(modalTest, expected, "PurchaseModal density tests");
}

requireRegex(
  purchaseModal,
  /className="relative w-full max-w-md[^"]*p-4 sm:p-5 md:p-6/,
  "PurchaseModal mobile shell padding",
);
requireIncludes(
  purchaseModal,
  "\"relative flex items-center justify-between rounded-xl border px-3 py-2.5 w-full transition-all text-left\"",
  "PurchaseModal compact package row padding",
);

try {
  const forbiddenDiff = execSync(
    "git diff --name-only -- src/lib/gumdrop-ledger.ts src/lib/gumdrop-economics.ts src/lib/gumdrops-packages.ts src/app/api/paypal src/app/api/wallet",
    { cwd: root, encoding: "utf8" },
  ).trim();
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
