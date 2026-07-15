import { describe, expect, it } from "vitest";

import {
  artifactVersionFailureMessage,
  classifyGeneratedArtifactVersion,
  isGeneratedArtifactCurrent,
} from "@/lib/agent-score/generated-artifact-version-policy";
import { getArtifactRefreshStatus } from "@/lib/agent-score/refresh-safeguards";

describe("generated artifact version policy", () => {
  it("accepts artifacts generated at the current head", () => {
    const status = classifyGeneratedArtifactVersion({
      artifactPath: "agent/state/public-beta-score.generated.json",
      artifactHead: "head",
      currentHead: "head",
      parentHead: "parent",
      changedFilesInHead: [],
    });

    expect(status.status).toBe("current_head");
    expect(status.needsRefresh).toBe(false);
    expect(isGeneratedArtifactCurrent(status)).toBe(true);
  });

  it("accepts same-commit snapshots when the artifact was changed by HEAD", () => {
    const status = classifyGeneratedArtifactVersion({
      artifactPath: "agent/state/public-beta-score.generated.json",
      artifactHead: "parent",
      currentHead: "head",
      parentHead: "parent",
      changedFilesInHead: ["agent/state/public-beta-score.generated.json"],
    });

    expect(status.status).toBe("same_commit_snapshot");
    expect(status.needsRefresh).toBe(false);
    expect(status.reason).toContain("same commit");
  });

  it("rejects parent-head artifacts that were not changed by HEAD", () => {
    const status = classifyGeneratedArtifactVersion({
      artifactPath: "agent/state/current-beta-exit-status.generated.json",
      artifactHead: "parent",
      currentHead: "head",
      parentHead: "parent",
      changedFilesInHead: ["agent/state/public-beta-score.generated.json"],
    });

    expect(status.status).toBe("stale_source_version");
    expect(status.needsRefresh).toBe(true);
    expect(artifactVersionFailureMessage(status)).toBe(
      "agent/state/current-beta-exit-status.generated.json was generated from an older code version.",
    );
  });

  it("classifies missing artifact version metadata without pretending it is current", () => {
    const status = classifyGeneratedArtifactVersion({
      artifactPath: "agent/state/current-beta-exit-status.generated.json",
      currentHead: "head",
      parentHead: "parent",
      changedFilesInHead: ["agent/state/current-beta-exit-status.generated.json"],
    });

    expect(status.status).toBe("missing_version");
    expect(status.needsRefresh).toBe(true);
  });

  it("fails closed when the current code version is unavailable", () => {
    const status = classifyGeneratedArtifactVersion({
      artifactPath: "agent/state/public-beta-score.generated.json",
      artifactHead: "recorded-head",
    });

    expect(status.status).toBe("missing_version");
    expect(status.needsRefresh).toBe(true);
    expect(isGeneratedArtifactCurrent(status)).toBe(false);
    expect(status.reason).toContain("current code version is unavailable");
  });

  it("lets refresh safeguards treat same-commit snapshots as current", () => {
    const status = getArtifactRefreshStatus({
      artifactPath: "agent/state/public-beta-score.generated.json",
      currentHead: "parent",
      currentCodeVersion: "head",
      parentHead: "parent",
      changedFilesInHead: ["agent/state/public-beta-score.generated.json"],
      generatedAtUtc: "2026-05-26T12:00:00.000Z",
      nowUtc: "2026-05-26T12:01:00.000Z",
    });

    expect(status.status).toBe("same_commit_snapshot");
    expect(status.needsRefresh).toBe(false);
    expect(status.formalEvidenceGateCanClear).toBe(true);
  });
});
