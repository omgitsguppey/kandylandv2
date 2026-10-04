import { afterEach, describe, expect, it, vi } from "vitest";

import { runIfMaintenanceAllows } from "../../functions/src/maintenance-job-guard";
import {
  MAINTENANCE_SCHEDULES,
  MAINTENANCE_ADMIN_ANALYTICS_REFRESH_PATH,
  isMaintenanceBlockedAdminApiPath,
  isMaintenanceStateActive,
  resolveMaintenanceModeState,
} from "../../shared/runtime/maintenance-mode-contract";

// Keep endpoint construction on the real Functions SDK while isolating
// storage initialization; no scheduled handler or provider client is invoked.
vi.mock("../../functions/src/firebase-admin", async () => {
  const { mockFirestore } = await import("../support/firebase-admin-firestore.mock");
  return { db: mockFirestore, adminApp: { name: "maintenance-endpoint-fixture" } };
});

const ENV_KEY = "KANDY_MAINTENANCE_MODE";
const originalValue = process.env[ENV_KEY];

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = originalValue;
  }
  vi.restoreAllMocks();
});

describe("canonical maintenance state", () => {
  it("treats missing and ambiguous values as maintenance", () => {
    expect(resolveMaintenanceModeState(undefined)).toBe("unknown");
    expect(resolveMaintenanceModeState("maybe")).toBe("unknown");
    expect(isMaintenanceStateActive(resolveMaintenanceModeState(undefined))).toBe(true);
    expect(isMaintenanceStateActive(resolveMaintenanceModeState("maybe"))).toBe(true);
  });

  it("does not invoke scheduled work while maintenance is on or unresolved", async () => {
    const work = vi.fn(async () => "should-not-run");

    delete process.env[ENV_KEY];
    await expect(runIfMaintenanceAllows(work)).resolves.toBeUndefined();
    process.env[ENV_KEY] = "1";
    await expect(runIfMaintenanceAllows(work)).resolves.toBeUndefined();

    expect(work).not.toHaveBeenCalled();
  });

  it("invokes scheduled work only for an explicit normal-mode value", async () => {
    process.env[ENV_KEY] = "0";
    const work = vi.fn(async () => "normal-work");

    await expect(runIfMaintenanceAllows(work)).resolves.toBe("normal-work");
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("applies runtime bounds before the SDK creates scheduled endpoints", async () => {
    const functions = await import("../../functions/src/index");
    for (const name of Object.keys(MAINTENANCE_SCHEDULES) as Array<keyof typeof MAINTENANCE_SCHEDULES>) {
      const endpoint = functions[name].__endpoint;
      expect(endpoint.availableMemoryMb, `${name} memory`).toBe(512);
      expect(endpoint.minInstances, `${name} minimum`).toBe(0);
      expect(endpoint.maxInstances, `${name} maximum`).toBe(1);
    }
  });
});

describe("maintenance stored analytics snapshot eligibility", () => {
  it("allows only exact GET eligibility and keeps omitted method fail closed", () => {
    expect(isMaintenanceBlockedAdminApiPath(MAINTENANCE_ADMIN_ANALYTICS_REFRESH_PATH,"GET")).toBe(false);
    for (const method of [undefined,"HEAD","POST","PUT","PATCH","DELETE","OPTIONS","get"]) {
      expect(isMaintenanceBlockedAdminApiPath(MAINTENANCE_ADMIN_ANALYTICS_REFRESH_PATH,method),String(method)).toBe(true);
    }
    for (const path of ["/api/admin/analytics", "/api/admin/analytics/refresh/", "/api/admin/analytics/refresh-extra", "/api/admin/analytics/refresh/raw", "/api/admin/analytics/realtime", "/api/admin/analytics/live", "/api/admin/ai", "/api/admin/debug/assistant"]) {
      expect(isMaintenanceBlockedAdminApiPath(path,"GET"),path).toBe(true);
    }
  });
});
