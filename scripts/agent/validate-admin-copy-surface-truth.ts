import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

const files = [
  "src/lib/deterministic-admin-truth.ts",
  "src/app/admin/analytics/AnalyticsHelpers.tsx",
  "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
  "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
  "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
  "src/app/admin/debug/page.tsx",
  "src/app/admin/economy/page.tsx",
].map((path) => ({ path, source: readFileSync(join(root, path), "utf8") }));

const releaseNotes = JSON.parse(readFileSync(join(root, "public/kandydrops-release-notes.json"), "utf8")) as {
  notes?: Array<{ title?: string; summary?: string; bullets?: string[] }>;
};
const publicReleaseCopy = (releaseNotes.notes ?? [])
  .slice(0, 5)
  .map((note) => `${note.title ?? ""} ${note.summary ?? ""} ${(note.bullets ?? []).join(" ")}`)
  .join(" ");
if (/\b(route runtime|telemetry parity|validator|sourceTruth|Firestore|generatedAt|materializer|canonical|stale sample)\b/iu.test(publicReleaseCopy)) {
  failures.push("Public Beta release notes must keep raw technical jargon out of user-facing summaries.");
}

const helper = files.find((file) => file.path.endsWith("deterministic-admin-truth.ts"))?.source ?? "";
for (const expected of ["resolveMetricState", "safeRate", "getRollingWindow", "calculateGumdropValueBasis", "resolveWatchTruth"]) {
  if (!helper.includes(expected)) failures.push(`Admin truth helper must expose ${expected}.`);
}

const adminAnalytics = files
  .filter((file) => file.path.includes("admin/analytics"))
  .map((file) => file.source)
  .join("\n");
for (const expected of ["generatedAtUtc", "sourceTruth", "freshnessState"]) {
  if (!adminAnalytics.includes(expected)) failures.push(`Admin analytics copy/state must carry ${expected}.`);
}

if (/\bUnlocked drops with enough demand to matter\b|\bUnlocks \{|\bUnlocks</u.test(adminAnalytics)) {
  failures.push("Admin analytics display copy must use unwrap language instead of unlock language.");
}

if (failures.length > 0) {
  console.error("Admin copy surface truth validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin copy surface truth validation passed.");
