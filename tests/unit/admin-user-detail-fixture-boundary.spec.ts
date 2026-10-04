// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/user/[userId]/page.tsx"), "utf8");

describe("admin user detail fixture boundary", () => {
  it("renders a bounded local fixture for browser smoke user detail without calling the API", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('ADMIN_USER_DETAIL_BROWSER_SMOKE_USER_ID = "browser-smoke-user"');
    expect(source).toContain('displayName: "Admin Source Fixture User"');
    expect(source).toContain("isLocalAdminUiTestSession && userId === ADMIN_USER_DETAIL_BROWSER_SMOKE_USER_ID");
    expect(source).toContain("if (isLocalAdminUserDetailFixture)");
    expect(source).toContain("setTargetUser(ADMIN_USER_DETAIL_BROWSER_SMOKE_PROFILE)");
    expect(source).toContain("setAnalytics(null)");
    expect(source).toContain('data-admin-user-detail-fixture-boundary="true"');
    expect(source).toContain("source_missing: user detail source is not loaded in this fixture");
    expect(source).toContain("Protected analytics, support, security, recommendation, payment, and user metric samples stay blocked");
  });

  it("keeps verified admin access on the canonical admin user API path", () => {
    const fixtureBranch = source.indexOf("if (isLocalAdminUserDetailFixture)");
    const apiFetch = source.indexOf('authFetch(`/api/admin/user/${userId}`)');

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(apiFetch).toBeGreaterThan(fixtureBranch);
    expect(source).toContain("if (!isAdmin || !userId)");
  });

  it("does not show missing support or parity snapshots as ready or pass-like data", () => {
    expect(source).toContain('const ADMIN_USER_DETAIL_MISSING_LABEL = "Not loaded"');
    expect(source).toContain("Support snapshot not loaded");
    expect(source).toContain("Parity snapshot not loaded");
    expect(source).toContain("supportSummaryClassName");
    expect(source).toContain("paritySummaryClassName");
    expect(source).not.toContain('"Ready for support"');
    expect(source).not.toContain('"[unavailable]"');
  });

  it("does not collapse missing behavior metrics into zero-valued summary stats", () => {
    expect(source).toContain('return "No source";');
    expect(source).toContain("formatBehaviorCountLabel(behaviorRollup?.totalActions)");
    expect(source).toContain("formatBehaviorCountLabel(behaviorRollup?.views)");
    expect(source).toContain("formatBehaviorCountLabel(behaviorRollup?.authEvents)");
    expect(source).toContain("if (!behaviorRollup)");
    expect(source).not.toContain("behaviorRollup?.watchTimeMs ?? 0");
    expect(source).not.toContain("analytics?.eventCount ?? 0).toLocaleString()");
  });

  it("does not collapse missing profile or commerce sources into zero-valued fixture stats", () => {
    expect(source).toContain("const commerceSourceAvailable = Boolean(analytics || transactions.length > 0)");
    expect(source).toContain("const hasUsableCommerceValue = commerceSourceAvailable && hasUsableAdminTruthValue");
    const mastheadSource = readFileSync(join(process.cwd(), "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx"), "utf8");
    expect(source).toContain("sourceAvailable={!isLocalAdminUserDetailFixture}");
    expect(mastheadSource).toContain('const balanceLabel = sourceAvailable && typeof user.gumDropsBalance === "number"');
    expect(mastheadSource).toContain("const unlockLabel = sourceAvailable && Array.isArray(user.unlockedContent)");
    expect(source).toContain("formatCommerceMoneyLabel(totalSpentUsd)");
    expect(source).toContain("formatCommerceGumDropsLabel(deliveredGumDrops)");
    expect(source).toContain("source_missing: commerce source is not loaded in this fixture");
    expect(source).not.toContain('value: `$${totalSpentUsd.toFixed(2)}`');
    expect(source).not.toContain('value: `${deliveredGumDrops.toLocaleString()} GD`');
  });
});

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { USER_INDEX_COLLECTIONS, USER_INDEX_MATERIALIZER_CONTRACT_VERSION } from "@/lib/user-indexes/user-tracking-index-contract";
import { buildUserTrackingIndex } from "@/lib/user-indexes/user-index-normalizer";

