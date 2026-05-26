import { describe, expect, it } from "vitest";

import { validateGeneratedArtifactVersionPolicySources } from "../../scripts/agent/validate-generated-artifact-version-policy";

describe("generated artifact version policy validator", () => {
  const baseSources = {
    packageJson: JSON.stringify({
      scripts: {
        "check:generated-artifact-version-policy": "tsx scripts/agent/validate-generated-artifact-version-policy.ts",
      },
    }),
    policy: "export function classifyGeneratedArtifactVersion() {}",
    refreshSafeguards: [
      "import { classifyGeneratedArtifactVersion } from './generated-artifact-version-policy';",
      '"same_commit_snapshot"',
      "statusIsCurrent",
    ].join("\n"),
    publicBetaValidator: "import { classifyGeneratedArtifactFromGit } from '../../src/lib/agent-score/generated-artifact-version-policy';",
    currentBetaValidator: "import { classifyGeneratedArtifactVersion } from '../../src/lib/agent-score/generated-artifact-version-policy';",
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
});
