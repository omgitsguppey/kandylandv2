import { describe, expect, it } from "vitest";

import { buildProductBodyMapReport } from "@/lib/product-integrity/product-body-map";
import {
  buildBodySystemWiringRepairReport,
  classifyBodySystemWiringDirtyFile,
  validateBodySystemWiringRepairReport,
} from "@/lib/product-integrity/body-system-wiring-repair";

const packageScripts = {
  "check:body-system-wiring-repair": "tsx scripts/agent/validate-body-system-wiring-repair.ts",
  "check:product-body-map": "tsx scripts/agent/validate-product-body-map.ts",
};

describe("body system wiring repair", () => {
  it("turns the runtime watch-time orphan into an owned deferred repair instead of fake runtime proof", () => {
    const bodyMap = buildProductBodyMapReport({
      packageScripts,
      dirtyFiles: [],
      openPullRequests: [],
    });
    const report = buildBodySystemWiringRepairReport({
      productBodyMapReport: bodyMap,
      packageScripts,
      dirtyFiles: [],
      openPullRequests: [],
    });

    expect(report.gapsBefore).toBeGreaterThanOrEqual(1);
    expect(report.gapsFixed.map((gap) => gap.limbId)).toContain("metric:global:runtime_watch_time");

    const deferred = report.gapsDeferred.find((gap) => gap.limbId === "metric:global:runtime_watch_time");
    expect(deferred).toBeDefined();
    expect(deferred?.classification).toBe("deferred_with_owner");
    expect(deferred?.owner).toBe("viewer-runtime");
    expect(deferred?.reason).toContain("persisted watch-session evidence");
    expect(deferred?.evidencePolicy).toBe("do_not_claim_runtime_proof");
    expect(deferred?.validators).toEqual(expect.arrayContaining([
      "check:body-system-wiring-repair",
      "check:drop-watch-time-accuracy",
    ]));
    expect(report.unsafeUnknown).toEqual([]);
    expect(validateBodySystemWiringRepairReport(report)).toEqual([]);
  });

  it("requires fixed wiring gaps to carry validator and test coverage", () => {
    const report = buildBodySystemWiringRepairReport({
      productBodyMapReport: buildProductBodyMapReport({ packageScripts }),
      packageScripts,
      dirtyFiles: [],
      openPullRequests: [],
    });

    expect(report.gapsFixed.length).toBeGreaterThan(0);
    for (const gap of report.gapsFixed) {
      expect(gap.validators.length).toBeGreaterThan(0);
      expect(gap.testCoverage).toContain("tests/unit/body-system-wiring-repair.spec.ts");
      expect(gap.scoreDimensions.length).toBeGreaterThan(0);
    }
  });

  it("classifies dirty files for scoped staging and rejects unknown product runtime edits", () => {
    expect(classifyBodySystemWiringDirtyFile("agent/state/body-system-wiring-repair.generated.json"))
      .toBe("current_generated_artifact_to_commit");
    expect(classifyBodySystemWiringDirtyFile("src/lib/product-integrity/body-system-wiring-repair.ts"))
      .toBe("real_source_change_needs_review");
    expect(classifyBodySystemWiringDirtyFile("src/lib/wallet/runtime.ts"))
      .toBe("unsafe_unknown");
  });
});
