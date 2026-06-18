import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type PolicySources = {
  packageJson: string;
  policy: string;
  refreshSafeguards: string;
  publicBetaValidator: string;
  currentBetaValidator: string;
  overnightValidator: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");

const sourcePaths = {
  packageJson: "package.json",
  policy: "src/lib/agent-score/generated-artifact-version-policy.ts",
  refreshSafeguards: "src/lib/agent-score/refresh-safeguards.ts",
  publicBetaValidator: "scripts/agent/validate-public-beta-score.ts",
  currentBetaValidator: "scripts/agent/validate-current-beta-exit-status.ts",
  overnightValidator: "scripts/agent/validate-overnight-beta-readiness-lock.ts",
} satisfies Record<keyof PolicySources, string>;

function readSource(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function requireIncludes(source: string, expected: string, failure: string, failures: string[]) {
  if (!source.includes(expected)) failures.push(failure);
}

export function validateGeneratedArtifactVersionPolicySources(sources: PolicySources) {
  const failures: string[] = [];
  const validators = [
    sources.publicBetaValidator,
    sources.currentBetaValidator,
    sources.overnightValidator,
  ].join("\n");

  requireIncludes(
    sources.packageJson,
    "\"check:generated-artifact-version-policy\"",
    "package script check:generated-artifact-version-policy is required.",
    failures,
  );
  requireIncludes(
    sources.policy,
    "classifyGeneratedArtifactVersion",
    "central generated artifact version policy must export classifyGeneratedArtifactVersion.",
    failures,
  );
  requireIncludes(
    sources.refreshSafeguards,
    "classifyGeneratedArtifactVersion",
    "refresh safeguards must use the central generated artifact version policy.",
    failures,
  );
  requireIncludes(
    sources.refreshSafeguards,
    "same_commit_snapshot",
    "refresh safeguards must treat same_commit_snapshot as a current artifact status.",
    failures,
  );
  requireIncludes(
    sources.refreshSafeguards,
    "statusIsCurrent",
    "refresh safeguards must centralize accepted current artifact statuses.",
    failures,
  );
  requireIncludes(
    validators,
    "generated-artifact-version-policy",
    "beta artifact validators must import the central generated artifact version policy.",
    failures,
  );
  requireIncludes(
    sources.publicBetaValidator,
    "PUBLIC_BETA_SCORE_OWNED_INPUT_PATHS",
    "public beta score validator must declare owned source inputs for current_by_impact artifact status.",
    failures,
  );
  requireIncludes(
    sources.publicBetaValidator,
    "ownedSourcePaths: [...PUBLIC_BETA_SCORE_OWNED_INPUT_PATHS]",
    "public beta score validator must pass owned source inputs to the central generated artifact policy.",
    failures,
  );
  requireIncludes(
    sources.currentBetaValidator,
    "currentBetaExitOwnedInputPaths",
    "current beta exit validator must declare owned source inputs for current_by_impact artifact status.",
    failures,
  );
  requireIncludes(
    sources.currentBetaValidator,
    "ownedSourcePaths: [...currentBetaExitOwnedInputPaths]",
    "current beta exit validator must pass owned source inputs to the central generated artifact policy.",
    failures,
  );

  if (/function\s+changedInHead\b/u.test(validators)) {
    failures.push("generated artifact validators must not define local changedInHead helpers.");
  }
  if (/function\s+parentHead\b/u.test(validators)) {
    failures.push("generated artifact validators must not define local parentHead helpers.");
  }
  if (/matchesCurrentOrSameCommitArtifact/u.test(validators)) {
    failures.push("generated artifact validators must not define local same-commit matcher helpers.");
  }
  if (/function\s+sameSourceVersion\b/u.test(sources.refreshSafeguards)) {
    failures.push("refresh safeguards must not define duplicate sameSourceVersion logic.");
  }

  return failures;
}

function main() {
  const sources = Object.fromEntries(
    Object.entries(sourcePaths).map(([key, path]) => [key, readSource(path)]),
  ) as PolicySources;
  const failures = validateGeneratedArtifactVersionPolicySources(sources);

  if (failures.length > 0) {
    console.error("Generated artifact version policy validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Generated artifact version policy validated.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
