import { describe, expect, it } from "vitest";

import {
  ROUTE_PARAM_AVAILABILITY_MAP,
  validateRouteParamAvailabilityMap,
} from "@/lib/route-hardening/route-param-availability-map";

describe("route param availability map", () => {
  it("classifies dynamic route params with non-retryable recovery behavior", () => {
    expect(validateRouteParamAvailabilityMap()).toEqual([]);
    expect(ROUTE_PARAM_AVAILABILITY_MAP.map((entry) => entry.params).flat()).toEqual(
      expect.arrayContaining(["username", "dropId", "threadId", "userId"]),
    );
    for (const entry of ROUTE_PARAM_AVAILABILITY_MAP) {
      expect(entry.invalidParamBehavior.errorClass).toBe("validation_error");
      expect(entry.invalidParamBehavior.shouldRetry).toBe(false);
      expect(entry.missingResourceBehavior.recoveryAction.length).toBeGreaterThan(8);
      expect(entry.missingResourceBehavior.shouldRetry).toBe(false);
      expect(entry.clientSurfaceOwner).not.toBe("unknown");
    }
  });

  it("does not leave deleted, expired, or private resources silent", () => {
    const dropRoute = ROUTE_PARAM_AVAILABILITY_MAP.find((entry) => entry.routePath.includes("dropId"));

    expect(dropRoute).toBeDefined();
    expect(dropRoute?.deletedResourceBehavior.reasonClass).toBe("resource_unavailable_deleted");
    expect(dropRoute?.expiredResourceBehavior.reasonClass).toBe("resource_unavailable_expired");
    expect(dropRoute?.privateResourceBehavior.errorClass).toMatch(/permission_denied|auth_required/u);
    expect(dropRoute?.deletedResourceBehavior.recoveryAction).toContain("library");
  });
});
