import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  BILLING_SPIKE_RADAR_DOC_PATH,
  BILLING_SPIKE_RADAR_REPORT_PATH,
  BILLING_SPIKE_SURFACES,
  type BillingSpikeRadarReport,
} from "../../src/lib/cost/billing-spike-contract";

const repoRoot = process.cwd();
const failures: string[] = [];

function repoPath(relativePath: string) {
  return path.join(repoRoot, relativePath);
}

function fail(message: string) {
  failures.push(message);
}

function readRequired(relativePath: string) {
  const fullPath = repoPath(relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) fail(`${label} must include "${needle}".`);
}

function readReport() {
  const source = readRequired(BILLING_SPIKE_RADAR_REPORT_PATH);
  if (!source) return null;
  try {
    return JSON.parse(source) as BillingSpikeRadarReport;
  } catch (error) {
    fail(`${BILLING_SPIKE_RADAR_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateContracts() {
  if (BILLING_SPIKE_SURFACES.length !== 25) {
    fail(`Billing spike surface inventory must contain 25 entries; found ${BILLING_SPIKE_SURFACES.length}.`);
  }
  for (const entry of BILLING_SPIKE_SURFACES) {
    if (!entry.owner.trim()) fail(`${entry.surface} missing owner.`);
    if (!entry.recommendedCap.trim()) fail(`${entry.surface} missing recommendedCap.`);
    if (!entry.validator.trim()) fail(`${entry.surface} missing validator.`);
    if (!entry.emergencyDisableSwitch.trim()) fail(`${entry.surface} missing emergencyDisableSwitch.`);
    if (entry.sourceFiles.length === 0) fail(`${entry.surface} missing sourceFiles.`);
    if (entry.billingProducts.length === 0) fail(`${entry.surface} missing billingProducts.`);
    if (!entry.multiplierFormula.trim()) fail(`${entry.surface} missing multiplierFormula.`);
    if (!["low", "watch", "review", "high", "critical"].includes(entry.riskTier)) {
      fail(`${entry.surface} riskTier invalid.`);
    }
  }
}

function validateRequiredFormulas() {
  const contractSource = readRequired("src/lib/cost/billing-spike-contract.ts");
  const riskScoreSource = readRequired("src/lib/cost/billing-spike-risk-score.ts");
  for (const formula of [
    "risk = activeListeners * averageDocsPerSnapshot * reconnectRate * updateRate",
    "risk = eventsPerMinute * avgLogBytes * dedupeMissRate",
    "risk = sessionsPerMinute * eventsPerSession * writesPerEvent",
    "risk = viewsPerMinute * avgMediaBytes * uncachedRate",
    "risk = recipients * writesPerRecipient * retryMultiplier",
    "risk = commitsPerDay * buildMinutesPerDeploy * deployTriggeredRate",
    "risk = usersScanned * docsReadPerUser * runsPerDay",
    "risk = filesPerBatch * avgFileBytes * retryCount",
  ]) {
    requireIncludes(contractSource, formula, "billing spike contract");
  }
  for (const fnName of [
    "computeFirestoreListenerRisk",
    "computeDebugLogRisk",
    "computeAnalyticsIngestRisk",
    "computeMediaEgressRisk",
    "computeNotificationFanoutRisk",
    "computeBuildDeployChurnRisk",
    "computeMaterializerRisk",
    "computeUploadRetryRisk",
  ]) {
    requireIncludes(riskScoreSource, fnName, "billing spike risk score");
  }
}

function validateCriticalGuardrails() {
  const materializerSource = [readRequired("scripts/rebuild-analytics-truth.ts"), readRequired("scripts/rebuild-behavioral-intelligence.ts")].join("\n");
  if (!/MAX_ROWS|MAX_RUNTIME_MS|cursor|dry-run/iu.test(materializerSource)) {
    fail("Materializers must expose max rows/runtime/cursor/dry-run budgets.");
  }

  const adminOverviewSource = readRequired("src/lib/server/admin-overview-users.ts");
  if (/onSnapshot\(/u.test(adminOverviewSource)) {
    fail("Admin business metrics must use snapshot/rollup paths, not realtime listeners.");
  }

  const debugEvidenceSource = readRequired("src/lib/server/debug-evidence-store.ts");
  if (!/fingerprint|dedupe|suppressedEventWriteCount/iu.test(debugEvidenceSource)) {
    fail("Logging/debug evidence must use fingerprint dedupe.");
  }

  const ingestSources = [readRequired("src/app/api/analytics/ingest/route.ts"), readRequired("src/app/api/analytics/ingest-identified/route.ts")].join("\n");
  if (!/max|limit|budget|dedupe|ignore|sample/iu.test(ingestSources)) {
    fail("Analytics ingest lanes must include high-frequency event budget controls.");
  }

  const uploadSources = [readRequired("src/components/Admin/AssetUploader.tsx"), readRequired("src/lib/uploads/asset-upload-queue.ts")].join("\n");
  if (!/retry|max|queue|uploadProgress|uploadStatus/iu.test(uploadSources)) {
    fail("Media/upload paths must include queue state and retry caps.");
  }

  const notificationsSource = readRequired("src/lib/server/fcm-utils.ts");
  if (!/batch|retry|duplicate|idempot/iu.test(notificationsSource)) {
    fail("Notification fanout must include batching, dedupe, and retry caps.");
  }

  const releaseSource = readRequired("src/lib/release-notes/release-version-contract.ts");
  if (!/generated|agent\/state|package-lock\.json|release/iu.test(releaseSource)) {
    fail("Release notes lane must exclude generated churn and prevent looped version bumps.");
  }

  const sqlMirrorSource = [readRequired("scripts/agent/sync-sql.ts"), readRequired("docs/agent-truth/cloudrun-sql-bigquery-guardrails.md")].join("\n");
  if (!/sidecar|mirror|unless explicitly promoted|not runtime truth/iu.test(sqlMirrorSource)) {
    fail("Cloud SQL/Data Connect must remain sidecar-only unless explicitly approved.");
  }
}

function validateReport(report: BillingSpikeRadarReport | null) {
  if (!report) return;
  if (!["pass", "warning", "fail"].includes(report.status)) fail("Report status must be pass/warning/fail.");
  if (typeof report.overallRiskScore !== "number" || report.overallRiskScore < 0 || report.overallRiskScore > 100) {
    fail("Report overallRiskScore must be 0..100.");
  }
  if (!Array.isArray(report.surfaces) || report.surfaces.length !== BILLING_SPIKE_SURFACES.length) {
    fail("Report surfaces must match contract surface inventory size.");
  }
  if (!Array.isArray(report.topSpikeRisks) || report.topSpikeRisks.length === 0) {
    fail("Report must include topSpikeRisks.");
  }
  if (!Array.isArray(report.watchlist) || report.watchlist.length === 0) {
    fail("Report must include promo week watchlist entries.");
  }
  if (!Array.isArray(report.requiredCommands) || !report.requiredCommands.includes("npm run score:billing-spikes")) {
    fail("Report must include required command: npm run score:billing-spikes.");
  }
  if (!Array.isArray(report.forbiddenCommands) || !report.forbiddenCommands.includes("playwright")) {
    fail("Report must include forbidden command: playwright.");
  }
}

function validateDocsAndScripts() {
  const packageJson = readRequired("package.json");
  requireIncludes(packageJson, "\"score:billing-spikes\"", "package scripts");
  requireIncludes(packageJson, "\"check:billing-spikes\"", "package scripts");

  const docs = readRequired(BILLING_SPIKE_RADAR_DOC_PATH);
  requireIncludes(docs, "Billing spike radar", BILLING_SPIKE_RADAR_DOC_PATH);
  requireIncludes(docs, "Promo week watchlist", BILLING_SPIKE_RADAR_DOC_PATH);
  for (const entry of BILLING_SPIKE_SURFACES) requireIncludes(docs, entry.surface, BILLING_SPIKE_RADAR_DOC_PATH);
}

validateContracts();
validateRequiredFormulas();
validateCriticalGuardrails();
validateReport(readReport());
validateDocsAndScripts();

if (failures.length > 0) {
  console.error("Billing spike radar validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Billing spike radar validation passed.");
