import { describe, expect, it } from "vitest";

import {
  buildPwaServiceWorkerStatusCleanupReport,
  validatePwaServiceWorkerStatusCleanupReport,
} from "../../scripts/agent/tracking-runtime-surface-status-cleanup-shared";
import { buildPwaServiceWorkerDebugLane } from "@/lib/features/pwa/pwa-service-worker-contract";

describe("pwa service worker status cleanup", () => {
  it("does not degrade optional clean PWA safety only because registration was not observed", () => {
    const lane = buildPwaServiceWorkerDebugLane({
      registered: false,
      registrationExpected: false,
      registrationSource: "source_contract",
      notificationCompatible: true,
      forbiddenCacheSafe: true,
      offlineFallbackSafe: true,
      staleShellRisk: "low",
      telemetryMapped: true,
    });

    expect(lane.status).toBe("source_ready_not_registered");
    expect(lane.registrationStatusReason).toBe("optional_not_registered");
    expect(lane.notificationCompatible).toBe(true);
  });

  it("reports exact registration reason and next action", () => {
    const report = buildPwaServiceWorkerStatusCleanupReport({
      pwaLane: buildPwaServiceWorkerDebugLane({ registered: false, registrationExpected: false }),
    });

    expect(validatePwaServiceWorkerStatusCleanupReport(report)).toEqual([]);
    expect(report.pwaStatusAfter).toBe("source_ready_not_registered");
    expect(report.registrationStatusReason).toBe("optional_not_registered");
    expect(report.nextExactSteps[0]).toContain("Keep optional service worker registration");
  });
});
