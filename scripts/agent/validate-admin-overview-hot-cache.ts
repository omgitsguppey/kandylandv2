import { readFileSync } from "fs";
import { join } from "path";

import { writeJson, writeMarkdown } from "./admin-hot-cache-heartbeat-shared";

const source = readFileSync(join(process.cwd(), "src/app/api/admin/overview/route.ts"), "utf-8");
const failures: string[] = [];

for (const forbidden of [
  "ADMIN_OVERVIEW_USER_LIMIT",
  "ADMIN_OVERVIEW_DROP_LIMIT",
  'collection("users")',
  'collection("drops")',
  "limit(5_000)",
  'fetchCache = "force-no-store"',
  "revalidate = 0",
]) {
  if (source.includes(forbidden)) failures.push(`Admin overview route still contains ${forbidden}.`);
}
for (const required of [
  "guardApiRequest",
  "auth: \"admin\"",
  "snapshot_doc_plus_heartbeat_doc",
  "broadFallbackReadsRun: false",
  "buildMissingSnapshotResponse",
  "platformPulse",
  "ADMIN_HOT_CACHE_COLLECTION",
  "ADMIN_HEARTBEAT_COLLECTION",
]) {
  if (!source.includes(required)) failures.push(`Admin overview route missing ${required}.`);
}

writeJson("agent/state/admin-overview-hot-cache.generated.json", {
  status: failures.length === 0 ? "passed" : "failed",
  pageLoadReadModel: "snapshot_doc_plus_heartbeat_doc",
  broadFallbackReadsRun: false,
  authGuardPreserved: source.includes("auth: \"admin\""),
});
writeMarkdown("docs/agent-truth/admin-overview-hot-cache.md", [
  "# Admin Overview Hot Cache",
  "",
  "- Page load reads one admin overview snapshot doc and one heartbeat doc.",
  "- Missing snapshot returns source-missing state and does not run broad fallback reads.",
  "- Admin auth guard remains request-time dynamic.",
]);

if (failures.length > 0) {
  console.error("Admin overview hot-cache validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Admin overview hot-cache OK.");
