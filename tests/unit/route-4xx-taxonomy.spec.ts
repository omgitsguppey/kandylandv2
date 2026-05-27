import { describe, expect, it } from "vitest";

import {
  ROUTE_4XX_TAXONOMY,
  validateRoute4xxTaxonomy,
} from "@/lib/route-hardening/route-4xx-taxonomy";

describe("route 4xx taxonomy", () => {
  it("classifies permanent client failures as non-retryable with safe copy and diagnostics", () => {
    const failures = validateRoute4xxTaxonomy();

    expect(failures).toEqual([]);
    expect(ROUTE_4XX_TAXONOMY.validation_error.retryable).toBe(false);
    expect(ROUTE_4XX_TAXONOMY.permission_denied.retryable).toBe(false);
    expect(ROUTE_4XX_TAXONOMY.not_found.retryable).toBe(false);
    expect(ROUTE_4XX_TAXONOMY.permanent_client_error.diagnosticPolicy.writeMode).toBe("hourly_rollup");
    expect(ROUTE_4XX_TAXONOMY.validation_error.userCopy).not.toContain("Internal server error");
  });

  it("allows rate limit retry only through explicit backoff policy", () => {
    expect(ROUTE_4XX_TAXONOMY.rate_limited.retryable).toBe(true);
    expect(ROUTE_4XX_TAXONOMY.rate_limited.retryCondition).toContain("Retry-After");
    expect(ROUTE_4XX_TAXONOMY.rate_limited.diagnosticPolicy.writeMode).toBe("hourly_rollup");
  });
});
