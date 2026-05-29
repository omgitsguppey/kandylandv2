import { describe, expect, it, vi } from "vitest";
import { runValidation } from "../../scripts/agent/validate-addition-bloat-guard";
import { validateBloatGuard } from "../../src/lib/agent-governance/addition-bloat-guard";

describe("Addition Bloat Guard Validation Suite", () => {
  const baseConfig = {
    netAdditions: 10,
    netDeletions: 20,
    isGutConsolidationTask: false,
    newResolversCreated: [],
    newValidatorsCreated: [],
    newMemoryRules: [],
  };

  it("should validate a compliant config", () => {
    const failures = validateBloatGuard(baseConfig);
    expect(failures.length).toBe(0);
  });

  it("should fail if net additions exceed deletions with no justification", () => {
    const badConfig = {
      ...baseConfig,
      netAdditions: 30,
      netDeletions: 10,
    };
    const failures = validateBloatGuard(badConfig);
    expect(failures).toContain("Bloat violation: net additions exceed deletions, but no justification was provided.");
  });

  it("should pass if net additions exceed deletions with justification", () => {
    const goodConfig = {
      ...baseConfig,
      netAdditions: 30,
      netDeletions: 10,
      justificationForNetAdditions: "Needed to add new core validations.",
    };
    const failures = validateBloatGuard(goodConfig);
    expect(failures.length).toBe(0);
  });

  it("should fail if gut task has additions exceeding deletions without safe override", () => {
    const badConfig = {
      ...baseConfig,
      isGutConsolidationTask: true,
      netAdditions: 30,
      netDeletions: 10,
      justificationForNetAdditions: "Just some changes.",
    };
    const failures = validateBloatGuard(badConfig);
    expect(failures).toContain("Bloat violation: gut/consolidation task has net additions exceeding deletions without safe justification.");
  });

  it("should pass if gut task has additions exceeding deletions with explicitly justified and safe tag", () => {
    const goodConfig = {
      ...baseConfig,
      isGutConsolidationTask: true,
      netAdditions: 30,
      netDeletions: 10,
      justificationForNetAdditions: "explicitly_justified_and_safe - necessary rewrite.",
    };
    const failures = validateBloatGuard(goodConfig);
    expect(failures.length).toBe(0);
  });

  it("should fail if generated artifact over 500 lines lacks justification", () => {
    const badConfig = {
      ...baseConfig,
      generatedArtifactLinesCount: { "stale-report.json": 600 },
    };
    const failures = validateBloatGuard(badConfig);
    expect(failures).toContain("Bloat violation: generated artifact 'stale-report.json' is over 500 lines (600) but has no justification.");
  });

  it("should execute validation without process.exit if clean", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`process.exit called with ${code}`);
    });

    try {
      runValidation();
      expect(exitSpy).not.toHaveBeenCalled();
    } catch (e: any) {
      if (e.message.startsWith("process.exit called")) {
        expect.fail(e.message);
      } else {
        throw e;
      }
    } finally {
      exitSpy.mockRestore();
    }
  });
});
