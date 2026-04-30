import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_DOCS = [
  "docs/agent-truth/analytics-truth-layer-v2.md",
  "docs/agent-truth/analytics-file-inventory.md",
  "docs/agent-truth/analytics-source-hierarchy.md",
  "docs/agent-truth/analytics-actor-taxonomy.md",
  "docs/agent-truth/analytics-module-map.md",
  "agent/index/analytics-truth-layer-v2.json",
];

const REQUIRED_MODULES = [
  "Platform Pulse",
  "Audience Snapshot",
  "Commerce Snapshot",
  "Live Pulse",
  "Journey Funnel",
  "Auth Outcomes",
  "Onboarding Performance",
  "Daily Task Pipeline",
  "Notification Funnel",
  "Event Mix",
  "Live Interaction Stream",
  "Data Validation",
  "Admin Debug",
];

const REQUIRED_ACTORS = [
  "guest",
  "anonymous visitor",
  "session",
  "authenticated user",
  "creator",
  "admin",
  "system",
  "unknown",
];

const REQUIRED_INVENTORY_SECTIONS = [
  "Admin Analytics UI Modules",
  "Admin Debug Validation Modules",
  "Admin Analytics API Routes",
  "Product/API Telemetry and Behavior Routes",
  "Server Analytics Utilities",
  "Client Telemetry Emitters and Catalogs",
  "Task Pipeline Files",
  "Notification Pipeline Files",
  "Purchase, Unlock, Wallet, and Commerce Files",
  "Onboarding Files",
  "Identity, Session, and Auth Files",
  "Firebase, GA4, BigQuery, and Functions Files",
  "Cache, Polling, Fallback, and Runtime Files",
  "Config, Rules, Deploy, and Environment Files",
  "Tests",
  "Scripts and Agent Index Files",
];

const REQUIRED_INVENTORY_PATHS = [
  "src/app/admin/analytics/page.tsx",
  "src/app/api/admin/analytics/historical/route.ts",
  "src/app/api/admin/analytics/realtime/route.ts",
  "src/app/api/admin/debug/route.ts",
  "src/app/api/analytics/ingest/route.ts",
  "src/app/api/analytics/ingest-identified/route.ts",
  "src/lib/telemetry.ts",
  "src/lib/telemetry-catalog.ts",
  "src/lib/admin-task-pipeline.ts",
  "src/lib/admin-notification-funnel.ts",
  "src/lib/gumdrop-ledger.ts",
  "src/lib/transaction-normalizers.ts",
  "src/lib/admin-onboarding-velocity.ts",
  "src/lib/client-session.ts",
  "functions/src/analytics-bigquery-export.ts",
  "functions/src/analytics-realtime-summary.ts",
  "public/firebase-messaging-sw.js",
  "firestore.rules",
  "database.rules.json",
  "apphosting.yaml",
  "tests/unit/admin-analytics-realtime-route.spec.ts",
  "scripts/check-analytics-continuity.ts",
  "agent/index/repo-inventory.json",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function fail(message: string) {
  console.error(`[analytics-truth-layer-v2] ${message}`);
  process.exitCode = 1;
}

function assertIncludes(file: string, source: string, expected: string) {
  if (!source.includes(expected)) {
    fail(`${file} is missing ${expected}`);
  }
}

function assertJsonIncludesArrayValue(
  file: string,
  values: unknown,
  expected: string,
) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    fail(`${file} is missing array value ${expected}`);
  }
}

for (const doc of REQUIRED_DOCS) {
  if (!exists(doc)) {
    fail(`required artifact missing: ${doc}`);
  }
}

const doctrine = read("docs/agent-truth/analytics-truth-layer-v2.md");
const inventory = read("docs/agent-truth/analytics-file-inventory.md");
const hierarchy = read("docs/agent-truth/analytics-source-hierarchy.md");
const taxonomy = read("docs/agent-truth/analytics-actor-taxonomy.md");
const moduleMap = read("docs/agent-truth/analytics-module-map.md");
const index = JSON.parse(read("agent/index/analytics-truth-layer-v2.json")) as {
  doctrine?: Record<string, unknown>;
  actors?: unknown;
  modules?: Array<{ name?: string }>;
  fileGroups?: Record<string, unknown>;
  sourceDocuments?: unknown;
};

