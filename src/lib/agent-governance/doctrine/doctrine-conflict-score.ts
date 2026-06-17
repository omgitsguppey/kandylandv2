import { matchesGlob } from "./doctrine-coverage-score";
import type { DoctrineScoringCard } from "./doctrine-coverage-score";

export type SurfacePathRule = {
  pattern: string;
  primarySurface: string;
  doctrine: string;
};

export type DoctrineConflictFinding = {
  id: string;
  status: "resolved" | "unresolved";
  penalty: number;
  reason: string;
  resolverCardId?: string;
};

export type DoctrineConflictScore = {
  penalty: number;
  conflicts: DoctrineConflictFinding[];
};

function patternSpecificity(pattern: string) {
  return pattern.replace(/\*\*/gu, "").replace(/\*/gu, "").length;
}

function authorityResolverSelected(selectedCards: DoctrineScoringCard[], conflictedCard: DoctrineScoringCard) {
  return selectedCards.some((card) => card.authorityLevel < conflictedCard.authorityLevel);
}

export function scoreDoctrineConflicts(
  selectedCards: DoctrineScoringCard[],
  changedFiles: string[],
  pathRules: SurfacePathRule[],
): DoctrineConflictScore {
  const selectedIds = new Set(selectedCards.map((card) => card.id));
  const conflicts: DoctrineConflictFinding[] = [];

  for (const card of selectedCards) {
    if (card.canonicalDoc.startsWith("agent/state/") || card.canonicalDoc.includes(".generated.")) {
      conflicts.push({
        id: `generated-report:${card.id}`,
        status: "unresolved",
        penalty: 20,
        reason: `${card.id} points at generated report ${card.canonicalDoc}.`,
      });
    }

    const missingResolver = card.conflictsWith.find((conflictId) => selectedIds.has(conflictId) && !authorityResolverSelected(selectedCards, card));
    if (missingResolver) {
      conflicts.push({
        id: `missing-authority:${card.id}:${missingResolver}`,
        status: "unresolved",
        penalty: 50,
        reason: `${card.id} conflicts with ${missingResolver}, but no higher-authority resolver is selected.`,
      });
    }

    if (card.status === "legacy" && !card.supersedes.length && !authorityResolverSelected(selectedCards, card)) {
      conflicts.push({
        id: `legacy-unresolved:${card.id}`,
        status: "unresolved",
        penalty: 25,
        reason: `${card.id} is legacy without a selected canonical/superseding resolver.`,
      });
    }
  }

  for (const changedFile of changedFiles) {
    const matches = pathRules.filter((rule) => matchesGlob(changedFile, rule.pattern));
    const surfaces = Array.from(new Set(matches.map((rule) => rule.primarySurface)));
    if (surfaces.length <= 1) continue;

    const winningRule = [...matches].sort((left, right) => patternSpecificity(right.pattern) - patternSpecificity(left.pattern))[0];
    const resolver = selectedCards.find((card) => card.canonicalDoc === winningRule.doctrine || card.fileGlobs.includes(winningRule.pattern));
    conflicts.push({
      id: `surface-overlap:${changedFile}`,
      status: resolver ? "resolved" : "unresolved",
      penalty: resolver ? 0 : 15,
      reason: `${changedFile} matches multiple primary surfaces (${surfaces.join(", ")}); most-specific rule chooses ${winningRule.primarySurface}.`,
      resolverCardId: resolver?.id,
    });
  }

  return {
    penalty: conflicts.reduce((sum, conflict) => sum + conflict.penalty, 0),
    conflicts,
  };
}
