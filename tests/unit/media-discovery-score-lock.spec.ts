import { describe, expect, it } from "vitest";

import { CREATOR_RELATIONSHIP_DEBUG_LANE, CREATOR_RELATIONSHIP_EVENTS } from "@/lib/discovery/creator-relationship-contract";
import { SEARCH_COST_POLICY } from "@/lib/discovery/search-cost-contract";
import { SEARCH_DISCOVERY_DEBUG_LANE, SEARCH_DISCOVERY_EVENTS, buildSearchTelemetryPayload } from "@/lib/discovery/search-telemetry-contract";
import { MEDIA_ACCESS_EVENTS } from "@/lib/media/media-access-contract";
import { MEDIA_UPLOAD_LIFECYCLE_EVENTS, buildMediaUploadLifecycleEvent } from "@/lib/media/media-upload-contract";
import {
  buildMediaDiscoveryScoreLockReport,
  classifyMediaDiscoveryScoreLockDirtyFile,
  validateMediaDiscoveryScoreLockReport,
} from "../../scripts/agent/validate-media-discovery-score-lock";
import {
  targetedBehaviorHeadsMatch,
  targetedBehaviorReportHasExplicitPass,
  targetedBehaviorReportIsFresh,
} from "../../scripts/agent/validate-targeted-behavior-evidence";

const TEST_HEAD = "b".repeat(40);
const GENERATED_PHASE_ARTIFACTS = [
  "agent/state/media-upload-lifecycle.generated.json",
  "agent/state/private-media-access.generated.json",
  "agent/state/creator-discovery-relationship-funnel.generated.json",
  "agent/state/search-discovery-cost.generated.json",
] as const;
const REPORT_KEY_BY_ARTIFACT: Record<typeof GENERATED_PHASE_ARTIFACTS[number], string> = {
  "agent/state/media-upload-lifecycle.generated.json": "media-upload-lifecycle",
  "agent/state/private-media-access.generated.json": "private-media-access",
  "agent/state/creator-discovery-relationship-funnel.generated.json": "creator-discovery-relationship-funnel",
  "agent/state/search-discovery-cost.generated.json": "search-discovery-cost",
};

function passingArtifactReports(head = TEST_HEAD): Record<string, Record<string, unknown>> {
  return Object.fromEntries(GENERATED_PHASE_ARTIFACTS.map((artifactPath) => [artifactPath, {
    reportKey: REPORT_KEY_BY_ARTIFACT[artifactPath],
    status: "pass",
    passed: true,
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    sourceCommit: head,
    canClearSourceGate: true,
    validationFailures: [],
  }]));
}

