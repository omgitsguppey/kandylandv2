import { describe, expect, it } from "vitest";

import {
  buildDependencyToolchainPolicyReport,
  validateDependencyToolchainPolicyReport,
} from "../../src/lib/config-hardening/dependency-toolchain-policy";

describe("dependency toolchain policy", () => {
  it("blocks broad dependency bundles from beta-exit cleanup by default", () => {
    const report = buildDependencyToolchainPolicyReport();
    const validation = validateDependencyToolchainPolicyReport(report);

    expect(report.policyStatus).toBe("classified");
    expect(report.rules.some((rule) => rule.id === "provider_sdk_updates_separate_window")).toBe(true);
    expect(report.lockfilePolicy.status).toBe("intentional_change_required");
    expect(validation.ok).toBe(true);
  });
});
