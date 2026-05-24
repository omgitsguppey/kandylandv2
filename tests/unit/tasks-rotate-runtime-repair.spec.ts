import { describe, expect, it } from "vitest";

import {
  buildTasksRotateRuntimeRepairReport,
  validateTasksRotateRuntimeRepairReport,
} from "@/lib/debug/debug-cockpit-batch19-product-routes";

describe("tasks rotate runtime repair", () => {
  it("classifies high-volume task rotation client errors as typed non-retryable outcomes", () => {
    const report = buildTasksRotateRuntimeRepairReport();

    expect(report.statusAfter).toBe("expected_typed_client_error");
    expect(report.errorClasses).toContain("unauthenticated");
    expect(report.errorClasses).toContain("missing_task_assignment");
    expect(report.retrySuppression).toBe("permanent_expected_failures_retryable_false");
    expect(report.rewardPolicyChanged).toBe(false);
    expect(validateTasksRotateRuntimeRepairReport(report)).toEqual([]);
  });
});
