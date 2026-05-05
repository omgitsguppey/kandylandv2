import fs from "node:fs";
import path from "node:path";

import type { Drop } from "../../src/types/db";
import {
  computeCreatorSupplyQualityScore,
  CREATOR_SUPPLY_ADMIN_CONFIDENCE_REASON,
  CREATOR_SUPPLY_NEW_CREATOR_REASON,
} from "../../src/lib/creator/creator-supply-quality-score";
import {
  applyCreatorQualityAdjustment,
  buildCreatorQualityAdjustment,
  buildCreatorSupplyQualityMap,
} from "../../src/lib/recommendations/creator-quality-adjustment";

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

function makeDrop(id: string, creatorId: string, overrides: Partial<Drop> = {}): Drop {
  const nowMs = Date.now();

  return {
    id,
    creatorId,
    title: `Drop ${id}`,
    description: "validator fixture",
    imageUrl: "https://example.test/cover.jpg",
    contentUrl: "https://example.test/content.jpg",
    unlockCost: 100,
    validFrom: nowMs - (2 * 24 * 60 * 60 * 1000),
    validUntil: nowMs + (7 * 24 * 60 * 60 * 1000),
    status: "active",
    approvalStatus: "approved",
    totalUnlocks: 0,
    type: "content",
    tags: ["art"],
    ...overrides,
  };
}

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const scoreContract = read("src/lib/creator/creator-supply-quality-score.ts");
  const adjustmentContract = read("src/lib/recommendations/creator-quality-adjustment.ts");
  const rankingFeatures = read("src/lib/recommendations/ranking-features.ts");
  const deterministicRanker = read("src/lib/recommendations/deterministic-ranker.ts");
  const serverBehavior = read("src/lib/server/behavioral-intelligence.ts");
  const adminRoute = read("src/app/api/admin/user/[userId]/route.ts");
  const calibrationDocs = read("docs/agent-truth/behavioral-math-calibration.md");
  const rankingDocs = read("docs/agent-truth/recommendation-ranking.md");
  const creatorDoctrine = read("docs/doctrine/surfaces/creator-dashboard.md");
  const validatorMap = read("agent/context/validator-map.json");
  const healthy = computeCreatorSupplyQualityScore({
    activeDropsCount: 4,
    recentDropsFreshness: 0.9,
    positiveSatisfactionRate: 0.9,
    responseReliability: 0.85,
    fanPassAvailable: true,
    bookingAvailable: true,
    supportIssueCount: 0,
    moderationIssueCount: 0,
    refundRisk: 0,
    negativeFeedbackRisk: 0.05,
    profileCompleteness: 0.95,
    satisfactionSampleCount: 20,
    sampleCount: 80,
    creatorAgeDays: 120,
  });
  const weak = computeCreatorSupplyQualityScore({
    activeDropsCount: 0,
    recentDropsFreshness: 0.1,
    positiveSatisfactionRate: 0.25,
    responseReliability: 0.2,
    fanPassAvailable: false,
    bookingAvailable: false,
    supportIssueCount: 3,
    moderationIssueCount: 1,
    refundRisk: 0.35,
    negativeFeedbackRisk: 0.4,
    profileCompleteness: 0.4,
    satisfactionSampleCount: 10,
    sampleCount: 30,
    creatorAgeDays: 120,
  });
  const newCreator = computeCreatorSupplyQualityScore({
    activeDropsCount: 1,
    latestDropAtMs: Date.now() - (2 * 24 * 60 * 60 * 1000),
    creatorAgeDays: 4,
    sampleCount: 1,
    satisfactionSampleCount: 0,
    profileCompleteness: 0.6,
  });
  const weakAdjustment = buildCreatorQualityAdjustment({ creatorSupplyQuality: weak });
  const newCreatorAdjustment = buildCreatorQualityAdjustment({ creatorSupplyQuality: newCreator });
  const adjusted = applyCreatorQualityAdjustment(80, weakAdjustment);
  const supplyMap = buildCreatorSupplyQualityMap({
    drops: [
      makeDrop("one", "creator_a"),
      makeDrop("two", "creator_a"),
      makeDrop("three", "creator_b", { approvalStatus: "rejected" }),
    ],
    dropIntelligence: new Map([
      ["one", { dropId: "one", creatorId: "creator_a", freshnessDecayScore: 0.9, satisfactionScore: 0.8, satisfactionSampleCount: 5, viewerOpens: 20 }],
      ["two", { dropId: "two", creatorId: "creator_a", freshnessDecayScore: 0.8, satisfactionScore: 0.7, satisfactionSampleCount: 5, viewerOpens: 10 }],
    ]),
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:creator-supply-quality"] === "tsx scripts/agent/validate-creator-supply-quality.ts",
      "Package must expose the targeted creator supply quality validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/creator/creator-supply-quality-score.ts")
        && exists("src/lib/recommendations/creator-quality-adjustment.ts")
        && exists("scripts/agent/validate-creator-supply-quality.ts"),
      "Creator supply score, recommendation adjustment, and validator files must exist.",
    ),
    check(
      "formula is exact",
      scoreContract.includes("(0.20 * components.activeInventory)")
        && scoreContract.includes("(0.20 * components.freshness)")
        && scoreContract.includes("(0.20 * components.satisfaction)")
        && scoreContract.includes("(0.15 * components.responseReliability)")
        && scoreContract.includes("(0.10 * components.monetizationReadiness)")
        && scoreContract.includes("(0.10 * components.lowIssueRate)")
        && scoreContract.includes("(0.05 * components.profileCompleteness)")
        && healthy.creatorSupplyScore > weak.creatorSupplyScore,
      "creatorSupplyScore must use the requested weighted operational supply formula.",
    ),
    check(
      "all requested signals represented",
      [
        "activeDropsCount",
        "recentDropsFreshness",
        "fulfillmentResponseHealth",
        "fanPassAvailable",
        "bookingAvailable",
        "supportIssueCount",
        "moderationIssueCount",
        "positiveSatisfactionRate",
        "refundRisk",
        "negativeFeedbackRisk",
      ].every((token) => scoreContract.includes(token)),
      "Score contract must include inventory, freshness, response, monetization, issue, satisfaction, and risk signals.",
    ),
    check(
      "new creators are not buried for low data",
      newCreator.creatorSupplyScore >= 50
        && newCreator.adminReasons.includes(CREATOR_SUPPLY_NEW_CREATOR_REASON)
        && newCreatorAdjustment.confidenceMultiplier >= 0.85
        && adjusted.adjustedScore === 80,
      "Low data may lower confidence, but visibility score must not bury new creators by default.",
    ),
    check(
      "low supply reduces confidence not visibility",
      weakAdjustment.confidenceMultiplier < 1
        && weakAdjustment.scoreAdjustment === 0
        && weakAdjustment.visibilityAdjustment === 0
        && weakAdjustment.adminReasons.includes(CREATOR_SUPPLY_ADMIN_CONFIDENCE_REASON),
      "Low supply score should reduce recommendation confidence and expose admin reasons without a visibility penalty.",
    ),
    check(
      "admin missing pieces are exact",
      weak.missingOperationalPieces.includes("Add at least one active approved drop.")
        && weak.missingOperationalPieces.includes("Improve fulfillment and response reliability.")
        && weak.missingOperationalPieces.includes("Resolve support, moderation, refund, or negative feedback risk."),
      "Admin diagnostics must list specific missing operational pieces.",
    ),
    check(
      "creator map derives from drop supply",
      supplyMap.get("creator_a")?.creatorSupplyScore !== undefined
        && (supplyMap.get("creator_a")?.components.activeInventory || 0) > 0
        && (supplyMap.get("creator_b")?.components.activeInventory || 0) === 0,
      "Recommendation server should be able to derive creator supply from active Drops and drop intelligence.",
    ),
    check(
      "recommendation ranking consumes supply confidence",
      rankingFeatures.includes("creatorSupplyConfidenceMultiplier")
        && rankingFeatures.includes("creatorSupplyQuality")
        && deterministicRanker.includes("applyCreatorQualityAdjustment")
        && deterministicRanker.includes("creatorSupplyQuality")
        && adjustmentContract.includes("buildCreatorSupplyQualityMap"),
      "Ranking features and deterministic scorer must consume creator supply quality as confidence, not demand.",
    ),
    check(
      "server and admin expose creator supply diagnostics",
      serverBehavior.includes("buildCreatorSupplyQualityMap")
        && serverBehavior.includes("creatorSupplyQualityMap")
        && serverBehavior.includes("creatorSupplyQuality: entry.features.creatorSupplyQuality")
        && adminRoute.includes("creatorSupplyQuality: entry.creatorSupplyQuality"),
      "Server recommendations and admin user detail debug must expose creator supply quality diagnostics.",
    ),
    check(
      "docs and validator map updated",
      calibrationDocs.includes("Creator Supply Quality")
        && rankingDocs.includes("Creator supply quality")
        && creatorDoctrine.includes("check:creator-supply-quality")
        && validatorMap.includes("check:creator-supply-quality"),
      "Doctrine, recommendation truth docs, and compact validator map must expose the new creator supply lane.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Creator supply quality validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Creator supply quality validation passed.");
  }
}

main();
