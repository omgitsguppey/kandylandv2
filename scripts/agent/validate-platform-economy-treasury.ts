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
const page = readRequired("src/app/admin/economy/page.tsx");
const consoleView = readRequired("src/app/admin/economy/components/PlatformEconomyConsole.tsx");
const strip = readRequired("src/app/admin/economy/components/PlatformEconomyStrip.tsx");
const helper = readRequired("src/lib/server/platform-economy.ts");
const deterministicTruth = readRequired("src/lib/deterministic-admin-truth.ts");
const treasuryRoute = readRequired("src/app/api/admin/economy/treasury/route.ts");
const treasuryDoc = readRequired("docs/agent-truth/platform-economy-treasury.md");
const doctrineDoc = readRequired("docs/doctrine/surfaces/admin-platform-economy-doctrine.md");

if (packageJson.scripts?.["check:platform-economy-treasury"] !== "tsx scripts/agent/validate-platform-economy-treasury.ts") {
    failures.push("package.json must expose check:platform-economy-treasury.");
}

requireIncludes(page, "GumDrops Commerce Control Center", "Economy page");
if (page.includes("Work in progress")) {
    failures.push("Economy page must not remain a Work in progress placeholder.");
}

for (const expected of [
    "Outstanding GD",
    "Paid GD",
    "Bonus paid-source GD",
    "Reward/free GD",
    "Paid-source avg",
    "Floor state",
    "Warnings",
]) {
    requireIncludes(strip, expected, "Treasury strip");
}

for (const expected of [
    "walletRows",
    "/admin/user/",
    "sourceTruth",
    "freshnessState",
    "generatedAtUtc",
    "buildPlatformEconomyTreasurySummary",
    "calculateGumdropValueBasis",
    "AggregateField.sum(\"gumDropsBalance\")",
    "AggregateField.sum(\"gumDropsPurchasedBalance\")",
    "AggregateField.sum(\"gumDropsRewardBalance\")",
    "treasury_source_missing",
    "normalizeOptionalCount",
    "Missing treasury source data is unavailable, not zero.",
]) {
    requireIncludes(helper, expected, "Platform Economy treasury helper");
}

for (const expected of [
    "guardApiRequest",
    "auth: \"admin\"",
    "buildPlatformEconomyTreasurySummary",
]) {
    requireIncludes(treasuryRoute, expected, "Platform Economy treasury route");
}

for (const expected of [
    "Platform Economy is the top admin economic truth surface",
    "Platform Economy is the ultimate GumDrops Treasury and Commerce Control Center",
    "Outstanding GD",
    "Wallet drilldown",
    "$0.50 per 100 GD",
]) {
    requireIncludes(`${treasuryDoc}\n${doctrineDoc}`, expected, "Treasury doctrine bundle");
}
for (const expected of [
    "calculateGumdropValueBasis",
    "paidSourceGdIssued",
    "averageUsdPer100PaidSourceGd",
    "floorState",
]) {
    requireIncludes(deterministicTruth, expected, "Deterministic GumDrops value-basis helper");
}

if (failures.length > 0) {
    console.error("Platform economy treasury validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log("Platform economy treasury validation passed.");
