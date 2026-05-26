import { describe, expect, it } from "vitest";

import {
  buildReleaseReadinessContext,
  buildRuntimeSmokeHarnessReport,
  validateRuntimeSmokeHarnessReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("runtime smoke harness", () => {
  it("is source-safe and never claims deployed runtime proof", () => {
    const context = buildReleaseReadinessContext(process.cwd(), { currentHead: "head", openPrs: [], artifacts: [], dirtyFiles: [] });
    const report = buildRuntimeSmokeHarnessReport(context);

    expect(report.claimsDeployedRuntimeProof).toBe(false);
    expect(report.providerCallsPerformed).toBe(false);
    expect(report.routes.some((route) => route.routeClass === "api_webhook_or_provider")).toBe(true);
    expect(validateRuntimeSmokeHarnessReport(report)).toEqual([]);
  });
});
