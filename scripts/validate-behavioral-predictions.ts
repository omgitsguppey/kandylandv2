import fs from "node:fs";
import path from "node:path";

import {
  BEHAVIORAL_SOURCE_RELIABILITY_WEIGHTS,
  resolveBehavioralModelActivation,
} from "@/lib/behavioral/behavioral-math-calibration";

const repoRoot = process.cwd();
const REPORT_PATH = path.resolve(repoRoot, "agent/state/behavioral-math-calibration.generated.json");
const MODEL_VALIDATION_PATH = path.resolve(repoRoot, "agent/state/behavioral-model-validation.generated.json");
const RECOMMENDATION_ARTIFACT_PATH = path.resolve(repoRoot, "agent/state/recommendation-model.generated.json");

type ModelValidationReport = {
  generatedAt?: string;
  models?: {
    recommendationRanker?: {
      trainingSampleSize?: number;
      validationSampleSize?: number;
      trainingSource?: string;
      activeMode?: string;
      metrics?: {
        precisionAt5?: number;
        precisionAt10?: number;
        hitRate?: number;
        calibrationError?: number;
        coverage?: number;
      };
      baselineComparison?: {
        beatsBaseline?: boolean;
        baselineMetrics?: {
          precisionAt5?: number;
          precisionAt10?: number;
          hitRate?: number;
          calibrationError?: number;
        };
      };
    };
    userValueScore?: {
      metrics?: { hitRate?: number; calibrationError?: number; coverage?: number };
      baselineComparison?: { beatsBaseline?: boolean };
    };
    userEngagementScore?: {
      metrics?: { hitRate?: number; calibrationError?: number; coverage?: number };
      baselineComparison?: { beatsBaseline?: boolean };
    };
    watchTimeEstimation?: {
      metrics?: { hitRate?: number; calibrationError?: number; coverage?: number };
      baselineComparison?: { beatsBaseline?: boolean };
    };
  };
};

type RecommendationArtifact = {
  sampleCount?: number;
  trainingSource?: string;
};

