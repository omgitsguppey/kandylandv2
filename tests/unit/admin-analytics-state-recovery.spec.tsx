// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimeAnalyticsResponse } from "@/types/admin-analytics";

const state = vi.hoisted(() => ({ realtime: undefined as RealtimeAnalyticsResponse | undefined, error: undefined as Error | undefined }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({user:{uid:"verified-admin",providerData:[{providerId:"password"}]},userProfile:{role:"admin"}}) }));
vi.mock("@/hooks/useNow", () => ({ useNow: () => 1_759_363_200_000 }));
vi.mock("@/lib/authFetch", () => ({ authFetch: vi.fn() }));
vi.mock("@/lib/client-error-reporting", () => ({ reportStorageIssue: vi.fn() }));
vi.mock("@/hooks/useAdminPollingSWR", () => ({ useAdminPollingSWR: (url: string | null) => ({data:url==="/api/admin/analytics/realtime"?state.realtime:undefined,error:url==="/api/admin/analytics/realtime"?state.error:undefined,isLoading:false,mutate:vi.fn()}) }));
vi.mock("@/hooks/useAdminAnalyticsSnapshotRegistry", () => ({ useAdminAnalyticsSnapshotRegistry: () => {
  const keys=["platformPulse","audienceSnapshot","commerceSnapshot","livePulse","journeyFunnel","authOutcomeSplit","onboardingVelocity","dailyTaskPipeline","notificationFunnel","eventMix","liveInteractionStream","dataHealthSummary"];
  const modules=keys.map(sectionKey=>({sectionKey,moduleKey:sectionKey,rangeKey:"30d",sourceMode:"unavailable",truthState:"missing",refreshStatus:"idle",snapshot:null,lastVerifiedAt:null,generatedAt:null,debugPath:"",hasVerifiedSnapshot:false,isLoading:false,error:null,firstSnapshotMs:null,duplicateRefreshPrevented:false,unavailableReason:"source_missing",refresh:vi.fn()}));
  return {modules,bySectionKey:Object.fromEntries(modules.map(module=>[module.sectionKey,module])),byModuleKey:{},summary:{moduleCount:12,verifiedCount:0,staleCount:0,unavailableCount:12,refreshingCount:0,firstSnapshotMs:null},debug:{snapshotFirstMigrationEnabled:true}};
} }));

