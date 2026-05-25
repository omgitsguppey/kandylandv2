import { describe, expect, it } from "vitest";
import { classifySourceWindowZeroShell, statusBlocksHealthyLoaded } from "@/lib/debug/source-window-zero-shell-classifier";

describe("source-window zero-shell classifier", () => {
  it("does not allow loaded zero rows without source window provenance", () => {
    const result = classifySourceWindowZeroShell({
      rowsLoaded: 0,
      sampleCount: 0,
      sourcePath: "orchestration evidence collections",
      sourceExists: true,
      sourceReady: true,
      formulaState: "documented",
      freshnessState: "fresh",
    });

    expect(result.status).toBe("source_ready_no_sample_loaded");
    expect(statusBlocksHealthyLoaded(result.status)).toBe(true);
    expect(result.nextAction).toContain("bounded sample");
  });

  it("classifies real empty only when the source window and generated time exist", () => {
    const result = classifySourceWindowZeroShell({
      rowsLoaded: 0,
      sampleCount: 0,
      sourceWindowStartUtc: "2026-05-01T00:00:00.000Z",
      sourceWindowEndUtc: "2026-05-25T00:00:00.000Z",
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
      sourcePath: "experiments registry",
      sourceExists: true,
      formulaState: "documented",
      freshnessState: "fresh",
    });

    expect(result.status).toBe("loaded_empty_with_source_window");
    expect(statusBlocksHealthyLoaded(result.status)).toBe(false);
  });

  it("makes formula missing actionable before treating a panel as loaded", () => {
    const result = classifySourceWindowZeroShell({
      rowsLoaded: 10,
      sampleCount: 10,
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
      sourcePath: "analytics truth recovery",
      sourceExists: true,
      formulaState: "missing",
      freshnessState: "fresh",
    });

    expect(result.status).toBe("formula_missing_actionable");
    expect(result.explanation).toContain("formula");
  });
});
