import fs from "node:fs";
import path from "node:path";

import type { Drop } from "../../src/types/db";
import {
  ADJACENT_EXPLORE_BUDGET_SHARE,
  applyExplorationBudget,
  calculateExplorationSlotBudget,
  computeExplorationBoost,
  EXPLORATION_ADMIN_REASON,
  EXPLOIT_BUDGET_SHARE,
  isExplorationEligibleDrop,
  NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE,
} from "../../src/lib/recommendations/exploration-policy";
import { generateColdStartCandidates } from "../../src/lib/recommendations/cold-start-candidates";

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

function makeDrop(id: string, overrides: Partial<Drop> = {}): Drop {
  const nowMs = Date.now();

  return {
    id,
    title: `Drop ${id}`,
    description: "validator fixture",
    imageUrl: "https://example.test/cover.jpg",
    contentUrl: "https://example.test/content.jpg",
    unlockCost: 100,
    validFrom: nowMs - (60 * 60 * 1000),
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
  const explorationPolicy = read("src/lib/recommendations/exploration-policy.ts");
  const coldStart = read("src/lib/recommendations/cold-start-candidates.ts");
  const candidateGeneration = read("src/lib/recommendations/candidate-generation.ts");
  const runtime = read("src/lib/server/behavioral-intelligence.ts");
  const rankingFeatures = read("src/lib/recommendations/ranking-features.ts");
  const explanations = read("src/lib/recommendations/recommendation-explanations.ts");
  const rankingDocs = read("docs/agent-truth/recommendation-ranking.md");
  const calibrationDocs = read("docs/agent-truth/behavioral-math-calibration.md");
  const validatorMap = read("agent/context/validator-map.json");
  const formula = computeExplorationBoost({
    baseExploreWeight: 0.15,
    uncertaintyBonus: 1,
    freshnessBoost: 1,
    safetyEligibility: 1,
  });
  const budget = calculateExplorationSlotBudget(10);
  const nowMs = Date.now();
  const entries = [
    ...Array.from({ length: 8 }, (_, index) => ({
      drop: makeDrop(`exploit-${index}`, { validFrom: nowMs - ((index + 2) * 24 * 60 * 60 * 1000) }),
      score: 90 - index,
      candidateSources: ["live_drop", "popular"],
    })),
    {
      drop: makeDrop("adjacent-creator", { creatorId: "creator-adjacent" }),
      score: 70,
      candidateSources: ["live_drop", "adjacent_creator"],
    },
    {
      drop: makeDrop("new-low-sample", { validFrom: nowMs - (30 * 60 * 1000) }),
      score: 68,
      candidateSources: ["live_drop", "fresh", "new_low_sample_drop"],
    },
    {
      drop: makeDrop("expired-new", {
        validUntil: nowMs - 1,
      }),
      score: 100,
      candidateSources: ["new_low_sample_drop"],
    },
  ];
  const explored = applyExplorationBudget({ entries, limit: 10, nowMs });
  const explorationCount = explored.filter((entry) => entry.exploration.lane !== "exploit").length;
  const coldStartCandidates = generateColdStartCandidates({
    drops: [
      makeDrop("interest", { tags: ["art"], type: "content" }),
      makeDrop("unsafe", { approvalStatus: "rejected" }),
      makeDrop("popular", { validFrom: nowMs - (2 * 24 * 60 * 60 * 1000), tags: ["music"] }),
    ],
    hints: {
      onboardingInterests: ["art"],
      firstClickCategories: ["content"],
      searchIntentTokens: ["art"],
    },
    dropIntelligence: new Map([
      ["popular", { dropId: "popular", viewerOpens: 80, previewOpens: 20 }],
    ]),
    nowMs,
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:exploration-budget"] === "tsx scripts/agent/validate-exploration-budget.ts",
      "Package must expose the targeted exploration budget validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/recommendations/exploration-policy.ts")
        && exists("src/lib/recommendations/cold-start-candidates.ts")
        && exists("scripts/agent/validate-exploration-budget.ts"),
      "Exploration policy, cold-start candidate generator, and validator must exist.",
    ),
    check(
      "80/15/5 budget constants exist",
      EXPLOIT_BUDGET_SHARE === 0.8
        && ADJACENT_EXPLORE_BUDGET_SHARE === 0.15
        && NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE === 0.05
        && budget.exploitSlots === 8
        && budget.maxExplorationSlots === 2,
      "Recommendation slots must use 80% exploit, 15% adjacent exploration, and 5% new/low-sample exploration.",
    ),
    check(
      "formula is exact",
      explorationPolicy.includes("baseExploreWeight * uncertaintyBonus * freshnessBoost * safetyEligibility")
        && formula.explorationBoost === 0.15
        && formula.scoreBoost > 0,
      "explorationBoost must equal baseExploreWeight * uncertaintyBonus * freshnessBoost * safetyEligibility.",
    ),
    check(
      "exploration is capped",
      explored.length === 10
        && explorationCount <= budget.maxExplorationSlots
        && explored.filter((entry) => entry.exploration.lane === "exploit").length >= budget.exploitSlots,
      "Exploration slots must never exceed the capped 20% explore budget when enough exploit candidates exist.",
    ),
    check(
      "unsafe and expired drops excluded",
      !explored.some((entry) => entry.drop.id === "expired-new")
        && !isExplorationEligibleDrop(makeDrop("rejected", { approvalStatus: "rejected" }), nowMs)
        && !isExplorationEligibleDrop(makeDrop("expired", { validUntil: nowMs - 1 }), nowMs),
      "Exploration must not select unsafe, rejected, expired, or otherwise ineligible drops.",
    ),
    check(
      "admin explanation exists",
      explored.some((entry) => entry.exploration.reasons.includes(EXPLORATION_ADMIN_REASON))
        && runtime.includes("EXPLORATION_ADMIN_REASON"),
      "Exploration diagnostics must surface the plain-English admin reason.",
    ),
    check(
      "cold start uses early intent and fresh popularity",
      coldStart.includes("onboardingInterests")
        && coldStart.includes("firstClickCategories")
        && coldStart.includes("searchIntentTokens")
        && coldStart.includes("Popular fresh drop for cold start.")
        && coldStartCandidates.some((candidate) => candidate.sources.includes("cold_start_interest"))
        && coldStartCandidates.some((candidate) => candidate.sources.includes("popular"))
        && !coldStartCandidates.some((candidate) => candidate.drop.id === "unsafe"),
      "Cold-start retrieval must use onboarding interests, first clicks, search intent, and popular fresh drops.",
    ),
    check(
      "personalization confidence is not overstated",
      coldStart.includes("personalization remains weak")
        && runtime.includes("weak-personalization")
        && runtime.includes("Personalization is not strong yet."),
      "New-user recommendations must be labeled weak/cold-start instead of strong personalization.",
    ),
    check(
      "server runtime no longer traps insufficient-signal users",
      runtime.includes("generateColdStartCandidates")
        && runtime.includes("applyExplorationBudget")
        && !runtime.includes("if (recommendationState.insufficientSignal) {\n    return [];"),
      "Insufficient-signal users must receive bounded cold-start recommendations instead of an empty list.",
    ),
    check(
      "candidate sources are wired into ranking and explanations",
      rankingFeatures.includes("\"adjacent_creator\"")
        && rankingFeatures.includes("\"new_low_sample_drop\"")
        && candidateGeneration.includes("adjacent_category")
        && candidateGeneration.includes("new_low_sample_drop")
        && explanations.includes("bounded exploration slot"),
      "Retrieval, ranking, and explanation layers must all understand exploration candidate sources.",
    ),
    check(
      "docs and compact validator map updated",
      rankingDocs.includes("Exploration budget")
        && rankingDocs.includes("80%")
        && rankingDocs.includes("Exploration slot: gathering signal.")
        && calibrationDocs.includes("Cold-Start Exploration Budget")
        && validatorMap.includes("check:exploration-budget"),
      "Doctrine and compact validator map must expose the exploration budget lane.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Exploration budget validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Exploration budget validation passed.");
  }
}

main();
