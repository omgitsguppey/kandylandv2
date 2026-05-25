import { describe, expect, it } from "vitest";

import { buildViewerStartTelemetryEvent, classifyViewerStartCoverage } from "@/lib/analytics/viewer-start-telemetry-contract";

describe("viewer start telemetry repair", () => {
  it("builds a viewer start event only for resolved content exposure", () => {
    const event = buildViewerStartTelemetryEvent({
      userId: "user-1",
      dropId: "drop-1",
      watchSessionId: "watch_1",
      clientSessionId: "client-1",
      entitlementState: "unlocked",
      mediaKind: "video",
      route: "/dashboard/viewer",
      sourceComponent: "viewer_watch_session_route",
      consentState: "granted",
    });

    expect(event.eventName).toBe("watch_session_started");
    expect(event.params).toMatchObject({
      drop_id: "drop-1",
      watch_session_id: "watch_1",
      entitlement_state: "unlocked",
      sourceTruth: "server_viewer_start",
    });
  });

  it("keeps viewer activity failed when watch sessions exist without start events", () => {
    expect(classifyViewerStartCoverage({
      watchSessionCount: 200,
      sessionFactCount: 370,
      viewerStartEventCount: 0,
    })).toMatchObject({
      state: "fail",
      attributionGap: "viewer_start_missing",
      passAllowed: false,
    });
  });
});
