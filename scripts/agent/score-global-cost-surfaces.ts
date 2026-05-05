import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  GLOBAL_COST_BUCKET_WEIGHTS,
  GLOBAL_COST_FORBIDDEN_DEFAULT_COMMANDS,
  GLOBAL_COST_HARD_LIMITS,
  GLOBAL_COST_MINIMAL_COMMANDS,
  GLOBAL_COST_REPORT_PATH,
  GLOBAL_COST_SURFACE_BUCKETS,
  GLOBAL_COST_SURFACE_CONTRACTS,
  type GlobalCostFinding,
  type GlobalCostFindingSeverity,
  type GlobalCostScoreBucket,
  type GlobalCostSurfaceContract,
  type GlobalCostSurfaceEvaluation,
  type GlobalCostSurfaceReport,
} from "../../src/lib/server/global-cost-surface-contract";

const repoRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".yml", ".yaml", ".md", ".rules"]);
const skipDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "playwright-report",
  "test-results",
  "lighthouse-results",
]);

const severityImpact: Record<GlobalCostFindingSeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

function repoPath(relativePath: string) {
  return path.join(repoRoot, relativePath);
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/gu, "/");
}

function readIfExists(relativePath: string) {
  const absolutePath = repoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function walkFiles(startPath: string): string[] {
  const absoluteStart = repoPath(startPath);
  if (!existsSync(absoluteStart)) return [];
  const output: string[] = [];

  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipDirectories.has(entry.name)) visit(path.join(directory, entry.name));
        continue;
      }
      if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) continue;
      output.push(normalizePath(path.relative(repoRoot, path.join(directory, entry.name))));
    }
  }

  visit(absoluteStart);
  return output.sort();
}