import { useAdminAnalyticsState } from "@/app/admin/analytics/hooks/useAdminAnalyticsState";
import { useAdminAnalyticsSnapshot } from "@/hooks/useAdminAnalyticsSnapshot";
import { authFetch } from "@/lib/authFetch";
import { createSnapshotValue, createUnavailableAdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";
import type { AdminMetricSnapshotRange } from "@/lib/analytics/admin-metric-snapshot";

beforeEach(() => { state.realtime=undefined;state.error=undefined;window.sessionStorage.clear(); });
afterEach(cleanup);

describe("Optional GA4 legacy metadata", () => {
  it("retains first-party facts and GA source warnings with stale optional GA setup metadata", () => {
    state.realtime = Object.assign({
      success: true,
      totalActive: 12,
      deepTrackerActive: 12,
      generatedAtMs: 1_759_363_190_000,
      data: [],
      activeUsers: [],
      liveTruthLabel: "live" as const,
      activeUsersTruthLabel: "live" as const,
      issues: ["GA4 config missing; first-party product truth remains authoritative"],
    }, { requiresSetup: true });
    const { result } = renderHook(useAdminAnalyticsState);
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBe(12);
    expect(result.current.liveResponse?.generatedAtMs).toBe(state.realtime.generatedAtMs);
    expect(result.current.backgroundAnalyticsIssues.join(" ")).toContain("GA4 config missing");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function selectedSnapshot(rangeKey: AdminMetricSnapshotRange, views = 7) {
  return {
    ...createUnavailableAdminMetricSnapshot({ moduleKey: "audience_snapshot", rangeKey, reason: "seed" }),
    values: { views: createSnapshotValue({ value: views, source: "bounded_fact_window", sourceMode: "verified_cache" }) },
    truthState: "verified" as const, sourceMode: "verified_cache" as const,
    lastVerifiedAt: "2026-10-02T12:00:00.000Z", expiresAt: "2026-10-02T12:05:00.000Z",
    warnings: [], refreshStatus: "completed" as const,
  };
}
function snapshotResponse(rangeKey: AdminMetricSnapshotRange, views = 7) {
  return new Response(JSON.stringify({ success: true, snapshot: selectedSnapshot(rangeKey, views) }), { status: 200 });
}

describe("Analytics snapshot selection custody", () => {
  beforeEach(() => vi.mocked(authFetch).mockReset());

  it("ignores an old GET after a newer range settles and aborts the obsolete transport", async () => {
    const old = deferred<Response>();
    vi.mocked(authFetch).mockImplementationOnce(() => old.promise).mockResolvedValueOnce(snapshotResponse("7d", 14));
    const { result, rerender } = renderHook(({ rangeKey }) => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey }), { initialProps: { rangeKey: "24h" as AdminMetricSnapshotRange } });
    const oldSignal = vi.mocked(authFetch).mock.calls[0][1]?.signal;
    rerender({ rangeKey: "7d" });
    await waitFor(() => expect(result.current.snapshot?.values.views.value).toBe(14));
    expect(oldSignal?.aborted).toBe(true);
    await act(async () => old.resolve(snapshotResponse("24h", 99)));
    expect(result.current.snapshot?.rangeKey).toBe("7d");
    expect(result.current.snapshot?.values.views.value).toBe(14);
  });

  it("ignores an old POST and old error after the selected range changes", async () => {
    const old = deferred<Response>();
    vi.mocked(authFetch).mockResolvedValueOnce(snapshotResponse("24h")).mockImplementationOnce(() => old.promise).mockResolvedValueOnce(snapshotResponse("7d", 14));
    const { result, rerender } = renderHook(({ rangeKey }) => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey }), { initialProps: { rangeKey: "24h" as AdminMetricSnapshotRange } });
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    let pending!: ReturnType<typeof result.current.refresh>;
    act(() => { pending = result.current.refresh(); });
    rerender({ rangeKey: "7d" });
    await waitFor(() => expect(result.current.snapshot?.rangeKey).toBe("7d"));
    await act(async () => { old.reject(new Error("Old range failed")); await pending; });
    expect(result.current.error).toBeNull();
    expect(result.current.refreshStatus).toBe("completed");
    expect(result.current.snapshot?.values.views.value).toBe(14);
  });

  it("settles failed refresh truth while retaining a verified same-range snapshot, then recovers manually", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(snapshotResponse("24h", 7))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, refreshStatus: "completed", error: "Source unavailable" }), { status: 200 }))
      .mockResolvedValueOnce(snapshotResponse("24h", 9));
    const { result } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h" }));
    await waitFor(() => expect(result.current.snapshot?.values.views.value).toBe(7));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.snapshot?.values.views.value).toBe(7);
    expect(result.current.refreshStatus).toBe("failed");
    expect(result.current.error).not.toBeNull();
    await act(async () => { await result.current.refresh(); });
    expect(result.current.snapshot?.values.views.value).toBe(9);
    expect(result.current.error).toBeNull();
    expect(result.current.refreshStatus).toBe("completed");
  });

  it("rejects a wrong-range POST without replacing the current verified snapshot", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(snapshotResponse("24h", 7)).mockResolvedValueOnce(snapshotResponse("7d", 99));
    const { result } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h" }));
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    await act(async () => { await result.current.refresh(); });
    expect(result.current.snapshot?.rangeKey).toBe("24h");
    expect(result.current.snapshot?.values.views.value).toBe(7);
    expect(result.current.refreshStatus).toBe("failed");
  });

  it("aborts on unmount and ignores a deferred response", async () => {
    const pending = deferred<Response>();
    vi.mocked(authFetch).mockImplementationOnce(() => pending.promise);
    const { unmount } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h" }));
    const signal = vi.mocked(authFetch).mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.resolve(snapshotResponse("24h")));
    expect(authFetch).toHaveBeenCalledOnce();
  });

  it("performs explicitly requested mount refresh once for each selected window", async () => {
    vi.mocked(authFetch).mockImplementation(async (_url, init) => {
      const rangeKey = init?.method === "POST" ? JSON.parse(init.body as string).rangeKey : String(_url).includes("7d") ? "7d" : "24h";
      return snapshotResponse(rangeKey);
    });
    const { rerender } = renderHook(({ rangeKey }) => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey, refreshOnMount: true }), { initialProps: { rangeKey: "24h" as AdminMetricSnapshotRange } });
    await waitFor(() => expect(vi.mocked(authFetch).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1));
    rerender({ rangeKey: "7d" });
    await waitFor(() => expect(vi.mocked(authFetch).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2));
  });

  it("ignores a late successful POST after another range loads", async () => {
    const old = deferred<Response>();
    vi.mocked(authFetch).mockResolvedValueOnce(snapshotResponse("24h")).mockImplementationOnce(() => old.promise).mockResolvedValueOnce(snapshotResponse("7d", 14));
    const { result, rerender } = renderHook(({ rangeKey }) => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey }), { initialProps: { rangeKey: "24h" as AdminMetricSnapshotRange } });
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    let pending!: ReturnType<typeof result.current.refresh>;
    act(() => { pending = result.current.refresh(); });
    rerender({ rangeKey: "7d" });
    await waitFor(() => expect(result.current.snapshot?.values.views.value).toBe(14));
    await act(async () => { old.resolve(snapshotResponse("24h", 99)); await pending; });
    expect(result.current.snapshot?.rangeKey).toBe("7d");
    expect(result.current.snapshot?.values.views.value).toBe(14);
  });

  it("does not accept an old selection after returning to the same range", async () => {
    const first = deferred<Response>();
    vi.mocked(authFetch).mockImplementationOnce(() => first.promise).mockResolvedValueOnce(snapshotResponse("7d", 14)).mockResolvedValueOnce(snapshotResponse("24h", 9));
    const { result, rerender } = renderHook(({ rangeKey }) => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey }), { initialProps: { rangeKey: "24h" as AdminMetricSnapshotRange } });
    rerender({ rangeKey: "7d" });
    await waitFor(() => expect(result.current.snapshot?.values.views.value).toBe(14));
    rerender({ rangeKey: "24h" });
    await waitFor(() => expect(result.current.snapshot?.values.views.value).toBe(9));
    await act(async () => first.resolve(snapshotResponse("24h", 99)));
    expect(result.current.snapshot?.values.views.value).toBe(9);
  });

  it("rejects a wrong-module GET and recovers through a manual same-selection refresh", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true, snapshot: { ...selectedSnapshot("24h", 99), moduleKey: "commerce_snapshot" } }), { status: 200 })).mockResolvedValueOnce(snapshotResponse("24h", 9));
    const { result } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h" }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.snapshot).toBeNull();
    expect(result.current.refreshStatus).toBe("failed");
    await act(async () => { await result.current.refresh(); });
    expect(result.current.snapshot?.values.views.value).toBe(9);
    expect(result.current.error).toBeNull();
  });

  it("preserves verified data when an error response carries an unavailable replacement", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(snapshotResponse("24h", 7)).mockResolvedValueOnce(new Response(JSON.stringify({ success: false, snapshot: createUnavailableAdminMetricSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", reason: "failed" }), error: "Unavailable" }), { status: 500 }));
    const { result } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h" }));
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    await act(async () => { await result.current.refresh(); });
    expect(result.current.snapshot?.values.views.value).toBe(7);
    expect(result.current.refreshStatus).toBe("failed");
    expect(result.current.error).not.toBeNull();
  });

  it("settles loading when manual refresh supersedes an initial deferred GET", async () => {
    const get = deferred<Response>();
    vi.mocked(authFetch).mockImplementationOnce(() => get.promise).mockResolvedValueOnce(snapshotResponse("24h", 9));
    const { result } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h" }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.snapshot?.values.views.value).toBe(9);
    await act(async () => get.resolve(snapshotResponse("24h", 99)));
    expect(result.current.snapshot?.values.views.value).toBe(9);
  });

  it("does not auto-refresh after the initial GET was superseded by manual work", async () => {
    const get = deferred<Response>();
    const manual = deferred<Response>();
    vi.mocked(authFetch).mockImplementationOnce(() => get.promise).mockImplementationOnce(() => manual.promise).mockResolvedValue(snapshotResponse("24h", 99));
    const { result } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", refreshOnMount: true }));
    let pending!: ReturnType<typeof result.current.refresh>;
    act(() => { pending = result.current.refresh(); });
    const manualSignal = vi.mocked(authFetch).mock.calls[1][1]?.signal;
    await act(async () => get.resolve(snapshotResponse("24h", 7)));
    expect(authFetch).toHaveBeenCalledTimes(2);
    expect(manualSignal?.aborted).toBe(false);
    await act(async () => { manual.resolve(snapshotResponse("24h", 9)); await pending; });
    expect(result.current.snapshot?.values.views.value).toBe(9);
  });
});

describe("Analytics response recovery", () => {
  it.each([undefined,new Error("Source unavailable")])("retains absent route data without manufacturing success or a current timestamp", (error) => {
    state.error=error;
    const { result } = renderHook(useAdminAnalyticsState);
    expect(result.current.liveResponse).toBeUndefined();
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBeNull();
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.displayState).toBe("unavailable");
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.displayValue).not.toBe("0");
    expect(result.current.livePulseModel.mode).toBe("unavailable");
  });

  it("preserves a timestamped confirmed zero and its source freshness", () => {
    state.realtime={success:true,totalActive:0,deepTrackerActive:0,generatedAtMs:1_759_363_190_000,data:[],activeUsers:[],liveTruthLabel:"live",activeUsersTruthLabel:"live"} as RealtimeAnalyticsResponse;
    const { result } = renderHook(useAdminAnalyticsState);
    expect(result.current.liveResponse?.totalActive).toBe(0);
    expect(result.current.liveResponse?.generatedAtMs).toBe(state.realtime.generatedAtMs);
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBe(0);
  });

  it("does not promote an explicitly unsuccessful response", () => {
    state.realtime={success:false,totalActive:0,generatedAtMs:1_759_363_190_000} as RealtimeAnalyticsResponse;
    const { result } = renderHook(useAdminAnalyticsState);
    expect(result.current.liveResponse).toBeUndefined();
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBeNull();
  });

  it("retains a real cached snapshot during a failed background refresh", () => {
    state.realtime={success:true,totalActive:7,generatedAtMs:1_759_363_190_000,data:[],activeUsers:[],liveTruthLabel:"cached",activeUsersTruthLabel:"cached"} as RealtimeAnalyticsResponse;
    state.error=new Error("Background refresh failed");
    const { result } = renderHook(useAdminAnalyticsState);
    expect(result.current.liveResponse?.totalActive).toBe(7);
    expect(result.current.liveResponse?.generatedAtMs).toBe(state.realtime.generatedAtMs);
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBe(7);
    expect(result.current.backgroundAnalyticsIssues.join(" ")).toContain("Background refresh failed");
  });
});


