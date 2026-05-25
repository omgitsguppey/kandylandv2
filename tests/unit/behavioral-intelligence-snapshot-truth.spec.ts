import { describe, expect, it } from "vitest";
import { buildBehavioralIntelligenceSnapshotStatus } from "@/lib/behavioral/behavioral-intelligence-snapshot-status";

describe("behavioral intelligence snapshot truth", () => {
  it("keeps zero profiles and unknown ranking actionable", () => {
    const report = buildBehavioralIntelligenceSnapshotStatus({
      userProfiles: 0,
      dropProfiles: 0,
      connectedModules: 0,
      sampleSize: 0,
      rankingMode: "unknown",
      deterministicBaselineStatus: "missing",
      sourcePath: "behavioral snapshot status",
    });

    expect(report.status.status).toBe("formula_missing_actionable");
    expect(report.nextAction).toContain("deterministic baseline");
  });

  it("allows deterministic loaded snapshots without ML activation", () => {
    const report = buildBehavioralIntelligenceSnapshotStatus({
      userProfiles: 5,
      guestProfiles: 2,
      dropProfiles: 10,
      connectedModules: 9,
      sampleSize: 42,
      rankingMode: "deterministic",
      deterministicBaselineStatus: "available",
      mlValidationStatus: "not_enough_sample",
      modelVersion: "deterministic-v1",
      latestRebuildAtUtc: "2026-05-25T12:00:00.000Z",
      freshness: "live",
      sourcePath: "behavioral snapshot status",
    });

    expect(report.status.status).toBe("loaded_with_data");
    expect(report.sampleSize).toBe(42);
    expect(report.mlValidationStatus).toBe("not_enough_sample");
  });
});
