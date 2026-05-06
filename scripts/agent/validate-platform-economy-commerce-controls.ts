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

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const consoleView = readRequired("src/app/admin/economy/components/PlatformEconomyConsole.tsx");
const contract = readRequired("src/lib/platform-economy.ts");
const helper = readRequired("src/lib/server/platform-economy.ts");
const mutations = readRequired("src/lib/server/platform-economy-mutations.ts");
const packagesRoute = readRequired("src/app/api/admin/economy/packages/route.ts");
const promosRoute = readRequired("src/app/api/admin/economy/promos/route.ts");
const offersRoute = readRequired("src/app/api/admin/economy/offers/route.ts");
const redemptionsRoute = readRequired("src/app/api/admin/economy/redemptions/route.ts");
const driftRoute = readRequired("src/app/api/admin/economy/drift/route.ts");
const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
const doctrineDoc = readRequired("docs/doctrine/surfaces/admin-platform-economy-doctrine.md");
const controlsDoc = readRequired("docs/agent-truth/platform-economy-commerce-controls.md");
const sourceDoc = readRequired("docs/agent-truth/gumdrop-source-of-funds-truth.md");

if (packageJson.scripts?.["check:platform-economy-commerce-controls"] !== "tsx scripts/agent/validate-platform-economy-commerce-controls.ts") {
    failures.push("package.json must expose check:platform-economy-commerce-controls.");
}

for (const expected of [
    "Packages",
    "Promos",
    "Offers",
    "Redemptions",
    "Drift",
    "Warnings",
]) {
    requireIncludes(consoleView, expected, "Platform Economy console");
}

for (const expected of [
    "PLATFORM_ECONOMY_BASE_USD_PER_100_GD = 1",
    "PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD = 0.5",
    "computeEffectiveUsdPer100Gd",
    "buildPackageWarnings",
    "buildPromoWarnings",
    "normalizePromoCode",
    "classifyPromoBonusSource",
]) {
    requireIncludes(contract, expected, "Platform Economy contract");
}

for (const expected of [
    "readPlatformEconomyPackages",
    "readPlatformEconomyPromos",
    "readPlatformEconomyOffers",
    "readPlatformEconomyRedemptions",
    "buildPlatformEconomyDriftReport",
    "expired_promo_active",
    "wallet_balance_source_mismatch",
]) {
    requireIncludes(helper, expected, "Platform Economy server helper");
}

for (const expected of [
    "savePlatformEconomyPackage",
    "savePlatformEconomyPromo",
    "savePlatformEconomyOffer",
    "below_floor_override_reason_required",
    "normalizePromoCode",
]) {
    requireIncludes(mutations, expected, "Platform Economy mutations");
}

requireIncludes(contract, "promo_redemption_limit_missing", "Platform Economy contract");

for (const [source, label] of [
    [packagesRoute, "Packages route"],
    [promosRoute, "Promos route"],
    [offersRoute, "Offers route"],
] as const) {
    requireIncludes(source, "guardApiRequest", label);
    requireIncludes(source, "auth: \"admin\"", label);
    requireIncludes(source, "requireTrustedOrigin: true", label);
    requireIncludes(source, "PATCH_handler", label);
    requireIncludes(source, "POST_handler", label);
}

for (const [source, label] of [
    [redemptionsRoute, "Redemptions route"],
    [driftRoute, "Drift route"],
] as const) {
    requireIncludes(source, "guardApiRequest", label);
    requireIncludes(source, "auth: \"admin\"", label);
}

for (const expected of [
    "packageId",
    "promoId",
    "offerId",
    "priceUsdBeforeDiscount",
    "priceUsdPaid",
    "sourceOfFundsBreakdown",
    "idempotencyKey",
    "orderId",
]) {
    requireIncludes(paypalCapture, expected, "PayPal capture ledger metadata");
}

for (const expected of [
    "Platform Economy cannot drift",
    "Base rate anchor: `$1 = 100 GD`",
    "Paid package bonus GumDrops remain paid-source bonus",
]) {
    requireIncludes(`${doctrineDoc}\n${controlsDoc}\n${sourceDoc}`, expected, "Commerce control doctrine bundle");
}

if (failures.length > 0) {
    console.error("Platform economy commerce controls validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log("Platform economy commerce controls validation passed.");
