// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, cleanup, render, renderHook, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/page.tsx"),
  "utf8",
);
const hookSource = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const helpersSource = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/AnalyticsHelpers.tsx"),
  "utf8",
);
const preferencesSource = readFileSync(
  join(process.cwd(), "src/lib/admin-analytics-preferences.ts"),
  "utf8",
);
const historicalRouteSource = readFileSync(
  join(process.cwd(), "src/app/api/admin/analytics/historical/route.ts"),
  "utf8",
);

describe("admin analytics local fixture boundary", () => {
  it("labels local admin UI fixture analytics evidence as source_missing", () => {
    expect(pageSource).toContain('data-admin-analytics-fixture-boundary="true"');
    expect(pageSource).toContain('data-admin-analytics-fixture-state="source_missing"');
    expect(pageSource).toContain("analytics data waits for verified snapshots");
    expect(pageSource).not.toContain("analytics data stays source_missing");
  });

  it("skips top-level admin analytics reads and preference writes for fixture sessions", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/analytics/preferences"');
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/analytics/realtime"');
    expect(hookSource).toContain("isLocalAdminUiTestSession ? null : historicalUrl");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/overview"');
    expect(hookSource).toContain("permission_blocked: analytics preferences require verified admin access.");
  });

  it("skips section drilldown override reads in fixture sessions", () => {
    const normalizedHelpersSource = helpersSource.replace(/\r\n/g, "\n");

    expect(normalizedHelpersSource).toContain("disabled = false");
    expect(normalizedHelpersSource).toContain("const ADMIN_ANALYTICS_SECTION_OVERRIDE_REFRESH_INTERVAL_MS = 0");
    expect(normalizedHelpersSource).toContain("ADMIN_ANALYTICS_SECTION_OVERRIDE_REFRESH_INTERVAL_MS");
    expect(normalizedHelpersSource).not.toContain("60_000");
    expect(normalizedHelpersSource).toContain(
      "!disabled && (range !== ADMIN_ANALYTICS_DEFAULT_RANGE || Boolean(viewerUser))",
    );
    expect(hookSource).toContain("viewerUserFilter,\n    isLocalAdminUiTestSession");
    expect(hookSource.match(/isLocalAdminUiTestSession/g)?.length ?? 0).toBeGreaterThan(20);
  });

  it("does not classify missing fixture realtime snapshots as broken runtime errors", () => {
    expect(hookSource).toContain('liveRealtime.feedStatus === "failed" && effectiveLiveResponse');
    expect(hookSource).toContain("const liveRealtimeFailureDetail");
    expect(hookSource).toContain("error: liveRealtimeFailureDetail");
    expect(hookSource).toContain("realtimeError: liveRealtimeFailureDetail");
    expect(hookSource).toContain("liveError instanceof Error");
    expect(hookSource).not.toContain('error: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : null');
    expect(hookSource).not.toContain('realtimeError: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : null');
  });

  it("defaults admin analytics hydration to launch history without enabling raw polling", () => {
    expect(preferencesSource).toContain('ADMIN_ANALYTICS_DEFAULT_RANGE = "all"');
    expect(hookSource).toContain("const historicalUrl = `/api/admin/analytics/historical?period=${ADMIN_ANALYTICS_DEFAULT_RANGE}`");
    expect(historicalRouteSource).toContain("shouldHydrateDefaultLaunchHistoryFromSources");
    expect(historicalRouteSource).toContain("hydrating launch history from bounded canonical source collections");
    expect(hookSource).toContain("Launch history hydrating; showing verified snapshots");
    expect(hookSource).toContain("Launch history hydrating; using confirmed transactions");
    expect(hookSource).toContain("Hydrating launch history from source evidence");
    expect(hookSource).toContain("Hydrating launch history");
    expect(hookSource).not.toContain("Waiting for first analytics snapshot");
    expect(hookSource).not.toContain('ADMIN_ANALYTICS_DEFAULT_RANGE = "30d"');
  });

  it("keeps all-time platform snapshots from short-circuiting launch-history recovery", () => {
    expect(historicalRouteSource).toContain("const shouldHydrateLaunchHistoryFromSources =");
    expect(historicalRouteSource).toContain("shouldHydrateDefaultLaunchHistoryFromSources(snapshotAuthorityTarget)");
    expect(historicalRouteSource).toContain("snapshotAuthorityResult.status === 200 && !shouldHydrateLaunchHistoryFromSources");
    expect(historicalRouteSource).toContain(
      "Canonical all-time platform snapshot is available as hot-cache context; source collections remain used for launch-history continuity.",
    );
  });
});


const fixtureAdmission = vi.hoisted(() => ({
  providerId: "admin-ui-test-session",
  authFetch: vi.fn(),
  pollingKeys: [] as Array<string | null>,
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "admin-fixture-admission", providerData: [{ providerId: fixtureAdmission.providerId }] }, userProfile: { role: "admin" } }) }));
vi.mock("@/hooks/useNow", () => ({ useNow: () => Date.now() }));
vi.mock("@/lib/authFetch", () => ({ authFetch: fixtureAdmission.authFetch }));
vi.mock("@/lib/client-error-reporting", () => ({ reportStorageIssue: vi.fn() }));
vi.mock("@/hooks/useAdminPollingSWR", () => ({ useAdminPollingSWR: (url: string | null) => {
  fixtureAdmission.pollingKeys.push(url);
  return { data: undefined, error: undefined, isLoading: false, mutate: vi.fn() };
} }));
import { useAdminAnalyticsState } from "@/app/admin/analytics/hooks/useAdminAnalyticsState";
import { createSnapshotValue, createUnavailableAdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";
import type { AdminMetricSnapshotRange } from "@/lib/analytics/admin-metric-snapshot";

function admittedFixtureResponse(url: string, init?: RequestInit, activeCount = 7) {
  const selected = init?.method === "POST" ? JSON.parse(String(init.body)) : Object.fromEntries(new URL(url, "http://localhost").searchParams);
  const snapshot = {
    ...createUnavailableAdminMetricSnapshot({ moduleKey: selected.moduleKey, rangeKey: selected.rangeKey as AdminMetricSnapshotRange, reason: "controlled transport" }),
    truthState: "verified", sourceMode: "verified_cache", refreshStatus: "completed",
    lastVerifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300_000).toISOString(),
    warnings: [], values: { activeCount: createSnapshotValue({ value: activeCount, source: "controlled_fixture_document", sourceMode: "verified_cache" }) },
  };
  return new Response(JSON.stringify({ success: true, snapshot, metadata: { exists: true, sourceVersion: snapshot.sourceVersion } }), { status: 200 });
}

