import fs from "node:fs";
import path from "node:path";

import {
  computeSatisfactionScore,
  shouldPromptForContentSatisfaction,
} from "../../src/lib/behavioral/satisfaction-score";

const repoRoot = process.cwd();

type Check = {
  label: string;
  pass: boolean;
  detail: string;
};

const requiredEvents = [
  "content_satisfaction_positive",
  "content_satisfaction_negative",
  "content_satisfaction_skipped",
  "recommendation_reason_helpful",
  "recommendation_reason_not_helpful",
];

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
  const scoreContract = read("src/lib/behavioral/satisfaction-score.ts");
  const prompt = read("src/components/Feedback/ContentSatisfactionPrompt.tsx");
  const viewerClient = read("src/app/dashboard/viewer/ViewerClient.tsx");
  const viewerTelemetry = read("src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts");
  const eventContract = read("src/lib/behavioral/event-fact-contract.ts");
  const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
  const metricNormalizer = read("src/lib/behavioral/event-fact-normalizer.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const ingest = read("src/app/api/analytics/ingest-identified/route.ts");
  const rankingFeatures = read("src/lib/recommendations/ranking-features.ts");
  const deterministicRanker = read("src/lib/recommendations/deterministic-ranker.ts");
  const mlRanker = read("src/lib/recommendations/ml-ranker.ts");
  const explanations = read("src/lib/recommendations/recommendation-explanations.ts");
  const runtime = read("functions/src/behavioral-intelligence-runtime.ts");
  const docs = read("docs/agent-truth/behavioral-math-calibration.md");
  const validatorMap = read("agent/context/validator-map.json");
  const positive = computeSatisfactionScore({
    explicitRating: 1,
    completionQuality: 1,
    repeatCreatorInterest: 0.8,
    feedbackRecency: 1,
    lowRefundRisk: 1,
  });
  const negative = computeSatisfactionScore({
    explicitRating: 0,
    completionQuality: 0.55,
    repeatCreatorInterest: 0,
    feedbackRecency: 1,
    lowRefundRisk: 0.4,
  });
  const promptAfterConsumption = shouldPromptForContentSatisfaction({
    meaningfulConsumption: true,
    completionQuality: 0.7,
    lastPromptAtMs: Date.now() - (15 * 24 * 60 * 60 * 1000),
  });
  const promptBeforeConsumption = shouldPromptForContentSatisfaction({
    meaningfulConsumption: false,
    completionQuality: 1,
  });
  const promptLowCompletion = shouldPromptForContentSatisfaction({
    meaningfulConsumption: true,
    completionQuality: 0.2,
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:satisfaction-signal"] === "tsx scripts/agent/validate-satisfaction-signal.ts",
      "Package must expose the targeted satisfaction validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/behavioral/satisfaction-score.ts")
        && exists("src/components/Feedback/ContentSatisfactionPrompt.tsx")
        && exists("scripts/agent/validate-satisfaction-signal.ts"),
      "Satisfaction score, prompt component, and validator files must exist.",
    ),
    check(
      "formula is exact",
      scoreContract.includes("(0.35 * explicitRating)")
        && scoreContract.includes("(0.25 * completionQuality)")
        && scoreContract.includes("(0.20 * repeatCreatorInterest)")
        && scoreContract.includes("(0.10 * feedbackRecency)")
        && scoreContract.includes("(0.10 * lowRefundRisk)")
        && positive.satisfactionScore > negative.satisfactionScore
        && negative.suppressionScore > 0,
      "satisfactionScore must use the requested weighted math and negative feedback must produce suppression.",
    ),
    check(
      "satisfaction stays separate from watch truth",
      !scoreContract.includes("watch_session")
        && !scoreContract.includes("watch-time")
        && scoreContract.includes("completionQuality"),
      "Satisfaction may use completion quality as one input but must not redefine watch-session truth.",
    ),
    check(
      "prompt is gated after meaningful consumption",
      prompt.includes("meaningfulConsumptionKey")
        && prompt.includes("localStorage")
        && prompt.includes("GLOBAL_PROMPT_COOLDOWN_MS")
        && promptAfterConsumption
        && !promptBeforeConsumption
        && !promptLowCompletion,
      "Prompt must use meaningful consumption and cooldown gates so users are not spammed.",
    ),
    check(
      "prompt emits all requested events",
      requiredEvents.every((eventName) => prompt.includes(eventName) && telemetryCatalog.includes(`eventName: "${eventName}"`)),
      "The UI prompt and telemetry catalog must register all satisfaction and recommendation reason events.",
    ),
    check(
      "viewer wires prompt after consumption",
      viewerClient.includes("ContentSatisfactionPrompt")
        && viewerClient.includes("setSatisfactionPrompt")
        && viewerClient.includes("trackAssetCompleted")
        && viewerClient.includes("meaningfulConsumptionKey")
        && viewerTelemetry.includes("watchSessionId"),
      "Viewer must surface a prompt after consumed media and connect it to the watch session id.",
    ),
    check(
      "events are normalized behavioral facts",
      requiredEvents.every((eventName) => eventContract.includes(`"${eventName}"`) && normalizer.includes(`${eventName}:`)),
      "All requested events must enter the normalized behavioral action catalog.",
    ),
    check(
      "identified metric family maps satisfaction to content",
      metricNormalizer.includes("content_satisfaction_positive: \"content\"")
        && metricNormalizer.includes("recommendation_reason_not_helpful: \"content\""),
      "Satisfaction must be content behavior, not watch-time, commerce, or admin behavior.",
    ),
    check(
      "identified ingest treats satisfaction as client truth",
      requiredEvents.every((eventName) => ingest.includes(`canonicalEventName === "${eventName}"`)),
      "Satisfaction facts are client preference facts and must not be mistaken for server purchase/unlock truth.",
    ),
    check(
      "recommendations consume satisfaction",
      rankingFeatures.includes("satisfactionProfile")
        && rankingFeatures.includes("buildRecommendationSatisfactionSignal")
        && rankingFeatures.includes("satisfactionBoost")
        && rankingFeatures.includes("satisfaction.suppressionScore")
        && deterministicRanker.includes("features.satisfactionBoost")
        && mlRanker.includes("satisfactionScore")
        && mlRanker.includes("input.features.satisfactionBoost"),
      "Deterministic and ML recommendation paths must use satisfaction as ranking signal and suppression evidence.",
    ),
    check(
      "admin explanations are plain English",
      explanations.includes("Similar satisfaction feedback")
        && explanations.includes("features.satisfactionReasons")
        && scoreContract.includes("Lowered because recent satisfaction feedback was negative."),
      "Admin and user-facing explanations must describe satisfaction effects without mystery math.",
    ),
    check(
      "materializer persists satisfaction profile",
      runtime.includes("satisfactionProfile")
        && runtime.includes("recordSatisfactionSignal")
        && runtime.includes("content_satisfaction_positive")
        && runtime.includes("recommendation_reason_not_helpful")
        && runtime.includes("satisfactionScore"),
      "Behavioral materializer must preserve satisfaction evidence for recommendation profiles and drop intelligence.",
    ),
    check(
      "docs and validator map updated",
      docs.includes("Satisfaction Feedback Loop")
        && docs.includes("content_satisfaction_negative")
        && docs.includes("Satisfaction is separate from watch time")
        && validatorMap.includes("check:satisfaction-signal"),
      "Doctrine and compact validator map must expose the new satisfaction lane.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Satisfaction signal validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Satisfaction signal validation passed.");
  }
}

main();
