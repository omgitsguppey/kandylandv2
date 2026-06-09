import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  BILLING_SPIKE_FORBIDDEN_COMMANDS,
  BILLING_SPIKE_RADAR_REPORT_PATH,
  BILLING_SPIKE_REQUIRED_COMMANDS,
  BILLING_SPIKE_SURFACES,
  type BillingSpikeRadarEvaluation,
  type BillingSpikeRadarReport,
  type BillingSpikeRiskTier,
  type BillingSpikeSourcePatternFinding,
  type BillingSpikeSurfaceEntry,
} from "../../src/lib/cost/billing-spike-contract";
import {
  billingRiskTierFromScore,
  computeAnalyticsIngestRisk,
  computeBuildDeployChurnRisk,
  computeDebugLogRisk,
  computeFirestoreListenerRisk,
  computeMaterializerRisk,
  computeMediaEgressRisk,
  computeNotificationFanoutRisk,
  computeUploadRetryRisk,
} from "../../src/lib/cost/billing-spike-risk-score";

const repoRoot = process.cwd();

function repoPath(relativePath: string) {
  return path.join(repoRoot, relativePath);
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/gu, "/");
}

function walkFiles(startPath: string): string[] {
  const absoluteStart = repoPath(startPath);
  if (!existsSync(absoluteStart)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(absoluteStart, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      output.push(...walkFiles(normalizePath(path.join(startPath, entry.name))));
      continue;
    }
    output.push(normalizePath(path.join(startPath, entry.name)));
  }
  return output;
}

function patternMatches(pattern: string): string[] {
  const normalized = normalizePath(pattern);
  if (!normalized.includes("*")) return existsSync(repoPath(normalized)) ? [normalized] : [];
  const anchor = normalized.split("*")[0].replace(/\/$/u, "");
  const files = walkFiles(anchor.length > 0 ? anchor : ".");
  const regex = new RegExp(
    `^${normalized
      .replace(/\*\*/gu, "__GLOBSTAR__")
      .replace(/\*/gu, "__STAR__")
      .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
      .replace(/__GLOBSTAR__/gu, ".*")
      .replace(/__STAR__/gu, "[^/]*")}$`,
    "u",
  );
  return files.filter((filePath) => regex.test(filePath));
}

function computeRiskScore(entry: BillingSpikeSurfaceEntry) {
  switch (entry.surface) {
    case "firestore_realtime_listeners":
      return computeFirestoreListenerRisk({ activeListeners: 30, averageDocsPerSnapshot: 60, reconnectRate: 1.4, updateRate: 2 });
    case "cloud_logging_debug_evidence_volume":
    case "four_xx_logging_volume":
      return computeDebugLogRisk({ eventsPerMinute: 600, avgLogBytes: 600, dedupeMissRate: 0.6 });
    case "analytics_guest_ingest_volume":
      return computeAnalyticsIngestRisk({ sessionsPerMinute: 120, eventsPerSession: 16, writesPerEvent: 1 });
    case "analytics_identified_ingest_volume":
      return computeAnalyticsIngestRisk({ sessionsPerMinute: 80, eventsPerSession: 22, writesPerEvent: 1 });
    case "storage_media_egress":
      return computeMediaEgressRisk({ viewsPerMinute: 220, avgMediaBytes: 450_000, uncachedRate: 0.45 });
    case "notification_fanout_retry_storms":
    case "creator_broadcast_fanout":
      return computeNotificationFanoutRisk({ recipients: 1_500, writesPerRecipient: 1.2, retryMultiplier: 1.6 });
    case "cloud_build_deploy_churn":
    case "release_note_version_update_loops":
      return computeBuildDeployChurnRisk({ commitsPerDay: 40, buildMinutesPerDeploy: 8, deployTriggeredRate: 0.35 });
    case "firestore_unbounded_collection_reads":
    case "behavioral_rebuild_jobs":
    case "daily_task_reset_materializer_loops":
      return computeMaterializerRisk({ usersScanned: 2_500, docsReadPerUser: 18, runsPerDay: 24 });
    case "storage_upload_retries":
      return computeUploadRetryRisk({ filesPerBatch: 8, avgFileBytes: 8_000_000, retryCount: 2 });
    default:
      return 12_000;
  }
}

