export interface BloatGuardConfig {
  netAdditions: number;
  netDeletions: number;
  justificationForNetAdditions?: string;
  isGutConsolidationTask: boolean;
  generatedArtifactLinesCount?: Record<string, number>;
  generatedArtifactJustifications?: Record<string, string>;
  newResolversCreated: string[];
  newResolverJustifications?: Record<string, string>;
  newValidatorsCreated: {
    name: string;
    owner: string;
    packageScript: string;
    hasUnitTest: boolean;
    hasRetirementRule: boolean;
  }[];
  newMemoryRules: {
    rule: string;
    associatedMistakePattern: string;
  }[];
}

export function validateBloatGuard(config: BloatGuardConfig): string[] {
  const failures: string[] = [];

  // 1. Net additions > deletions must have justification
  if (config.netAdditions > config.netDeletions) {
    if (!config.justificationForNetAdditions || config.justificationForNetAdditions.trim().length === 0) {
      failures.push("Bloat violation: net additions exceed deletions, but no justification was provided.");
    }
  }

  // 2. Gut/consolidation tasks must not have net additions exceeding deletions
  if (config.isGutConsolidationTask && config.netAdditions > config.netDeletions) {
    if (!config.justificationForNetAdditions || !config.justificationForNetAdditions.includes("explicitly_justified_and_safe")) {
      failures.push("Bloat violation: gut/consolidation task has net additions exceeding deletions without safe justification.");
    }
  }

  // 3. Generated artifact over 500 lines must be justified
  if (config.generatedArtifactLinesCount) {
    for (const [filename, lines] of Object.entries(config.generatedArtifactLinesCount)) {
      if (lines > 500) {
        const justification = config.generatedArtifactJustifications?.[filename];
        if (!justification || justification.trim().length === 0) {
          failures.push(`Bloat violation: generated artifact '${filename}' is over 500 lines (${lines}) but has no justification.`);
        }
      }
    }
  }

  // 4. Any new resolver must have justification of why no canonical owner existed
  for (const resolver of config.newResolversCreated) {
    const justification = config.newResolverJustifications?.[resolver];
    if (!justification || justification.trim().length === 0) {
      failures.push(`Bloat violation: new resolver '${resolver}' must prove why no canonical owner existed.`);
    }
  }

  // 5. New validators must have owner, script, unit test, and retirement rule
  for (const validator of config.newValidatorsCreated) {
    if (!validator.owner) {
      failures.push(`Bloat violation: validator '${validator.name}' is missing an owner.`);
    }
    if (!validator.packageScript) {
      failures.push(`Bloat violation: validator '${validator.name}' is missing a package script.`);
    }
    if (!validator.hasUnitTest) {
      failures.push(`Bloat violation: validator '${validator.name}' is missing a unit test.`);
    }
    if (!validator.hasRetirementRule) {
      failures.push(`Bloat violation: validator '${validator.name}' is missing a retirement rule.`);
    }
  }

  // 6. Memory rules must be specific and tied to mistake patterns
  for (const rule of config.newMemoryRules) {
    if (!rule.associatedMistakePattern || rule.associatedMistakePattern.trim().length === 0) {
      failures.push(`Bloat violation: memory rule '${rule.rule}' is missing an associated mistake pattern.`);
    }
  }

  return failures;
}
