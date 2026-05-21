import { describe, expect, it } from "vitest";

import {
  buildFinalAlgorithmicDebugLock,
  validateFinalAlgorithmicDebugLock,
  type FinalAlgorithmicDebugLockInput,
} from "@/lib/debug/final-algorithmic-debug-lock";

const completeInput: FinalAlgorithmicDebugLockInput = {
  scoreBefore: 65.8,
  scoreAfter: 65.8,
  debugBacklogStatus: "pass",
  aiCriticStatus: "request_changes",
  behaviorMathStatus: "pass",
  legacyNormalizationStatus: "pass",
  orphanMetricStatus: "pass",
  realUsageConfidenceStatus: "pass",
  recoveryPlaybookStatus: "pass",
  refreshQueueStatus: "pass",
  operatorCockpitStatus: "pass",
  manualBottleneckReduction: "manual testing is no longer the default bottleneck; formal evidence gates remain manual",
  remainingFormalEvidenceGates: ["Visual/manual smoke", "Runtime/provider smoke", "Admin truth/sample evidence"],
  remainingScoreDrag: ["runtimeHealth", "evidenceCompleteness", "costRisk"],
  p0Count: 0,
  p1Count: 20,
  p2Count: 70,
  nextExactSteps: [
    "Attach visual/manual smoke artifact.",
    "Attach runtime/provider smoke artifact.",
    "Attach redacted admin truth sample artifact.",
  ],
  dependencies: {
    debugBacklog: true,
    aiCritic: true,
    behaviorMath: true,
    legacyNormalization: true,
    orphanMetrics: true,
    realUsageConfidence: true,
    recoveryPlaybooks: true,
    refreshQueue: true,
    operatorCockpit: true,
  },
};

describe("final algorithmic debug lock", () => {
  it("locks algorithmic debugging without clearing formal evidence gates", () => {
    const lock = buildFinalAlgorithmicDebugLock(completeInput, {
      generatedAtUtc: "2026-05-21T07:00:00.000Z",
      currentHead: "abc1234",
    });

    expect(lock.overallStatus).toBe("locked_with_formal_gates_remaining");
    expect(lock.remainingFormalEvidenceGates).toEqual(expect.arrayContaining([
      "Visual/manual smoke",
      "Runtime/provider smoke",
      "Admin truth/sample evidence",
    ]));
    expect(lock.manualBottleneckReduction).toContain("formal evidence gates remain manual");
    expect(validateFinalAlgorithmicDebugLock(lock)).toEqual([]);
  });

  it("rejects missing phase dependencies and hidden manual evidence gates", () => {
    const lock = buildFinalAlgorithmicDebugLock({
      ...completeInput,
      behaviorMathStatus: "missing",
      remainingFormalEvidenceGates: [],
      dependencies: {
        ...completeInput.dependencies,
        behaviorMath: false,
      },
    });

    expect(validateFinalAlgorithmicDebugLock(lock)).toEqual(expect.arrayContaining([
      expect.stringContaining("behavior math unknown"),
      expect.stringContaining("phase missing without dependency status"),
      expect.stringContaining("manual evidence still required but not listed honestly"),
    ]));
  });
});
