import { describe, expect, it } from "vitest";

import {
  buildUserCheckinRouteErrorMappingReport,
  validateUserCheckinRouteErrorMappingReport,
} from "@/lib/debug/debug-cockpit-batch19-product-routes";

describe("user profile/register/checkin route error mapping", () => {
  it("maps known user and check-in failures to typed non-retryable client errors", () => {
    const report = buildUserCheckinRouteErrorMappingReport();

    expect(report.userProfileStatus).toBe("typed_safe_error_mapping");
    expect(report.userRegisterStatus).toBe("typed_safe_error_mapping");
    expect(report.checkinStatus).toBe("typed_safe_error_mapping");
    expect(report.duplicateCheckinRetryable).toBe(false);
    expect(validateUserCheckinRouteErrorMappingReport(report)).toEqual([]);
  });
});