const detailState = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  const reads: Array<{ path: string; kind: string; limit?: number }> = [];
  const makeRef = (path: string, limit?: number): any => ({
    path,
    doc: (id: string) => makeRef(`${path}/${id}`),
    collection: (name: string) => makeRef(`${path}/${name}`),
    where: () => makeRef(path, limit),
    orderBy: () => makeRef(path, limit),
    limit: (count: number) => makeRef(path, count),
    get: async () => {
      reads.push({ path, kind: limit === undefined && documents.has(path) ? "document" : "query_or_missing", limit });
      return { exists: documents.has(path), data: () => documents.get(path), docs: [], empty: true, size: 0 };
    },
  });
  return {
    documents, reads, adminDb: { collection: (name: string) => makeRef(name) },
    userId: "detail_subject", authFetch: vi.fn(), guard: vi.fn(), reportIssue: vi.fn(),
  };
});

// SDK, auth/router transport, recommendation I/O and diagnostics are local doubles;
// the actual Detail GET, source owner, page composition and existing UI primitives run.
vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: detailState.adminDb }));
vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: detailState.guard }));
vi.mock("@/lib/server/auth", () => ({ handleApiError: (error: any) => NextResponse.json({ error: error.message }, { status: error.status ?? 500 }) }));
vi.mock("@/lib/server/route-runtime-health", () => ({ withRouteRuntimeHealth: (_name: string, handler: unknown) => handler }));
vi.mock("@/lib/server/route-diagnostics", () => ({ recordRouteWarning: vi.fn() }));
vi.mock("@/lib/server/drop-references", () => ({ getDropReferenceMap: async () => ({}), resolveDropTitle: (_map: unknown, id: string) => id }));
vi.mock("@/lib/server/behavioral-intelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/behavioral-intelligence")>();
  return { ...actual, getBehavioralUserProfile: async () => null, buildDeterministicDropRecommendations: async () => [] };
});
vi.mock("next/navigation", () => ({ useParams: () => ({ userId: detailState.userId }), useRouter: () => ({ back: vi.fn() }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "verified_admin_fixture" }, userProfile: { uid: "verified_admin_fixture", role: "admin" }, loading: false }) }));
vi.mock("@/lib/authFetch", () => ({ authFetch: detailState.authFetch }));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue: detailState.reportIssue }));
vi.mock("@/components/Analytics/PageViewEvent", () => ({ PageViewEvent: () => null }));

import { GET as actualDetailGet } from "@/app/api/admin/user/[userId]/route";
import AdminUserAnalyticsPage from "@/app/admin/user/[userId]/page";
import { AdminUserDetailMasthead } from "@/components/creative-tim/kandydrops/admin-users/AdminUsersOperations";

