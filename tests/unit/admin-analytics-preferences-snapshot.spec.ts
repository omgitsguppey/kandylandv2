import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("admin analytics preferences snapshot refresh", () => {
  it("loads analytics preferences as a snapshot and refreshes after explicit saves", () => {
    expect(source).toContain("const ADMIN_ANALYTICS_PREFERENCES_REFRESH_INTERVAL_MS = 0");
    expect(source).toContain(
      'useAdminPollingSWR<AnalyticsPreferencesResponse>(\n    isLocalAdminUiTestSession ? null : "/api/admin/analytics/preferences",\n    ADMIN_ANALYTICS_PREFERENCES_REFRESH_INTERVAL_MS',
    );
    expect(source).toContain("await mutateAnalyticsPreferences(");
    expect(source).toContain("{ revalidate: false }");
    expect(source).not.toContain(
      'useAdminPollingSWR<AnalyticsPreferencesResponse>(\n    isLocalAdminUiTestSession ? null : "/api/admin/analytics/preferences",\n    30_000',
    );
  });
});
