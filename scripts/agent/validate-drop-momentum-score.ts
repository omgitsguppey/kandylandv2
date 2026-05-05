import fs from "node:fs";
import path from "node:path";

import {
  DROP_MOMENTUM_MIN_STRONG_IMPRESSIONS,
  computeDropMomentumScore,
} from "../../src/lib/behavioral/drop-momentum-score";
import { buildDropMomentumBoost } from "../../src/lib/recommendations/drop-momentum-boost";
import { computeDeterministicRecommendationScore } from "../../src/lib/recommendations/deterministic-ranker";

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

function buildFeatures(momentumBoost: number) {
  return {
    creatorAffinity: 0.2,
    contentAffinity: 0.2,
    experienceAffinity: 0.2,
    completionQuality: 0.2,
    unlockQuality: 0.2,
    purchaseIntent: 0.2,
    returnCadence: 0.2,
    popularity: 0.2,
    freshness: 0.6,
    urgency: 0.1,
    priceFit: 0.5,
    followedCreatorBoost: 0,
    previousUnlockCreatorBoost: 0,
    similarUserBoost: 0,
    pPurchase7d: 0.2,
    pUnlock24h: 0.2,
    pWatchComplete: 0.2,
    pReturn7d: 0.2,
    pCreatorFollow: 0.2,
    pNegativeFeedback: 0,
    predictedPaidConversion: 0.2,
    predictedUnlock: 0.2,
    predictedWatchCompletion: 0.2,
    predictedReturn: 0.2,
    previousExposurePenalty: 0,
    fatiguePenalty: 0,
    diversityBoost: 0,
    suppressionScore: 0,
    suppressionScoreMultiplier: 1,
    suppressionReasons: [],
    queryIntentScore: 0,
    queryIntentBoost: 0,
    queryIntentReasons: [],
    dropMomentumScore: 70,
    dropMomentumBoost: momentumBoost,
    dropMomentumLabel: "sampled",
    dropMomentumReasons: ["Boosted by early drop momentum."],
    truthScore: 0.5,
    confidence: 0.5,
  };
}

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const contract = read("src/lib/behavioral/drop-momentum-score.ts");
  const boost = read("src/lib/recommendations/drop-momentum-boost.ts");
  const features = read("src/lib/recommendations/ranking-features.ts");
  const deterministic = read("src/lib/recommendations/deterministic-ranker.ts");
  const ml = read("src/lib/recommendations/ml-ranker.ts");
  const serverBehavior = read("src/lib/server/behavioral-intelligence.ts");
  const adminRoute = read("src/app/api/admin/user/[userId]/route.ts");
  const runtime = read("functions/src/behavioral-intelligence-runtime.ts");
  const docs = read("docs/agent-truth/behavioral-math-calibration.md");
  const recommendationDocs = read("docs/agent-truth/recommendation-ranking.md");
  const strongScore = computeDropMomentumScore({
    impressions1h: 40,
    impressions6h: 44,
    impressions24h: 48,
    previewOpens1h: 32,
    previewOpens6h: 32,
    viewerOpens6h: 24,
    viewerOpens24h: 25,
    unlocks6h: 16,
    validWatchCompletions6h: 18,
    purchasesAfterView24h: 15,
    negativeFeedbackCount: 0,
    feedbackCount: 10,
    creatorBaselineScore: 10,
  });
  const earlyScore = computeDropMomentumScore({
    impressions1h: 8,
    impressions6h: 10,
    impressions24h: 12,
    previewOpens1h: 7,
    previewOpens6h: 8,
    viewerOpens6h: 7,
    viewerOpens24h: 8,
    unlocks6h: 4,
    validWatchCompletions6h: 5,
    purchasesAfterView24h: 2,
    negativeFeedbackCount: 0,
    feedbackCount: 2,
    creatorBaselineScore: 5,
  });
  const negativeScore = computeDropMomentumScore({
    impressions1h: 40,
    impressions6h: 60,
    impressions24h: 80,
    previewOpens1h: 24,
    previewOpens6h: 30,
    viewerOpens6h: 30,
    viewerOpens24h: 35,
    unlocks6h: 12,
    validWatchCompletions6h: 14,
    purchasesAfterView24h: 6,
    negativeFeedbackCount: 8,
    feedbackCount: 16,
    creatorBaselineScore: 10,
  });
  const earlyBoost = buildDropMomentumBoost({
    drop: { id: "drop_a", creatorId: "creator_a", type: "content", unlockCost: 100 } as any,
    intelligence: {
      earlyMomentum: {
        impressions1h: 8,
        impressions6h: 10,
        impressions24h: 12,
        previewOpens1h: 7,
        previewOpens6h: 8,
        viewerOpens6h: 7,
        viewerOpens24h: 8,
        unlocks6h: 4,
        validWatchCompletions6h: 5,
        purchasesAfterView24h: 2,
        negativeFeedbackCount: 0,
        feedbackCount: 2,
      },
      creatorBaselineMomentumScore: 5,
    },
  });
  const baselineBoost = buildDropMomentumBoost({
    drop: { id: "drop_b", creatorId: "creator_a", type: "content", unlockCost: 100 } as any,
    intelligence: {
      impressions24h: 24,
      previewOpens1h: 8,
      previewOpens6h: 8,
      viewerOpens6h: 8,
      viewerOpens24h: 8,
      unlocks6h: 4,
      validWatchCompletions6h: 4,
      purchasesAfterView24h: 2,
      creatorBaselineMomentumScore: 70,
    },
  });
  const baseRankScore = computeDeterministicRecommendationScore(buildFeatures(0) as any);
  const boostedRankScore = computeDeterministicRecommendationScore(buildFeatures(6) as any);

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:drop-momentum-score"] === "tsx scripts/agent/validate-drop-momentum-score.ts",
      "Package must expose the targeted drop momentum validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/behavioral/drop-momentum-score.ts")
        && exists("src/lib/recommendations/drop-momentum-boost.ts")
        && exists("scripts/agent/validate-drop-momentum-score.ts"),
      "Drop momentum score, recommendation boost, and validator files must exist.",
    ),
    check(
      "formula exists",
      contract.includes("(0.25 * previewRate1h)")
        && contract.includes("(0.25 * unlockRate6h)")
        && contract.includes("(0.20 * watchCompletionRate6h)")
        && contract.includes("(0.20 * purchaseAfterViewRate24h)")
        && contract.includes("(100 * 0.10 * creatorBaselineLift)")
        && contract.includes("negativeFeedbackPenalty"),
      "Momentum score must use the requested weighted formula and subtract negative feedback penalty.",
    ),
    check(
      "minimum impressions gate exists",
      DROP_MOMENTUM_MIN_STRONG_IMPRESSIONS === 20
        && strongScore.verdict === "strong_positive"
        && earlyScore.verdict === "early_signal"
        && earlyScore.sampleLabel === "early signal",
      "Strong momentum verdicts require 20 impressions; smaller samples must be labeled early signal.",
    ),
    check(
      "creator baseline comparison exists",
      strongScore.creatorBaselineLift > 0
        && baselineBoost.signals.creatorBaselineLift === 0
        && boost.includes("creatorBaselineMomentumScore")
        && serverBehavior.includes("creatorBaselineMomentumScore"),
      "Momentum must compare against creator-local baseline, not global popularity only.",
    ),
    check(
      "negative feedback penalty works",
      negativeScore.negativeFeedbackPenalty > 0
        && negativeScore.momentumScore < strongScore.momentumScore
        && negativeScore.reasons.includes("Momentum limited by negative feedback rate."),
      "Negative feedback rate must reduce momentum score and explain the limitation.",
    ),
    check(
      "boost is bounded but active for early signal",
      earlyBoost.momentumBoost > 0
        && earlyBoost.momentumBoost <= 10
        && earlyBoost.sampleLabel === "early signal"
        && earlyBoost.reasons.includes("Boosted by early drop momentum."),
      "Promising early signals should receive a bounded boost without becoming a strong verdict.",
    ),
    check(
      "rankers apply momentum boost",
      deterministic.includes("features.queryIntentBoost + features.dropMomentumBoost")
        && ml.includes("+ input.features.dropMomentumBoost")
        && boostedRankScore > baseRankScore,
      "Deterministic and ML rankers must add momentum boost after source-truthed base score and suppression.",
    ),
    check(
      "ranking features expose momentum",
      features.includes("dropMomentumScore")
        && features.includes("dropMomentumBoost")
        && features.includes("dropMomentumLabel")
        && features.includes("dropMomentumReasons")
        && features.includes("buildDropMomentumBoost"),
      "Recommendation features must carry momentum score, boost, label, and admin reasons.",
    ),
    check(
      "runtime persists early-window fields",
      runtime.includes("impressions1h")
        && runtime.includes("impressions6h")
        && runtime.includes("impressions24h")
        && runtime.includes("previewOpens1h")
        && runtime.includes("unlocks6h")
        && runtime.includes("validWatchCompletions6h")
        && runtime.includes("purchasesAfterView24h")
        && runtime.includes("earlyMomentum"),
      "Behavioral materializer must persist early response velocity fields for drop intelligence.",
    ),
    check(
      "admin debug exposes momentum",
      serverBehavior.includes("momentum: {")
        && adminRoute.includes("momentum: entry.momentum")
        && serverBehavior.includes("...explanation.adminReasons")
        && boost.includes("Boosted by early drop momentum."),
      "Admin recommendation diagnostics must expose plain-English momentum reasons.",
    ),
    check(
      "payment and unlock behavior not mutated",
      !boost.toLowerCase().includes("paypal")
        && !boost.toLowerCase().includes("gumdrop")
        && !boost.toLowerCase().includes("ledger")
        && !contract.toLowerCase().includes("paypal")
        && !contract.toLowerCase().includes("ledger"),
      "Momentum scoring must not change payment, ledger, or unlock behavior.",
    ),
    check(
      "docs updated",
      docs.includes("Drop Momentum Scoring")
        && docs.includes("creatorBaselineLift")
        && docs.includes("Fewer than `20` impressions")
        && recommendationDocs.includes("Drop momentum boost")
        && recommendationDocs.includes("Boosted by early drop momentum."),
      "Behavioral math and recommendation ranking docs must document momentum scoring.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Drop momentum validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Drop momentum validation passed.");
  }
}

main();
