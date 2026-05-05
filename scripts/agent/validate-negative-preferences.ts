import fs from "node:fs";
import path from "node:path";

import { computeNegativePreferenceScore } from "../../src/lib/behavioral/negative-preference-score";
import { applyRecommendationSuppression, buildRecommendationSuppression } from "../../src/lib/recommendations/suppression-rules";

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

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const eventContract = read("src/lib/behavioral/event-fact-contract.ts");
  const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
  const metricNormalizer = read("src/lib/behavioral/event-fact-normalizer.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const ingest = read("src/app/api/analytics/ingest-identified/route.ts");
  const scoreContract = read("src/lib/behavioral/negative-preference-score.ts");
  const suppressionRules = read("src/lib/recommendations/suppression-rules.ts");
  const rankingFeatures = read("src/lib/recommendations/ranking-features.ts");
  const deterministicRanker = read("src/lib/recommendations/deterministic-ranker.ts");
  const mlRanker = read("src/lib/recommendations/ml-ranker.ts");
  const runtime = read("functions/src/behavioral-intelligence-runtime.ts");
  const docs = read("docs/agent-truth/behavioral-math-calibration.md");
  const nowMs = Date.now();
  const requiredEvents = [
    "drop_not_interested",
    "creator_not_interested",
    "category_not_interested",
    "creator_muted",
    "recommendation_dismissed",
  ];
  const fullSuppression = computeNegativePreferenceScore({
    explicitNegativeFeedback: 1,
    repeatedSkips: 1,
    lowWatchAfterRecommendation: 1,
    negativeFeedbackRecency: 1,
    creatorMuteStrength: 1,
    latestNegativeAtMs: nowMs,
    nowMs,
  }).suppressionScore;
  const explicitDropSuppression = buildRecommendationSuppression({
    nowMs,
    drop: { id: "drop_a", creatorId: "creator_a", type: "art" } as any,
    profile: {
      negativePreferenceProfile: {
        version: 1,
        halfLifeDays: 30,
        latestAtMs: nowMs,
        dropIds: ["drop_a"],
        drops: {
          drop_a: {
            entityId: "drop_a",
            explicitNegativeFeedback: 1,
            latestAtMs: nowMs,
            eventNames: ["drop_not_interested"],
          },
        },
      },
    },
  });
  const weakCategorySuppression = buildRecommendationSuppression({
    nowMs,
    drop: { id: "drop_b", creatorId: "creator_b", type: "fitness" } as any,
    profile: {
      negativePreferenceProfile: {
        version: 1,
        halfLifeDays: 30,
        latestAtMs: nowMs,
        categoryScores: { fitness: 0.35 },
        categories: {
          fitness: {
            entityId: "fitness",
            repeatedSkips: 0.35,
            latestAtMs: nowMs,
            eventNames: ["recommendation_dismissed"],
          },
        },
      },
    },
  });
  const mutedSuppression = buildRecommendationSuppression({
    nowMs,
    drop: { id: "drop_c", creatorId: "creator_c", type: "music" } as any,
    profile: {
      negativePreferenceProfile: {
        version: 1,
        halfLifeDays: 30,
        latestAtMs: nowMs - (120 * 24 * 60 * 60 * 1000),
        mutedCreatorIds: ["creator_c"],
        creators: {
          creator_c: {
            entityId: "creator_c",
            explicitNegativeFeedback: 1,
            latestAtMs: nowMs - (120 * 24 * 60 * 60 * 1000),
            eventNames: ["creator_muted"],
          },
        },
      },
    },
  });
  const freshScore = computeNegativePreferenceScore({
    explicitNegativeFeedback: 1,
    repeatedSkips: 0,
    lowWatchAfterRecommendation: 0,
    negativeFeedbackRecency: 1,
    creatorMuteStrength: 0,
    latestNegativeAtMs: nowMs,
    nowMs,
  }).suppressionScore;
  const decayedScore = computeNegativePreferenceScore({
    explicitNegativeFeedback: 1,
    repeatedSkips: 0,
    lowWatchAfterRecommendation: 0,
    negativeFeedbackRecency: 1,
    creatorMuteStrength: 0,
    latestNegativeAtMs: nowMs - (30 * 24 * 60 * 60 * 1000),
    nowMs,
  }).suppressionScore;
  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:negative-preferences"] === "tsx scripts/agent/validate-negative-preferences.ts",
      "Package must expose the targeted negative preference validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/behavioral/negative-preference-score.ts")
        && exists("src/lib/recommendations/suppression-rules.ts")
        && exists("scripts/agent/validate-negative-preferences.ts"),
      "Negative preference score, suppression rules, and validator files must exist.",
    ),
    check(
      "events are normalized behavioral facts",
      requiredEvents.every((eventName) => eventContract.includes(`"${eventName}"`) && normalizer.includes(`${eventName}:`)),
      "All requested negative preference events must be behavioral actions with normalizer aliases.",
    ),
    check(
      "events are tracked telemetry",
      requiredEvents.every((eventName) => telemetryCatalog.includes(`eventName: "${eventName}"`)),
      "All requested negative preference events must be recognized by identified telemetry ingest.",
    ),
    check(
      "identified ingest treats preference events as client truth",
      requiredEvents.every((eventName) => ingest.includes(`canonicalEventName === "${eventName}"`)),
      "Negative preference controls are explicit client preference facts, not server purchase/unlock truth.",
    ),
    check(
      "metric normalizer includes preference families",
      metricNormalizer.includes("drop_not_interested: \"content\"")
        && metricNormalizer.includes("creator_muted: \"creator\""),
      "Negative preference actions must enter the identified behavioral fact family map.",
    ),
    check(
      "suppression formula exists",
      scoreContract.includes("(0.45 * explicitNegativeFeedback)")
        && scoreContract.includes("(0.25 * repeatedSkips)")
        && scoreContract.includes("(0.15 * lowWatchAfterRecommendation)")
        && scoreContract.includes("(0.10 * negativeFeedbackRecency)")
        && scoreContract.includes("(0.05 * creatorMuteStrength)")
        && fullSuppression === 1,
      "suppressionScore must use the requested weighted formula and clamp to one.",
    ),
    check(
      "suppression decays with half life unless muted",
      decayedScore < freshScore
        && scoreContract.includes("NEGATIVE_PREFERENCE_HALF_LIFE_DAYS = 30")
        && mutedSuppression.suppressionScore >= 0.8,
      "Explicit negative feedback decays over 30 days, while creator mutes remain strong.",
    ),
    check(
      "final score formula applies",
      suppressionRules.includes("baseScore * (1 - clamp01(suppressionScore))")
        && applyRecommendationSuppression(80, 0.25) === 60,
      "Final recommendation score must be baseScore * (1 - suppressionScore).",
    ),
    check(
      "explicit negative beats weak positive",
      explicitDropSuppression.suppressionScore >= 0.5
        && applyRecommendationSuppression(35, explicitDropSuppression.suppressionScore) < 20,
      "A direct less-like-this action must overpower weak positive behavior.",
    ),
    check(
      "single weak category signal does not suppress category",
      weakCategorySuppression.suppressionScore === 0,
      "One weak dismissal must not suppress a whole category.",
    ),
    check(
      "rankers apply suppression",
      deterministicRanker.includes("applyRecommendationSuppression")
        && mlRanker.includes("applyRecommendationSuppression")
        && rankingFeatures.includes("suppressionScore")
        && rankingFeatures.includes("suppressionReasons"),
      "Deterministic and ML rankers must both apply suppression after base score calculation.",
    ),
    check(
      "runtime persists preference profile",
      runtime.includes("negativePreferenceProfile")
        && runtime.includes("negativeCreatorIds")
        && runtime.includes("mutedCreatorIds")
        && runtime.includes("categoryNegativeAffinity")
        && runtime.includes("lowWatchAfterRecommendationDropIds"),
      "Behavioral materializer must persist drop, creator, category, mute, skip, and low-watch suppression evidence.",
    ),
    check(
      "admin reason exists",
      suppressionRules.includes("Lowered because user dismissed similar drops."),
      "Suppression must expose a plain-English admin reason.",
    ),
    check(
      "docs updated",
      docs.includes("Negative Preference Suppression")
        && docs.includes("drop_not_interested")
        && docs.includes("baseScore * (1 - suppressionScore)"),
      "Behavioral math doctrine must document negative preference suppression.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Negative preference validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Negative preference validation passed.");
  }
}

main();