function patternMatches(pattern: string) {
  const normalized = normalizePath(pattern);
  if (!normalized.includes("*")) {
    return existsSync(repoPath(normalized)) ? [normalized] : [];
  }

  const anchor = normalized.split("*")[0].replace(/\/$/u, "");
  const start = anchor.length > 0 ? anchor : ".";
  return walkFiles(start).filter((filePath) => {
    const escaped = normalized
      .replace(/\*\*/gu, "__GLOBSTAR__")
      .replace(/\*/gu, "__STAR__")
      .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
      .replace(/__GLOBSTAR__/gu, ".*")
      .replace(/__STAR__/gu, "[^/]*");
    return new RegExp(`^${escaped}$`, "u").test(filePath);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

function addFinding(
  findings: GlobalCostFinding[],
  input: Omit<GlobalCostFinding, "id" | "scoreImpact"> & { scoreImpact?: number },
) {
  findings.push({
    id: `${input.surface}:${input.title.toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_|_$/gu, "")}`,
    scoreImpact: input.scoreImpact ?? severityImpact[input.severity],
    ...input,
  });
}

function evaluateContract(contract: GlobalCostSurfaceContract): GlobalCostSurfaceEvaluation {
  const sourceFilesPresent = Array.from(new Set(contract.sourceFiles.flatMap(patternMatches)));
  const sourceFilesMissing = contract.sourceFiles.filter((sourceFile) => patternMatches(sourceFile).length === 0);
  const hasLimits = [
    contract.maxEventsPerUserPerMinute,
    contract.maxEventsPerSession,
    contract.maxBytesPerRequest,
    contract.maxRowsPerRun,
    contract.maxRuntimeMs,
  ].some((value) => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const hasRatePolicy = contract.requiredRateLimit.trim().length > 0 && contract.requiredRateLimit !== "none";
  const hasDebugEvidencePolicy = contract.requiredDebugEvidence.trim().length > 0;
  const hasKillSwitchPolicy = contract.requiredKillSwitch.trim().length > 0;
  const status = !contract.owner || !hasLimits || !hasRatePolicy || !hasDebugEvidencePolicy || !hasKillSwitchPolicy || sourceFilesPresent.length === 0
    ? "fail"
    : sourceFilesMissing.length > sourceFilesPresent.length
      ? "warning"
      : "pass";

  return {
    ...contract,
    bucket: GLOBAL_COST_SURFACE_BUCKETS[contract.surface],
    sourceFilesPresent,
    sourceFilesMissing,
    hasOwner: contract.owner.trim().length > 0,
    hasLimits,
    hasRatePolicy,
    hasDebugEvidencePolicy,
    hasKillSwitchPolicy,
    status,
  };
}

function scanHardLimits(findings: GlobalCostFinding[]) {
  const telemetrySource = [
    readIfExists("src/hooks/useViewerWatchSession.ts"),
    readIfExists("src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts"),
    readIfExists("src/components/Analytics/DeepTracker.tsx"),
  ].join("\n");
  const tickMatch = /WATCH_VISIBLE_TICK_INTERVAL_MS\s*=\s*([0-9_]+)/u.exec(telemetrySource);
  const tickInterval = tickMatch ? Number(tickMatch[1].replace(/_/gu, "")) : null;
  if (tickInterval !== null && tickInterval < 5_000) {
    addFinding(findings, {
      surface: "telemetry_event_volume",
      severity: "critical",
      bucket: "telemetryEventVolume",
      title: "watch telemetry tick interval is too frequent",
      filePath: "src/hooks/useViewerWatchSession.ts",
      evidence: [`WATCH_VISIBLE_TICK_INTERVAL_MS=${tickInterval}`],
      expectedRule: "Watch/session visible ticks must be 5s or slower.",
      actualPattern: "Visible watch tick interval below 5000ms.",
      suggestedFix: "Raise watch tick interval to at least 5000ms and flush on close/visibility hidden.",
    });
  }
  if (/setInterval\s*\([\s\S]{0,220},\s*1_?000\s*\)/u.test(telemetrySource)) {
    addFinding(findings, {
      surface: "telemetry_event_volume",
      severity: "critical",
      bucket: "telemetryEventVolume",
      title: "one second telemetry interval detected",
      filePath: "src/components/Analytics/DeepTracker.tsx",
      evidence: ["setInterval(..., 1000)"],
      expectedRule: "No 1s telemetry ticks.",
      actualPattern: "setInterval with 1000ms delay in telemetry/watch code.",
      suggestedFix: "Batch or slow telemetry intervals to 5s+ and flush on lifecycle transitions.",
    });
  }

  const debugStore = readIfExists("src/lib/server/debug-evidence-store.ts");
  if (!includesAny(debugStore, [
    "DEBUG_EVIDENCE_MAX_EVENT_WRITES_PER_FINGERPRINT_PER_HOUR",
    "suppressedEventWriteCount",
  ])) {
    addFinding(findings, {
      surface: "debug_evidence_volume",
      severity: "critical",
      bucket: "loggingDebugEvidence",
      title: "debug evidence lacks per fingerprint write cap",
      filePath: "src/lib/server/debug-evidence-store.ts",
      evidence: ["Missing fingerprint hourly event-write cap evidence."],
      expectedRule: "Debug evidence must dedupe by fingerprint and roll up repeats instead of writing every instance.",
      actualPattern: "No source-visible hourly write cap.",
      suggestedFix: "Add a fingerprint/hour write cap and rollup suppressed repeats.",
    });
  }

  const diagnosticsSource = [
    readIfExists("src/lib/server/server-diagnostics.ts"),
    readIfExists("src/lib/server/route-diagnostics.ts"),
    readIfExists("src/lib/debug-evidence-contract.ts"),
  ].join("\n");
  if (!includesAny(diagnosticsSource, ["slice(0, 500)", "slice(0, 20)"]) || !diagnosticsSource.includes("contentUrl")) {
    addFinding(findings, {
      surface: "cloud_logging_volume",
      severity: "major",
      bucket: "loggingDebugEvidence",
      title: "diagnostic logging caps or redaction evidence missing",
      filePath: "src/lib/server/server-diagnostics.ts",
      evidence: ["Expected capped fields and contentUrl redaction evidence."],
      expectedRule: "No giant logs and sensitive fields must be redacted.",
      actualPattern: "Missing detail cap or content URL redaction marker.",
      suggestedFix: "Cap diagnostic detail previews and redact raw content URL fields.",
    });
  }

  const mediaRoute = readIfExists("src/app/api/drops/content/route.ts");
  for (const [needle, title] of [
    ["MEDIA_PROXY", "media route lacks MEDIA_PROXY rate policy"],
    ["MEDIA_PROXY_MAX_BYTES_PER_REQUEST", "media route lacks byte budget"],
    ["cache: \"no-store\"", "media route lacks no-store upstream fetch"],
    ["Cache-Control", "media route lacks private cache header"],
    ["isAllowedRemoteMediaUrl", "media route lacks allowed-host guard"],
  ] as const) {
    if (!mediaRoute.includes(needle)) {
      addFinding(findings, {
        surface: "media_signed_url_access",
        severity: "critical",
        bucket: "mediaStorageImage",
        title,
        filePath: "src/app/api/drops/content/route.ts",
        evidence: [`Missing ${needle}`],
        expectedRule: "Media routes require byte, rate, cache, entitlement, and host guards.",
        actualPattern: `Missing ${needle}`,
        suggestedFix: "Add source-visible media proxy guard evidence.",
      });
    }
  }

  const fcmSource = readIfExists("src/lib/server/fcm-utils.ts");
  for (const needle of [
    "FCM_MULTICAST_BATCH_SIZE",
    "FCM_MAX_RECIPIENTS_PER_BROADCAST_RUN",
    "FCM_MAX_RETRIES_PER_BROADCAST",
    "duplicatePushPreventedCount",
  ]) {
    if (!fcmSource.includes(needle)) {
      addFinding(findings, {
        surface: "fcm_notification_fanout",
        severity: "critical",
        bucket: "authNotificationAbuse",
        title: "notification fanout cap missing",
        filePath: "src/lib/server/fcm-utils.ts",
        evidence: [`Missing ${needle}`],
        expectedRule: "Notification fan-out requires batch, recipient, retry, and dedupe caps.",
        actualPattern: `Missing ${needle}`,
        suggestedFix: "Add source-visible fan-out caps and broadcast report evidence.",
      });
    }
  }

  for (const routeFile of [
    "src/app/api/auth/manual-sign-in-lookup/route.ts",
    "src/app/api/auth/navigation-session/route.ts",
    "src/app/api/user/register/route.ts",
  ]) {
    const source = readIfExists(routeFile);
    if (!source.includes("guardApiRequest") || !source.includes("rateLimit") || !source.includes("requireTrustedOrigin")) {
      addFinding(findings, {
        surface: "firebase_auth_abuse",
        severity: "critical",
        bucket: "authNotificationAbuse",
        title: "auth route lacks abuse guard",
        filePath: routeFile,
        evidence: ["Expected guardApiRequest, rateLimit, and requireTrustedOrigin."],
        expectedRule: "Signup/login/reset routes require abuse/rate policy and trusted origin.",
        actualPattern: "Missing route abuse guard evidence.",
        suggestedFix: "Route the auth surface through guardApiRequest with rate limit and trusted origin.",
      });
    }
  }

  for (const scriptFile of [
    "scripts/rebuild-analytics-truth.ts",
    "scripts/rebuild-behavioral-intelligence.ts",
  ]) {
    const source = readIfExists(scriptFile);
    for (const needle of ["--dry-run", "MAX_ROWS", "MAX_RUNTIME_MS", "MAX_RETRIES"]) {
      if (!source.includes(needle)) {
        addFinding(findings, {
          surface: "analytics_materializers",
          severity: "critical",
          bucket: "rebuildMaterializersImportExport",
          title: "rebuild script lacks cost budget",
          filePath: scriptFile,
          evidence: [`Missing ${needle}`],
          expectedRule: "Rebuild jobs require dry-run, max rows, max runtime, and retry cap.",
          actualPattern: `Missing ${needle}`,
          suggestedFix: "Add source-visible rebuild budget constants and dry-run mode.",
        });
      }
    }
  }

  const ciSource = readIfExists(".github/workflows/ci.yml");
  if (/playwright|cypress|lighthouse|check:ui:audits|check:ui:lighthouse|npm run check(?:\s|$)/imu.test(ciSource)) {
    addFinding(findings, {
      surface: "browser_audit_tooling",
      severity: "critical",
      bucket: "ciBuildTestTooling",
      title: "default CI runs broad browser or full checks",
      filePath: ".github/workflows/ci.yml",
      evidence: ["Default CI contains forbidden broad audit command."],
      expectedRule: "Browser/visual/full-suite audits are default-off in CI.",
      actualPattern: "Forbidden command appears in CI default workflow.",
      suggestedFix: "Move broad browser/full checks behind explicit workflow_dispatch or owner-approved jobs.",
    });
  }

  const telemetrySafety = [
    readIfExists("src/lib/telemetry.ts"),
    readIfExists("src/components/Analytics/DeepTracker.tsx"),
    readIfExists("src/app/api/analytics/ingest/route.ts"),
    readIfExists("src/app/api/analytics/ingest-identified/route.ts"),
  ].join("\n");
  if (/(contentUrl|contentUrls|downloadURL|signedUrl|targetUrl)/u.test(telemetrySafety)) {
    addFinding(findings, {
      surface: "telemetry_event_volume",
      severity: "critical",
      bucket: "telemetryEventVolume",
      title: "raw content url telemetry detected",
      filePath: "src/lib/telemetry.ts",
      evidence: ["Telemetry source contains raw content URL token."],
      expectedRule: "Telemetry must not send raw/internal content URLs.",
      actualPattern: "Raw URL-like content field in telemetry path.",
      suggestedFix: "Replace raw URL fields with dropId/fileId/assetKey/mediaIndex metadata.",
    });
  }

  const releaseContract = readIfExists("src/lib/release-notes/release-version-contract.ts");
  const hasGeneratedStateExclusion = releaseContract.includes("agent\\/state") || releaseContract.includes("agent/state");
  if (!hasGeneratedStateExclusion || !releaseContract.includes(".generated.json") || !releaseContract.includes("package-lock.json")) {
    addFinding(findings, {
      surface: "cloud_build_minutes",
      severity: "major",
      bucket: "ciBuildTestTooling",
      title: "generated reports can inflate release/build churn",
      filePath: "src/lib/release-notes/release-version-contract.ts",
      evidence: ["Release exclusion list missing generated/package-lock protections."],
      expectedRule: "Generated reports and package-lock-only changes must not inflate public version/build/audit cost.",
      actualPattern: "Missing generated artifact exclusion marker.",
      suggestedFix: "Add generated report/build artifact exclusions to release bumping.",
    });
  }
}

function buildReport() {
  const findings: GlobalCostFinding[] = [];
  const evaluations = GLOBAL_COST_SURFACE_CONTRACTS.map(evaluateContract);
  const seenSurfaces = new Set<string>();

  for (const evaluation of evaluations) {
    if (seenSurfaces.has(evaluation.surface)) {
      addFinding(findings, {
        surface: evaluation.surface,
        severity: "critical",
        bucket: evaluation.bucket,
        title: "duplicate cost surface contract",
        filePath: "src/lib/server/global-cost-surface-contract.ts",
        evidence: [evaluation.surface],
        expectedRule: "Each global cost surface is declared exactly once.",
        actualPattern: "Duplicate surface id.",
        suggestedFix: "Remove duplicate contract entry.",
      });
    }
    seenSurfaces.add(evaluation.surface);

    if (evaluation.status === "fail") {
      addFinding(findings, {
        surface: evaluation.surface,
        severity: "major",
        bucket: evaluation.bucket,
        title: "cost surface contract incomplete",
        filePath: "src/lib/server/global-cost-surface-contract.ts",
        evidence: [
          `hasOwner=${evaluation.hasOwner}`,
          `hasLimits=${evaluation.hasLimits}`,
          `hasRatePolicy=${evaluation.hasRatePolicy}`,
          `sourceFilesPresent=${evaluation.sourceFilesPresent.length}`,
        ],
        expectedRule: "Every cost surface has owner, limits, rate policy, debug evidence, kill switch, and source files.",
        actualPattern: "Contract metadata incomplete.",
        suggestedFix: "Complete the cost surface contract entry.",
      });
    }
  }

  scanHardLimits(findings);

  const bucketDeductions = Object.fromEntries(
    Object.keys(GLOBAL_COST_BUCKET_WEIGHTS).map((bucket) => [bucket, 0]),
  ) as Record<GlobalCostScoreBucket, number>;
  for (const finding of findings) {
    bucketDeductions[finding.bucket] += Math.abs(finding.scoreImpact);
  }

  const bucketScores = Object.fromEntries(
    Object.entries(GLOBAL_COST_BUCKET_WEIGHTS).map(([bucket, weight]) => [
      bucket,
      clamp(weight - bucketDeductions[bucket as GlobalCostScoreBucket], 0, weight),
    ]),
  ) as Record<GlobalCostScoreBucket, number>;
  const overallScore = Math.round(Object.values(bucketScores).reduce((sum, value) => sum + value, 0));
  const criticalFindings = findings.filter((finding) => finding.severity === "critical");
  const status = criticalFindings.length > 0
    ? "fail"
    : overallScore >= 95
      ? "clean"
      : overallScore >= 90
        ? "pass"
        : overallScore >= 80
          ? "warning"
          : "fail";

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    status,
    bucketScores,
    bucketWeights: GLOBAL_COST_BUCKET_WEIGHTS,
    surfaces: evaluations,
    findings,
    criticalFindings,
    hardLimits: [...GLOBAL_COST_HARD_LIMITS],
    minimalVerificationCommands: [...GLOBAL_COST_MINIMAL_COMMANDS],
    forbiddenCommands: [...GLOBAL_COST_FORBIDDEN_DEFAULT_COMMANDS],
    summary: `${evaluations.length} global cost surfaces classified; ${criticalFindings.length} critical findings.`,
  } satisfies GlobalCostSurfaceReport;
}

const report = buildReport();
mkdirSync(path.dirname(repoPath(GLOBAL_COST_REPORT_PATH)), { recursive: true });
writeFileSync(repoPath(GLOBAL_COST_REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`);

if (report.criticalFindings.length > 0) {
  console.error(`Global cost score: ${report.overallScore}/100 (${report.status}) with ${report.criticalFindings.length} critical findings.`);
  process.exitCode = 1;
} else {
  console.log(`Global cost score: ${report.overallScore}/100 (${report.status}); ${report.surfaces.length} surfaces classified.`);
}
