import { describe, expect, it } from "vitest";

import {
  deriveGeneratedReportFreshness,
  findGeneratedReportRuntimeRead,
  isGeneratedReportRuntimeEvidenceReaderPath,
  isGeneratedReportRuntimeSourcePath,
} from "@/lib/agent-governance/generated-reports/generated-report-contract";

describe("generated report contract", () => {
  it("treats current-head mismatches as stale even inside the age window", () => {
    const freshness = deriveGeneratedReportFreshness({
      generatedAt: "2026-06-11T12:00:00.000Z",
      nowMs: Date.parse("2026-06-11T13:00:00.000Z"),
      sourceCommit: "old-head",
      currentHead: "new-head",
    });

    expect(freshness).toBe("stale");
  });

  it("keeps same-head generated reports fresh within the freshness window", () => {
    const freshness = deriveGeneratedReportFreshness({
      generatedAt: "2026-06-11T12:00:00.000Z",
      nowMs: Date.parse("2026-06-11T13:00:00.000Z"),
      sourceCommit: "same-head",
      currentHead: "same-head",
    });

    expect(freshness).toBe("fresh");
  });

  it("distinguishes generated-report path metadata from a runtime read", () => {
    const metadata = 'const reportPath = "agent/state/example.generated.json";';
    const runtimeRead = 'const report = readJsonFile("agent/state/example.generated.json");';
    const joinedRead = `
      const reportPath = path.join(process.cwd(), "agent", "state", fileName);
      const report = fs.readFileSync(reportPath, "utf8");
    `;

    expect(findGeneratedReportRuntimeRead(metadata)).toBeNull();
    expect(findGeneratedReportRuntimeRead(runtimeRead)?.[0]).toContain("readJsonFile");
    expect(findGeneratedReportRuntimeRead(joinedRead)?.[0]).toContain('"agent", "state"');
    expect(findGeneratedReportRuntimeRead('import "agent/context/example.generated.json";')).not.toBeNull();
    expect(findGeneratedReportRuntimeRead('// from "agent/state/example.generated.json"')).toBeNull();
    expect(isGeneratedReportRuntimeSourcePath("src/lib/test-hardening/report.ts")).toBe(false);
    expect(isGeneratedReportRuntimeSourcePath("functions/src/report.ts")).toBe(true);
    expect(isGeneratedReportRuntimeEvidenceReaderPath("src/app/api/admin/debug/route.ts")).toBe(true);
  });
});