function toTierScore(tier: BillingSpikeRiskTier) {
  if (tier === "critical") return 100;
  if (tier === "high") return 80;
  if (tier === "review") return 60;
  if (tier === "watch") return 35;
  return 15;
}

const STALE_SOURCE_PATTERN_REPLACEMENTS: Record<string, { replacementPatterns: string[]; reason: string }> = {
  "docs/agent-truth/watch-time-truth-v2.md": {
    replacementPatterns: ["docs/agent-truth/runtime-watch-time-v2.md"],
    reason: "Runtime watch-time v2 evidence moved to the runtime-watch-time-v2 report.",
  },
  "src/lib/creator-dashboard/creator-broadcasts.ts": {
    replacementPatterns: [
      "src/lib/creator-broadcasts/broadcast-contract.ts",
      "src/lib/notifications/creator-broadcast-notifications.ts",
    ],
    reason: "Creator broadcast source truth was split into broadcast contract and notification fanout owners.",
  },
};

const MANUAL_EVIDENCE_PATTERNS = [
  ".github/workflows/**",
  "dataconnect/dataconnect.yaml",
] as const;

function classifyMissingSourcePattern(pattern: string): BillingSpikeSourcePatternFinding {
  const staleReplacement = STALE_SOURCE_PATTERN_REPLACEMENTS[pattern];
  if (staleReplacement) {
    return {
      pattern,
      classification: "stale_detector_pattern",
      reason: staleReplacement.reason,
      nextAction: `Update the billing radar sourceFiles entry to ${staleReplacement.replacementPatterns.join(", ")}.`,
      replacementPatterns: staleReplacement.replacementPatterns,
    };
  }

  if (MANUAL_EVIDENCE_PATTERNS.includes(pattern as (typeof MANUAL_EVIDENCE_PATTERNS)[number])) {
    return {
      pattern,
      classification: "external_manual_evidence_required",
      reason: "This pattern depends on repository/hosted infrastructure evidence rather than a product source module.",
      nextAction: "Keep as manual evidence until a local policy file or workflow artifact owns the guardrail.",
    };
  }

  return {
    pattern,
    classification: "real_missing_coverage",
    reason: "No matching source path was found for this billing multiplier surface.",
    nextAction: "Add or point the detector at the canonical source owner before treating the surface as covered.",
  };
}

function buildTierFinding(entry: BillingSpikeSurfaceEntry, computedTier: BillingSpikeRiskTier) {
  if (computedTier === entry.riskTier) return null;
  return {
    declaredTier: entry.riskTier,
    computedTier,
    classification: "tier_calibration_review" as const,
    reason: "The deterministic sample risk model does not match the contract's declared watch tier.",
    nextAction: "Review whether the declared tier is a promo-week policy ceiling or whether computeRiskScore needs surface-specific inputs.",
  };
}

function evaluateSurface(entry: BillingSpikeSurfaceEntry): BillingSpikeRadarEvaluation {
  const sourceFilesPresent = Array.from(new Set(entry.sourceFiles.flatMap(patternMatches)));
  const sourceFilesMissing = entry.sourceFiles.filter((sourceFile) => patternMatches(sourceFile).length === 0);
  const sourcePatternFindings = sourceFilesMissing.map(classifyMissingSourcePattern);
  const riskScore = computeRiskScore(entry);
  const computedTier = billingRiskTierFromScore(riskScore);
  const tierMismatch = computedTier !== entry.riskTier;
  const tierFinding = buildTierFinding(entry, computedTier);
  const hasOwner = entry.owner.trim().length > 0;
  const hasRecommendedCap = entry.recommendedCap.trim().length > 0;
  const hasEmergencySwitch = entry.emergencyDisableSwitch.trim().length > 0;
  const status = !hasOwner || !hasRecommendedCap || !hasEmergencySwitch || sourceFilesPresent.length === 0
    ? "fail"
    : sourceFilesMissing.length > 0 || tierMismatch
      ? "warning"
      : "pass";

  return {
    ...entry,
    sourceFilesPresent,
    sourceFilesMissing,
    sourcePatternFindings,
    computedTier,
    riskTierMatches: !tierMismatch,
    tierFinding,
    hasOwner,
    hasRecommendedCap,
    hasEmergencySwitch,
    riskScore,
    status,
  };
}

