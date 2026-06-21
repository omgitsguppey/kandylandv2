import { writeJson } from "./admin-hot-cache-heartbeat-shared";
import { ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION, validateAdminRealtimeMigrationEntries } from "../../src/lib/admin/admin-realtime-to-hot-cache-migration";
import { readFileSync } from "fs";
import { join } from "path";

const failures = validateAdminRealtimeMigrationEntries();
const overviewHook = readFileSync(join(process.cwd(), "src/hooks/useAdminOverviewRealtime.ts"), "utf-8");
const chatSource = readFileSync(join(process.cwd(), "src/components/Chat/ChatExperience.tsx"), "utf-8");
if (overviewHook.includes("onSnapshot")) failures.push("Admin overview default hook still uses onSnapshot.");
if (overviewHook.includes("realtime_firestore")) failures.push("Admin overview default hook still emits realtime_firestore.");
if (!chatSource.includes("onSnapshot")) failures.push("User-facing chat realtime appears removed.");

writeJson("agent/state/admin-realtime-hot-cache-migration.generated.json", {
  status: failures.length === 0 ? "passed" : "failed",
  entries: ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION,
});

if (failures.length > 0) {
  console.error("Admin realtime hot-cache migration validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Admin realtime hot-cache migration OK.");
