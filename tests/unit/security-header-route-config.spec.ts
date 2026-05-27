import { describe, expect, it } from "vitest";

import {
  buildSecurityHeaderRouteConfigReport,
  validateSecurityHeaderRouteConfigReport,
} from "../../src/lib/config-hardening/security-header-contract";

describe("security header route config", () => {
  it("classifies middleware redirects, headers, images, cache, and PWA scope", () => {
    const report = buildSecurityHeaderRouteConfigReport();
    const validation = validateSecurityHeaderRouteConfigReport(report);

    expect(report.securityHeaders.some((header) => header.key === "Content-Security-Policy")).toBe(true);
    expect(report.redirectPolicy.status).toBe("classified");
    expect(report.privateRouteCachePolicy.status).toBe("classified");
    expect(validation.ok).toBe(true);
  });
});
