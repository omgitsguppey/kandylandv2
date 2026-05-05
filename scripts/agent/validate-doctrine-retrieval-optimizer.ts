import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  DEFAULT_MAX_DOCTRINE_TOKENS,
  HIGH_RISK_MAX_DOCTRINE_CARDS,
} from "../../src/lib/doctrine/doctrine-context-cost";
import {
  loadDoctrineCards,
  optimizeDoctrineContext,
  writeOptimizedDoctrineContext,
  type DoctrineRetrievalInput,
  type OptimizedDoctrineContext,
} from "../../src/lib/doctrine/doctrine-retrieval-optimizer";

const root = process.cwd();
const reportPath = "agent/state/doctrine-retrieval-optimizer.generated.json";
const failures: string[] = [];

type SampleTask = DoctrineRetrievalInput & {
  id: string;
  expectSurfaces: string[];
  expectFeatures: string[];
  expectHighRisk?: boolean;
  expectLegacy?: boolean;
};

const sampleTasks: SampleTask[] = [
  {
    id: "wallet-purchase-modal",
    taskSummary: "wallet density fix",
    changedFiles: ["src/components/PurchaseModal.tsx"],
    expectSurfaces: ["user"],
    expectFeatures: ["wallet"],
    expectHighRisk: true,
  },
  {
    id: "viewer-watch-time",
    taskSummary: "viewer watch-time file media tracking continuity",
    changedFiles: ["src/hooks/useViewerWatchSession.ts"],
    expectSurfaces: [],
    expectFeatures: ["viewer", "watch-time"],
  },
  {
    id: "admin-users-behavioral",
    taskSummary: "admin users behavioral tracking change",
    changedFiles: ["src/app/admin/users/page.tsx"],
    expectSurfaces: ["admin"],
    expectFeatures: ["user-management", "telemetry"],
  },
  {
    id: "creator-projection",
    taskSummary: "creator dashboard projection read-only admin view-as",
    changedFiles: ["src/lib/admin/synthetic-creators-view-as.ts"],
    expectSurfaces: [],
    expectFeatures: ["creator-dashboard"],
    expectLegacy: true,
  },
  {
    id: "moderation-theft-risk",
    taskSummary: "moderation theft-risk scrape risk change",
    changedFiles: ["src/lib/moderation/scrape-risk-score.ts"],
    expectSurfaces: [],
    expectFeatures: ["moderation"],
  },
  {
    id: "support-workspace-ui",
    taskSummary: "support workspace UI ticket inbox polish",
    changedFiles: ["src/components/Support/SupportInbox.tsx"],
    expectSurfaces: ["user"],
    expectFeatures: ["support"],
  },
  {
    id: "docs-only-doctrine",
    taskSummary: "docs-only doctrine hierarchy context update",
    changedFiles: ["docs/doctrine/03-surface-hierarchy.md"],
    expectSurfaces: [],
    expectFeatures: ["doctrine-retrieval"],
  },
  {
    id: "server-route-security",
    taskSummary: "server route security auth trusted origin cache rule",
    changedFiles: ["src/app/api/security/log-attempt/route.ts"],
    expectSurfaces: ["server"],
    expectFeatures: ["security/cost"],
    expectHighRisk: true,
  },
  {
    id: "cloud-sql-cost",
    taskSummary: "Cloud SQL Data Connect cost BigQuery guardrail",
    changedFiles: ["dataconnect/schema/schema.gql"],
    expectSurfaces: ["server"],
    expectFeatures: ["cloud/sql/bigquery"],
    expectHighRisk: true,
  },
  {
    id: "navigation-ui-only",
    taskSummary: "navigation UI-only polish",
    changedFiles: ["src/components/Navbar.tsx"],
    expectSurfaces: ["user"],
    expectFeatures: ["device-ui"],
  },
];

function repoPath(filePath: string) {
  return join(root, filePath);
}

