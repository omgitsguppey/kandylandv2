import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AUDIT_CACHE_INDEX_PATH,
  AUDIT_CACHE_VERSION,
  buildAuditCacheMetadata,
  emptyAuditCacheIndex,
  evaluateAuditCache,
  getAuditCacheMaxAgeMs,
  markAuditCacheHit,
  upsertAuditCacheRecord,
} from "../../src/lib/agent-audit/audit-cache";

const root = process.cwd();
const failures: string[] = [];
const paypalCaptureRoute = ["src", "app", "api", "paypal", "capture", "route.ts"].join("/");
const purchaseModalPath = ["src", "components", "PurchaseModal.tsx"].join("/");
const affectedPlanReportPath = ["agent", "state", "affected-audit-plan.generated.json"].join("/");
const auditRuntimeSummaryPath = ["agent", "state", "audit-runtime-summary.generated.json"].join("/");

function fail(message: string) {
  failures.push(message);
}

function readRequired(filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function parseJsonObject(filePath: string) {
  const source = readRequired(filePath);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail(`${filePath} must be a JSON object.`);
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    fail(`${filePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as { scripts?: Record<string, string> };
const packageScripts = packageJson.scripts ?? {};
const cacheSource = readRequired("src/lib/agent-audit/audit-cache.ts");
const fingerprintSource = readRequired("src/lib/agent-audit/file-fingerprint.ts");
const runnerSource = readRequired("scripts/agent/run-audit-with-ledger.ts");
const plannerSource = readRequired("src/lib/agent-audit/affected-surface-router.ts");
const scoreSource = readRequired("scripts/agent/score-audit-runtime.ts");
const statusSource = readRequired("scripts/agent/cache-audit-result.ts");
const docs = readRequired("docs/agent-truth/audit-cache.md");
const indexJson = parseJsonObject(AUDIT_CACHE_INDEX_PATH);

for (const [scriptName, command] of Object.entries({
  "check:audit-cache": "tsx scripts/agent/validate-audit-cache.ts",
  "audit:cache-status": "tsx scripts/agent/cache-audit-result.ts",
})) {
  if (packageScripts[scriptName] !== command) {
    fail(`package.json must expose "${scriptName}": "${command}".`);
  }
}

for (const expected of [
  "createHash(\"sha256\")",
  "fingerprintFile",
  "fingerprintExistingFiles",
  "DEFAULT_AUDIT_CONFIG_FILES",
]) {
  requireIncludes(fingerprintSource, expected, "file fingerprint helper");
}

for (const expected of [
  "sha256Json",
  "auditName",
  "auditVersion",
  "sortedRelevantFilePaths",
  "contentHashes",
  "relevantPackageJsonScripts",
  "validatorFileHash",
  "configFileHashes",
  "cache stale: relevant file hash changed",
  "cache stale: validator hash changed",
  "cache stale: config hash changed",
  "cache stale: package script changed",
  "commandsAvoided",
  "accuracyScoreAtCreation",
  "AUDIT_CACHE_VOLATILE_OUTPUT_FILES",
  "FALSE_POSITIVE_RATE_REVIEW_THRESHOLD",
]) {
  requireIncludes(cacheSource, expected, "audit cache contract");
}

for (const expected of [
  "evaluateAuditCache",
  "markAuditCacheHit",
  "upsertAuditCacheRecord",
  "exitCodeFromCachedStatus",
]) {
  requireIncludes(runnerSource, expected, "audit runner cache integration");
}
requireIncludes(plannerSource, "check:audit-cache", "affected planner cache route");
requireIncludes(scoreSource, "summarizeAuditCacheIndex", "audit runtime score cache integration");
requireIncludes(statusSource, "auditName", "cache status script");
requireIncludes(statusSource, "latestAuditRecord", "cache status script");

if (indexJson) {
  if (indexJson.version !== AUDIT_CACHE_VERSION) {
    fail(`${AUDIT_CACHE_INDEX_PATH}.version must be ${AUDIT_CACHE_VERSION}.`);
  }
  if (!indexJson.records || typeof indexJson.records !== "object" || Array.isArray(indexJson.records)) {
    fail(`${AUDIT_CACHE_INDEX_PATH}.records must be an object.`);
  }
}

for (const expected of [
  "Turborepo",
  "ESLint",
  "TypeScript incremental",
  "sha256",
  "commandsAvoided",
  "false positive rate",
  "audit:run",
  "audit:cache-status",
]) {
  requireIncludes(docs, expected, "audit cache docs");
}

if (getAuditCacheMaxAgeMs("check:purchase-telemetry-truth", [paypalCaptureRoute]) !== 6 * 60 * 60 * 1000) {
  fail("Critical payment audits must use a 6h max age.");
}
if (getAuditCacheMaxAgeMs("check:wallet-density", [purchaseModalPath]) !== 6 * 60 * 60 * 1000) {
  fail("Wallet/payment-adjacent validators must use a 6h max age.");
}
if (getAuditCacheMaxAgeMs("check:generated-artifacts", [affectedPlanReportPath]) !== 24 * 60 * 60 * 1000) {
  fail("Generated report validators must use a 24h max age.");
}
if (getAuditCacheMaxAgeMs("check:audit-runtime-ledger", [auditRuntimeSummaryPath]) !== 60 * 60 * 1000) {
  fail("Audit runtime summary validators must use a 1h max age.");
}
if (getAuditCacheMaxAgeMs("docs-consistency", ["docs/agent-truth/audit-cache.md"]) !== 72 * 60 * 60 * 1000) {
  fail("Docs/audit doctrine validators must use a 72h max age.");
}

const metadata = buildAuditCacheMetadata({
  root,
  auditName: "check:audit-cache",
  relevantFiles: ["src/lib/agent-audit/audit-cache.ts", "src/lib/agent-audit/file-fingerprint.ts"],
  validatorFiles: ["scripts/agent/validate-audit-cache.ts"],
  relevantPackageJsonScripts: { "check:audit-cache": "tsx scripts/agent/validate-audit-cache.ts" },
});
const volatileFilteredMetadata = buildAuditCacheMetadata({
  root,
  auditName: "check:audit-cache",
  relevantFiles: [auditRuntimeSummaryPath, "src/lib/agent-audit/audit-cache.ts"],
  validatorFiles: ["scripts/agent/validate-audit-cache.ts"],
  relevantPackageJsonScripts: { "check:audit-cache": "tsx scripts/agent/validate-audit-cache.ts" },
});
if (volatileFilteredMetadata.relevantFiles.includes(auditRuntimeSummaryPath)) {
  fail("Audit cache fingerprints must exclude volatile runtime outputs that are written by audit:run.");
}
const memoryIndex = emptyAuditCacheIndex();
let evaluation = evaluateAuditCache({
  index: memoryIndex,
  metadata,
  accuracyStats: { accuracyScore: 1, falsePositiveRate: 0, confirmedFindings: 0, falsePositiveFindings: 0 },
});
if (evaluation.valid) {
  fail("Empty cache index must miss.");
}
upsertAuditCacheRecord({
  root,
  index: memoryIndex,
  metadata,
  durationMs: 5,
  resultStatus: "pass",
  findingsHash: "fixture",
  command: "npm run check:audit-cache",
  accuracyScoreAtCreation: 1,
  now: Date.now(),
  write: false,
});
evaluation = evaluateAuditCache({
  index: memoryIndex,
  metadata,
  accuracyStats: { accuracyScore: 1, falsePositiveRate: 0, confirmedFindings: 0, falsePositiveFindings: 0 },
});
if (!evaluation.valid) {
  fail(`Fresh unchanged cache record should be valid: ${evaluation.reason}`);
}
markAuditCacheHit({ root, index: memoryIndex, cacheKey: metadata.cacheKey, command: "npm run check:audit-cache", write: false });
if (!memoryIndex.records[metadata.cacheKey]?.commandsAvoided.includes("npm run check:audit-cache")) {
  fail("Cache hit must record commandsAvoided.");
}
evaluation = evaluateAuditCache({
  index: memoryIndex,
  metadata,
  accuracyStats: { accuracyScore: 0.79, falsePositiveRate: 0, confirmedFindings: 79, falsePositiveFindings: 21 },
});
if (evaluation.valid) {
  fail("Low accuracy cache must be invalid.");
}
evaluation = evaluateAuditCache({
  index: memoryIndex,
  metadata,
  accuracyStats: { accuracyScore: 1, falsePositiveRate: 0.21, confirmedFindings: 79, falsePositiveFindings: 21 },
});
if (evaluation.valid) {
  fail("False-positive rate above 20% must force audit review.");
}

if (/npx\s+turbo|turbo\s+run|remote cache|paid service/iu.test(cacheSource)) {
  fail("Audit cache must stay lightweight and local; do not adopt Turborepo or paid services.");
}

if (failures.length > 0) {
  console.error("Audit cache validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Audit cache validation passed.");
