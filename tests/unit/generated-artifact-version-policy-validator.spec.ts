import { describe, expect, it } from "vitest";

import { validateGeneratedArtifactVersionPolicySources } from "../../scripts/agent/validate-generated-artifact-version-policy";

describe("generated artifact version policy validator", () => {
  const baseSources = {
    packageJson: JSON.stringify({
      scripts: {
        "check:generated-artifact-version-policy": "tsx scripts/agent/validate-generated-artifact-version-policy.ts",
      },
    }),
    policy: [
      "export function classifyGeneratedArtifactVersion() {}",
      "const artifactCommit = null;",
      "const effectiveComparisonHead = artifactCommit;",
    ].join("\n"),
    refreshSafeguards: [
      "import { classifyGeneratedArtifactVersion } from './generated-artifact-version-policy';",
      '"same_commit_snapshot"',
      "statusIsCurrent",
    ].join("\n"),
    publicBetaValidator: [
      "import { classifyGeneratedArtifactFromGit } from '../../src/lib/agent-score/generated-artifact-version-policy';",
      "const PUBLIC_BETA_SCORE_OWNED_INPUT_PATHS = [] as const;",
      "classifyGeneratedArtifactFromGit({ ownedSourcePaths: [...PUBLIC_BETA_SCORE_OWNED_INPUT_PATHS] });",
    ].join("\n"),
    currentBetaValidator: [
      "import { classifyGeneratedArtifactVersion } from '../../src/lib/agent-score/generated-artifact-version-policy';",
      "const currentBetaExitOwnedInputPaths = [] as const;",
      "classifyGeneratedArtifactVersion({ ownedSourcePaths: [...currentBetaExitOwnedInputPaths] });",
    ].join("\n"),
    overnightValidator: "import { classifyGeneratedArtifactFromGit } from '../../src/lib/agent-score/generated-artifact-version-policy';",
  };

  it("passes when score artifacts use the shared policy", () => {
    expect(validateGeneratedArtifactVersionPolicySources(baseSources)).toEqual([]);
  });

  it("fails when a validator reintroduces local HEAD helper logic", () => {
    expect(validateGeneratedArtifactVersionPolicySources({
      ...baseSources,
      publicBetaValidator: `${baseSources.publicBetaValidator}\nfunction changedInHead() { return true; }`,
    })).toContain("generated artifact validators must not define local changedInHead helpers.");
  });

  it("fails when refresh safeguards do not understand same-commit snapshots", () => {
    expect(validateGeneratedArtifactVersionPolicySources({
      ...baseSources,
      refreshSafeguards: "import { classifyGeneratedArtifactVersion } from './generated-artifact-version-policy';",
    })).toContain("refresh safeguards must treat same_commit_snapshot as a current artifact status.");
  });

  it("fails when beta validators omit owned input boundaries", () => {
    expect(validateGeneratedArtifactVersionPolicySources({
      ...baseSources,
      publicBetaValidator: "import { classifyGeneratedArtifactFromGit } from '../../src/lib/agent-score/generated-artifact-version-policy';",
    })).toContain("public beta score validator must declare owned source inputs for current_by_impact artifact status.");

    expect(validateGeneratedArtifactVersionPolicySources({
      ...baseSources,
      currentBetaValidator: "import { classifyGeneratedArtifactVersion } from '../../src/lib/agent-score/generated-artifact-version-policy';",
    })).toContain("current beta exit validator must declare owned source inputs for current_by_impact artifact status.");
  });

  it("fails when the central policy omits same-commit artifact comparison tracking", () => {
    expect(validateGeneratedArtifactVersionPolicySources({
      ...baseSources,
      policy: "export function classifyGeneratedArtifactVersion() {}",
    })).toContain("central generated artifact version policy must track the last commit that touched each generated artifact.");
  });
});