describe("Analytics fixture admission through the actual controller, registry and hooks", () => {
  beforeEach(() => {
    fixtureAdmission.providerId = "admin-ui-test-session";
    fixtureAdmission.authFetch.mockReset().mockImplementation(async (url: string, init?: RequestInit) => admittedFixtureResponse(url, init));
    fixtureAdmission.pollingKeys = [];
    window.sessionStorage.clear();
  });
  afterEach(cleanup);

  it("does not start authenticated snapshot reads in a local fixture and preserves missing source truth", async () => {
    const { result } = renderHook(useAdminAnalyticsState);
    await waitFor(() => expect(result.current.analyticsSnapshotRegistry.modules.every((module) => !module.isLoading)).toBe(true));
    expect(result.current.isLocalAdminUiTestSession).toBe(true);
    expect(fixtureAdmission.authFetch).not.toHaveBeenCalled();
    expect(fixtureAdmission.pollingKeys.filter(Boolean)).toHaveLength(0);
    expect(result.current.analyticsSnapshotRegistry.modules.every((module) => module.snapshot === null && module.error === null)).toBe(true);
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBeNull();
    act(() => {
      result.current.setModuleRanges({ livePulse: "7d", viewerDrilldown: "7d" });
      result.current.setViewerUserFilter("controlled-viewer");
    });
    expect(fixtureAdmission.authFetch).not.toHaveBeenCalled();
    expect(fixtureAdmission.pollingKeys.filter(Boolean)).toHaveLength(0);
  });

  it("visibly disables the existing refresh affordance in the local fixture", () => {
    const { result } = renderHook(useAdminAnalyticsState);
    const rendered = render(result.current.renderSectionRangeControl("livePulse"));
    const refresh = within(rendered.container).getByRole("button", { name: /refresh/i });
    expect(refresh).toBeDisabled();
  });

  it("retains default admitted module reads and one explicitly requested refresh", async () => {
    fixtureAdmission.providerId = "password";
    const { result } = renderHook(useAdminAnalyticsState);
    await waitFor(() => expect(result.current.analyticsSnapshotRegistry.modules.every((module) => !module.isLoading)).toBe(true));
    const modules = result.current.analyticsSnapshotRegistry.modules;
    const initialCalls = fixtureAdmission.authFetch.mock.calls;
    expect(initialCalls).toHaveLength(modules.length);
    expect(new Set(initialCalls.map(([url]) => new URL(String(url), "http://localhost").searchParams.get("moduleKey"))).size).toBe(modules.length);
    expect(initialCalls.every(([, init]) => init?.method === "GET")).toBe(true);
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBe(7);
    await act(async () => { await result.current.analyticsSnapshotRegistry.bySectionKey.livePulse.refresh(); });
    expect(fixtureAdmission.authFetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(JSON.parse(fixtureAdmission.authFetch.mock.calls.at(-1)![1].body)).toMatchObject({ moduleKey: "live_pulse", force: false });
  });

  it("cancels and hides admitted work when entering a fixture, ignores its late revision and rereads on return", async () => {
    fixtureAdmission.providerId = "password";
    let resolveOld!: (response: Response) => void;
    const old = new Promise<Response>((resolve) => { resolveOld = resolve; });
    fixtureAdmission.authFetch.mockImplementationOnce(() => old);
    const { result, rerender } = renderHook(useAdminAnalyticsState);
    const oldCall = fixtureAdmission.authFetch.mock.calls[0];
    const oldSignal = oldCall[1].signal as AbortSignal;
    fixtureAdmission.providerId = "admin-ui-test-session";
    rerender();
    expect(oldSignal.aborted).toBe(true);
    expect(result.current.analyticsSnapshotRegistry.modules.every((module) => module.snapshot === null && !module.isLoading)).toBe(true);
    const admittedCallCount = fixtureAdmission.authFetch.mock.calls.length;
    await act(async () => {
      expect(await result.current.analyticsSnapshotRegistry.bySectionKey.platformPulse.refresh()).toBeNull();
      resolveOld(admittedFixtureResponse(oldCall[0], oldCall[1], 99));
    });
    expect(fixtureAdmission.authFetch).toHaveBeenCalledTimes(admittedCallCount);
    expect(result.current.analyticsSnapshotRegistry.modules.every((module) => module.snapshot === null)).toBe(true);
    fixtureAdmission.providerId = "password";
    rerender();
    await waitFor(() => expect(result.current.analyticsSnapshotRegistry.modules.every((module) => !module.isLoading)).toBe(true));
    expect(fixtureAdmission.authFetch).toHaveBeenCalledTimes(admittedCallCount + result.current.analyticsSnapshotRegistry.modules.length);
    expect(result.current.analyticsOverviewDisplayMetrics.liveActive.primaryValue).toBe(7);
  });
});