function fail(message: string) {
  failures.push(message);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function read(filePath: string) {
  return existsSync(repoPath(filePath)) ? readFileSync(repoPath(filePath), "utf8") : "";
}

function selectedIds(context: OptimizedDoctrineContext) {
  return new Set(context.selectedCards.map((card) => card.id));
}

function selectedDocs(context: OptimizedDoctrineContext) {
  return new Set(context.selectedCards.map((card) => card.canonicalDoc));
}

function hasSurfaceOrFeature(context: OptimizedDoctrineContext, value: string) {
  return context.selectedCards.some((card) => card.surface === value || card.feature === value);
}

function validateSample(sample: SampleTask, context: OptimizedDoctrineContext) {
  const ids = selectedIds(context);
  const docs = selectedDocs(context);
  const highRiskCap = sample.expectHighRisk ? HIGH_RISK_MAX_DOCTRINE_CARDS : 8;

  assert(context.selectedCards.length <= highRiskCap, `${sample.id}: selected too many cards (${context.selectedCards.length}).`);
  assert(
    context.coverage.estimatedTokens <= (sample.maxTokenBudget ?? DEFAULT_MAX_DOCTRINE_TOKENS) || Boolean(sample.expectHighRisk),
    `${sample.id}: context exceeded token budget without high-risk override.`,
  );
  assert(context.coverage.surfaceCoverage >= 0.95, `${sample.id}: surface coverage below 0.95.`);
  assert(context.coverage.validatorCoverage >= 0.9, `${sample.id}: validator coverage below 0.9.`);
  assert(context.coverage.contextSavings >= 0.75, `${sample.id}: context savings below 75%.`);
  assert(!context.selectedCards.some((card) => card.canonicalDoc.startsWith("agent/state/") || card.canonicalDoc.includes(".generated.")), `${sample.id}: generated report selected as doctrine.`);
  assert(!context.conflicts.some((conflict) => conflict.status === "unresolved"), `${sample.id}: unresolved conflict remains.`);
  assert(context.fullDocsOnlyIfNeeded.length === 0, `${sample.id}: full markdown docs are forced by default.`);

  for (const surface of sample.expectSurfaces) {
    assert(context.affectedSurfaces.includes(surface), `${sample.id}: affected surface ${surface} missing.`);
    assert(hasSurfaceOrFeature(context, surface), `${sample.id}: selected cards do not cover surface ${surface}.`);
  }
  for (const feature of sample.expectFeatures) {
    assert(context.affectedFeatures.includes(feature), `${sample.id}: affected feature ${feature} missing.`);
    assert(hasSurfaceOrFeature(context, feature), `${sample.id}: selected cards do not cover feature ${feature}.`);
  }
  if (sample.expectHighRisk) {
    assert(context.coverage.highRiskCoverage === 1, `${sample.id}: high-risk coverage must be 1.0.`);
    assert(docs.has("docs/doctrine/01-source-of-truth-constitution.md"), `${sample.id}: source-of-truth constitution missing for high-risk task.`);
  }
  if (sample.expectLegacy) {
    assert(context.coverage.legacyWarningCoverage === 1, `${sample.id}: legacy warning coverage must be 1.0.`);
    assert(context.legacyWarnings.length > 0, `${sample.id}: legacy warning details missing.`);
  }
  assert(ids.has("doctrine-card-validator-map"), `${sample.id}: validator map card missing.`);
}

for (const filePath of [
  "src/lib/doctrine/doctrine-retrieval-optimizer.ts",
  "src/lib/doctrine/doctrine-coverage-score.ts",
  "src/lib/doctrine/doctrine-context-cost.ts",
  "src/lib/doctrine/doctrine-conflict-score.ts",
  "scripts/agent/optimize-doctrine-context.ts",
  "scripts/agent/validate-doctrine-retrieval-optimizer.ts",
  "agent/context/optimized-task-context.generated.json",
  "docs/agent-truth/doctrine-retrieval-optimizer.md",
  "docs/agent-truth/doctrine-storage-strategy.md",
]) {
  assert(existsSync(repoPath(filePath)), `Missing required optimizer file: ${filePath}`);
}

const packageJson = read("package.json");
assert(packageJson.includes('"optimize:doctrine-context": "tsx scripts/agent/optimize-doctrine-context.ts"'), "package.json missing optimize:doctrine-context script.");
assert(packageJson.includes('"check:doctrine-retrieval-optimizer": "tsx scripts/agent/validate-doctrine-retrieval-optimizer.ts"'), "package.json missing check:doctrine-retrieval-optimizer script.");

const agents = read("AGENTS.md");
assert(agents.includes("optimize:doctrine-context"), "AGENTS.md must reference optimize:doctrine-context as the first doctrine read path.");
assert(agents.includes("smallest sufficient context pack"), "AGENTS.md must describe the smallest sufficient context pack rule.");
assert(!/read every Markdown file by default/iu.test(agents.replace("Do not read every Markdown file by default", "")), "AGENTS.md must not instruct agents to read all markdown by default.");

const readme = read("README.md");
assert(readme.includes("agent/context/optimized-task-context.generated.json"), "README must link optimized task context.");
assert(readme.includes("KandyDrops doctrine retrieval is an optimization problem"), "README must include optimizer doctrine note.");

const contexts = sampleTasks.map((sample) => {
  const context = optimizeDoctrineContext(sample);
  validateSample(sample, context);
  return { sample, context };
});

writeOptimizedDoctrineContext(contexts[0].context);

const cardUseCount = new Map<string, number>();
for (const { context } of contexts) {
  for (const card of context.selectedCards) cardUseCount.set(card.id, (cardUseCount.get(card.id) ?? 0) + 1);
}

const allCards = loadDoctrineCards();
const usedIds = new Set(cardUseCount.keys());
const staleCards = allCards
  .filter((card) => !card.lastReviewed || Date.parse(card.lastReviewed) < Date.parse("2026-02-04"))
  .map((card) => card.id);
const duplicateCards = Array.from(
  allCards.reduce((map, card) => {
    const key = `${card.surface}:${card.feature}:${card.canonicalDoc}`;
    map.set(key, [...(map.get(key) ?? []), card.id]);
    return map;
  }, new Map<string, string[]>()),
)
  .filter(([, ids]) => ids.length > 1)
  .map(([key, ids]) => ({ key, ids }));

const report = {
  generatedAt: new Date().toISOString(),
  sampleCount: contexts.length,
  averageCardsSelected: contexts.reduce((sum, entry) => sum + entry.context.selectedCards.length, 0) / contexts.length,
  averageEstimatedTokens: contexts.reduce((sum, entry) => sum + entry.context.coverage.estimatedTokens, 0) / contexts.length,
  averageContextSavings: contexts.reduce((sum, entry) => sum + entry.context.coverage.contextSavings, 0) / contexts.length,
  tasksOverBudget: contexts
    .filter((entry) => entry.context.coverage.estimatedTokens > (entry.sample.maxTokenBudget ?? DEFAULT_MAX_DOCTRINE_TOKENS) && !entry.sample.expectHighRisk)
    .map((entry) => entry.sample.id),
  unresolvedConflicts: contexts.flatMap((entry) =>
    entry.context.conflicts.filter((conflict) => conflict.status === "unresolved").map((conflict) => ({ task: entry.sample.id, conflict })),
  ),
  mostUsedCards: Array.from(cardUseCount.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([id, count]) => ({ id, count })),
  staleCards,
  duplicateCards,
  lowUtilityCards: allCards.filter((card) => !usedIds.has(card.id)).slice(0, 20).map((card) => card.id),
  missingSurfaceCards: sampleTasks.flatMap((sample, index) =>
    [...sample.expectSurfaces, ...sample.expectFeatures].filter((surface) => !hasSurfaceOrFeature(contexts[index].context, surface)),
  ),
  sampleSummaries: contexts.map((entry) => ({
    id: entry.sample.id,
    selectedCards: entry.context.selectedCards.map((card) => card.id),
    estimatedTokens: entry.context.coverage.estimatedTokens,
    contextSavings: entry.context.coverage.contextSavings,
    affectedSurfaces: entry.context.affectedSurfaces,
    affectedFeatures: entry.context.affectedFeatures,
  })),
};

mkdirSync(dirname(repoPath(reportPath)), { recursive: true });
writeFileSync(repoPath(reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");

assert(report.averageContextSavings >= 0.75, "Average context savings must be at least 75%.");
assert(report.tasksOverBudget.length === 0, "No non-high-risk sample task may exceed budget.");
assert(report.unresolvedConflicts.length === 0, "No sample task may have unresolved conflicts.");
assert(report.missingSurfaceCards.length === 0, "No sample task may miss expected surface cards.");

if (failures.length > 0) {
  console.error("Doctrine retrieval optimizer validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Doctrine retrieval optimizer validation passed. Report written to ${reportPath}.`);
