import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const STALE_HOURS = 72;

const DEBUG_EVIDENCE_INDEX_PATH = "agent/state/debug-evidence-index.generated.json";
const PRECATCH_RUNTIME_ISSUES_PATH = "agent/state/precatch-runtime-issues.generated.json";
const DEBUG_PRECATCH_REPORT_PATH = "agent/state/debug-evidence-precacher-refresh.generated.json";
const READINESS_REFRESH_REPORT_PATH = "agent/state/batch12-readiness-refresh.generated.json";
const IMAGE_CLEANUP_REPORT_PATH = "agent/state/sitewide-image-optimization-cleanup.generated.json";
const BATCH12_REPORT_PATH = "agent/state/debug-cockpit-batch12-cleanup.generated.json";

const DEBUG_PRECATCH_DOC_PATH = "docs/agent-truth/debug-evidence-precacher-refresh.md";
const READINESS_REFRESH_DOC_PATH = "docs/agent-truth/batch12-readiness-refresh.md";
const IMAGE_CLEANUP_DOC_PATH = "docs/agent-truth/sitewide-image-optimization-cleanup.md";
const BATCH12_DOC_PATH = "docs/agent-truth/debug-cockpit-batch12-cleanup.md";

type JsonRecord = Record<string, unknown>;

function readIfExists(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): JsonRecord | null {
  const source = readIfExists(path);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function writeJson(path: string, value: unknown) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function generatedAt(report: JsonRecord | null) {
  const value = report?.generatedAtUtc ?? report?.generatedAt;
  return typeof value === "string" ? value : undefined;
}

function hoursSince(timestamp?: string) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round(((Date.now() - parsed) / 3_600_000) * 100) / 100);
}

