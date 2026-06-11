export type RecommendedActionSeverity = "info" | "minor" | "moderate" | "major" | "critical";

export type RecommendedActionInput = {
  id: string;
  title: string;
  owner: string;
  sourceFile: string;
  findingKind: string;
  rootCause: string;
  refreshCommand: string;
  severity: RecommendedActionSeverity;
  resolved: boolean;
  batchArtifact?: string;
};

export type RecommendedActionDedupeResult = {
  visibleActions: Array<RecommendedActionInput & { alsoAffects: string[] }>;
  duplicateActionsCollapsed: number;
  collapsedActionIds: string[];
};

const SEVERITY_RANK: Record<RecommendedActionSeverity, number> = {
  info: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4,
};

function dedupeKey(action: RecommendedActionInput) {
  return [
    action.sourceFile,
    action.findingKind,
    action.refreshCommand,
    action.owner,
    action.rootCause,
  ].join("::");
}

export function dedupeRecommendedActions(actions: readonly RecommendedActionInput[]): RecommendedActionDedupeResult {
  const byKey = new Map<string, RecommendedActionInput[]>();
  for (const action of actions) {
    const key = dedupeKey(action);
    const group = byKey.get(key);
    if (group) {
      group.push(action);
    } else {
      byKey.set(key, [action]);
    }
  }

  const visibleActions = Array.from(byKey.values()).map((group) => {
    const [primary, ...duplicates] = group
      .slice()
      .sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
    return {
      ...primary!,
      alsoAffects: duplicates.map((entry) => entry.id),
    };
  });

  return {
    visibleActions,
    duplicateActionsCollapsed: actions.length - visibleActions.length,
    collapsedActionIds: visibleActions.flatMap((action) => action.alsoAffects),
  };
}

export function validateRecommendedActionDedupe(result: RecommendedActionDedupeResult) {
  const failures: string[] = [];
  const keys = new Set<string>();

  for (const action of result.visibleActions) {
    const key = dedupeKey(action);
    if (keys.has(key)) failures.push(`duplicate action remains visible for ${key}.`);
    keys.add(key);
    if (!action.owner) failures.push(`${action.id} lacks owner.`);
    if (!action.refreshCommand) failures.push(`${action.id} lacks refresh command.`);
    if (!action.rootCause) failures.push(`${action.id} lacks root cause.`);
  }

  if (result.duplicateActionsCollapsed < 0) failures.push("duplicate collapse count cannot be negative.");
  return failures;
}
