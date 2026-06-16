import { describe, expect, it, vi } from "vitest";

import {
  buildDeploymentHealthReport,
  measureDeploymentHealth,
  resolveDeploymentHealthEndpoint,
} from "../../scripts/verify-deployment";

describe("deployment health verification", () => {
  it("does not call runtime or clear gates without an explicit deployment URL", async () => {
    const fetchImpl = vi.fn();

    const report = await measureDeploymentHealth({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      generatedAtUtc: "2026-06-16T00:00:00.000Z",
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(report.status).toBe("external_evidence_required");
    expect(report.evidenceClass).toBe("external_evidence_required");
    expect(report.canClearRuntimeGate).toBe(false);
    expect(report.canClearProviderGate).toBe(false);
    expect(report.canClearAdminTruthGate).toBe(false);
    expect(report.nextExactSteps.join(" ")).toContain("npm run check:deployment -- --url=");
  });

  it("normalizes deployment health endpoint without preserving query strings", () => {
    expect(resolveDeploymentHealthEndpoint("https://example.test/path?token=secret#hash")).toEqual({
      targetUrl: "https://example.test/path",
      healthEndpoint: "https://example.test/path/api/health",
    });

    expect(resolveDeploymentHealthEndpoint("https://example.test/api/health?token=secret")).toEqual({
      targetUrl: "https://example.test",
      healthEndpoint: "https://example.test/api/health",
    });
  });

  it("allows an explicit healthy runtime check to clear only the runtime gate", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "healthy" }),
    });

    const report = await measureDeploymentHealth({
      targetUrl: "https://kandydrops.com",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      generatedAtUtc: "2026-06-16T00:00:00.000Z",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://kandydrops.com/api/health", expect.objectContaining({
      cache: "no-store",
    }));
    expect(report.status).toBe("healthy");
    expect(report.evidenceClass).toBe("runtime_redacted");
    expect(report.canClearSourceGate).toBe(false);
    expect(report.canClearRuntimeGate).toBe(true);
    expect(report.canClearProviderGate).toBe(false);
    expect(report.canClearAdminTruthGate).toBe(false);
  });

  it("keeps unhealthy runtime responses from clearing runtime proof", () => {
    const report = buildDeploymentHealthReport({
      status: "unhealthy",
      targetUrl: "https://kandydrops.com",
      healthEndpoint: "https://kandydrops.com/api/health",
      httpStatus: 503,
      responseStatus: "degraded",
      generatedAtUtc: "2026-06-16T00:00:00.000Z",
    });

    expect(report.status).toBe("unhealthy");
    expect(report.evidenceClass).toBe("runtime_redacted");
    expect(report.canClearRuntimeGate).toBe(false);
    expect(report.validationFailures).toContain("deployment health status is unhealthy");
    expect(report.doesNotProve).toContain("Does not prove PayPal/provider smoke.");
  });
});
