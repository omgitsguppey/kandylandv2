import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const page = readFileSync(join(repoRoot, "src/app/admin/users/page.tsx"), "utf8");
const route = readFileSync(join(repoRoot, "src/app/api/admin/users/route.ts"), "utf8");

const failures: string[] = [];

const requireIncludes = (source: string, needle: string, message: string) => {
  if (!source.includes(needle)) {
    failures.push(message);
  }
};

requireIncludes(route, 'mode === "summary"', "Admin users API must expose a summary loading lane.");
requireIncludes(route, 'mode === "list"', "Admin users API must expose a lightweight list loading lane.");
requireIncludes(route, 'mode === "detail"', "Admin users API must expose an explicit selected-user detail lane.");
requireIncludes(route, 'loadingLane: "summary"', "Summary response must label its loading lane.");
requireIncludes(route, 'loadingLane: "list"', "List response must label its loading lane.");
requireIncludes(route, 'loadingLane: "selectedUser"', "Detail response must label its selected-user loading lane.");
requireIncludes(route, "readAdminUsersFastSummarySnapshot", "Summary lane must use the bounded fast snapshot reader.");
requireIncludes(route, "readAggregateCount(usersCollection)", "Summary lane must use aggregate counts instead of loading every user row.");
requireIncludes(route, 'adminDb.collection("analytics_commerce_rollup").doc("summary").get()', "Summary lane must read the commerce hot-cache snapshot.");
requireIncludes(route, 'adminDb.collection("users").orderBy("createdAt", "desc").limit(ADMIN_USERS_LIST_LIMIT).get()', "List lane must read bounded user rows directly.");
requireIncludes(route, 'adminDb.collection("analytics_users_rollup").doc(userId).get()', "Detail lane must read one selected user rollup.");
requireIncludes(route, 'adminDb.collection("analytics_user_daily").where("uid", "==", userId).limit(ADMIN_USERS_DAILY_ROLLUP_LIMIT).get()', "Detail lane must scope bounded daily metrics to the selected user.");

requireIncludes(page, 'authFetch("/api/admin/users?mode=summary")', "User Management page must request summary separately.");
requireIncludes(page, 'authFetch("/api/admin/users?mode=list")', "User Management page must request list separately.");
requireIncludes(page, '/api/admin/users?mode=detail&userId=', "User Management page must request selected-user detail explicitly.");
requireIncludes(page, 'data-admin-users-loading-lane="selectedUser"', "User Management UI must mark selected-user loading lane controls.");
requireIncludes(page, 'data-admin-users-loading-lane="behavioralDetail"', "User Management UI must mark behavioral detail surfaces.");

if (page.includes('const response = await authFetch("/api/admin/users");')) {
  failures.push("User Management initial load must not call the legacy full admin/users GET.");
}

if (page.includes("setUserAnalytics(result.analyticsByUser || {})")) {
  failures.push("List loading must not replace user analytics from a broad all-user response.");
}

if (failures.length > 0) {
  console.error("Admin users loading lane validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin users loading lane validation passed.");
