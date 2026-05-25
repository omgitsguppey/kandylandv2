import { describe, expect, it } from "vitest";

import {
  MODULE_COVERAGE_SOURCE_POLICIES,
  getModuleCoveragePolicy,
} from "@/lib/analytics/module-coverage-source-policy";

describe("module coverage source policy", () => {
  it("defines the Batch 34 module set with validators and dependent panels", () => {
    const expectedModules = [
      "auth",
      "onboarding",
      "navigation",
      "notifications",
      "daily_tasks",
      "task_guidance",
      "commerce",
      "unlock_watch",
      "creator_experiences",
      "engagement",
      "admin",
      "runtime",
      "support",
      "ai_debug",
    ];

    expect(MODULE_COVERAGE_SOURCE_POLICIES.map((policy) => policy.moduleId)).toEqual(expectedModules);
    for (const policy of MODULE_COVERAGE_SOURCE_POLICIES) {
      expect(policy.validators.length).toBeGreaterThan(0);
      expect(policy.dependentPanels.length).toBeGreaterThan(0);
      expect(policy.nextAction).toMatch(/\S/);
    }
  });

  it("does not blindly require GA4 for internal or substitute-backed modules", () => {
    const admin = getModuleCoveragePolicy("admin");
    const runtime = getModuleCoveragePolicy("runtime");
    const notifications = getModuleCoveragePolicy("notifications");
    const dailyTasks = getModuleCoveragePolicy("daily_tasks");

    expect(admin.requiredSources).not.toContain("ga4");
    expect(runtime.requiredSources).not.toContain("ga4");
    expect(admin.internalCanonicalSources).toContain("admin_truth_snapshot");
    expect(runtime.internalCanonicalSources).toContain("route_runtime");
    expect(notifications.acceptedSubstituteSources).toEqual(
      expect.arrayContaining(["notification_outcomes", "push_tokens"]),
    );
    expect(dailyTasks.acceptedSubstituteSources).toContain("task_lifecycle");
  });
});
