import {
  optimizeDoctrineContext,
  writeOptimizedDoctrineContext,
  OPTIMIZED_DOCTRINE_CONTEXT_PATH,
  type DoctrineRetrievalInput,
} from "../../src/lib/agent-governance/doctrine/doctrine-retrieval-optimizer";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function readListArg(name: string) {
  const value = readArg(name);
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const taskSummary = readArg("--task") ?? "doctrine context optimization";
const changedFiles = [
  ...readListArg("--changed"),
  ...readListArg("--files"),
].filter(Boolean);

const input: DoctrineRetrievalInput = {
  taskSummary,
  changedFiles,
  explicitSurfaces: readListArg("--surface"),
  explicitFeatures: readListArg("--feature"),
  riskHints: readListArg("--risk"),
  maxCards: readArg("--max-cards") ? Number(readArg("--max-cards")) : undefined,
  maxTokenBudget: readArg("--max-token-budget") ? Number(readArg("--max-token-budget")) : undefined,
};

const context = optimizeDoctrineContext(input);
writeOptimizedDoctrineContext(context);

console.log(
  [
    `Optimized doctrine context written to ${OPTIMIZED_DOCTRINE_CONTEXT_PATH}.`,
    `Selected cards: ${context.selectedCards.length}.`,
    `Estimated tokens: ${context.coverage.estimatedTokens}.`,
    `Context savings: ${(context.coverage.contextSavings * 100).toFixed(1)}%.`,
  ].join("\n"),
);