describe("media discovery score lock", () => {
  it("locks media upload, private access, creator discovery, relationships, and search", () => {
    const report = buildMediaDiscoveryScoreLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
      artifactReports: passingArtifactReports(),
    });

    expect(report.mediaUploadStatus).toBe("pass");
    expect(report.privateMediaAccessStatus).toBe("pass");
    expect(report.creatorDiscoveryStatus).toBe("pass");
    expect(report.relationshipFunnelStatus).toBe("pass");
    expect(report.searchDiscoveryStatus).toBe("pass");
    expect(report.costControlStatus).toBe("pass");
    expect(report.telemetryStatus).toBe("pass");
    expect(report.debugVisibilityStatus).toBe("pass");
    expect(report.status).toBe("pass");
    expect(report.passed).toBe(true);
    expect(report.sourceCommit).toBe(TEST_HEAD);
    expect(targetedBehaviorHeadsMatch(report.sourceCommit, TEST_HEAD)).toBe(true);
    expect(targetedBehaviorReportIsFresh(report as unknown as Record<string, unknown>)).toBe(true);
    expect(targetedBehaviorReportHasExplicitPass(report as unknown as Record<string, unknown>)).toBe(true);
    expect(report.scoreBefore).toBe(77.83);
    expect(report.scoreAfter).toBe(77.83);
    expect(report.scoreDimensions).toEqual(expect.arrayContaining(["sourceHealth", "runtimeHealth", "evidenceCompleteness", "costRisk", "regressionRisk"]));
    expect(report.remainingGaps).toEqual(expect.arrayContaining([
      "Runtime/provider media access smoke remains outside this source-only lock.",
    ]));
    expect(validateMediaDiscoveryScoreLockReport(report)).toEqual([]);
  });

  it("requires canonical event spines and debug lanes", () => {
    const report = buildMediaDiscoveryScoreLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      artifactReports: passingArtifactReports(),
    });

    expect(report.eventSpines.mediaUpload).toEqual(MEDIA_UPLOAD_LIFECYCLE_EVENTS);
    expect(report.eventSpines.privateMediaAccess).toEqual(MEDIA_ACCESS_EVENTS);
    expect(report.eventSpines.creatorRelationship).toEqual(CREATOR_RELATIONSHIP_EVENTS);
    expect(report.eventSpines.searchDiscovery).toEqual(SEARCH_DISCOVERY_EVENTS);
    expect(report.debugLanes).toEqual(expect.arrayContaining([
      "Media upload",
      "Private media access",
      CREATOR_RELATIONSHIP_DEBUG_LANE,
      SEARCH_DISCOVERY_DEBUG_LANE,
    ]));
    expect(report.searchCostPolicy).toMatchObject({
      backendCallPerKeystrokeAllowed: false,
      broadUnboundedReadsAllowed: false,
      rawQueryTextInBroadTelemetryAllowed: false,
      clientDebounceMs: SEARCH_COST_POLICY.clientDebounceMs,
    });
  });

  it("blocks raw private media and raw search data in lock telemetry examples", () => {
    const uploadPayload = buildMediaUploadLifecycleEvent({
      eventName: "media_storage_upload_completed",
      uploadId: "upload_1",
      ownerUserId: "user_1",
      featureId: "support",
      surface: "chat",
      mediaKind: "image",
      mimeType: "image/png",
      sizeBytes: 1024,
      maxBytes: 4096,
      storagePath: "chat/private/user_1/raw.png",
      assetUrl: "https://firebasestorage.googleapis.com/v0/b/private/raw.png?token=secret",
      status: "storage_completed",
      privacyClass: "required_integrity",
    });
    const searchPayload = buildSearchTelemetryPayload({
      eventName: "search_submitted",
      surface: "drops",
      sourceComponent: "compact_drops_filter_bar",
      queryText: "secret fan@example.com query",
      executionMode: "local_filter",
    });
    const report = buildMediaDiscoveryScoreLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      artifactReports: passingArtifactReports(),
    });

    expect(JSON.stringify(uploadPayload)).not.toContain("firebasestorage.googleapis.com");
    expect(JSON.stringify(uploadPayload)).not.toContain("chat/private/user_1/raw.png");
    expect(JSON.stringify(searchPayload)).not.toContain("fan@example.com");
    expect(JSON.stringify(searchPayload)).not.toContain("secret");
    expect(report.rawSensitiveTelemetryProtected).toBe(true);
  });

  it("fails when a required phase lock is missing or score dimensions are absent", () => {
    const report = buildMediaDiscoveryScoreLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      missingArtifactForTest: "agent/state/search-discovery-cost.generated.json",
      artifactReports: passingArtifactReports(),
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(targetedBehaviorReportHasExplicitPass(report as unknown as Record<string, unknown>)).toBe(false);
    expect(validateMediaDiscoveryScoreLockReport(report)).toContain("search discovery cost artifact missing.");

    const noScore = {
      ...buildMediaDiscoveryScoreLockReport({
        currentHead: TEST_HEAD,
        dirtyFiles: [],
        artifactReports: passingArtifactReports(),
      }),
      scoreDimensions: [],
    };
    expect(validateMediaDiscoveryScoreLockReport(noScore)).toContain("score dimensions missing.");
  });

  it("fails closed when provenance is not full-head and current", () => {
    const report = buildMediaDiscoveryScoreLockReport({
      generatedAtUtc: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      currentHead: "short-head",
      dirtyFiles: [],
      artifactReports: passingArtifactReports(),
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "currentHead and sourceCommit must be the same full 40-character Git SHA.",
      "generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.",
    ]));
  });

  it("rejects stale, wrong-head, failing, or failure-bearing child artifacts", () => {
    const artifactReports = passingArtifactReports();
    artifactReports["agent/state/search-discovery-cost.generated.json"] = {
      status: "pass",
      generatedAtUtc: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      currentHead: "d".repeat(40),
      validationFailures: ["search child failed"],
    };
    const report = buildMediaDiscoveryScoreLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      artifactReports,
    });

    expect(report.status).toBe("fail");
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "search-discovery-cost child validationFailures must be an explicit empty array.",
      "search-discovery-cost child currentHead must match the current full Git SHA.",
      "search-discovery-cost child generatedAtUtc must be non-future and fresh within 86400000ms.",
    ]));
    expect(report.nextExactSteps.join("\n")).toContain("search-discovery-cost child currentHead");
  });

  it("rejects unrelated child identity and malformed verdict fields", () => {
    const artifactReports = passingArtifactReports();
    artifactReports["agent/state/private-media-access.generated.json"] = {
      ...artifactReports["agent/state/private-media-access.generated.json"],
      reportKey: "unrelated-report",
      passed: "yes",
    };
    const report = buildMediaDiscoveryScoreLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      artifactReports,
    });

    expect(report.status).toBe("fail");
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "private-media-access child reportKey must be private-media-access.",
      "private-media-access child passed must be boolean when present.",
    ]));
  });

  it("classifies scoped dirty files and blocks unsafe runtime churn", () => {
    expect(classifyMediaDiscoveryScoreLockDirtyFile("scripts/agent/validate-media-discovery-score-lock.ts")).toBe("validator_artifact_expected");
    expect(classifyMediaDiscoveryScoreLockDirtyFile("tests/unit/media-discovery-score-lock.spec.ts")).toBe("test_artifact_expected");
    expect(classifyMediaDiscoveryScoreLockDirtyFile("agent/state/media-discovery-score-lock.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyMediaDiscoveryScoreLockDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");

    const report = buildMediaDiscoveryScoreLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: ["src/lib/gumdrop-ledger.ts"],
      artifactReports: passingArtifactReports(),
    });
    expect(validateMediaDiscoveryScoreLockReport(report)).toContain("src/lib/gumdrop-ledger.ts is unclassified for media discovery score lock.");
  });
});
