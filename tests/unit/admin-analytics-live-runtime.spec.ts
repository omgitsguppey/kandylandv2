import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsLiveSignals } from "@/lib/admin-analytics-live-runtime";

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

describe("admin analytics live runtime", () => {
  it("builds a realtime live roster from identified and guest telemetry", () => {
    const nowMs = Date.parse("2026-04-22T20:30:00.000Z");
    const result = buildAdminAnalyticsLiveSignals({
      eventFactDocs: [
        createDoc("evt_1", {
          userId: "user_1",
          username: "amber",
          eventName: "home_page_viewed",
          timestamp: nowMs - 60_000,
          pagePath: "/",
          params: {
            component_name: "Hero",
            semantic_scope_label: "Home",
          },
        }),
      ],
      guestBatchDocs: [
        createDoc("guest_batch_1", {
          sessionKey: "anon_12345678",
          receivedAtMs: nowMs - 30_000,
          events: [
            {
              type: "page_view",
              timestamp: nowMs - 30_000,
              path: "/drops",
            },
          ],
        }),
      ],
      guestSessionDocs: [
        createDoc("guest_session_1", {
          sessionKey: "anon_12345678",
          lastReceivedAtMs: nowMs - 30_000,
          pagePaths: ["/drops"],
          interactionTypes: ["page_view"],
        }),
      ],
      watchSessionDocs: [
        createDoc("watch_1", {
          userId: "user_1",
          username: "amber",
          lastSeenAtMs: nowMs - 15_000,
          pagePath: "/dashboard/viewer",
          dropTitle: "Drop One",
          isClosed: false,
        }),
      ],
      listenerState: {
        eventFactsLoaded: true,
        guestBatchesLoaded: true,
        guestSessionsLoaded: true,
        watchSessionsLoaded: true,
      },
      nowMs,
    });

    expect(result.feedStatus).toBe("realtime");
    expect(result.totalActive).toBe(2);
    expect(result.deepTrackerActive).toBe(1);
    expect(result.guestActive).toBe(1);
    expect(result.activeUsers[0]?.lastDropTitle).toBe("Drop One");
    expect(result.activeUsers.some((entry) => entry.actorType === "guest")).toBe(
      true,
    );
    expect(result.data.find((entry) => entry.minute === 0)?.users).toBeGreaterThan(0);
  });

  it("fails closed to snapshot mode when every realtime lane fails", () => {
    const result = buildAdminAnalyticsLiveSignals({
      listenerState: {
        eventFactsFailed: true,
        guestBatchesFailed: true,
        guestSessionsFailed: true,
        watchSessionsFailed: true,
      },
      nowMs: Date.parse("2026-04-22T20:30:00.000Z"),
    });

    expect(result.feedStatus).toBe("failed");
    expect(result.liveTruthLabel).toBe("failed");
    expect(result.issues).toHaveLength(4);
    expect(result.issues.join(" ")).not.toContain("polled");
  });
});