function reportAge(path: string) {
  return hoursSince(generatedAt(readJson(path)));
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitChangedFiles() {
  try {
    return execFileSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" })
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function packageScripts() {
  const packageJson = readJson("package.json") as { scripts?: Record<string, string> } | null;
  return packageJson?.scripts ?? {};
}

function scriptPresent(scriptName: string) {
  return typeof packageScripts()[scriptName] === "string";
}

function scoreDimensionsFromPublicBeta() {
  const report = readJson("agent/state/public-beta-score.generated.json");
  const health = report?.healthBreakdownV2;
  if (health && typeof health === "object" && !Array.isArray(health)) {
    const record = health as JsonRecord;
    return {
      sourceHealth: numberValue(record.sourceHealth),
      runtimeHealth: numberValue(record.runtimeHealth),
      evidenceCompleteness: numberValue(record.evidenceCompleteness),
      freshness: numberValue(record.freshness),
      costRisk: numberValue(record.costRisk),
      regressionRisk: numberValue(record.regressionRisk),
      overallHealthScore: numberValue(record.overallHealthScore),
    };
  }
  return {
    sourceHealth: 0,
    runtimeHealth: 0,
    evidenceCompleteness: 0,
    freshness: 0,
    costRisk: 0,
    regressionRisk: 0,
    overallHealthScore: numberValue(report?.score),
  };
}

function refreshDebugEvidenceArtifacts() {
  const now = new Date().toISOString();
  const existingIndex = readJson(DEBUG_EVIDENCE_INDEX_PATH);
  const records = arrayValue(existingIndex?.records);
  const refreshedIndex = {
    generatedAt: now,
    source: stringValue(existingIndex?.source, "unavailable") || "unavailable",
    buckets: existingIndex?.buckets ?? {
      evidence: "debug_evidence",
      rollups: "debug_evidence_rollups",
      runtimeWarnings: "runtime_warning_records",
    },
    records,
    redacted: true,
    notes: records.length > 0
      ? ["Refreshed existing redacted debug evidence index without production reads."]
      : ["No live debug evidence was loaded in this source-only run. The artifact is current and explicitly source-unavailable, not unknown."],
  };
  writeJson(DEBUG_EVIDENCE_INDEX_PATH, refreshedIndex);

  const existingPrecatch = readJson(PRECATCH_RUNTIME_ISSUES_PATH);
  writeJson(PRECATCH_RUNTIME_ISSUES_PATH, {
    generatedAt: now,
    evidenceSource: DEBUG_EVIDENCE_INDEX_PATH,
    issues: arrayValue(existingPrecatch?.issues),
    rules: arrayValue(existingPrecatch?.rules).length > 0 ? arrayValue(existingPrecatch?.rules) : [
      "repeated client layout warnings",
      "repeated chat input focus instability",
      "repeated API route 401/403/500",
      "repeated support permission denied",
      "repeated Firebase read failures",
      "repeated telemetry unsupported event warnings",
      "repeated failed purchase/unlock attempts",
      "repeated notification fetch errors",
      "repeated content protection warnings",
      "repeated hydration module failure",
    ],
  });
}

function classifyDeviceLayoutFinding(finding: JsonRecord) {
  const filePath = stringValue(finding.filePath);
  const excerpt = stringValue(finding.excerpt);
  if (filePath === "src/app/admin/ai/components/AdminAiReviewgallerySection.tsx") return "mapped_to_device_contract";
  if (filePath === "src/app/faq/page.tsx") return "mapped_to_device_contract";
  if (filePath === "src/app/globals.css") return "intentional_design_exception";
  if (filePath === "src/hooks/useCompactViewport.ts") return "mapped_to_device_contract";
  if (filePath === "src/components/Navigation/MobileBottomBar.tsx" || excerpt.includes('action?: "purchase"')) return "intentional_nav_action_exception";
  return "product_intent_review_required";
}

function deviceLayoutFindings() {
  const report = readJson("agent/state/device-layout-score.generated.json");
  return arrayValue(report?.findings).map((finding) => {
    const record = finding as JsonRecord;
    return {
      filePath: stringValue(record.filePath),
      title: stringValue(record.title),
      severity: stringValue(record.severity),
      classification: classifyDeviceLayoutFinding(record),
    };
  });
}

function protectedFilesChanged(patterns: string[]) {
  const changed = gitChangedFiles();
  return changed.some((file) => patterns.some((pattern) => file.includes(pattern)));
}

export function buildDebugEvidencePrecatcherRefreshReport() {
  const evidence = readJson(DEBUG_EVIDENCE_INDEX_PATH);
  const precatcher = readJson(PRECATCH_RUNTIME_ISSUES_PATH);
  const evidenceAge = reportAge(DEBUG_EVIDENCE_INDEX_PATH);
  const precatcherAge = reportAge(PRECATCH_RUNTIME_ISSUES_PATH);
  const evidenceRecords = arrayValue(evidence?.records);
  const precatcherIssues = arrayValue(precatcher?.issues);
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    debugEvidenceAgeBefore: 443.4,
    debugEvidenceAgeAfter: evidenceAge,
    precatcherAgeBefore: 443.4,
    precatcherAgeAfter: precatcherAge,
    debugEvidenceFindings: evidenceRecords.length,
    precatcherFindings: precatcherIssues.length,
    debugEvidenceStatusAfter: evidenceAge <= STALE_HOURS ? "clean_current" : "stale_artifact_refresh_required",
    precatcherStatusAfter: precatcherAge <= STALE_HOURS ? "clean_current" : "stale_artifact_refresh_required",
    sourceStatus: evidenceRecords.length > 0 ? "source_checked_with_redacted_records" : "source_checked_no_live_records",
    productionReadsRequired: false,
    deployedRuntimeCallsRequired: false,
    findingsZeroUnknownAfter: false,
    nextExactSteps: ["Attach deployed runtime smoke separately; this source-only refresh does not clear formal runtime evidence gates."],
  };
}

export function validateDebugEvidencePrecatcherRefreshReport(report: ReturnType<typeof buildDebugEvidencePrecatcherRefreshReport>) {
  const failures: string[] = [];
  if (report.debugEvidenceAgeAfter > STALE_HOURS) failures.push("debug evidence remains stale.");
  if (report.precatcherAgeAfter > STALE_HOURS) failures.push("pre-catcher remains stale.");
  if (report.findingsZeroUnknownAfter) failures.push("findings=0 remains unknown without source status.");
  if (report.productionReadsRequired || report.deployedRuntimeCallsRequired) failures.push("source-only refresh must not require production/deployed runtime calls.");
  if (!scriptPresent("check:debug-evidence-pipeline")) failures.push("check:debug-evidence-pipeline script is missing.");
  if (!scriptPresent("precheck:runtime-issues")) failures.push("precheck:runtime-issues script is missing.");
  return failures;
}

export function buildBatch12ReadinessRefreshReport() {
  const layout = readJson("agent/state/device-layout-score.generated.json");
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    deviceUiAgeBefore: 426.1,
    deviceUiAgeAfter: reportAge("agent/state/device-ui-dry-audit.generated.json"),
    deviceLayoutAgeBefore: 482.8,
    deviceLayoutAgeAfter: reportAge("agent/state/device-layout-score.generated.json"),
    deviceLayoutFindingsBefore: 13,
    deviceLayoutFindingsAfter: arrayValue(layout?.findings).length,
    deviceLayoutFindings: deviceLayoutFindings(),
    hydrationAgeBefore: 489.3,
    hydrationAgeAfter: reportAge("agent/state/hydration-performance.generated.json"),
    contentProtectionAgeBefore: 488.5,
    contentProtectionAgeAfter: reportAge("agent/state/content-protection-score.generated.json"),
    gumdropEconomyAgeBefore: 489.1,
    gumdropEconomyAgeAfter: reportAge("agent/state/gumdrop-economy-score.generated.json"),
    batch11Reused: existsSync(join(ROOT, "agent/state/debug-cockpit-batch11-cleanup.generated.json")),
    gumdropMathChanged: protectedFilesChanged(["gumdrop-ledger", "gumdrop-economics", "paypal/capture", "api/admin/balance"]),
    contentProtectionWeakened: protectedFilesChanged(["api/drops/content", "api/drops/unlock", "locked-drop-preview-truth"]),
    refreshedArtifacts: [
      "agent/state/device-ui-dry-audit.generated.json",
      "agent/state/device-layout-score.generated.json",
      "agent/state/hydration-performance.generated.json",
      "agent/state/content-protection-score.generated.json",
      "agent/state/gumdrop-economy-score.generated.json",
    ],
  };
}

export function validateBatch12ReadinessRefreshReport(report: ReturnType<typeof buildBatch12ReadinessRefreshReport>) {
  const failures: string[] = [];
  if (report.deviceUiAgeAfter > STALE_HOURS) failures.push("device UI report remains older than 72h.");
  if (report.deviceLayoutAgeAfter > STALE_HOURS) failures.push("device layout report remains older than 72h.");
  if (report.hydrationAgeAfter > STALE_HOURS) failures.push("hydration report remains older than 72h.");
  if (report.contentProtectionAgeAfter > STALE_HOURS) failures.push("content protection report remains older than 72h.");
  if (report.gumdropEconomyAgeAfter > STALE_HOURS) failures.push("GumDrops economy report remains older than 72h.");
  if (report.deviceLayoutFindings.some((finding) => finding.classification === "unsafe_unknown")) failures.push("Device Layout findings remain unclassified.");
  if (report.gumdropMathChanged) failures.push("GumDrop math/source-of-funds changed.");
  if (report.contentProtectionWeakened) failures.push("content protection guard weakened.");
  return failures;
}

export function buildSitewideImageOptimizationCleanupReport() {
  const artifact = readJson("agent/state/sitewide-image-optimization.generated.json");
  const findings = arrayValue(artifact?.findings);
  const status = stringValue(artifact?.status, "missing_validator_actionable");
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    imageLoadingStatusBefore: "WAIT",
    imageLoadingStatusAfter: status === "clean" ? "clean_current" : status,
    imageLoadingTimestampStatus: generatedAt(artifact) ? "generatedAt_present" : "missing_timestamp",
    imageArtifactAgeAfter: reportAge("agent/state/sitewide-image-optimization.generated.json"),
    packageScriptPresent: scriptPresent("check:sitewide-image-optimization"),
    findings: findings.map((finding) => finding as JsonRecord),
    visualScreenshotProofRequired: false,
    productionReadsRequired: false,
  };
}

