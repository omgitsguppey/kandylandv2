// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { join } from "path";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminUsersRealtime } from "@/hooks/useAdminUsersRealtime";

const usersStreamTransport = vi.hoisted(() => ({ fetch: vi.fn(), issue: vi.fn() }));
vi.mock("@/lib/authFetch", () => ({ authFetch: usersStreamTransport.fetch }));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue: usersStreamTransport.issue }));

import {
  ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION,
  validateAdminRealtimeMigrationEntries,
} from "@/lib/admin/admin-realtime-to-hot-cache-migration";

describe("admin realtime to hot-cache migration", () => {
  it("keeps admin overview off Firestore realtime listeners while preserving chat realtime", () => {
    const overviewHook = readFileSync(join(process.cwd(), "src/hooks/useAdminOverviewRealtime.ts"), "utf-8");
    const chatSource = readFileSync(join(process.cwd(), "src/components/Chat/ChatExperience.tsx"), "utf-8");

    expect(overviewHook).not.toContain("onSnapshot");
    expect(overviewHook).not.toContain("realtime_firestore");
    expect(chatSource).toContain("onSnapshot");
    expect(ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.some((entry) => entry.classification === "realtime_allowed_user_chat")).toBe(true);
  });

  it("requires owner, reason, max query size, detach behavior, and fallback for realtime exceptions", () => {
    expect(validateAdminRealtimeMigrationEntries()).toEqual([]);
    const exception = ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.find((entry) => entry.classification === "realtime_allowed_operator_live_debug")?.exception;
    expect(exception).toMatchObject({
      owner: "admin_debug",
      detachBehavior: "cleanup_required",
      fallbackHotCachePath: "admin_debug_snapshot",
    });
    expect(exception?.reason).toContain("Operator live debug");
    expect(exception?.maxQuerySize).toBeGreaterThan(0);
  });

  it("keeps admin analytics metric polling disabled by default", () => {
    const analyticsStateHook = readFileSync(
      join(process.cwd(), "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
      "utf-8",
    );
    const normalizedAnalyticsStateHook = analyticsStateHook.replace(/\r\n/g, "\n");

    expect(normalizedAnalyticsStateHook).toContain("ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS = 0");
    expect(normalizedAnalyticsStateHook).toContain(
      'useAdminPollingSWR<RealtimeAnalyticsResponse>(\n    isLocalAdminUiTestSession ? null : "/api/admin/analytics/realtime",\n    ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS',
    );
    expect(normalizedAnalyticsStateHook).toContain(
      "useAdminPollingSWR<HistoricalAnalyticsResponse>(isLocalAdminUiTestSession ? null : historicalUrl, ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS",
    );
    expect(normalizedAnalyticsStateHook).toContain(
      'useAdminPollingSWR<AdminOverviewResponse>(isLocalAdminUiTestSession ? null : "/api/admin/overview", ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS',
    );
  });
});

describe("Admin Users stream failure settlement", () => {
  const ignoreInvalidation = () => undefined;
  const advance = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  const openStream = (packets: unknown[] = []) => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const cancel = vi.fn();
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(value) { controller = value; packets.forEach((packet) => value.enqueue(encoder.encode(`data: ${JSON.stringify(packet)}\n\n`))); },
      cancel,
    });
    return {
      response: new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
      cancel,
      push: (text: string) => controller.enqueue(encoder.encode(text)),
      close: () => controller.close(),
    };
  };
  beforeEach(() => {
    vi.useFakeTimers();
    usersStreamTransport.fetch.mockReset();
    usersStreamTransport.issue.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([401, 403, 422, 429])("settles permanent/unclassified %i and retains the verified-snapshot failure distinction", async (status) => {
    usersStreamTransport.fetch.mockResolvedValue(new Response("Blocked", { status }));
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate: ignoreInvalidation }));
    await advance();
    expect(result.current.pulseState).toBe("degraded");
    await advance(600_000);
    window.dispatchEvent(new Event("online"));
    await advance(600_000);
    expect(usersStreamTransport.fetch).toHaveBeenCalledOnce();
    expect(result.current.pulseLabel).toContain("paused");
  });

  it("reports failed rather than healthy or zero when no snapshot exists", async () => {
    usersStreamTransport.fetch.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: false, onInvalidate: ignoreInvalidation }));
    await advance();
    expect(result.current.pulseState).toBe("failed");
  });

  it("settles the owned authentication preflight failure without a transport loop", async () => {
    usersStreamTransport.fetch.mockRejectedValue(new Error("Not authenticated"));
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate: ignoreInvalidation }));
    await advance(600_000);
    expect(result.current.pulseState).toBe("degraded");
    expect(usersStreamTransport.fetch).toHaveBeenCalledOnce();
  });

  it("honors verified Retry-After before a successful stream reconnect", async () => {
    const valid = openStream([{ type: "connected", metricScope: "operational_pulse_only", emittedAt: 100 }]);
    usersStreamTransport.fetch.mockResolvedValueOnce(new Response("Rate limited", { status: 429, headers: { "Retry-After": "60" } })).mockResolvedValue(valid.response);
    const onInvalidate = vi.fn();
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate }));
    await advance(59_999);
    expect(usersStreamTransport.fetch).toHaveBeenCalledOnce();
    await advance(1);
    expect(usersStreamTransport.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.pulseState).toBe("live");
    expect(result.current.lastPulseAt).toBe(100);
    expect(onInvalidate).not.toHaveBeenCalled();
  });

  it.each(["server", "network", "closed"] as const)("bounds %s reconnects and recovers only in a new transient epoch", async (kind) => {
    if (kind === "server") usersStreamTransport.fetch.mockResolvedValue(new Response("Unavailable", { status: 503 }));
    else if (kind === "network") usersStreamTransport.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    else usersStreamTransport.fetch.mockImplementation(async () => { const stream = openStream(); stream.close(); return stream.response; });
    const onInvalidate = vi.fn();
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate }));
    await advance();
    for (const delay of [2_000, 4_000, 8_000, 15_000]) {
      const before = usersStreamTransport.fetch.mock.calls.length;
      await advance(delay - 1);
      expect(usersStreamTransport.fetch).toHaveBeenCalledTimes(before);
      await advance(1);
      expect(usersStreamTransport.fetch).toHaveBeenCalledTimes(before + 1);
    }
    await advance(600_000);
    expect(usersStreamTransport.fetch).toHaveBeenCalledTimes(5);
    expect(result.current.pulseState).toBe("degraded");
    expect(result.current.pulseLabel).toContain("repeated failures");
    const recovered = openStream([{ type: "connected", metricScope: "operational_pulse_only", emittedAt: 200 }]);
    usersStreamTransport.fetch.mockResolvedValue(recovered.response);
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await advance();
    expect(usersStreamTransport.fetch).toHaveBeenCalledTimes(6);
    expect(result.current.lastPulseAt).toBe(200);
    expect(onInvalidate).not.toHaveBeenCalled();
  });

  it("decodes split valid packets and invalidates once without turning a pulse into a total", async () => {
    const stream = openStream();
    usersStreamTransport.fetch.mockResolvedValue(stream.response);
    const onInvalidate = vi.fn();
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate }));
    await advance();
    stream.push('data: {"type":"heartbeat","metricScope":"operational_pulse_only","emittedAt":300}\n');
    await advance();
    expect(result.current.lastPulseAt).toBeNull();
    stream.push('\ndata: {"type":"invalidate","metricScope":"operational_pulse_only","source":"snapshot_owner","emittedAt":301}\n\n');
    await advance();
    expect(result.current.lastPulseAt).toBe(301);
    expect(onInvalidate).toHaveBeenCalledExactlyOnceWith("snapshot_owner");
  });

  it.each(["scope", "malformed"] as const)("settles a %s contract failure without claiming a healthy stream", async (kind) => {
    const stream = openStream();
    usersStreamTransport.fetch.mockResolvedValue(stream.response);
    const onInvalidate = vi.fn();
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: false, onInvalidate }));
    await advance();
    stream.push(kind === "scope" ? 'data: {"type":"invalidate","metricScope":"business_totals"}\n\n' : 'data: broken-json\n\n');
    await advance(600_000);
    expect(result.current.pulseState).toBe("failed");
    expect(usersStreamTransport.fetch).toHaveBeenCalledOnce();
    expect(onInvalidate).not.toHaveBeenCalled();
    expect(stream.cancel).toHaveBeenCalledOnce();
  });

  it("ignores a late response after the hook is disabled and cancels its body", async () => {
    let finish!: (response: Response) => void;
    usersStreamTransport.fetch.mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; }));
    const onInvalidate = vi.fn();
    const { result, rerender } = renderHook(({ enabled }) => useAdminUsersRealtime({ enabled, hasSnapshotValue: true, onInvalidate }), { initialProps: { enabled: true } });
    await advance();
    const signal = usersStreamTransport.fetch.mock.calls[0][1].signal as AbortSignal;
    rerender({ enabled: false });
    const late = openStream([{ type: "invalidate", metricScope: "operational_pulse_only", emittedAt: 400 }]);
    finish(late.response);
    await advance(600_000);
    expect(signal.aborted).toBe(true);
    expect(late.cancel).toHaveBeenCalledOnce();
    expect(result.current.lastPulseAt).toBeNull();
    expect(onInvalidate).not.toHaveBeenCalled();
    expect(usersStreamTransport.fetch).toHaveBeenCalledOnce();
  });

  it("detaches a waiting reader and timer on unmount", async () => {
    const stream = openStream();
    usersStreamTransport.fetch.mockResolvedValue(stream.response);
    const { unmount } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate: ignoreInvalidation }));
    await advance();
    unmount();
    await advance(600_000);
    expect(stream.cancel).toHaveBeenCalledOnce();
    expect(usersStreamTransport.fetch).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("online"));
    await advance(600_000);
    expect(usersStreamTransport.fetch).toHaveBeenCalledOnce();
  });

  it("ignores an old owner's late failure after callback replacement connects a new stream", async () => {
    let failOld!: (reason: unknown) => void;
    const recovered = openStream([{ type: "connected", metricScope: "operational_pulse_only", emittedAt: 500 }]);
    usersStreamTransport.fetch.mockReturnValueOnce(new Promise<Response>((_resolve, reject) => { failOld = reject; })).mockResolvedValue(recovered.response);
    const firstOwner = vi.fn();
    const nextOwner = vi.fn();
    const { result, rerender } = renderHook(({ onInvalidate }) => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate }), { initialProps: { onInvalidate: firstOwner } });
    await advance();
    rerender({ onInvalidate: nextOwner });
    await advance();
    failOld(new Error("Old connection failed"));
    await advance(600_000);
    expect(result.current.pulseState).toBe("live");
    expect(result.current.lastPulseAt).toBe(500);
    expect(usersStreamTransport.fetch).toHaveBeenCalledTimes(2);
    expect(usersStreamTransport.issue).not.toHaveBeenCalled();
    expect(firstOwner).not.toHaveBeenCalled();
  });

  it("bounds an unknown consumer callback failure without misclassifying a valid packet", async () => {
    usersStreamTransport.fetch.mockImplementation(async () => openStream([{ type: "invalidate", metricScope: "operational_pulse_only", emittedAt: 600 }]).response);
    const onInvalidate = vi.fn(() => { throw new Error("Consumer failed"); });
    const { result } = renderHook(() => useAdminUsersRealtime({ hasSnapshotValue: true, onInvalidate }));
    await advance(600_000);
    expect(usersStreamTransport.fetch).toHaveBeenCalledTimes(5);
    expect(onInvalidate).toHaveBeenCalledTimes(5);
    expect(result.current.pulseLabel).toContain("repeated failures");
    expect(usersStreamTransport.issue.mock.calls[0][0].error.message).toBe("Consumer failed");
  });
});
