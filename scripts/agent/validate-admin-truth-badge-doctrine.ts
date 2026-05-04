import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const truthState = read("src/lib/admin-truth-state.ts");
const truthBadge = read("src/components/Admin/AdminTruthBadge.tsx");
const usersPage = read("src/app/admin/users/page.tsx");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const statsBar = read("src/components/Admin/AdminStatsBar.tsx");

[
  '"live"',
  '"refreshing"',
  '"stale"',
  '"degraded"',
  '"failed"',
  '"unavailable"',
  '"delayed"',
  '"review"',
].forEach((state) => {
  assert(truthState.includes(state), `Admin truth state contract missing ${state}.`);
});

assert(truthBadge.includes("data-admin-truth-state"), "AdminTruthBadge must expose a stable truth-state marker.");
assert(usersPage.includes("AdminTruthBadge"), "User Management must render AdminTruthBadge.");
assert(userDetailPage.includes("AdminTruthBadge"), "User detail must render AdminTruthBadge.");
assert(statsBar.includes("AdminTruthBadge"), "AdminStatsBar must render AdminTruthBadge.");
assert(usersPage.includes('pendingInitialLoad={!summary && summaryLoading}'), "WAIT must only appear during first-load summary hydration.");
assert(userDetailPage.includes("commerceTruthState"), "User detail must resolve a dedicated commerce truth state.");
assert(userDetailPage.includes("metricTruthState"), "User detail must resolve a dedicated metric truth state.");
assert(userDetailPage.includes("behaviorTruthState"), "User detail must resolve a dedicated behavior truth state.");
assert(!usersPage.includes("AdminStatusBadge"), "User Management should not keep legacy AdminStatusBadge usage for truth badges.");
assert(!userDetailPage.includes("AdminStatusBadge"), "User detail should not keep legacy AdminStatusBadge usage for truth badges.");

console.log("Admin truth badge doctrine is wired across user analytics surfaces.");
