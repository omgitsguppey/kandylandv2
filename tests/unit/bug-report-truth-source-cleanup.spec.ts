import { describe, expect, it } from "vitest";

import { buildBugReportTruthSource } from "@/lib/debug/bug-report-truth-source";

describe("bug report truth source cleanup", () => {
  it("builds a bounded redacted read-only source response", () => {
    const source = buildBugReportTruthSource({
      reports: [{
        id: "bug_1",
        createdAt: 1_800_000_000_000,
        status: "received",
        rewardGd: 10,
        route: "/drops",
        userMessage: "private user body",
        operatorMessage: "private operator body",
        sanitizedContext: { token: "secret", safe: "ok" },
      }],
      readLimit: 50,
      generatedAtMs: 1_800_000_000_500,
      sourcePath: "/api/admin/debug/bug-reports",
    });

    expect(source.success).toBe(true);
    expect(source.readOnly).toBe(true);
    expect(source.limit).toBeLessThanOrEqual(50);
    expect(source.truth.status).toBe("loaded_with_reports");
    expect(source.truth.sourceWindow?.label).toBe("latest_50");
    expect(source.truth.redactionStatus).toBe("summary_only_raw_bodies_redacted");
    expect(JSON.stringify(source)).not.toMatch(/private user body|private operator body|secret/i);
  });

  it("returns a terminal failed state instead of hanging", () => {
    const source = buildBugReportTruthSource({
      reports: [],
      readLimit: 50,
      generatedAtMs: 1_800_000_000_500,
      sourcePath: "/api/admin/debug/bug-reports",
      loadError: new Error("database raw failure"),
    });

    expect(source.success).toBe(false);
    expect(source.truth.status).toBe("failed");
    expect(source.truth.nextAction).toMatch(/route diagnostics/i);
    expect(source.truth.loadError).not.toContain("database raw failure");
  });
});