describe("Analytics snapshot request admission", () => {
  beforeEach(() => vi.mocked(authFetch).mockReset());

  it("does not load or write while explicitly disabled even with mount refresh requested", async () => {
    const { result } = renderHook(() => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", enabled: false, refreshOnMount: true }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.snapshot).toBeNull();
    expect(result.current.metadata).toBeNull();
    await act(async () => { expect(await result.current.refresh()).toBeNull(); });
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("settles and hides an old POST when admission is withdrawn, then starts a fresh admitted load", async () => {
    const old = deferred<Response>();
    vi.mocked(authFetch).mockResolvedValueOnce(snapshotResponse("24h", 7)).mockImplementationOnce(() => old.promise).mockResolvedValueOnce(snapshotResponse("24h", 9));
    const { result, rerender } = renderHook(({ enabled }) => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", enabled }), { initialProps: { enabled: true } });
    await waitFor(() => expect(result.current.snapshot?.values.views.value).toBe(7));
    let pending!: ReturnType<typeof result.current.refresh>;
    act(() => { pending = result.current.refresh(); });
    const oldSignal = vi.mocked(authFetch).mock.calls[1][1]?.signal;
    rerender({ enabled: false });
    expect(oldSignal?.aborted).toBe(true);
    expect(result.current.snapshot).toBeNull();
    expect(result.current.isLoading).toBe(false);
    await act(async () => { old.resolve(snapshotResponse("24h", 99)); expect(await pending).toBeNull(); });
    expect(result.current.snapshot).toBeNull();
    expect(result.current.error).toBeNull();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.snapshot?.values.views.value).toBe(9));
    expect(authFetch).toHaveBeenCalledTimes(3);
  });

  it("runs the established load and mount refresh once after admission opens", async () => {
    vi.mocked(authFetch).mockResolvedValue(snapshotResponse("24h", 7));
    const { result, rerender } = renderHook(({ enabled }) => useAdminAnalyticsSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", enabled, refreshOnMount: true }), { initialProps: { enabled: false } });
    expect(result.current.isLoading).toBe(false);
    expect(authFetch).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(vi.mocked(authFetch).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1));
    expect(authFetch).toHaveBeenCalledTimes(2);
    expect(result.current.snapshot?.values.views.value).toBe(7);
  });
});
