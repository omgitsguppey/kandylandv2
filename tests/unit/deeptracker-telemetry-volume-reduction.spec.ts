// @vitest-environment happy-dom
import React, { StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  classifyClientTelemetryEventPriority,
  CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS,
  CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP,
  CLIENT_TELEMETRY_RETRY_DELAYS_MS,
  resolveClientTelemetryRetryDelayMs,
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
  it("uses an event-triggered 15 second non-priority batch delay without recurring polling", () => {
    expect(CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS).toBe(15_000);

    const source = readRepoFile("src/components/Analytics/DeepTracker.tsx");
    expect(source).toContain("GUEST_ANALYTICS_FLUSH_INTERVAL_MS = CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS");
    expect(source).toContain("scheduleNonPriorityFlush");
    expect(source).toContain('flushQueue("batch")');
    expect(source).not.toContain("window.setInterval(");
    expect(source).not.toContain("2_500");
  });

  it("retries retained batches with bounded event-driven backoff", () => {
    expect(CLIENT_TELEMETRY_RETRY_DELAYS_MS).toEqual([15_000, 30_000, 60_000, 120_000]);
    expect(CLIENT_TELEMETRY_RETRY_DELAYS_MS.map((_, index) =>
      resolveClientTelemetryRetryDelayMs(index + 1))).toEqual(CLIENT_TELEMETRY_RETRY_DELAYS_MS);
    expect(resolveClientTelemetryRetryDelayMs(0)).toBeNull();
    expect(resolveClientTelemetryRetryDelayMs(5)).toBeNull();
    expect(resolveClientTelemetryRetryDelayMs(Number.NaN)).toBeNull();

    const source = readRepoFile("src/components/Analytics/DeepTracker.tsx");
    expect(source).toContain("scheduleRetainedQueueRetry");
    expect(source).toContain("resolveClientTelemetryRetryDelayMs");
    expect(source).toContain("persistGuestQueue(eventQueue.current");
    expect(source).toContain('document.visibilityState === "visible"');
    expect(source).not.toContain("window.setInterval(");
  });

  it("keeps priority events out of the 15 second batch delay", () => {
    expect(classifyClientTelemetryEventPriority({ eventName: "gumdrops_purchase_completed" })).toBe("priority_immediate");
    expect(classifyClientTelemetryEventPriority({ eventName: "identity_linked" })).toBe("priority_immediate");
    expect(classifyClientTelemetryEventPriority({ eventName: "runtime_watch_time_v2" })).toBe("priority_immediate");
    expect(classifyClientTelemetryEventPriority({ type: "page_view" })).toBe("priority_next_flush");
    expect(classifyClientTelemetryEventPriority({ type: "click" })).toBe("priority_next_flush");
    expect(classifyClientTelemetryEventPriority({ type: "hover" })).toBe("non_priority_batch");
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

  it("routes raw analytics transports through canonical telemetry helpers", () => {
    const deepTracker = readRepoFile("src/components/Analytics/DeepTracker.tsx");
    const runtimeWatchTracker = readRepoFile("src/components/Analytics/RuntimeWatchTracker.tsx");
    const telemetry = readRepoFile("src/lib/telemetry.ts");

    expect(deepTracker).toContain("submitGuestAnalyticsIngestPayload");
    expect(runtimeWatchTracker).toContain("submitRuntimeWatchTelemetryEvent");
    expect(deepTracker).not.toMatch(/fetch\s*\(\s*["']\/api\/analytics\/ingest/u);
    expect(deepTracker).not.toMatch(/navigator\.sendBeacon\s*\(/u);
    expect(runtimeWatchTracker).not.toMatch(/fetch\s*\(/u);
    expect(runtimeWatchTracker).not.toMatch(/navigator\.sendBeacon\s*\(/u);
    expect(telemetry).toContain("submitGuestAnalyticsIngestPayload");
    expect(telemetry).toContain("submitRuntimeWatchTelemetryEvent");
  });

  it("writes the phase report with audit items and percentage-only savings", () => {
    const report = JSON.parse(readRepoFile("agent/state/deeptracker-telemetry-volume-reduction.generated.json"));

    expect(report.reportKey).toBe("deeptracker-telemetry-volume-reduction");
    expect(report.summary.nonPriorityFlushSeconds).toBe(15);
    expect(report.summary.eventTriggeredBatch).toBe(true);
    expect(report.summary.runtimeWatchUnaffected).toBe(true);
    expect(report.auditItemsAddressed).toEqual([1, 2, 3, 4, 5, 6, 14]);
    expect(JSON.stringify(report.costSavingsModel)).not.toMatch(/\$\d/u);
    expect(JSON.stringify(report.costSavingsModel)).not.toContain("deeptracker_interval_flush");
    expect(report.prCleanupActions).toEqual([]);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });
});


const engagement = vi.hoisted(() => ({ path: "/drops", user: null as { uid: string } | null, track: vi.fn(), guest: vi.fn(), guestBodies: [] as any[], identified: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => engagement.path }));
vi.mock("@/context/AuthContext", () => ({ useAuthIdentity: () => ({ user: engagement.user }) }));
vi.mock("@/lib/firebase", () => ({ auth: { get currentUser() { return engagement.user; } } }));
vi.mock("@/lib/authFetch", () => ({ authFetch: (...args: unknown[]) => engagement.identified(...args) }));
vi.mock("@/lib/client-diagnostics", () => ({ recordClientDiagnostic: vi.fn() }));
vi.mock("@/lib/privacy-consent", () => ({
  canUseBehavioralAnalytics: () => true, canUseAnonymousAnalytics: () => true, canUseIdentifiedAnalytics: () => true,
  readPrivacySettingsSnapshot: () => ({ consentMode: "full_behavioral", anonymousAnalyticsEnabled: true, identifiedAnalyticsEnabled: true, honorGlobalPrivacyControl: true, allowRecommendations: true }),
  resolvePrivacyDataAvailabilityReason: () => "full_signal", subscribeToPrivacySettings: () => () => {},
}));
vi.mock("@/lib/client-session", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/client-session")>(),
  getClientAnalyticsIdentitySnapshot: () => ({ sessionId: "sess_engagement_fixture", anonymousVisitorId: "subject_engagement_fixture" }),
  getClientSessionId: () => "sess_engagement_fixture",
}));
vi.mock("@/lib/telemetry", async importOriginal => {
 const actual=await importOriginal<typeof import("@/lib/telemetry")>();
 return { ...actual, trackEvent: (...args: Parameters<typeof actual.trackEvent>) => { engagement.track(...args); return actual.trackEvent(...args); } };
});
import { DeepTracker } from "@/components/Analytics/DeepTracker";
import { syncIdentifiedTelemetryOwnership } from "@/lib/telemetry";
const queueKey = "kandydrops.analytics.guest-queue";
const checkpointOf = (event: string) => engagement.track.mock.calls.filter(call => call[0] === event).at(-1)?.[1];
const guestPayloads = () => engagement.guestBodies;
const identifiedEvents = () => engagement.identified.mock.calls.flatMap(call => JSON.parse(String(call[1]?.body)).events);
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
async function settleTransports() { await act(async () => { await Promise.all(engagement.guest.mock.results.map(result => result.value)); }); }
function visibility(value: "visible" | "hidden") { Object.defineProperty(document,"visibilityState",{configurable:true,value}); fireEvent(document,new Event("visibilitychange")); }
function fixture() { return React.createElement(React.Fragment, null, React.createElement("button", { "aria-label": "Fixture action" }, "Open"), React.createElement(DeepTracker)); }
describe("observed engagement through actual component and canonical transports", () => {
 beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-02T12:00:00Z")); sessionStorage.clear(); localStorage.clear();
  engagement.path="/drops"; engagement.user=null; engagement.track.mockClear(); engagement.guest.mockReset(); engagement.guestBodies=[]; engagement.identified.mockReset();
  engagement.guest.mockImplementation(async (url, init) => { if(url === "/api/analytics/ingest") engagement.guestBodies.push(JSON.parse(typeof init?.body?.text === "function" ? await init.body.text() : String(init?.body))); return new Response(JSON.stringify({ success: true }), { status: 200 }); });
  engagement.identified.mockImplementation(async () => new Response(null,{status:204}));
  vi.stubGlobal("fetch",engagement.guest); Object.defineProperty(navigator,"sendBeacon",{configurable:true,value:vi.fn(()=>false)});
  Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"}); syncIdentifiedTelemetryOwnership(null);
 });
 afterEach(async () => { cleanup(); await Promise.resolve(); syncIdentifiedTelemetryOwnership(null); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
 it("retains idle-only zero after a rejected lifecycle beacon and an HTTP recovery", async () => {
  const view=render(fixture()); await advance(300_000); view.unmount(); await advance(0); await settleTransports();
  expect(checkpointOf("session_closed")).toMatchObject({active_ms:0,idle_ms:300_000,hidden_ms:0});
  const retained=JSON.parse(sessionStorage.getItem(queueKey)!);
  expect(retained.events.find((event: any)=>event.semanticEventName==="session_closed").sessionMeasurement).toMatchObject({activeMs:0,idleMs:300_000,status:"final"});
  render(fixture());await advance(0);await settleTransports();
  const recovered=guestPayloads().find(body=>body.batchId===retained.stableBatch.batchId);
  const persisted=recovered.events.find((event: any)=>event.semanticEventName==="session_closed");
  expect(persisted.sessionMeasurement).toMatchObject({activeMs:0,idleMs:300_000,hiddenMs:0,status:"final"});
 });
 it("does not credit five minutes of visible time after one click", async () => {
  const view=render(fixture()); fireEvent.click(view.getByRole("button")); await advance(300_000);view.unmount(); await advance(0);
  expect(checkpointOf("session_closed")).toMatchObject({active_ms:30_000,idle_ms:270_000,hidden_ms:0});
 });
 it("credits only one second after a late click", async () => {
  const view=render(fixture()); await advance(299_000);fireEvent.click(view.getByRole("button"));await advance(1_000);view.unmount();await advance(0);
  expect(checkpointOf("session_closed")).toMatchObject({active_ms:1_000,idle_ms:299_000});
 });
 it("does not retroactively credit idle time in cumulative checkpoints", async () => {
  const view=render(fixture());fireEvent.click(view.getByRole("button"));await advance(120_000);fireEvent.click(view.getByRole("button"));
  expect(checkpointOf("session_activity_tick")).toMatchObject({active_ms:30_000,idle_ms:90_000});
 });
 it("checkpoints hidden time and retains actions after returning", async () => {
  const view=render(fixture());fireEvent.click(view.getByRole("button"));await advance(10_000);visibility("hidden");
  expect(engagement.track.mock.calls.filter(call=>call[0]==="session_closed")).toHaveLength(0);
  await advance(50_000);visibility("visible");fireEvent.click(view.getByRole("button"));await advance(20_000);view.unmount();await advance(0);
  expect(checkpointOf("session_closed")).toMatchObject({active_ms:30_000,idle_ms:0,hidden_ms:50_000});
  expect(checkpointOf("semantic_page_engaged")).toMatchObject({click_count:2});
  const final=JSON.parse(checkpointOf("session_closed").session_measurement);expect(final.status).toBe("final");expect(final.endedAtMs-final.startedAtMs).toBe(80_000);
 });
 it("keeps raw closeout and compact checkpoint time in agreement after both idle and hidden intervals", async () => {
  const view=render(fixture());fireEvent.click(view.getByRole("button"));await advance(40_000);visibility("hidden");await advance(50_000);visibility("visible");await advance(30_000);view.unmount();await advance(0);
  const closed=checkpointOf("session_closed");const measurement=JSON.parse(closed.session_measurement);
  expect(measurement).toMatchObject({activeMs:30_000,idleMs:40_000,hiddenMs:50_000});
  expect(closed).toMatchObject({active_ms:30_000,idle_ms:40_000,hidden_ms:50_000});
  const page=JSON.parse(sessionStorage.getItem(queueKey)!).events.find((event: any)=>event.type==="page_leave");
  expect(page).toMatchObject({activeMs:30_000,idleMs:40_000,hiddenMs:50_000});
 });
 it("resumes a persisted page without creating another page or session start", async () => {
  const view=render(fixture());fireEvent.click(view.getByRole("button"));await advance(2_000);
  const hide=new Event("pagehide");Object.defineProperty(hide,"persisted",{value:true});fireEvent(window,hide);await advance(10_000);
  const show=new Event("pageshow");Object.defineProperty(show,"persisted",{value:true});fireEvent(window,show);
  fireEvent.click(view.getByRole("button"));await advance(2_000);view.unmount();await advance(0);
  expect(engagement.track.mock.calls.filter(call=>call[0]==="semantic_page_viewed")).toHaveLength(1);
  expect(engagement.track.mock.calls.filter(call=>call[0]==="session_started")).toHaveLength(1);
  expect(checkpointOf("session_closed")).toMatchObject({active_ms:4_000,hidden_ms:10_000});
 });
 it("keeps one page start and one final segment under StrictMode setup replay", async () => {
  const view=render(React.createElement(StrictMode, null, fixture()));await advance(1_000);view.unmount();await advance(0);
  expect(engagement.track.mock.calls.filter(call=>call[0]==="semantic_page_viewed")).toHaveLength(1);
  expect(engagement.track.mock.calls.filter(call=>call[0]==="session_started")).toHaveLength(1);
  expect(engagement.track.mock.calls.filter(call=>call[0]==="session_closed")).toHaveLength(1);
  expect(guestPayloads().flatMap(body=>body.events).filter(event=>event.type==="page_view")).toHaveLength(1);
 });
 it("uses only identified first-party transport for an authenticated visit", async () => {
  engagement.user={uid:"actor_a"};syncIdentifiedTelemetryOwnership("actor_a");const view=render(fixture());await advance(1_000);fireEvent.click(view.getByRole("button"));await advance(1_500);view.unmount();await advance(1_500);
  expect(guestPayloads()).toHaveLength(0);expect(identifiedEvents().filter(event=>event.eventName==="semantic_page_viewed")).toHaveLength(1);
  const closed=identifiedEvents().find(event=>event.eventName==="session_closed");expect(closed.eventParams.session_measurement).toEqual(expect.any(String));expect(closed.eventParams.page_path).toBe("/drops");expect(closed.eventParams.source_truth).toBe("client_supporting");
  expect(Object.keys(closed.eventParams).length).toBeLessThanOrEqual(40);
 });
 it("never submits guest observations to the identified endpoint", async () => {
  const view=render(fixture());await advance(1_000);fireEvent.click(view.getByRole("button"));await advance(1_500);view.unmount();await advance(0);
  expect(engagement.identified).not.toHaveBeenCalled();expect(guestPayloads().flatMap(body=>body.events).filter(event=>event.semanticEventName==="semantic_target_clicked")).toHaveLength(1);
 });
 it("keeps a beacon batch identity and payload across storage reload until an HTTP receipt", async () => {
  const view=render(fixture());await advance(1_000);vi.mocked(navigator.sendBeacon).mockReturnValue(true);visibility("hidden");await advance(0);
  const body=await (vi.mocked(navigator.sendBeacon).mock.calls.at(-1)![1] as Blob).text();const submitted=JSON.parse(body);
  const stored=JSON.parse(sessionStorage.getItem(queueKey)!);expect(stored.stableBatch.batchId).toBe(submitted.batchId);expect(stored.events.length).toBeGreaterThan(0);
  view.unmount();await advance(0);vi.mocked(navigator.sendBeacon).mockReturnValue(false);visibility("visible");engagement.guest.mockClear();engagement.guestBodies=[];render(fixture());await advance(0);await settleTransports();
  const recovered=guestPayloads()[0];expect(recovered.batchId).toBe(submitted.batchId);expect(recovered.events).toEqual(submitted.events);
 });
 it("finalizes separate route segments while preserving one client session", async () => {
  const view=render(fixture());fireEvent.click(view.getByRole("button"));await advance(2_000);engagement.path="/experiences";view.rerender(fixture());await advance(3_000);view.unmount();await advance(0);
  const closes=engagement.track.mock.calls.filter(call=>call[0]==="session_closed").map(call=>JSON.parse(call[1].session_measurement));
  expect(closes).toHaveLength(2);expect(closes[0].segmentId).not.toBe(closes[1].segmentId);expect(closes[0].endedAtMs).toBe(closes[1].startedAtMs);
  expect(engagement.track.mock.calls.filter(call=>call[0]==="session_started")).toHaveLength(1);
 });
 it("does not attribute a departing actor closeout to the new authenticated actor", async () => {
  engagement.user={uid:"actor_a"};syncIdentifiedTelemetryOwnership("actor_a");const view=render(fixture());await advance(2_000);
  engagement.user={uid:"actor_b"};view.rerender(fixture());await advance(1_000);view.unmount();await advance(1_500);
  const closes=identifiedEvents().filter(event=>event.eventName==="session_closed");expect(closes).toHaveLength(1);expect(closes[0].eventParams.auth_state).toBe("authenticated");
  const observed=engagement.track.mock.calls.filter(call=>call[0]==="session_closed");expect(observed.at(-1)![2].expectedUserId).toBe("actor_b");
  expect(JSON.parse(closes[0].eventParams.session_measurement).endedAtMs-JSON.parse(closes[0].eventParams.session_measurement).startedAtMs).toBe(1_000);
 });
 it("Root clock probe: session-start checkpoint remains valid when Date.now advances between calls",async()=>{
  let clock=Date.now();vi.spyOn(Date,"now").mockImplementation(()=>clock++);
  const view=render(fixture());
  const started = checkpointOf("session_started");
  expect(started?.session_measurement).toEqual(expect.any(String));
  const measurement = JSON.parse(started.session_measurement);
  expect(measurement.activeMs + measurement.idleMs + measurement.hiddenMs).toBe(measurement.endedAtMs - measurement.startedAtMs);
  expect(started).toMatchObject({ active_ms: measurement.activeMs, idle_ms: measurement.idleMs, hidden_ms: measurement.hiddenMs });
  const observed = engagement.track.mock.calls.filter(call => call[0] === "session_started").at(-1)!;
  expect(observed[2].eventTimestampMs).toBe(measurement.endedAtMs);
  view.unmount();
 });
 it("Root clock probe: final checkpoint remains valid when Date.now advances between calls",async()=>{
  const view=render(fixture());await advance(40_000);
  let clock=Date.now();vi.spyOn(Date,"now").mockImplementation(()=>clock++);
  view.unmount();
  expect(checkpointOf("session_closed")?.session_measurement).toEqual(expect.any(String));
  const value=JSON.parse(checkpointOf("session_closed").session_measurement);
  expect(value.activeMs+value.idleMs+value.hiddenMs).toBe(value.endedAtMs-value.startedAtMs);
  const closed = checkpointOf("session_closed");
  expect(closed).toMatchObject({ active_ms: value.activeMs, idle_ms: value.idleMs, hidden_ms: value.hiddenMs });
  const observed = engagement.track.mock.calls.filter(call => call[0] === "session_closed").at(-1)!;
  expect(observed[2].eventTimestampMs).toBe(value.endedAtMs);
  const stored = JSON.parse(sessionStorage.getItem(queueKey)!);
  const page = stored.events.filter((event: any) => event.type === "page_leave").at(-1);
  expect(page).toMatchObject({ timestamp: value.endedAtMs, durationMs: value.endedAtMs - value.startedAtMs, activeMs: value.activeMs, idleMs: value.idleMs, hiddenMs: value.hiddenMs });
  expect(page.sessionMeasurement).toEqual(value);
 });

});
