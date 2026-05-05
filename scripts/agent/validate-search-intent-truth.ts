import fs from "node:fs";
import path from "node:path";

import {
  computeQueryIntentScore,
  computeSearchIntentDecay,
  sanitizeSearchIntentParams,
} from "../../src/lib/behavioral/search-intent-profile";
import { buildQueryIntentRanking } from "../../src/lib/recommendations/query-intent-ranking";

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
  const contract = read("src/lib/behavioral/search-intent-profile.ts");
  const ranking = read("src/lib/recommendations/query-intent-ranking.ts");
  const eventContract = read("src/lib/behavioral/event-fact-contract.ts");
  const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
  const metricNormalizer = read("src/lib/behavioral/event-fact-normalizer.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const ingest = read("src/app/api/analytics/ingest-identified/route.ts");
  const features = read("src/lib/recommendations/ranking-features.ts");
  const deterministic = read("src/lib/recommendations/deterministic-ranker.ts");
  const ml = read("src/lib/recommendations/ml-ranker.ts");
  const runtime = read("functions/src/behavioral-intelligence-runtime.ts");
  const serverBehavior = read("src/lib/server/behavioral-intelligence.ts");
  const adminRoute = read("src/app/api/admin/user/[userId]/route.ts");
  const docs = read("docs/agent-truth/behavioral-math-calibration.md");
  const nowMs = Date.now();
  const requiredEvents = [
    "search_query_submitted",
    "filter_selected",
    "sort_changed",
    "category_clicked",
    "creator_search_selected",
  ];
  const sanitized = sanitizeSearchIntentParams({
    query: "email test@example.com cyber candy 555-111-2222",
    category: "art",
  }, "search_query_submitted");
  const activeIntent = buildQueryIntentRanking({
    nowMs,
    drop: { id: "drop_a", creatorId: "creator_a", type: "art", tags: ["cyber"] } as any,
    searchIntentProfile: {
      version: 1,
      halfLifeHours: 24,
      latestAtMs: nowMs,
      activeUntilMs: nowMs + 60_000,
      rawQueryStored: false,
      tokens: { cyber: 1, candy: 1 },
      categories: { art: 1 },
      creatorIds: {},
      filters: { art: 1 },
      sorts: {},
      queryClusters: { candy_cyber: 2 },
      intentClasses: { category: 1 },
      queryLengths: { latest: 20, average: 20, samples: 1 },
      sessionIds: ["session_a"],
    },
  });
  const expiredIntent = buildQueryIntentRanking({
    nowMs,
    drop: { id: "drop_a", creatorId: "creator_a", type: "art" } as any,
    searchIntentProfile: {
      version: 1,
      halfLifeHours: 24,
      latestAtMs: nowMs - (48 * 60 * 60 * 1000),
      activeUntilMs: nowMs - 1,
      rawQueryStored: false,
      tokens: { art: 1 },
      categories: { art: 1 },
      creatorIds: {},
      filters: {},
      sorts: {},
      queryClusters: { art: 1 },
      intentClasses: { category: 1 },
      queryLengths: { latest: 3, average: 3, samples: 1 },
      sessionIds: ["session_a"],
    },
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:search-intent-truth"] === "tsx scripts/agent/validate-search-intent-truth.ts",
      "Package must expose the targeted search intent validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/behavioral/search-intent-profile.ts")
        && exists("src/lib/recommendations/query-intent-ranking.ts")
        && exists("scripts/agent/validate-search-intent-truth.ts"),
      "Search intent profile, query ranking, and validator files must exist.",
    ),
    check(
      "events are normalized behavioral facts",
      requiredEvents.every((eventName) => eventContract.includes(`"${eventName}"`) && normalizer.includes(`${eventName}:`)),
      "All requested search/filter events must normalize into behavioral facts.",
    ),
    check(
      "events are tracked telemetry",
      requiredEvents.every((eventName) => telemetryCatalog.includes(`eventName: "${eventName}"`)),
      "All requested search/filter events must be accepted by telemetry catalog.",
    ),
    check(
      "identified ingest sanitizes query params before fact write",
      ingest.includes("sanitizeSearchIntentParams")
        && ingest.includes("isSearchIntentEventName(canonicalEventName)")
        && !("query" in sanitized)
        && !("searchQuery" in sanitized)
        && Array.isArray(sanitized.normalized_query_tokens)
        && sanitized.raw_query_stored === false,
      "Raw query text must be replaced by normalized tokens, length, cluster, and intent class before storage.",
    ),
    check(
      "sensitive tokens are redacted",
      !sanitized.normalized_query_tokens.includes("test_example_com")
        && !sanitized.normalized_query_tokens.includes("555")
        && sanitized.query_length > 0,
      "Sanitization must not retain email, phone, or similar sensitive raw query fragments.",
    ),
    check(
      "metric normalizer includes intent families",
      metricNormalizer.includes("search_query_submitted: \"content\"")
        && metricNormalizer.includes("creator_search_selected: \"creator\""),
      "Search intent actions must enter the identified metric family map.",
    ),
    check(
      "query intent formula exists",
      contract.includes("(0.40 * clamp01(input.exactCategoryMatch))")
        && contract.includes("(0.25 * clamp01(input.creatorNameMatch))")
        && contract.includes("(0.20 * clamp01(input.recentSearchRecency))")
        && contract.includes("(0.10 * clamp01(input.repeatedQueryCluster))")
        && contract.includes("(0.05 * clamp01(input.filterMatch))")
        && computeQueryIntentScore({
          exactCategoryMatch: 1,
          creatorNameMatch: 1,
          recentSearchRecency: 1,
          repeatedQueryCluster: 1,
          filterMatch: 1,
        }) === 1,
      "queryIntentScore must use the requested weighted formula.",
    ),
    check(
      "search intent half-life is 24h",
      contract.includes("SEARCH_INTENT_HALF_LIFE_HOURS = 24")
        && computeSearchIntentDecay({ latestAtMs: nowMs - (24 * 60 * 60 * 1000), nowMs }) < 0.51,
      "Search intent must decay fast with a 24-hour half-life.",
    ),
    check(
      "ranking applies active-session boost",
      ranking.includes("queryIntentBoost: roundScore(queryIntentScore * 15)")
        && deterministic.includes("suppressedScore + features.queryIntentBoost")
        && ml.includes("+ input.features.queryIntentBoost")
        && activeIntent.queryIntentBoost > 0
        && expiredIntent.queryIntentBoost === 0,
      "Active-session recommendations must receive finalScore += queryIntentScore * 15, and expired intent must not boost.",
    ),
    check(
      "ranking features expose query intent",
      features.includes("queryIntentScore")
        && features.includes("queryIntentBoost")
        && features.includes("queryIntentReasons")
        && features.includes("buildQueryIntentRanking"),
      "Recommendation features must carry query intent score, boost, and admin reasons.",
    ),
    check(
      "runtime persists sanitized search profile",
      runtime.includes("searchIntentProfile")
        && runtime.includes("rawQueryStored: false")
        && runtime.includes("searchIntentTokens")
        && runtime.includes("searchIntentQueryClusters")
        && runtime.includes("SEARCH_INTENT_HALF_LIFE_HOURS"),
      "Behavioral materializer must persist sanitized tokens, categories, clusters, query length, and half-life metadata.",
    ),
    check(
      "admin/debug exposes plain English reason",
      serverBehavior.includes("queryIntent")
        && adminRoute.includes("queryIntent: entry.queryIntent")
        && ranking.includes("Boosted by recent search intent."),
      "Admin recommendation diagnostics must show a plain-English search intent reason.",
    ),
    check(
      "docs updated",
      docs.includes("Search Intent Ranking")
        && docs.includes("search_query_submitted")
        && docs.includes("finalScore += queryIntentScore * 15"),
      "Behavioral math doctrine must document search intent tracking, sanitization, and boost math.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Search intent validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Search intent validation passed.");
  }
}

main();
