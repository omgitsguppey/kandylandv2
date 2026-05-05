import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_MAX_DOCTRINE_CARDS = 8;
export const DEFAULT_MAX_DOCTRINE_TOKENS = 12_000;
export const HIGH_RISK_MAX_DOCTRINE_CARDS = 12;

export type DoctrineCostCard = {
  id: string;
  tokenEstimate: number;
};

export function clampScore(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

export function estimateSelectedTokens(cards: DoctrineCostCard[]) {
  return cards.reduce((sum, card) => sum + Math.max(0, Math.round(card.tokenEstimate || 0)), 0);
}

export function computeCostScore(tokenEstimate: number, maxTokenBudget: number) {
  return clampScore(tokenEstimate / Math.max(1, maxTokenBudget), 0, Number.POSITIVE_INFINITY);
}

export function computeUtilityScore(coverageScore: number, tokenEstimate: number, maxTokenBudget: number) {
  return coverageScore / Math.max(0.1, computeCostScore(tokenEstimate, maxTokenBudget));
}

export function computeContextSavings(estimatedTokens: number, fullMarkdownTokenEstimate: number) {
  return clampScore(1 - estimatedTokens / Math.max(1, fullMarkdownTokenEstimate));
}

function listMarkdownFiles(root: string, relativeDirectory: string, results: string[] = []) {
  const absoluteDirectory = join(root, relativeDirectory);
  if (!existsSync(absoluteDirectory)) return results;

  for (const entry of readdirSync(absoluteDirectory)) {
    const absolutePath = join(absoluteDirectory, entry);
    const relativePath = `${relativeDirectory}/${entry}`.replace(/\\/gu, "/");
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      listMarkdownFiles(root, relativePath, results);
      continue;
    }
    if (entry.endsWith(".md")) results.push(relativePath);
  }

  return results;
}

export function estimateMarkdownDoctrineTokens(root = process.cwd()) {
  const markdownFiles = [
    ...listMarkdownFiles(root, "docs/doctrine"),
    ...listMarkdownFiles(root, "docs/agent-truth"),
  ];

  const tokenEstimate = markdownFiles.reduce((sum, relativePath) => {
    const source = readFileSync(join(root, relativePath), "utf8");
    const words = source.split(/\s+/u).filter(Boolean).length;
    return sum + Math.ceil(words * 1.3);
  }, 0);

  return Math.max(tokenEstimate, 1);
}
