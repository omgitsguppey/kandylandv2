import fs from "node:fs";
import path from "node:path";

import {
  DIVERSITY_ADMIN_REASON,
  DIVERSITY_CATEGORY_LIMIT_TOP_8,
  DIVERSITY_CREATOR_LIMIT_TOP_6,
  rerankRecommendationsForDiversity,
  resolveRecommendationPriceTier,
} from "../../src/lib/recommendations/diversity-reranker";

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

function drop(input: {
  id: string;
  creatorId: string;
  category: string;
  score: number;
  cost?: number;
  media?: "image" | "video";
  sources?: string[];
}) {
  return {
    score: input.score,
    candidateSources: input.sources || ["popular"],
    drop: {
      id: input.id,
      creatorId: input.creatorId,
      type: input.category,
      unlockCost: input.cost ?? 100,
      mediaCounts: input.media === "video" ? { images: 0, videos: 1 } : { images: 1, videos: 0 },
      validFrom: Date.now(),
    } as any,
  };
}

function countTop<T>(entries: T[], limit: number, resolver: (entry: T) => string) {
  const counts = new Map<string, number>();
  entries.slice(0, limit).forEach((entry) => {
    const key = resolver(entry);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Math.max(0, ...counts.values());
}

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const reranker = read("src/lib/recommendations/diversity-reranker.ts");
  const serverBehavior = read("src/lib/server/behavioral-intelligence.ts");
  const adminRoute = read("src/app/api/admin/user/[userId]/route.ts");
  const docs = read("docs/agent-truth/behavioral-math-calibration.md");
  const recommendationDocs = read("docs/agent-truth/recommendation-ranking.md");

  const sameCreatorCandidates = [
    drop({ id: "c1", creatorId: "creator_a", category: "content", score: 100 }),
    drop({ id: "c2", creatorId: "creator_a", category: "content", score: 99 }),
    drop({ id: "c3", creatorId: "creator_a", category: "content", score: 98 }),
    drop({ id: "c4", creatorId: "creator_a", category: "content", score: 97 }),
    drop({ id: "b1", creatorId: "creator_b", category: "promo", score: 82, media: "video", sources: ["fresh"] }),
    drop({ id: "c5", creatorId: "creator_c", category: "external", score: 81, cost: 750, sources: ["ending_soon"] }),
    drop({ id: "d1", creatorId: "creator_d", category: "promo", score: 80, cost: 1200, media: "video", sources: ["theme_affinity"] }),
    drop({ id: "e1", creatorId: "creator_e", category: "external", score: 79, cost: 0, sources: ["popular"] }),
  ];
  const creatorReranked = rerankRecommendationsForDiversity({ entries: sameCreatorCandidates });

  const categoryCandidates = [
    drop({ id: "cat1", creatorId: "a", category: "content", score: 100 }),
    drop({ id: "cat2", creatorId: "b", category: "content", score: 99 }),
    drop({ id: "cat3", creatorId: "c", category: "content", score: 98 }),
    drop({ id: "cat4", creatorId: "d", category: "content", score: 97 }),
    drop({ id: "cat5", creatorId: "e", category: "content", score: 96 }),
    drop({ id: "alt1", creatorId: "f", category: "promo", score: 82, media: "video" }),
    drop({ id: "alt2", creatorId: "g", category: "external", score: 81, cost: 700 }),
    drop({ id: "alt3", creatorId: "h", category: "promo", score: 80, cost: 1200 }),
    drop({ id: "alt4", creatorId: "i", category: "external", score: 79, media: "video" }),
    drop({ id: "alt5", creatorId: "j", category: "promo", score: 78, cost: 0 }),
  ];
  const categoryReranked = rerankRecommendationsForDiversity({ entries: categoryCandidates });
  const highAffinityCategoryReranked = rerankRecommendationsForDiversity({
    entries: categoryCandidates,
    profile: { categoryAffinity: { content: 5 } },
  });

  const priceMixReranked = rerankRecommendationsForDiversity({
    entries: [
      drop({ id: "p1", creatorId: "a", category: "content", score: 95, cost: 100 }),
      drop({ id: "p2", creatorId: "b", category: "content", score: 94, cost: 100 }),
      drop({ id: "p3", creatorId: "c", category: "content", score: 93, cost: 100 }),
      drop({ id: "p4", creatorId: "d", category: "promo", score: 92, cost: 1200, sources: ["fresh"] }),
      drop({ id: "p5", creatorId: "e", category: "external", score: 91, cost: 0, sources: ["ending_soon"] }),
    ],
  });

  const recentExposureReranked = rerankRecommendationsForDiversity({
    entries: [
      drop({ id: "recent_drop", creatorId: "a", category: "content", score: 100 }),
      drop({ id: "fresh_alt", creatorId: "b", category: "promo", score: 82, sources: ["fresh"] }),
      drop({ id: "urgent_alt", creatorId: "c", category: "external", score: 81, sources: ["ending_soon"] }),
    ],
    profile: { recentDropIds: ["recent_drop"] },
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:diversity-reranking"] === "tsx scripts/agent/validate-diversity-reranking.ts",
      "Package must expose the targeted diversity reranking validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/recommendations/diversity-reranker.ts")
        && exists("scripts/agent/validate-diversity-reranking.ts"),
      "Diversity reranker and validator files must exist.",
    ),
    check(
      "creator top window capped",
      DIVERSITY_CREATOR_LIMIT_TOP_6 === 2
        && countTop(creatorReranked, 6, (entry) => entry.drop.creatorId || "") <= 2,
      "No more than two drops from the same creator should appear in the top six when alternatives exist.",
    ),
    check(
      "category top window capped unless high affinity",
      DIVERSITY_CATEGORY_LIMIT_TOP_8 === 3
        && countTop(categoryReranked, 8, (entry) => String(entry.drop.type || "")) <= 3
        && countTop(highAffinityCategoryReranked, 8, (entry) => String(entry.drop.type || "")) > 3,
      "No more than three same-category drops should appear in the top eight unless category affinity is very high.",
    ),
    check(
      "price tiers can mix",
      new Set(priceMixReranked.slice(0, 4).map((entry) => resolveRecommendationPriceTier(entry.drop))).size > 1
        && reranker.includes("priceTier")
        && reranker.includes("explorationBoost += 3"),
      "Reranking should mix price tiers when possible through bounded exploration boost.",
    ),
    check(
      "fresh urgent personalized mix exists",
      reranker.includes("resolveCandidateMixSegment")
        && reranker.includes("\"urgent\"")
        && reranker.includes("\"fresh\"")
        && reranker.includes("\"personalized\""),
      "Reranking should mix fresh, urgent, personalized, and fallback candidate sources when possible.",
    ),
    check(
      "recent exposure is penalized",
      recentExposureReranked[0]?.drop.id !== "recent_drop"
        && recentExposureReranked.find((entry) => entry.drop.id === "recent_drop")?.diversity.recentExposurePenalty === 24
        && recentExposureReranked.some((entry) => entry.diversity.reasons.includes("Moved lower because this drop appeared in a recent session.")),
      "Repeated drops across consecutive sessions must move lower when alternatives exist.",
    ),
    check(
      "formula matches doctrine",
      reranker.includes("sameCreatorPenalty + sameCategoryPenalty + sameMediaTypePenalty + recentExposurePenalty")
        && reranker.includes("candidate.score - diversityPenalty + explorationBoost"),
      "Diversity reranking must use predictedScore - diversityPenalty + explorationBoost.",
    ),
    check(
      "admin explanation exists",
      DIVERSITY_ADMIN_REASON === "Moved lower to keep creator/category diversity."
        && reranker.includes("Moved lower to keep creator/category diversity."),
      "Admin diagnostics must include the requested plain-English diversity reason.",
    ),
    check(
      "server applies reranking after predicted scores",
      serverBehavior.includes("scoreRecommendationWithArtifact")
        && serverBehavior.includes("const scored = deterministicRanked")
        && serverBehavior.includes("rerankRecommendationsForDiversity")
        && serverBehavior.indexOf("rerankRecommendationsForDiversity") > serverBehavior.indexOf("scoreRecommendationWithArtifact")
        && serverBehavior.includes("withDiversityDiagnostics"),
      "Server recommendation output must rerank after deterministic or ML-blended predicted scores are known.",
    ),
    check(
      "admin debug exposes diversity",
      adminRoute.includes("diversity: entry.diversity")
        && serverBehavior.includes("Diversity penalty")
        && serverBehavior.includes("Exploration boost"),
      "Admin recommendation diagnostics must expose diversity score movement and reasons.",
    ),
    check(
      "payment and unlock behavior untouched",
      !reranker.toLowerCase().includes("gumdrop")
        && !reranker.toLowerCase().includes("paypal")
        && !reranker.toLowerCase().includes("entitlement"),
      "Diversity reranking must stay isolated from payment, GumDrop ledger, and unlock truth code.",
    ),
    check(
      "docs updated",
      docs.includes("Diversity Reranking")
        && docs.includes("predictedScore - diversityPenalty + explorationBoost")
        && recommendationDocs.includes("Diversity reranking")
        && recommendationDocs.includes("Moved lower to keep creator/category diversity."),
      "Behavioral math and recommendation ranking docs must document diversity reranking.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Diversity reranking validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Diversity reranking validation passed.");
  }
}

main();
