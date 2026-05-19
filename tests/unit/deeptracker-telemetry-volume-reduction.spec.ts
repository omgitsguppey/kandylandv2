import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  classifyClientTelemetryEventPriority,
  CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS,
  CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP,
} from "../../src/lib/analytics/client-telemetry-priority";
import {
  buildIdentityLinkPayload,
  hasSubmittedIdentityLink,
  IDENTITY_LINK_PENDING_TTL_MS,
  shouldSubmitIdentityLink,
} from "../../src/lib/analytics/analytics-identity-link";
import { RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS } from "../../src/lib/analytics/runtime-watch-time-v2";

const repoRoot = path.resolve(__dirname, "../..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("DeepTracker telemetry volume reduction", () => {
  it("sets non-priority flush interval to 15 seconds", () => {
    expect(CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS).toBe(15_000);

    const source = readRepoFile("src/components/Analytics/DeepTracker.tsx");
    expect(source).toContain("GUEST_ANALYTICS_FLUSH_INTERVAL_MS = CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS");
    expect(source).not.toContain("2_500");
  });

  it("keeps priority events out of the 15 second batch delay", () => {
    expect(classifyClientTelemetryEventPriority({ eventName: "gumdrops_purchase_completed" })).toBe("priority_immediate");
    expect(classifyClientTelemetryEventPriority({ eventName: "identity_linked" })).toBe("priority_immediate");
    expect(classifyClientTelemetryEventPriority({ eventName: "runtime_watch_time_v2" })).toBe("priority_immediate");
    expect(classifyClientTelemetryEventPriority({ type: "page_view" })).toBe("priority_next_flush");
    expect(classifyClientTelemetryEventPriority({ type: "click" })).toBe("priority_next_flush");
    expect(classifyClientTelemetryEventPriority({ type: "hover" })).toBe("non_priority_batch");
  });

  it("coalesces pagehide visibility and cleanup finalization into one closeout", () => {
    const source = readRepoFile("src/components/Analytics/DeepTracker.tsx");

    expect(source).toContain("finalCloseoutKeyRef");
    expect(source).toContain("emitPageSummary(\"visibility\")");
    expect(source).toContain("emitPageSummary(\"pagehide\")");
    expect(source).toContain("emitPageSummary(\"cleanup\")");
    expect(source).toContain("preferBeacon: true");
  });

  it("summarizes hover visibility and scroll telemetry instead of streaming noisy events", () => {
    const source = readRepoFile("src/components/Analytics/DeepTracker.tsx");

    expect(source).toContain("hoverSummaryRef");
    expect(source).toContain("visibilitySummaryRef");
    expect(source).toContain("SCROLL_MILESTONES");
    expect(source).toContain("emitHoverSummary");
    expect(source).toContain("emitVisibilitySummary");
    expect(source).toContain("emitScrollSummary");
    expect(source).not.toContain("GUEST_ANALYTICS_MAX_HOVER_EVENTS_PER_SESSION = 12");
    expect(source).not.toContain("GUEST_ANALYTICS_MAX_VISIBILITY_EVENTS_PER_SESSION = 24");
  });

  it("removes 500ms scroll interval polling and emits milestones only", () => {
    const source = readRepoFile("src/components/Analytics/DeepTracker.tsx");

    expect(source).not.toContain("now - lastScrollTime > 500");
    expect(source).toContain("requestAnimationFrame");
    expect(source).toContain("nextScrollMilestoneIndexRef");
    expect(source).toContain("[25, 50, 75, 100]");
  });

  it("keeps priority events from being dropped by the non-priority queue cap", () => {
    const source = readRepoFile("src/components/Analytics/DeepTracker.tsx");

    expect(CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP).toBeLessThan(500);
    expect(source).toContain("trimNonPriorityQueueForEvent");
    expect(source).toContain("queuedPriority !== \"non_priority_batch\"");
  });

  it("marks identity link pending before send and blocks duplicate bursts", async () => {
    const storage = createMemoryStorage();
    const payload = buildIdentityLinkPayload({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      reason: "login",
    });

    expect(shouldSubmitIdentityLink(payload, new Set())).toBe(true);
    const result = await payload.submit(async () => new Response(JSON.stringify({ success: false, reason: "try_later" }), { status: 503 }), storage);

    expect(result.success).toBe(false);
    expect(result.loginBlocking).toBe(false);
    expect(hasSubmittedIdentityLink(payload, storage)).toBe(true);
    expect(IDENTITY_LINK_PENDING_TTL_MS).toBeGreaterThan(0);
  });

  it("keeps runtime watch heartbeat independent at 10 seconds", () => {
    const source = readRepoFile("src/components/Analytics/RuntimeWatchTracker.tsx");

    expect(RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS).toBe(10_000);
    expect(source).toContain("RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS");
    expect(source).not.toContain("CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS");
  });

  it("writes the phase report with audit items and percentage-only savings", () => {
    const report = JSON.parse(readRepoFile("agent/state/deeptracker-telemetry-volume-reduction.generated.json"));

    expect(report.reportKey).toBe("deeptracker-telemetry-volume-reduction");
    expect(report.summary.nonPriorityFlushSeconds).toBe(15);
    expect(report.summary.runtimeWatchUnaffected).toBe(true);
    expect(report.auditItemsAddressed).toEqual([1, 2, 3, 4, 5, 6, 14]);
    expect(JSON.stringify(report.costSavingsModel)).not.toMatch(/\$\d/u);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });
});