function readIfExists(relativePath: string) {
  const fullPath = repoPath(relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function buildReport(): BillingSpikeRadarReport {
  const surfaces = BILLING_SPIKE_SURFACES.map(evaluateSurface);
  const warnings: string[] = [];
  const criticalBlockers: string[] = [];

  for (const evaluation of surfaces) {
    if (evaluation.status === "fail") {
      criticalBlockers.push(`${evaluation.surface}: incomplete ownership/cap/switch/source coverage.`);
    } else {
      for (const finding of evaluation.sourcePatternFindings) {
        warnings.push(`${evaluation.surface}: ${finding.classification} for ${finding.pattern}; ${finding.nextAction}`);
      }
      if (evaluation.tierFinding) {
        warnings.push(
          `${evaluation.surface}: tier_calibration_review declared=${evaluation.tierFinding.declaredTier} computed=${evaluation.tierFinding.computedTier}; ${evaluation.tierFinding.nextAction}`,
        );
      }
    }
  }

  const adminUsersSource = readIfExists("src/lib/server/admin-overview-users.ts");
  if (/onSnapshot\(/u.test(adminUsersSource)) {
    criticalBlockers.push("admin_overview_users: realtime listener detected in admin business metric lane.");
  }

  const fourXxDedupeSource = readIfExists("src/lib/server/route-4xx-dedupe.ts");
  if (!/fingerprint|dedupe|count/iu.test(fourXxDedupeSource)) {
    criticalBlockers.push("four_xx_logging_volume: missing dedupe fingerprint evidence.");
  }

  const mediaRouteSource = readIfExists("src/app/api/drops/content/route.ts");
  if (!/Cache-Control|MEDIA_PROXY_MAX_BYTES_PER_REQUEST|MEDIA_PROXY/iu.test(mediaRouteSource)) {
    criticalBlockers.push("storage_media_egress: media route lacks cache/byte/rate guard evidence.");
  }

  const fcmSource = readIfExists("src/lib/server/fcm-utils.ts");
  if (!/FCM_MAX_RETRIES_PER_BROADCAST|duplicatePushPreventedCount/iu.test(fcmSource)) {
    criticalBlockers.push("notification_fanout_retry_storms: retry or dedupe cap evidence missing.");
  }

  const releaseSource = readIfExists("src/lib/release-notes/release-version-contract.ts");
  if (!/generated|agent\/state|package-lock\.json/iu.test(releaseSource)) {
    criticalBlockers.push("release_note_version_update_loops: generated-only churn exclusions missing.");
  }

  const watchlist = surfaces
    .filter((surface) => surface.riskTier === "critical" || surface.riskTier === "high")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map((surface) => `${surface.surface} (${surface.riskTier}, score=${Math.round(surface.riskScore)})`);

  const weightedRiskTotal = surfaces.reduce((sum, entry) => sum + toTierScore(entry.riskTier), 0);
  const maxRiskTotal = BILLING_SPIKE_SURFACES.length * 100;
  const overallRiskScore = Math.round((weightedRiskTotal / Math.max(1, maxRiskTotal)) * 100);
  const status = criticalBlockers.length > 0 ? "fail" : warnings.length > 0 ? "warning" : "pass";
  const topSpikeRisks = [...surfaces].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    status,
    overallRiskScore,
    topSpikeRisks,
    surfaces,
    criticalBlockers: Array.from(new Set(criticalBlockers)),
    warnings: Array.from(new Set(warnings)),
    watchlist,
    requiredCommands: [...BILLING_SPIKE_REQUIRED_COMMANDS],
    forbiddenCommands: [...BILLING_SPIKE_FORBIDDEN_COMMANDS],
    summary: `${surfaces.length} billing multiplier surfaces classified; ${criticalBlockers.length} critical blockers, ${warnings.length} actionable coverage findings.`,
  };
}

const report = buildReport();
mkdirSync(path.dirname(repoPath(BILLING_SPIKE_RADAR_REPORT_PATH)), { recursive: true });
writeFileSync(repoPath(BILLING_SPIKE_RADAR_REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`);

if (report.status === "fail") {
  console.error(`Billing spike radar: FAIL (${report.criticalBlockers.length} critical blockers).`);
  process.exitCode = 1;
} else {
  console.log(`Billing spike radar: ${report.status.toUpperCase()} (overallRiskScore=${report.overallRiskScore}).`);
}