describe("admitted activity actual Detail source-to-render", () => {
  const nowMs = 1_796_000_000_000;
  const windowStartMs = nowMs - 14 * 24 * 60 * 60 * 1000;
  const windowEndMs = nowMs - 5;
  const subject = () => ({
    uid: detailState.userId, displayName: "Bounded Detail Subject", username: "bounded-subject",
    email: "subject@example.invalid", photoURL: null, role: "user", createdAt: nowMs - 40 * 24 * 60 * 60 * 1000,
    gumDropsBalance: 0, gumDropsPurchasedBalance: 0, gumDropsRewardBalance: 0, unlockedContent: [],
    privacySettings: { consentMode: "full_behavioral", allowRecommendations: true, identifiedAnalyticsEnabled: true, honorGlobalPrivacyControl: true, globalPrivacyControl: false },
  });
  function currentIndex(total = 1): Record<string, unknown> {
    const facts = total > 0 ? [{
      factId: "admitted_detail_fixture", actorType: "user", actorUserId: detailState.userId,
      sessionId: "bounded_session", normalizedAction: "page_viewed", eventName: "page_viewed", timestampMs: nowMs - 1000,
      route: "/dashboard", sourceComponent: "local_source_double", surface: "user", target: {}, sourceTruth: "client",
      sourceReliability: 0.8, consentState: "granted", metricEligible: true,
      confidenceInputs: { schemaComplete: true, hasActor: true, hasTargetWhenRequired: true, hasSession: true, hasServerTruth: false },
    }] : [];
    const index = buildUserTrackingIndex({ userId: detailState.userId, facts: facts as any, sourceWindowStartMs: windowStartMs, sourceWindowEndMs: windowEndMs });
    return { ...index, dataAvailabilityReason: "available", actionCounts: { ...index.actionCounts, total },
      materializer: { materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION, sourceFingerprint: "source_current", publishedAtMs: nowMs } };
  }
  const setIndex = (index: Record<string, unknown>) => detailState.documents.set(`${USER_INDEX_COLLECTIONS.userTrackingIndexes}/${detailState.userId}`, index);
  async function getDetail() {
    return actualDetailGet(new NextRequest(`http://localhost/api/admin/user/${detailState.userId}`), { params: Promise.resolve({ userId: detailState.userId }) });
  }
  async function renderDetail() {
    const view = render(React.createElement(AdminUserAnalyticsPage));
    const block = await waitFor(() => {
      const value = view.container.querySelector("[data-individual-user-metric-state]");
      expect(value).not.toBeNull();
      return value!;
    });
    return { view, block, activity: block.querySelector("[data-admitted-activity-state]") };
  }
  function summaryText(view: ReturnType<typeof render>, label: string) {
    const name = [...view.container.querySelectorAll("p")].find(element => element.textContent === label);
    expect(name).toBeTruthy();
    return name!.parentElement!.textContent;
  }
  beforeEach(() => {
    detailState.documents.clear(); detailState.reads.length = 0; detailState.userId = "detail_subject";
    detailState.guard.mockReset().mockResolvedValue({ caller: { uid: "verified_admin_fixture", isAdmin: true } });
    detailState.reportIssue.mockClear(); detailState.authFetch.mockReset().mockImplementation(getDetail);
    vi.spyOn(Date, "now").mockReturnValue(nowMs);
    vi.stubEnv("USER_INDEX_SOURCE_FINGERPRINT", "source_current");
    detailState.documents.set(`users/${detailState.userId}`, subject());
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("serves the saved admitted count through the actual GET and actual source block, with its14-day dates", async () => {
    setIndex(currentIndex());
    const { view, block, activity } = await renderDetail();
    expect(activity).toHaveAttribute("data-admitted-activity-state", "available");
    expect(activity).toHaveTextContent("Recorded activity: 1 admitted activity record");
    expect(activity).toHaveTextContent("does not establish detailed metric or all-history coverage");
    expect([...activity!.querySelectorAll("time")].map(element => element.dateTime)).toEqual([new Date(windowStartMs).toISOString(), new Date(windowEndMs).toISOString()]);
    expect(block).toHaveAttribute("data-individual-user-metric-state", "bridge_missing");
    expect(summaryText(view, "Actions")).not.toMatch(/^Actions\d/);
    expect(detailState.authFetch).toHaveBeenCalledTimes(1);
    expect(detailState.reads.filter(read => read.path === `${USER_INDEX_COLLECTIONS.userTrackingIndexes}/${detailState.userId}`)).toHaveLength(1);
    expect(detailState.guard).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ auth: "admin", scopeToCaller: true }));
  });

  it("shows an exact empty admitted window without labeling detailed actions, views or watch as zero", async () => {
    setIndex(currentIndex(0));
    const { view, activity } = await renderDetail();
    expect(activity).toHaveTextContent("Recorded activity: 0 admitted activity records");
    for (const label of ["Actions", "Views", "Auth", "Watch time", "Last seen"]) {
      expect(summaryText(view, label)).toContain("Detailed metrics unavailable");
      expect(summaryText(view, label)).not.toMatch(/(?:Proven zero|0m|\b0\b)$/);
    }
  });

  it.each([
    { label: "foreign stored UID", change: { userId: "foreign_user" }, reason: "identity_mismatch" },
    { label: "old version", change: { materializer: { materializerVersion: "old", sourceFingerprint: "source_current", publishedAtMs: nowMs } }, reason: "materializer_proof_missing" },
    { label: "foreign fingerprint", change: { materializer: { materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION, sourceFingerprint: "other", publishedAtMs: nowMs } }, reason: "materializer_proof_missing" },
    { label: "old window", change: { sourceWindowStartMs: windowStartMs - 900_001, sourceWindowEndMs: windowEndMs - 900_001 }, reason: "materializer_stale" },
    { label: "privacy-limited coverage", change: { dataAvailabilityReason: "privacy_limited" }, reason: "privacy_limited" },
    { label: "incomplete coverage", change: { dataAvailabilityReason: "source_disagreement" }, reason: "source_incomplete" },
    { label: "malformed count", change: { actionCounts: { total: "1" } }, reason: "count_invalid" },
  ])("keeps $label unavailable through actual GET and actual rendering", async ({ change, reason }) => {
    setIndex({ ...currentIndex(), ...change });
    const { activity } = await renderDetail();
    expect(activity).toHaveAttribute("data-admitted-activity-state", reason);
    expect(activity).toHaveTextContent(`Recorded activity unavailable: ${reason}`);
    expect(activity).not.toHaveTextContent("1 admitted activity record");
    expect(activity!.querySelectorAll("time")).toHaveLength(0);
  });

  it.each([
    { label: "unknown current privacy", privacySettings: undefined },
    { label: "declined behavioral consent", privacySettings: { consentMode: "necessary_only" } },
    { label: "GPC overriding a full mode", privacySettings: { consentMode: "full_behavioral", globalPrivacyControl: true, honorGlobalPrivacyControl: true } },
  ])("keeps the mixed person count unavailable for $label while retaining the existing response", async ({ privacySettings }) => {
    detailState.documents.set(`users/${detailState.userId}`, { ...subject(), privacySettings });
    setIndex(currentIndex());
    const response = await getDetail();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.analytics.individualMetricTruth).toMatchObject({ admittedActivity: null, admittedActivityUnavailableReason: "privacy_limited", valuesDisplayable: false });
    expect(body.analytics).toHaveProperty("grossRevenueUsd");
    expect(body.analytics).toHaveProperty("watchSecondsTotal");
    expect(body).toHaveProperty("transactions");
  });

  it("retains independent legacy observed fields without replacing them with the bounded activity count", async () => {
    setIndex(currentIndex());
    detailState.documents.set(`analytics_users_rollup/${detailState.userId}`, { eventCount: 8, viewCount: 3 });
    const body = await (await getDetail()).json();
    expect(body.analytics).toMatchObject({ eventCount: 8, viewCount: 3, individualMetricTruth: { valuesDisplayable: true, admittedActivity: { recordCount: 1 } } });
  });

  it("recovers on an actual page remount when the existing stored index becomes available", async () => {
    const first = await renderDetail();
    expect(first.activity).toHaveAttribute("data-admitted-activity-state", "source_missing");
    first.view.unmount();
    setIndex(currentIndex());
    const second = await renderDetail();
    expect(second.activity).toHaveTextContent("Recorded activity: 1 admitted activity record");
    expect(detailState.authFetch).toHaveBeenCalledTimes(2);
    expect(detailState.reads.filter(read => read.path === `${USER_INDEX_COLLECTIONS.userTrackingIndexes}/${detailState.userId}`)).toHaveLength(2);
  });

  it("does not render a foreign response projection for the currently selected UID", async () => {
    setIndex(currentIndex());
    const body = await (await getDetail()).json();
    if (body.analytics.individualMetricTruth.admittedActivity) body.analytics.individualMetricTruth.admittedActivity.userId = "foreign_user";
    detailState.authFetch.mockResolvedValue(NextResponse.json(body));
    const { activity } = await renderDetail();
    expect(activity).toHaveAttribute("data-admitted-activity-state", "identity_mismatch");
    expect(activity).not.toHaveTextContent("1 admitted activity record");
  });

  it("preserves the Admin guard before source reads and recovers via a fresh accepted request", async () => {
    setIndex(currentIndex());
    detailState.guard.mockRejectedValueOnce(Object.assign(new Error("permission_blocked"), { status: 403 }));
    expect((await getDetail()).status).toBe(403);
    expect(detailState.reads).toHaveLength(0);
    const recovered = await (await getDetail()).json();
    expect(recovered.analytics.individualMetricTruth.admittedActivity).toMatchObject({ userId: detailState.userId, recordCount: 1 });
  });
});

describe("actual Detail masthead missing-source fixture", () => {
  it("keeps numeric fixture balance and empty unlocks unavailable when sourceAvailable is false", () => {
    const view = render(React.createElement(AdminUserDetailMasthead, {
      user: { uid: "fixture", username: "fixture", displayName: "Fixture", role: "user", createdAt: 1_735_689_600_000, gumDropsBalance: 0, unlockedContent: [] } as any,
      joinedLabel: "Not loaded", onBack: vi.fn(), sourceAvailable: false,
    }));
    expect(view.getAllByText("No source", { exact: true })).toHaveLength(2);
    expect(view.queryByText("0 GD", { exact: true })).toBeNull();
    expect(view.queryByText("0 unlocked", { exact: true })).toBeNull();
  });
});
