export function collectAdminDebugControlTowerActionsStaticProbeFailures(
  { debugTabActions }: { debugTabActions: string },
): string[] {
  const failures: string[] = [];

  for (const expected of [
    "Expected source",
    "Found source",
    "Issue type",
    "Freshness",
    "Eligible",
    "canSelfHeal",
  ]) {
    if (!debugTabActions.includes(expected)) {
      failures.push(`Task Issues Attribution panel must show source-truth classification must include "${expected}".`);
    }
  }

  for (const expected of [
    "Actionable repairs",
    "Inspect-only",
    "Duplicates collapsed",
    "data-debug-repair-dedupe-key",
    "data-debug-repair-canonical-source-path",
    "data-debug-repair-actionability",
    "data-debug-repair-source-context-state",
    "data-debug-repair-duplicate-count",
    "data-debug-repair-source-collection",
    "data-debug-repair-visible-count",
    "data-debug-repair-actionable-count",
    "data-debug-repair-inspect-only-count",
    "Source collection",
    "Affected records",
    "Show source records",
    "Show more",
    "proposal.actionability === \"actionable\"",
    "Apply",
    "Inspect",
  ]) {
    if (!debugTabActions.includes(expected)) {
      failures.push(`Repairs panel must separate actionable, inspect-only, and deduped proposals must include "${expected}".`);
    }
  }

  const rawActionabilityCheck = "proposal.actionType !== \"rebuild_projection\"";
  if (debugTabActions.includes(rawActionabilityCheck)) {
    failures.push(`Repairs panel must not decide actionability from raw actionType in the UI must not include "${rawActionabilityCheck}".`);
  }

  return failures;
}
