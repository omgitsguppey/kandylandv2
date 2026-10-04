import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createSourceValidatorTaskFixture } from "./utils/source-validator-contract";

import { buildDebugCockpitBatch29AnalyticsSourceHierarchyReport } from "@/lib/debug/debug-cockpit-batch29-analytics-source-hierarchy";

describe("debug cockpit batch 29 analytics source hierarchy", () => {
  it("locks chart readiness, GA4 semantics, source detail, copy, and consumer alignment", () => {
    const report = buildDebugCockpitBatch29AnalyticsSourceHierarchyReport({
      ga4AvailabilityStatusBefore: "reports_available",
      ga4AvailabilityStatusAfter: "reports_loaded_empty",
      chartReadinessStatusBefore: "ready",
      chartReadinessStatusAfter: "source_disagreement",
      sourceAgreementStatus: "failed",
      validationCopyContradictionsBefore: 1,
      validationCopyContradictionsAfter: 0,
      passAllowedContradictionsBefore: 1,
      passAllowedContradictionsAfter: 0,
      analyticsTabSourceStatus: "source_agreement_failed",
      consumerSourceMismatches: ["admin_analytics_charts"],
      blockedAnalyticsConsumers: ["admin_analytics_charts", "admin_analytics_overview"],
      failedSources: ["ga4", "historical_snapshot", "legacy_support"],
    });

    expect(report.chartReadinessStatusAfter).toBe("source_disagreement");
    expect(report.ga4AvailabilityStatusAfter).toBe("reports_loaded_empty");
    expect(report.validationCopyContradictionsAfter).toBe(0);
    expect(report.passAllowedContradictionsAfter).toBe(0);
    expect(report.sourceAgreementDetails.comparedSources).toEqual(["first_party", "ga4", "historical_snapshot", "legacy_support"]);
    expect(report.secondSourceAnalyticsConsumers).toEqual([
      "admin_analytics_device_mix",
      "admin_analytics_region_demand",
      "admin_analytics_top_paths",
    ]);
    expect(report.blockedAnalyticsConsumers).not.toContain("admin_analytics_device_mix");
    expect(report.sourceAgreementDetails.blockedConsumerDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({
        consumer: "admin_analytics_device_mix",
        allowedDisplayState: "second_source_only",
      }),
    ]));
    expect(report.scoreAfter).toBeGreaterThan(report.scoreBefore);
    expect(report.scoreDimensions).toContain("chartReadinessHierarchy");
  });
});

describe("Batch29 actual CLI mutation scope", () => {
  const options = {
    validator: "scripts/agent/validate-debug-cockpit-batch29-analytics-source-hierarchy.ts",
    report: "agent/state/debug-cockpit-batch29-analytics-source-hierarchy.generated.json",
    allowedSourceFiles: ["tsconfig.json"],
  };
  const markdown = "docs/agent-truth/debug-cockpit-batch29-analytics-source-hierarchy.md";
  function createFixture() {
    const fixture = createSourceValidatorTaskFixture(options);
    // This CLI wrapper imports its models indirectly; resolve those actual repository models.
    fixture.write("tsconfig.json", JSON.stringify({ extends: join(process.cwd(), "tsconfig.json") }));
    return fixture;
  }

  it("admits an allowed mutation while retaining immutable scope and inherited evidence", () => {
    const fixture = createFixture();
    fixture.write("fixture.ts", "export const value = 2;\n");
    const result = fixture.run();
    expect(result.status, result.output).toBe(0);
    const report = JSON.parse(fixture.read(options.report));
    const inputHash = createHash("sha256").update(fixture.read("output/source-validator-fixture/input.json")).digest("hex");
    expect(report.validationFailures).toEqual([]);
    expect(report.dirtyFileClassifications).toEqual([]);
    expect(report.mutationScope).toMatchObject({
      owner: "scripts/agent/validate-agent-takeover-safety-check.ts",
      mode: "input_bound_task",
      taskKey: "source-validator-fixture",
      inputHash,
      currentHead: report.currentHead,
      changedFiles: ["fixture.ts", "tsconfig.json"],
      sourceFingerprint: fixture.fingerprint(),
      inheritedDirtySourceFileCount: 1,
    });
  });

  it("rejects an undeclared mutation before publishing and permits recovery", () => {
    const fixture = createFixture();
    fixture.write("fixture.ts", "export const value = 2;\n");
    const accepted = fixture.run();
    expect(accepted.status, accepted.output).toBe(0);
    const acceptedJson = fixture.read(options.report);
    const acceptedMarkdown = fixture.read(markdown);
    fixture.write(fixture.protectedFile, "export const value = 3;\n");
    const rejected = fixture.run();
    expect(rejected.status, rejected.output).toBe(1);
    expect(rejected.output).toContain("Output scope violation: " + fixture.protectedFile);
    expect(fixture.read(options.report)).toBe(acceptedJson);
    expect(fixture.read(markdown)).toBe(acceptedMarkdown);
    fixture.write(fixture.protectedFile, "export const value = 2;\n");
    const recovered = fixture.run();
    expect(recovered.status, recovered.output).toBe(0);
    expect(JSON.parse(fixture.read(options.report)).mutationScope.sourceFingerprint).toBe(fixture.fingerprint());
  });

  it("keeps the standalone whole-tree unsafe classification", () => {
    const fixture = createFixture();
    fixture.write("fixture.ts", "export const value = 2;\n");
    const result = fixture.run([]);
    expect(result.status, result.output).toBe(1);
    expect(result.output).toContain("dirty files unclassified.");
    const report = JSON.parse(fixture.read(options.report));
    expect(report.validationFailures).toEqual(["dirty files unclassified."]);
    expect(report.dirtyFileClassifications).toEqual(expect.arrayContaining([
      { filePath: fixture.protectedFile, classification: "unsafe_unknown" },
      { filePath: "fixture.ts", classification: "unsafe_unknown" },
    ]));
    expect(report.mutationScope).toEqual({ mode: "whole_git_worktree" });
  });
});
