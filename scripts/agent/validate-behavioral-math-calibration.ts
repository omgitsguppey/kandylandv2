import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

type Check = {
  label: string;
  pass: boolean;
  detail: string;
};

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.resolve(repoRoot, relativePath));
}

function check(label: string, pass: boolean, detail: string): Check {
  return { label, pass, detail };
}

function parseJson<T>(relativePath: string): T | null {
  try {
    return JSON.parse(read(relativePath)) as T;
  } catch {
    return null;
  }
}

type CalibrationReport = {
  activeMode?: string;
  validationMetrics?: {
    sampleSize?: number;
    sourceTruthCoverage?: number;
    precisionAt5?: number;
    precisionAt10?: number;
    unlockHitRateWithin24h?: number;
    purchaseHitRateWithin7d?: number;
    watchCompletionHitRate?: number;
    returnHitRateWithin7d?: number;
    calibrationError?: number;
    deterministicBaselineComparison?: {
      beatsBaseline?: boolean;
    };
  };
  truthRequirements?: {
    purchaseTruthPresent?: boolean;
    entitlementUnlockTruthPresent?: boolean;
    legacyPageDurationDemoted?: boolean;
    criticalFindings?: string[];
  };
};

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const contract = read("src/lib/behavioral/behavioral-math-calibration.ts");
  const rankingFeatures = read("src/lib/recommendations/ranking-features.ts");
  const deterministicRanker = read("src/lib/recommendations/deterministic-ranker.ts");
  const mlRanker = read("src/lib/recommendations/ml-ranker.ts");
  const candidateGeneration = read("src/lib/recommendations/candidate-generation.ts");
  const explorationPolicy = read("src/lib/recommendations/exploration-policy.ts");
  const runtime = read("functions/src/behavioral-intelligence-runtime.ts");
  const rollupContract = read("src/lib/user-behavior-rollup-contract.ts");
  const rollupHelper = read("src/lib/server/user-behavior-rollup.ts");
  const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
  const usersPage = read("src/app/admin/users/page.tsx");
  const predictionsScript = read("scripts/validate-behavioral-predictions.ts");
  const report = parseJson<CalibrationReport>("agent/state/behavioral-math-calibration.generated.json");
  const docs = read("docs/agent-truth/behavioral-math-calibration.md");

  const requiredPredictionFields = [
    "pPurchase7d",
    "pUnlock24h",
    "pWatchComplete",
    "pReturn7d",
    "pCreatorFollow",
    "pNegativeFeedback",
  ];

  const checks: Check[] = [
    check(
      "package scripts exist",
      packageJson.scripts?.["check:behavioral-math-calibration"] === "tsx scripts/agent/validate-behavioral-math-calibration.ts"
        && packageJson.scripts?.["validate:behavioral-predictions"] === "tsx scripts/validate-behavioral-predictions.ts",
      "Package must expose the targeted calibration and prediction validators.",
    ),
    check(
      "source reliability weights exist",
      [
        "server_transaction: 1",
        "server_entitlement_unlock: 1",
        "watch_session_rollup: 0.95",
        "server_creator_relationship: 0.9",
        "identified_event_fact: 0.75",
        "client_ui_event: 0.6",
        "guest_batch: 0.45",
        "legacy_page_duration: 0.2",
      ].every((fragment) => contract.includes(fragment)),
      "Behavioral math contract must carry the requested source reliability weights.",
    ),
    check(
      "truth score formula exists",
      contract.includes("(0.4 * clamp01(input.sourceReliability))")
        && contract.includes("(0.25 * clamp01(input.freshnessScore))")
        && contract.includes("(0.2 * clamp01(input.sampleScore))")
        && contract.includes("(0.1 * clamp01(input.schemaCompleteness))")
        && contract.includes("(0.05 * clamp01(input.sourceDisagreementPenalty))"),
      "Truth score must use source reliability, freshness, sample, schema, and disagreement penalty.",
    ),
    check(
      "engagement formula exists",
      contract.includes("(0.24 * clamp01(input.purchaseSignal))")
        && contract.includes("(0.23 * clamp01(input.unwrapSignal))")
        && contract.includes("(0.23 * clamp01(input.validWatchSignal))")
        && contract.includes("(0.13 * clamp01(input.return7dSignal))")
        && contract.includes("(0.1 * clamp01(input.meaningfulActionSignal))")
        && contract.includes("(0.07 * clamp01(input.freeIntentSignal))"),
      "Engagement score must match the product-goal weights.",
    ),
    check(
      "drop ranking formula exists",
      contract.includes("(0.35 * clamp01(input.pPurchase7d))")
        && contract.includes("(0.25 * clamp01(input.pUnlock24h))")
        && contract.includes("(0.2 * clamp01(input.pWatchComplete))")
        && contract.includes("(0.1 * clamp01(input.pReturn7d))")
        && contract.includes("(0.05 * clamp01(input.freshness))")
        && contract.includes("(0.05 * clamp01(input.urgency))"),
      "Drop recommendation score must rank by purchase, unlock, watch completion, return, freshness, and urgency.",
    ),
    check(
      "candidate generation and filtering documented in code",
      contract.includes("recent_live_drops")
        && contract.includes("popular_with_similar_users")
        && contract.includes("fallback_popular_fresh")
        && ((candidateGeneration.includes("isRecommendationEligibleDrop")
          && candidateGeneration.includes("validUntil && drop.validUntil <= nowMs")
          && candidateGeneration.includes("approvalStatus === \"rejected\" || approvalStatus === \"pending_review\""))
        || (candidateGeneration.includes("isExplorationEligibleDrop")
          && explorationPolicy.includes("drop.validUntil && drop.validUntil <= nowMs")
          && explorationPolicy.includes("\"pending_review\"")
          && explorationPolicy.includes("\"rejected\""))),
      "Candidate sources and eligibility filters must be explicit.",
    ),
    check(
      "prediction fields wired",
      requiredPredictionFields.every((field) => contract.includes(field) && rankingFeatures.includes(field) && runtime.includes(field)),
      "Ranking features and behavioral materializer must output all prediction fields.",
    ),
    check(
      "rankers use goal-calibrated score",
      deterministicRanker.includes("computeDropRecommendationScore")
        && mlRanker.includes("computeDropRecommendationScore")
        && mlRanker.includes("pPurchase7d")
        && mlRanker.includes("pUnlock24h"),
      "Deterministic and ML artifact scoring must share the same product-goal formula.",
    ),
    check(
      "server purchase and unlock truth first",
      runtime.includes("serverPurchaseCount")
        && runtime.includes("serverUnlockCount")
        && runtime.includes("isServerPurchaseFact")
        && runtime.includes("isServerUnlockFact")
        && runtime.includes("server_transaction")
        && runtime.includes("server_entitlement_unlock"),
      "Functions materializer must separate server purchases/unlocks from client context.",
    ),
    check(
      "admin rollups expose math state",
      rollupContract.includes("truthScore")
        && rollupContract.includes("predictionOutputs")
        && rollupContract.includes("mathCalibration")
        && rollupHelper.includes("computeBehavioralTruthScore")
        && usersPage.includes("data-user-behavior-math-mode")
        && userDetailPage.includes("Math:"),
      "Admin users must be able to see whether math is deterministic, validated, or unvalidated.",
    ),
    check(
      "ML activation rules enforced",
      contract.includes("sampleSize < 50")
        && contract.includes("ml_underperforms_baseline")
        && predictionsScript.includes("resolveBehavioralModelActivation"),
      "ML must stay inactive below 50 samples or when it underperforms deterministic baseline.",
    ),
    check(
      "generated report exists",
      exists("agent/state/behavioral-math-calibration.generated.json") && Boolean(report),
      "Prediction validation must generate a machine-readable report.",
    ),
    check(
      "generated report carries required metrics",
      Boolean(report?.validationMetrics)
        && [
          "precisionAt5",
          "precisionAt10",
          "unlockHitRateWithin24h",
          "purchaseHitRateWithin7d",
          "watchCompletionHitRate",
          "returnHitRateWithin7d",
          "calibrationError",
          "sampleSize",
          "sourceTruthCoverage",
        ].every((key) => key in (report?.validationMetrics ?? {})),
      "Report must include the required validation metrics.",
    ),
    check(
      "critical truth requirements pass",
      report?.truthRequirements?.purchaseTruthPresent === true
        && report?.truthRequirements?.entitlementUnlockTruthPresent === true
        && report?.truthRequirements?.legacyPageDurationDemoted === true
        && (report?.truthRequirements?.criticalFindings?.length ?? 0) === 0,
      "Purchase truth, entitlement unlock truth, and legacy watch demotion must pass.",
    ),
    check(
      "docs updated",
      docs.includes("pPurchase7d")
        && docs.includes("server_transaction")
        && docs.includes("deterministic stays active")
        && docs.includes("legacy_page_duration"),
      "Behavioral math calibration doctrine must explain predictions, truth sources, and activation rules.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Behavioral math calibration validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Behavioral math calibration validation passed.");
  }
}

main();
