import fs from "node:fs";
import path from "node:path";

type Check = {
  label: string;
  pass: boolean;
  detail: string;
};

const repoRoot = process.cwd();

function readText(relativePath: string) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.resolve(repoRoot, relativePath));
}

function check(label: string, pass: boolean, detail: string): Check {
  return { label, pass, detail };
}

function requireIncludes(content: string, needle: string) {
  return content.includes(needle);
}

function main() {
  const packageJson = JSON.parse(readText("package.json")) as { scripts?: Record<string, string> };
  const serverBehavior = readText("src/lib/server/behavioral-intelligence.ts");
  const rankingFeatures = readText("src/lib/recommendations/ranking-features.ts");
  const adminUserPage = readText("src/app/admin/user/[userId]/page.tsx");
  const trainScript = readText("scripts/train-recommendation-ranker.ts");

  const checks: Check[] = [
    check(
      "candidate-generation exists",
      exists("src/lib/recommendations/candidate-generation.ts"),
      "Expected canonical recommendation candidate generation helper.",
    ),
    check(
      "ranking-features exists",
      exists("src/lib/recommendations/ranking-features.ts"),
      "Expected canonical ranking feature helper.",
    ),
    check(
      "deterministic-ranker exists",
      exists("src/lib/recommendations/deterministic-ranker.ts"),
      "Expected deterministic ranker helper.",
    ),
    check(
      "ml-ranker exists",
      exists("src/lib/recommendations/ml-ranker.ts"),
      "Expected ML artifact ranker helper.",
    ),
    check(
      "recommendation explanations exist",
      exists("src/lib/recommendations/recommendation-explanations.ts"),
      "Expected explanation helper for plain-English reasons.",
    ),
    check(
      "train script exists",
      exists("scripts/train-recommendation-ranker.ts"),
      "Expected lightweight recommendation training script.",
    ),
    check(
      "package scripts exist",
      packageJson.scripts?.["train:recommendations"] === "tsx scripts/train-recommendation-ranker.ts"
        && packageJson.scripts?.["check:recommendation-ranker"] === "tsx scripts/agent/validate-recommendation-ranker.ts",
      "Package scripts must expose train:recommendations and check:recommendation-ranker.",
    ),
    check(
      "server ranker uses shared recommendation helpers",
      requireIncludes(serverBehavior, "generateRecommendationCandidates")
        && requireIncludes(serverBehavior, "rankDeterministicRecommendations")
        && requireIncludes(serverBehavior, "scoreRecommendationWithArtifact")
        && requireIncludes(serverBehavior, "buildRecommendationExplanation"),
      "src/lib/server/behavioral-intelligence.ts must delegate to the shared recommendation helpers.",
    ),
    check(
      "missing or stale model falls back",
      requireIncludes(readText("src/lib/recommendations/ml-ranker.ts"), "modelFreshness !== \"fresh\""),
      "ML ranker must return null when the artifact is missing or stale.",
    ),
    check(
      "fallback cards capped",
      requireIncludes(serverBehavior, "Math.min(limit, 3)")
        && requireIncludes(adminUserPage, "behavioralRecommendations.slice(0, 3)"),
      "Fallback recommendations must stay capped to three cards.",
    ),
    check(
      "ranking truth score requires explicit canonical truth",
      !requireIncludes(rankingFeatures, "computeBehavioralTruthScore")
        && requireIncludes(rankingFeatures, "if (typeof intelligence?.truthScore === \"number\")")
        && requireIncludes(rankingFeatures, "if (typeof profile?.truthScore === \"number\")")
        && requireIncludes(rankingFeatures, "return 0;"),
      "Ranking truth score must not be synthesized from confidence or legacy counts.",
    ),
    check(
      "admin page shows explanation text before math",
      requireIncludes(adminUserPage, "entry.explanationSummary")
        && requireIncludes(adminUserPage, "<details")
        && requireIncludes(adminUserPage, "Ranking diagnostics"),
      "Admin UI should default to plain-English reasons and collapse the math.",
    ),
    check(
      "artifact writer targets generated json",
      requireIncludes(trainScript, "agent/state/recommendation-model.generated.json"),
      "Training script must write the generated recommendation model artifact.",
    ),
    check(
      "no paid ai dependency added",
      !requireIncludes(trainScript, "@google-cloud/vertexai")
        && !requireIncludes(trainScript, "openai")
        && !requireIncludes(trainScript, "gemini"),
      "Training lane must stay local and deterministic without paid AI calls.",
    ),
    check(
      "docs updated",
      exists("docs/agent-truth/recommendation-ranking.md"),
      "Recommendation ranking doctrine doc must exist.",
    ),
  ];

  const failed = checks.filter((entry) => !entry.pass);
  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
