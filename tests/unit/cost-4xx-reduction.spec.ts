import { describe, expect, it } from "vitest";

import {
  buildCost4xxReductionReport,
  validateCost4xxReductionReport,
  type Cost4xxReductionReport,
} from "../../scripts/agent/validate-cost-4xx-reduction";

const sources = {
  "src/app/api/user/follow/route.ts": `
    import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
    const USER_FOLLOW_BODY_LIMIT_BYTES = 32_768;
    const body = await readBoundedJsonBody(request, {
      maxBytes: USER_FOLLOW_BODY_LIMIT_BYTES,
      routeName: "user/follow",
      allowEmpty: false,
    });
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({ success: false, code: error.code }, { status: error.status });
    }
  `,
  "src/app/api/user/onboarding-progress/route.ts": `
    import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
    const USER_ONBOARDING_PROGRESS_BODY_LIMIT_BYTES = 32_768;
    const body = await readBoundedJsonBody(request, {
      maxBytes: USER_ONBOARDING_PROGRESS_BODY_LIMIT_BYTES,
      routeName: "user/onboarding-progress",
      allowEmpty: true,
    });
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({ success: false, code: error.code }, { status: error.status });
    }
  `,
};

describe("cost and 4xx reduction report", () => {
  it("builds a source-backed report with cost lanes and 4xx classification", () => {
    const report = buildCost4xxReductionReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T07:00:00.000Z",
    });

    expect(report.cloudRunFindings).not.toHaveLength(0);
    expect(report.cloudSqlFindings).not.toHaveLength(0);
    expect(report.geminiCloudAssistFindings).not.toHaveLength(0);
    expect(report.route4xxFindings.some((entry) => entry.classification === "expected")).toBe(true);
    expect(report.route4xxFindings.some((entry) => entry.classification === "unexpected")).toBe(true);
    expect(report.fixesApplied.some((entry) => entry.id === "user-route-bounded-json-body")).toBe(true);
    expect(validateCost4xxReductionReport(report, sources, { currentHead: "head" })).toEqual([]);
  });

  it("fails when a touched user route keeps request.json", () => {
    const report = buildCost4xxReductionReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T07:00:00.000Z",
    });
    const badSources = {
      ...sources,
      "src/app/api/user/follow/route.ts": "const body = await request.json(); const bodyLimitBytes = 32_768;",
    };

    expect(validateCost4xxReductionReport(report, badSources, { currentHead: "head" })).toContain(
      "src/app/api/user/follow/route.ts still uses request.json() after body-limit reduction.",
    );
  });

  it("fails when 4xx retry risk is not classified", () => {
    const report = buildCost4xxReductionReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T07:00:00.000Z",
    }) as Cost4xxReductionReport;
    report.route4xxFindings[0].retryRisk = "";

    expect(validateCost4xxReductionReport(report, sources, { currentHead: "head" })).toContain(
      `4xx finding ${report.route4xxFindings[0].id} lacks retry risk classification.`,
    );
  });

  it("fails when cost lanes claim pass without evidence", () => {
    const report = buildCost4xxReductionReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T07:00:00.000Z",
    }) as Cost4xxReductionReport;
    report.cloudSqlFindings[0].status = "pass";
    report.cloudSqlFindings[0].evidence = [];

    const failures = validateCost4xxReductionReport(report, sources, { currentHead: "head" });
    expect(failures).toEqual(expect.arrayContaining([
      "cost finding cloud-sql-agent-context-mirror-only claims pass without artifact evidence.",
      "cost finding cloud-sql-agent-context-mirror-only lacks evidence.",
    ]));
  });
});