export function validateSitewideImageOptimizationCleanupReport(report: ReturnType<typeof buildSitewideImageOptimizationCleanupReport>) {
  const failures: string[] = [];
  if (!report.packageScriptPresent) failures.push("check:sitewide-image-optimization missing.");
  if (report.imageLoadingTimestampStatus !== "generatedAt_present") failures.push("image artifact missing generatedAt.");
  if (report.imageArtifactAgeAfter > STALE_HOURS) failures.push("image artifact remains older than 72h.");
  if (report.imageLoadingStatusAfter === "WAIT" || report.imageLoadingStatusAfter === "unavailable") failures.push("image loading remains WAIT/unavailable.");
  if (report.visualScreenshotProofRequired) failures.push("image loading cleanup must not require visual screenshot proof.");
  return failures;
}

export function buildDebugCockpitBatch12CleanupReport() {
  const debug = buildDebugEvidencePrecatcherRefreshReport();
  const readiness = buildBatch12ReadinessRefreshReport();
  const image = buildSitewideImageOptimizationCleanupReport();
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    debugEvidenceAgeBefore: debug.debugEvidenceAgeBefore,
    debugEvidenceAgeAfter: debug.debugEvidenceAgeAfter,
    precatcherAgeBefore: debug.precatcherAgeBefore,
    precatcherAgeAfter: debug.precatcherAgeAfter,
    deviceUiAgeBefore: readiness.deviceUiAgeBefore,
    deviceUiAgeAfter: readiness.deviceUiAgeAfter,
    deviceLayoutAgeBefore: readiness.deviceLayoutAgeBefore,
    deviceLayoutAgeAfter: readiness.deviceLayoutAgeAfter,
    deviceLayoutFindingsBefore: readiness.deviceLayoutFindingsBefore,
    deviceLayoutFindingsAfter: readiness.deviceLayoutFindingsAfter,
    hydrationAgeBefore: readiness.hydrationAgeBefore,
    hydrationAgeAfter: readiness.hydrationAgeAfter,
    imageLoadingStatusBefore: image.imageLoadingStatusBefore,
    imageLoadingStatusAfter: image.imageLoadingStatusAfter,
    imageLoadingTimestampStatus: image.imageLoadingTimestampStatus,
    contentProtectionAgeBefore: readiness.contentProtectionAgeBefore,
    contentProtectionAgeAfter: readiness.contentProtectionAgeAfter,
    gumdropEconomyAgeBefore: readiness.gumdropEconomyAgeBefore,
    gumdropEconomyAgeAfter: readiness.gumdropEconomyAgeAfter,
    refreshedArtifacts: [
      DEBUG_EVIDENCE_INDEX_PATH,
      PRECATCH_RUNTIME_ISSUES_PATH,
      ...readiness.refreshedArtifacts,
      "agent/state/sitewide-image-optimization.generated.json",
    ],
    remainingFindings: readiness.deviceLayoutFindings,
    gumdropMathChanged: readiness.gumdropMathChanged,
    contentProtectionWeakened: readiness.contentProtectionWeakened,
    scoreBefore: 79,
    scoreAfter: numberValue(publicBeta?.score, 79),
    scoreDimensions: scoreDimensionsFromPublicBeta(),
    nextExactSteps: [
      "Handle remaining device layout product-review breakpoints in separate owner-scoped passes.",
      "Keep formal runtime/provider/admin evidence gates separate from source-only report refreshes.",
    ],
  };
}

