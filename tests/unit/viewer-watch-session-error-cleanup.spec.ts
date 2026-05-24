import { describe, expect, it } from "vitest";

import {
  buildViewerWatchSessionErrorCleanupReport,
  validateViewerWatchSessionErrorCleanupReport,
} from "@/lib/debug/debug-cockpit-batch19-product-routes";

describe("viewer watch-session error cleanup", () => {
  it("maps expected watch-session client errors without weakening watch-time truth", () => {
    const report = buildViewerWatchSessionErrorCleanupReport();

    expect(report.statusAfter).toBe("expected_typed_client_error");
    expect(report.errorClasses).toContain("invalid_duration");
    expect(report.errorClasses).toContain("not_unlocked");
    expect(report.pageOpenTimeCountsAsWatchTime).toBe(false);
    expect(report.persistedWatchEvidence).toBe("analytics_watch_sessions+analytics_watch_observations");
    expect(validateViewerWatchSessionErrorCleanupReport(report)).toEqual([]);
  });
});
