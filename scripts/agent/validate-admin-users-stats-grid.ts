import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const usersPagePath = join(repoRoot, "src/app/admin/users/page.tsx");
const usersPage = readFileSync(usersPagePath, "utf8");

const failures: string[] = [];

const requireIncludes = (needle: string, message: string) => {
    if (!usersPage.includes(needle)) {
        failures.push(message);
    }
};

requireIncludes('data-admin-users-stats-layout="compact-grid"', "User Management stats must declare the compact grid layout marker.");
requireIncludes("grid-cols-2", "Stats grid must keep a two-column fallback for narrow phones.");
requireIncludes("min-[390px]:grid-cols-3", "Stats grid must switch to three columns when compact mobile width allows it.");
requireIncludes("xl:grid-cols-5", "Stats grid must support a denser tablet/desktop row.");
requireIncludes("data-admin-users-metric-state", "Each compact metric card must expose metric truth state.");
requireIncludes("data-admin-users-metric-source", "Each compact metric card must expose metric source.");

const requiredCards = [
    "Users",
    "Returners",
    "Unwraps",
    "Watch",
    "Revenue",
    "Paying",
    "Verified",
    "Push",
    "Onboarded",
];

for (const title of requiredCards) {
    requireIncludes(`title: "${title}"`, `Missing compact User Management metric card: ${title}.`);
}

const staleTitles = [
    "User base",
    "7 day returners",
    "Tracked unwraps",
    "Watch time",
    "Monetization",
    "Profit / bonus",
    "Delivered / bonus",
    "Effective rate",
];

for (const title of staleTitles) {
    if (usersPage.includes(`title: "${title}"`) || usersPage.includes(`>${title}<`)) {
        failures.push(`Old sprawled metric title still appears in User Management stats: ${title}.`);
    }
}

if (failures.length > 0) {
    console.error("Admin users stats grid validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Admin users compact stats grid validation passed.");
