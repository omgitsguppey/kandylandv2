import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildAdminDebugControlTowerModel } from "@/lib/admin-debug-control-tower";

function writeSpeedSecurityReport(rootDir: string, finding: Record<string, unknown>) {
  const stateDir = join(rootDir, "agent", "state");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "speed-security-hardening.generated.json"), JSON.stringify({
    generatedAt: "2026-05-14T12:00:00.000Z",
    overallScore: 80,
    overallStatus: "warning",
    findings: [finding],
  }), "utf8");
}

describe("Admin Debug speed/security finding copy", () => {
  it("translates unbounded Promise.all scanner copy into operator language", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "kd-debug-speed-"));
    writeSpeedSecurityReport(rootDir, {
      severity: "major",
      title: "Potential unbounded Promise.all fanout",
      domain: "costRunawayWorkControls",
      filePath: "functions/src/analytics-event-facts.ts",
      humanReadableWarning: "Concurrency changes need runtime/cost review.",
      validator: "npm run check:speed-security",
    });

    const model = buildAdminDebugControlTowerModel({
      rootDir,
      nowMs: Date.parse("2026-05-14T12:05:00.000Z"),
      debugEvidenceSource: "unavailable",
    });
    const report = model.reports.find((entry) => entry.id === "speed-security-hardening");
    const finding = report?.topFindings[0];

    expect(finding?.title).toBe("Backend work cap needed");
    expect(finding?.humanReadableWarning).toBe("Backend work can fan out too much at once.");
    expect(finding?.speedSecurityFindingKind).toBe("backend_work_fanout");
    expect(finding?.speedSecurityRefreshCommand).toBe("npm run check:speed-security");
    expect(finding?.evidence).toContain("data-debug-speed-security-finding-kind=backend_work_fanout");
  });

  it("translates body-limit scanner copy into operator language", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "kd-debug-body-"));
    writeSpeedSecurityReport(rootDir, {
      severity: "major",
      title: "Mutating route has body limit contract but no source-visible cap",
      domain: "apiRouteSecurityExploitHardening",
      filePath: "src/app/api/admin/analytics/refresh/route.ts",
      humanReadableWarning: "Route contract declares a body limit but source lacks a parser cap.",
      validator: "npm run check:speed-security",
    });

    const model = buildAdminDebugControlTowerModel({
      rootDir,
      nowMs: Date.parse("2026-05-14T12:05:00.000Z"),
      debugEvidenceSource: "unavailable",
    });
    const report = model.reports.find((entry) => entry.id === "speed-security-hardening");
    const finding = report?.topFindings[0];

    expect(finding?.title).toBe("Request body cap needed");
    expect(finding?.humanReadableWarning).toBe("API route needs a visible payload size cap before JSON parsing.");
    expect(finding?.speedSecurityFindingKind).toBe("request_body_cap");
    expect(finding?.evidence).toContain("data-debug-speed-security-refresh-command=npm run check:speed-security");
  });
});