function readJson<T>(relativeOrAbsolutePath: string): T | null {
  try {
    const absolutePath = path.isAbsolute(relativeOrAbsolutePath)
      ? relativeOrAbsolutePath
      : path.resolve(repoRoot, relativeOrAbsolutePath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readText(relativePath: string) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

function boolToCoverage(items: boolean[]) {
  if (items.length === 0) {
    return 0;
  }

  return Math.round((items.filter(Boolean).length / items.length) * 1000) / 1000;
}

function main() {
  const modelReport = readJson<ModelValidationReport>(MODEL_VALIDATION_PATH);
  const artifact = readJson<RecommendationArtifact>(RECOMMENDATION_ARTIFACT_PATH);
  const recommendation = modelReport?.models?.recommendationRanker;
  const deterministicMetrics = recommendation?.baselineComparison?.baselineMetrics ?? {};
  const sampleSize = Math.max(
    0,
    artifact?.sampleCount ?? recommendation?.trainingSampleSize ?? 0,
  );
  const activation = resolveBehavioralModelActivation({
    sampleSize,
    mlPrecisionAt5: recommendation?.metrics?.precisionAt5 ?? 0,
    deterministicPrecisionAt5: deterministicMetrics.precisionAt5 ?? 0,
    mlHitRate: recommendation?.metrics?.hitRate ?? 0,
    deterministicHitRate: deterministicMetrics.hitRate ?? 0,
    mlCalibrationError: recommendation?.metrics?.calibrationError ?? 1,
    deterministicCalibrationError: deterministicMetrics.calibrationError ?? 1,
  });

  const ingestRoute = readText("src/app/api/analytics/ingest-identified/route.ts");
  const runtime = readText("functions/src/behavioral-intelligence-runtime.ts");
  const ledger = readText("src/lib/gumdrop-ledger.ts");
  const watchScoring = readText("src/lib/watch-time-scoring.ts");
  const rankingFeatures = readText("src/lib/recommendations/ranking-features.ts");

  const purchaseTruthPresent = (ingestRoute.includes('"server_purchase_verified"') || ingestRoute.includes('"purchase_verified"'))
    && ledger.includes("isCanonicalPurchaseTransaction")
    && runtime.includes("serverPurchaseCount");
  const entitlementUnlockTruthPresent = ingestRoute.includes('"entitlement_granted"')
    && runtime.includes("serverUnlockCount")
    && runtime.includes("server_entitlement_unlock");
  const watchSessionTruthPresent = watchScoring.includes("computeLiteralValidWatchMs")
    && runtime.includes("watch_session_rollup");
  const legacyPageDurationDemoted = runtime.includes('watchScoreConfidence: watchScoreSource === "watch_session_rollup" ? "high" : watchScoreSource === "legacy_page_duration" ? "low"')
    && !runtime.includes('legacy_page_duration" ? "high"');
  const predictionOutputsPresent = [
    "pPurchase7d",
    "pUnlock24h",
    "pWatchComplete",
    "pReturn7d",
    "pCreatorFollow",
    "pNegativeFeedback",
  ].every((field) => rankingFeatures.includes(field) && runtime.includes(field));

  const sourceTruthCoverage = boolToCoverage([
    purchaseTruthPresent,
    entitlementUnlockTruthPresent,
    watchSessionTruthPresent,
    legacyPageDurationDemoted,
    predictionOutputsPresent,
  ]);

  const criticalFindings = [
    purchaseTruthPresent ? null : "Missing canonical purchase truth in behavioral prediction inputs.",
    entitlementUnlockTruthPresent ? null : "Missing canonical entitlement unlock truth in behavioral prediction inputs.",
    watchSessionTruthPresent ? null : "Missing watch-session rollup truth in behavioral prediction inputs.",
    legacyPageDurationDemoted ? null : "Legacy page duration can be mistaken for verified watch truth.",
    predictionOutputsPresent ? null : "Prediction outputs are not present across ranking and materialization.",
  ].filter((finding): finding is string => Boolean(finding));

  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceReliabilityWeights: BEHAVIORAL_SOURCE_RELIABILITY_WEIGHTS,
    activeMode: activation.activeMode,
    activationVerdict: activation.verdict,
    activationReasons: activation.reasons,
    validationMetrics: {
      precisionAt5: recommendation?.metrics?.precisionAt5 ?? 0,
      precisionAt10: recommendation?.metrics?.precisionAt10 ?? 0,
      unlockHitRateWithin24h: recommendation?.metrics?.hitRate ?? 0,
      purchaseHitRateWithin7d: modelReport?.models?.userValueScore?.metrics?.hitRate ?? 0,
      watchCompletionHitRate: modelReport?.models?.watchTimeEstimation?.metrics?.hitRate ?? 0,
      returnHitRateWithin7d: modelReport?.models?.userEngagementScore?.metrics?.hitRate ?? 0,
      calibrationError: recommendation?.metrics?.calibrationError ?? 0,
      deterministicBaselineComparison: {
        baselineName: "deterministic_goal_calibrated_ranker",
        beatsBaseline: recommendation?.baselineComparison?.beatsBaseline === true,
        deterministicPrecisionAt5: deterministicMetrics.precisionAt5 ?? 0,
        deterministicPrecisionAt10: deterministicMetrics.precisionAt10 ?? 0,
        deterministicHitRate: deterministicMetrics.hitRate ?? 0,
        deterministicCalibrationError: deterministicMetrics.calibrationError ?? 0,
      },
      sampleSize,
      validationSampleSize: recommendation?.validationSampleSize ?? 0,
      sourceTruthCoverage,
    },
    truthRequirements: {
      purchaseTruthPresent,
      entitlementUnlockTruthPresent,
      watchSessionTruthPresent,
      legacyPageDurationDemoted,
      predictionOutputsPresent,
      criticalFindings,
    },
    modelPolicy: {
      minimumMlSampleSize: 50,
      mlVerdictsActive: activation.activeMode !== "deterministic",
      deterministicStaysActiveWhenMlUnderperforms: true,
      trainingSource: artifact?.trainingSource ?? recommendation?.trainingSource ?? "unknown",
    },
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`[behavioral-predictions] wrote ${REPORT_PATH}`);
  console.log(`[behavioral-predictions] activeMode=${report.activeMode} sampleSize=${sampleSize} sourceTruthCoverage=${sourceTruthCoverage}`);

  if (criticalFindings.length > 0) {
    criticalFindings.forEach((finding) => console.error(`[behavioral-predictions] CRITICAL ${finding}`));
    process.exitCode = 1;
  }
}

main();
