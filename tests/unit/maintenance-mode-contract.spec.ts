import { afterEach, describe, expect, it, vi } from "vitest";

import { runIfMaintenanceAllows } from "../../functions/src/maintenance-job-guard";
import {
  isMaintenanceStateActive,
  resolveMaintenanceModeState,
} from "../../shared/runtime/maintenance-mode-contract";

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
});