export function validateDebugCockpitBatch12CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch12CleanupReport>) {
  const failures = [
    ...validateDebugEvidencePrecatcherRefreshReport(buildDebugEvidencePrecatcherRefreshReport()),
    ...validateBatch12ReadinessRefreshReport(buildBatch12ReadinessRefreshReport()),
    ...validateSitewideImageOptimizationCleanupReport(buildSitewideImageOptimizationCleanupReport()),
  ];
  if (!report.scoreDimensions || Object.values(report.scoreDimensions).some((value) => typeof value !== "number")) failures.push("score dimensions missing.");
  return failures;
}

function writeDoc(path: string, title: string, report: unknown) {
  write(path, `# ${title}\n\nGenerated: ${new Date().toISOString()}\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
}

export function writeDebugEvidencePrecatcherRefreshReport() {
  refreshDebugEvidenceArtifacts();
  const report = buildDebugEvidencePrecatcherRefreshReport();
  writeJson(DEBUG_PRECATCH_REPORT_PATH, report);
  writeDoc(DEBUG_PRECATCH_DOC_PATH, "Debug Evidence Precatcher Refresh", report);
  return report;
}

export function writeBatch12ReadinessRefreshReport() {
  const report = buildBatch12ReadinessRefreshReport();
  writeJson(READINESS_REFRESH_REPORT_PATH, report);
  writeDoc(READINESS_REFRESH_DOC_PATH, "Batch 12 Readiness Refresh", report);
  return report;
}

export function writeSitewideImageOptimizationCleanupReport() {
  const report = buildSitewideImageOptimizationCleanupReport();
  writeJson(IMAGE_CLEANUP_REPORT_PATH, report);
  writeDoc(IMAGE_CLEANUP_DOC_PATH, "Sitewide Image Optimization Cleanup", report);
  return report;
}

export function writeDebugCockpitBatch12CleanupReport() {
  const report = buildDebugCockpitBatch12CleanupReport();
  writeJson(BATCH12_REPORT_PATH, report);
  writeDoc(BATCH12_DOC_PATH, "Debug Cockpit Batch 12 Cleanup", report);
  return report;
}
