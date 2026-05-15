import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildProductSurfaceIntegrityReport,
  detectBodyLimitRequestJsonViolation,
  detectFakeActions,
  detectPrimaryDebugCopyLeak,
  detectUnboundedPromiseMap,
  type ProductSurfaceIntegrityReport,
} from "../../scripts/agent/validate-product-surface-integrity";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string) {
  return JSON.parse(read(relativePath)) as ProductSurfaceIntegrityReport;
}

describe("product surface integrity", () => {
  it("records the current product surface integrity artifact", () => {
    expect(existsSync(join(root, "agent/state/product-surface-integrity.generated.json"))).toBe(true);
    const report = readJson("agent/state/product-surface-integrity.generated.json");

    expect(report.reportKey).toBe("product-surface-integrity");
    expect(report.currentHead).toMatch(/^[a-f0-9]{40}$/u);
    expect(report.summary.sourceReportsRead).toBeGreaterThan(0);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });

  it("detects fake action targets", () => {
    expect(detectFakeActions('<a href="#">Open</a>')).toBe(true);
    expect(detectFakeActions('href: "/dashboard/creator"')).toBe(true);
    expect(detectFakeActions('<button type="button">Open</button>')).toBe(false);
  });

  it("detects primary Debug and raw source-copy leaks", () => {
    expect(detectPrimaryDebugCopyLeak("platform_pulse:30d")).toBe(true);
    expect(detectPrimaryDebugCopyLeak("agent/state/public-beta-score.generated.json")).toBe(true);
    expect(detectPrimaryDebugCopyLeak("Source truth: canonical. Freshness: fresh. Samples: 8.")).toBe(true);
    expect(detectPrimaryDebugCopyLeak("Dashboard data connected.")).toBe(false);
  });

  it("detects bounded-body contract regressions", () => {
    expect(detectBodyLimitRequestJsonViolation("const CREATOR_BODY_LIMIT_BYTES = 32_768; await request.json();")).toBe(true);
    expect(detectBodyLimitRequestJsonViolation("await readBoundedJsonBody(request, { maxBytes: CREATOR_BODY_LIMIT_BYTES });")).toBe(false);
  });

  it("detects unbounded Promise map fanout while accepting bounded worker pools", () => {
    expect(detectUnboundedPromiseMap("await Promise.all(items.map(async (item) => work(item)));")).toBe(true);
    expect(detectUnboundedPromiseMap("// cost-bound: bounded Promise.all worker pool\nawait Promise.all(workers.map(run));")).toBe(false);
  });

  it("classifies stale authority and deferred findings with owners", () => {
    const report = buildProductSurfaceIntegrityReport();

    expect(report.summary.staleAuthorityRisks).toBeGreaterThan(0);
    expect(report.deferredFindings.length).toBeGreaterThan(0);
    expect(report.deferredFindings.every((finding) => finding.owner.length > 0)).toBe(true);
  });

  it("accepts lazy-mounted creator managers and no primary source prose", () => {
    const hub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");

    expect(hub).toContain("data-creator-active-manager");
    expect(hub).toContain("activeManager");
    expect(hub).toContain('openSection === "requests"');
    expect(hub).toContain('openSection === "bookings"');
    expect(hub).toContain('openSection === "fan_pass"');
    expect(hub).not.toMatch(/["'`]Source truth:/u);
    expect(hub).not.toMatch(/["'`]Freshness:/u);
    expect(hub).not.toMatch(/["'`]Samples:/u);
  });

  it("keeps Debug-only report paths out of primary leak findings", () => {
    const report = buildProductSurfaceIntegrityReport();

    expect(report.debugCopyLeakFindings).toEqual([]);
    expect(read("src/app/admin/debug/components/DebugControlTower.tsx")).toContain("data-debug-report-source");
  });
});