assertIncludes("analytics doctrine", doctrine, "verified hot cache snapshot first");
assertIncludes("analytics doctrine", doctrine, "Manual refresh is allowed");
assertIncludes("analytics doctrine", doctrine, "The old realtime-only loading dependency is deprecated");
assertIncludes("analytics doctrine", doctrine, "Fake zeros are forbidden");
assertIncludes("analytics doctrine", doctrine, "Admin Analytics is the operator insight surface");
assertIncludes("analytics doctrine", doctrine, "Admin Debug is the validation surface");

assertIncludes("source hierarchy", hierarchy, "fake zeros");
assertIncludes("source hierarchy", hierarchy, "unlabeled stale cache");
assertIncludes("source hierarchy", hierarchy, "unlabeled fallback");
assertIncludes("source hierarchy", hierarchy, "events_YYYYMMDD");
assertIncludes("source hierarchy", hierarchy, "events_intraday_YYYYMMDD");
assertIncludes("source hierarchy", hierarchy, "AI/model summaries");

for (const actor of REQUIRED_ACTORS) {
  assertIncludes("actor taxonomy", taxonomy.toLowerCase(), actor.toLowerCase());
}

assertIncludes("actor taxonomy", taxonomy, "guest-to-user link");
assertIncludes("actor taxonomy", taxonomy, "Admin activity is excluded from user/guest analytics by default");
assertIncludes("actor taxonomy", taxonomy, "Unknown should not be silently coerced to user or guest");

for (const moduleName of REQUIRED_MODULES) {
  assertIncludes("analytics module map", moduleMap, moduleName);
}

assertIncludes("analytics module map", moduleMap, "snapshot");
assertIncludes("analytics module map", moduleMap, "Admin Debug keeps long validation");
assertIncludes("analytics module map", moduleMap, "move to Debug");

for (const section of REQUIRED_INVENTORY_SECTIONS) {
  assertIncludes("analytics file inventory", inventory, section);
}

for (const requiredPath of REQUIRED_INVENTORY_PATHS) {
  assertIncludes("analytics file inventory", inventory, requiredPath);
}

assertIncludes("analytics file inventory", inventory, "current likely source");
assertIncludes("analytics file inventory", inventory, "Refactor later");

if (index.doctrine?.hotCacheFirst !== true) {
  fail("agent index does not enable hotCacheFirst");
}
if (index.doctrine?.manualRefreshAllowed !== true) {
  fail("agent index does not enable manualRefreshAllowed");
}
if (index.doctrine?.realtimeOnlyLoadingDependencyDeprecated !== true) {
  fail("agent index does not deprecate realtime-only loading");
}

for (const actor of REQUIRED_ACTORS) {
  assertJsonIncludesArrayValue("analytics truth index actors", index.actors, actor);
}

const indexModuleNames = new Set((index.modules ?? []).map((entry) => entry.name));
for (const moduleName of REQUIRED_MODULES) {
  if (!indexModuleNames.has(moduleName)) {
    fail(`agent index modules are missing ${moduleName}`);
  }
}

for (const group of [
  "adminAnalyticsUi",
  "adminDebug",
  "apiRoutes",
  "serverUtilities",
  "clientTelemetry",
  "tasks",
  "notifications",
  "commerceUnlocks",
  "onboarding",
  "identitySession",
  "configRules",
  "tests",
  "scripts",
]) {
  if (!index.fileGroups?.[group]) {
    fail(`agent index fileGroups missing ${group}`);
  }
}

for (const doc of REQUIRED_DOCS.filter((entry) => entry.endsWith(".md"))) {
  assertJsonIncludesArrayValue("analytics truth index sourceDocuments", index.sourceDocuments, doc);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Analytics Truth Layer v2 contract check passed.");
