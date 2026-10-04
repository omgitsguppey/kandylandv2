// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Activity } from "lucide-react";
import { useState as useMonitoringFilterState } from "react";
import { DebugTabMonitoring } from "@/app/admin/debug/components/DebugTabMonitoring";
import { ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS, type AdminDebugRouteRuntimeFilter } from "@/lib/admin-debug-preferences";
import { filterAdminDebugRouteRuntimeHealth } from "@/lib/admin-debug-route-runtime";
import type { RouteRuntimeHealthItem } from "@/lib/route-runtime-health";

import { afterEach, describe, expect, it, vi } from "vitest";

import { MetricCard, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { SectionRangeControl } from "@/app/admin/analytics/AnalyticsHelpers";
import { AdminAnalyticsContentConversionSection } from "@/app/admin/analytics/components/AdminAnalyticsContentConversionSection";
import { buildAdminAnalyticsContentConversionModel } from "@/lib/admin-analytics-content-conversion";
import { DebugControlTowerBusinessTruth } from "@/app/admin/debug/components/DebugControlTowerBusinessTruth";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import { Pill, StatCard, Section } from "@/app/admin/debug/components/DebugPrimitives";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminDebugControlCanvas } from "@/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas";
import { AdminRosterWorkspace } from "@/components/creative-tim/kandydrops/admin-roster/AdminRosterWorkspace";
import { AdminUserMetricCard, AdminUserDetailMasthead, AdminUserDirectory, type AdminUserDirectoryRecord } from "@/components/creative-tim/kandydrops/admin-users/AdminUsersOperations";
import type { Drop, UserProfile } from "@/types/db";
import type { AdminOverviewActivityItem, AdminOverviewResponse, AdminOverviewTransactionRecord } from "@/lib/admin-overview";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { TopDropsTable } from "@/components/Admin/TopDropsTable";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";

const homeTelemetry = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/telemetry", () => homeTelemetry);
vi.mock("@/lib/firebase-data", () => ({ db: {}, rtdb: {}, storage: {} }));

afterEach(() => { cleanup(); vi.useRealTimers(); homeTelemetry.trackEvent.mockClear(); });

describe("Admin mobile component behavior", () => {
  const businessSnapshot: AdminUserTruthSnapshot = {
    totalUsers: 0, activeUsers: 0, returnedLast7Days: 0, onboardedUsers: 0,
    verifiedUsers: 0, pushEnabledUsers: 0, trackedUnwraps: 0,
    verifiedPurchases: 0, totalRevenueUsd: 0, validWatchTimeMs: 0,
    sourceFreshness: "live", generatedAt: Date.now(), sourceTruth: "canonical",
    confidenceScore: 100, sourceLabel: "Bounded controlled source",
    sourceTruthBreakdown: { users: "canonical", watchTime: "canonical", purchases: "canonical", revenue: "canonical", unwraps: "canonical" },
    issues: [],
  };
  it("does not inherit live ops-health or zero metrics when canonical business source is missing", () => {
    const {container}=render(<DebugControlTowerBusinessTruth truthState="live" businessSnapshot={{...businessSnapshot,sourceFreshness:"unavailable",sourceTruth:"blocked"}} />);
    const source=container.querySelector('[data-debug-report-source="canonical-business-truth"]') as HTMLElement;
    expect(source).toHaveAttribute("data-business-truth-status","source_missing_actionable");
    expect(within(source).queryAllByText("0",{exact:true})).toHaveLength(0);
    expect(within(source).getAllByText("No source",{exact:true})).toHaveLength(6);
    expect(within(source).queryByText("$0",{exact:true})).toBeNull();
    expect(within(source).queryByText("0m",{exact:true})).toBeNull();
    expect(within(source).getByText("Business truth source is missing or unavailable.")).toBeVisible();
  });
  it("restores verified business zeroes and their canonical source explanation after missing-source recovery", () => {
    const {container,rerender}=render(<DebugControlTowerBusinessTruth truthState="live" businessSnapshot={{...businessSnapshot,sourceFreshness:"unavailable",sourceTruth:"blocked"}} />);
    rerender(<DebugControlTowerBusinessTruth truthState="unavailable" businessSnapshot={businessSnapshot} />);
    const source=container.querySelector('[data-debug-report-source="canonical-business-truth"]') as HTMLElement;
    expect(source).toHaveAttribute("data-business-truth-status","healthy_current");
    expect(within(source).getAllByText("0",{exact:true})).toHaveLength(3);
    expect(within(source).getByText("$0",{exact:true})).toBeVisible();
    expect(within(source).getByText("0m",{exact:true})).toBeVisible();
    expect(within(source).queryByText("No source",{exact:true})).toBeNull();
    expect(within(source).getByText("Revenue source: admin snapshot canonical")).toBeVisible();
    expect(within(source).getByText("Watch source: watch time unavailable")).toBeVisible();
  });

  it("keeps the selected content grouping aligned with its rows through disclosure recovery", () => {
    const contentConversionModel = buildAdminAnalyticsContentConversionModel({
      selectedRange: "7d",
      loading: false,
      response: { contentConversionState: {
        generatedAtUtc: "2026-10-02T00:00:00.000Z", range: "7d",
        sourceState: "live", sourceTruth: "drop_metadata_plus_telemetry",
        totalPreviews: 10, totalUnlocks: 2, warnings: [],
        rows: (["contentType", "flavor"] as const).map((dimension) => ({
          groupKey: dimension, groupLabel: dimension === "contentType" ? "Video sample" : "Chocolate sample",
          groupingDimension: dimension, dropCount: 1, previewCount: 10, unlockCount: 2,
          unlockRatePct: 20, sourceTruth: "drop_metadata_plus_telemetry", freshnessState: "live",
          conversionState: "healthy", explanation: "Bounded source window",
        })),
      } },
    });
    render(<AdminAnalyticsContentConversionSection
      contentConversionModel={contentConversionModel}
      renderSectionRangeControl={() => <></>}
      formatPercent={(value) => `${value * 100}%`}
      formatDuration={(value) => `${value}s`}
      formatAbsoluteDateTime={(value) => String(value)}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Show Content Conversion details" }));
    const contentType = screen.getByRole("button", { name: "Content type" });
    const flavor = screen.getByRole("button", { name: "Flavor" });
    expect(contentType).toHaveAttribute("aria-pressed", "true");
    expect(flavor).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Video sample")).toBeVisible();
    fireEvent.click(flavor);
    expect(flavor).toHaveAttribute("aria-pressed", "true");
    expect(contentType).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Video sample")).toBeNull();
    expect(screen.getByText("Chocolate sample")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Hide Content Conversion details" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Content Conversion details" }));
    expect(screen.getByRole("button", { name: "Flavor" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Chocolate sample")).toBeVisible();
  });

  it("keeps a range change bound to its section and disables selection while saving", () => {
    const change = vi.fn();
    const { rerender } = render(<SectionRangeControl sectionKey="commerceSnapshot" range="all" onChange={change} />);
    const picker = screen.getByRole("combobox", { name: "commerceSnapshot range" });
    expect(picker).toHaveValue("all");
    fireEvent.change(picker, { target: { value: "7d" } });
    expect(change).toHaveBeenCalledWith("commerceSnapshot", "7d");
    rerender(<SectionRangeControl sectionKey="commerceSnapshot" range="7d" saving onChange={change} />);
    expect(picker).toHaveValue("7d");
    expect(picker).toBeDisabled();
  });

  it("respects a controlled operational panel and connects its disclosure to the real content", () => {
    const change = vi.fn();
    const { rerender } = render(<AdminDashboardModule title="Snapshot" open={false} onOpenChange={change}><p>Original source</p></AdminDashboardModule>);
    fireEvent.click(screen.getByRole("button", {name:"Expand Snapshot"}));
    expect(change).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledWith(true);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByText("Original source")).toBeNull();
    rerender(<AdminDashboardModule title="Snapshot" open onOpenChange={change}><p>Original source</p></AdminDashboardModule>);
    const collapse = screen.getByRole("button", {name:"Collapse Snapshot"});
    expect(collapse.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Original source").parentElement?.id).toBe(collapse.getAttribute("aria-controls"));
    fireEvent.click(collapse);
    expect(change).toHaveBeenLastCalledWith(false);
  });

  it("preserves a caller's default-open panel through close and reopen", () => {
    render(<AdminDashboardModule title="Current work" defaultOpen><p>Current detail</p></AdminDashboardModule>);
    fireEvent.click(screen.getByRole("button", {name:"Collapse Current work"}));
    expect(screen.queryByText("Current detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name:"Expand Current work"}));
    expect(screen.getByText("Current detail")).toBeVisible();
  });

  it("keeps disclosure actions hidden until details open and reconnects them after reopening", () => {
    const action = vi.fn();
    render(<SectionCard title="Revenue" icon={Activity} rightSlot={<button onClick={action}>Refresh revenue</button>}><p>Verified revenue detail</p></SectionCard>);
    expect(screen.queryByText("Verified revenue detail")).toBeNull();
    expect(screen.queryByRole("button", { name: "Refresh revenue" })).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show Revenue details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByText("Verified revenue detail").parentElement?.id).toBe(toggle.getAttribute("aria-controls"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh revenue" }));
    expect(action).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Hide Revenue details" }));
    expect(screen.queryByText("Verified revenue detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show Revenue details" }));
    expect(screen.getByRole("button", { name: "Refresh revenue" })).toBeEnabled();
  });

  it.each(["unavailable", "blocked"] as const)("does not print a numeric priority for a %s Debug source", (truthState) => {
    const select = vi.fn();
    render(<AdminDebugControlCanvas title="Debug" subtitle="Source review" statusLabel="No source" statusClassName="" statusTextClassName="" tabs={[{id:"source",label:"Source",icon:Activity},{id:"cost",label:"Cost",icon:Activity}]} activeTab="source" onTabChange={select} priorityAction={{label:"Pending decisions",value:0,meta:"Missing snapshot",truthState}} evidenceBoundary={<p>Original evidence</p>}><p>Active workstream</p></AdminDebugControlCanvas>);
    const metric = screen.getByText("Pending decisions").closest("[data-admin-metric-card-state]");
    expect(metric).toHaveAttribute("data-admin-metric-card-has-value", "false");
    expect(metric?.textContent).not.toMatch(/\b0\b/);
    expect(metric?.textContent).toContain("No source");
    const picker = screen.getByRole("combobox", { name: "Debug workstream" });
    expect(picker).toHaveValue("source");
    fireEvent.change(picker, { target: { value: "cost" } });
    expect(select).toHaveBeenCalledWith("cost");
    expect(screen.getByText("Original evidence").closest("details")).not.toHaveAttribute("open");
  });

  it("preserves a confirmed zero and Roster selection callbacks", () => {
    const select = vi.fn();
    render(<AdminRosterWorkspace eyebrow="Creators" title="Roster" subtitle="Review" tabs={[{key:"review",label:"Needs review"},{key:"approved",label:"Approved"}]} activeTab="review" onTabChange={select} metrics={[{label:"Confirmed queue",value:0,description:"Loaded snapshot"}]}><p>Creator decision</p></AdminRosterWorkspace>);
    expect(screen.getByText("0")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Creator review" }), { target: { value: "approved" } });
    expect(select).toHaveBeenCalledWith("approved");
    expect(screen.getByText("Creator decision")).toBeInTheDocument();
  });

  it("keeps absent account values distinct from loaded zero without changing the back action", () => {
    const back = vi.fn();
    const user = { uid:"user-proof",role:"user",displayName:"Account" } as UserProfile;
    const { rerender } = render(<AdminUserDetailMasthead user={user} joinedLabel="Not recorded" onBack={back} />);
    expect(screen.getAllByText("No source")).toHaveLength(2);
    expect(screen.queryByText("0 GD")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to roster" }));
    expect(back).toHaveBeenCalledOnce();
    rerender(<AdminUserDetailMasthead user={{...user,gumDropsBalance:0,unlockedContent:[]}} joinedLabel="Today" onBack={back} />);
    expect(screen.getByText("0 GD")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("No source")).toBeNull();
  });

  it("does not turn a fixture's placeholder zero into account source evidence", () => {
    const user = { uid:"fixture-proof", role:"user", displayName:"Fixture", email:"fixture@example.invalid", photoURL:"", createdAt:1, gumDropsBalance:0, unlockedContent:[] } as UserProfile;
    render(<AdminUserDetailMasthead user={user} sourceAvailable={false} joinedLabel="Fixture" onBack={vi.fn()} />);
    expect(screen.getAllByText("No source")).toHaveLength(2);
    expect(screen.queryByText("0 GD")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });
});


describe("Analytics metric content and disclosure behavior", () => {
  it.each(["header", "footer"] as const)("keeps a %s source badge attached to the canonical value and explanation", (badgePlacement) => {
    const { container } = render(<MetricCard label="Confirmed revenue" value="$12.34" hint="Selected server ledger window" icon={Activity} truthState="unavailable" statusBadgeLabel="No source" badgePlacement={badgePlacement} />);
    expect(screen.getByText("Confirmed revenue")).toBeVisible();
    expect(screen.getByText("$12.34")).toBeVisible();
    expect(screen.getByText("Selected server ledger window")).toBeVisible();
    expect(screen.getByText("No source").closest('[data-admin-analytics-truth-state="unavailable"]')).toBe(container.firstElementChild);
  });
  it("hides only an intentionally hidden primary badge while retaining unavailable truth and value", () => {
    const { container } = render(<MetricCard label="Revenue" value="No verified snapshot yet" icon={Activity} truthState="unavailable" statusBadgeLabel="No source" badgePlacement="hidden" />);
    expect(screen.queryByText("No source")).toBeNull();
    expect(screen.getByText("No verified snapshot yet")).toBeVisible();
    expect(container.firstElementChild).toHaveAttribute("data-admin-analytics-truth-state", "unavailable");
  });
  it("keeps the source explanation in a native disclosure without requiring hover", () => {
    render(<MetricCard label="Confirmed revenue" value="$12.34" icon={Activity} dictionaryTooltip="Revenue belongs to the server ledger." />);
    const summary = screen.getByText("About this metric").closest("summary");
    expect(summary).toHaveAttribute("aria-label", "About Confirmed revenue");
    expect(summary?.closest("details")).not.toHaveAttribute("open");
    const explanation = screen.getByText("Revenue belongs to the server ledger.");
    expect(explanation).not.toBeVisible();
    fireEvent.click(summary!);
    expect(explanation).toBeVisible();
    fireEvent.click(summary!);
    expect(explanation).not.toBeVisible();
  });
});


describe("Admin Home actual bounded record and range behavior", () => {
  const drops: Drop[] = Array.from({ length: 12 }, (_, index) => ({
    id: "sample-drop-" + (index + 1), title: "Sample drop " + (index + 1), description: "Controlled source record",
    status: index === 1 ? "scheduled" : "active", unlockCost: 100 + index * 25,
    imageUrl: "/sample-cover.png", contentUrl: "/safe-sampled-content", validFrom: 0, validUntil: 0,
    totalUnlocks: 120 - index * 7, totalClicks: 100 - index * 3,
  }));

  it("binds the selected range to canonical summaries and resets Top Drops paging", () => {
    const chartData: AdminOverviewResponse["chartData"] = Array.from({ length: 36 }, (_, index) => ({
      key: "day-" + index, date: "Day " + (index + 1), revenue: index + 1, unwraps: index + 2, purchases: 1,
    }));
    const trendSummary: AdminOverviewResponse["trendSummary"] = {
      windowDays: 30, currentStartDayKey: "day-6", currentEndDayKey: "day-35", previousStartDayKey: "day-0", previousEndDayKey: "day-5",
      currentRevenueCents: 12000, previousRevenueCents: 10000, currentUnwraps: 48, previousUnwraps: 24,
      currentPurchases: 24, previousPurchases: 12, currentNewUsers: 123, previousNewUsers: 10,
      revenueActiveDays: 30, unwrapActiveDays: 30, bestRevenueDay: { key: "day-35", label: "Day 36", value: 36 },
      bestUnwrapDay: { key: "day-35", label: "Day 36", value: 37 }, topUnlockDrop: { dropId: "sample-drop-1", title: "Sample drop 1", unwraps: 120 },
    };
    render(<AdminAnalyticsCharts chartData={chartData} trendSummary={trendSummary} topDrops={drops} truthLabel="Verified bounded cache" truthVariant="cached" />);
    fireEvent.click(screen.getByRole("button", { name: "Next top drops page" }));
    expect(screen.getByText("Showing 6-10 of 12")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    expect(screen.getByRole("button", { name: "7d" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30d" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("$231.00")).toBeVisible();
    expect(screen.getByText("238")).toBeVisible();
    expect(screen.getByText("Showing 1-5 of 12")).toBeVisible();
    expect(homeTelemetry.trackEvent).toHaveBeenCalledWith("admin_revenue_range_changed", { range: "7d" });
    expect(homeTelemetry.trackEvent).toHaveBeenCalledWith("admin_chart_view_changed", { chart: "revenue_unwraps", range: "7d" });
  });

  it("keeps Top Drops search debounced, recovers empty results and preserves source fields", async () => {
    vi.useFakeTimers();
    render(<TopDropsTable drops={drops} timeRangeKey="30d" />);
    const search = screen.getByRole("textbox", { name: "Search top drops" });
    fireEvent.change(search, { target: { value: "sample-drop-12" } });
    expect(screen.getByText("Showing 1-5 of 12")).toBeVisible();
    await act(async () => { vi.advanceTimersByTime(299); });
    expect(screen.getByText("Showing 1-5 of 12")).toBeVisible();
    await act(async () => { vi.advanceTimersByTime(1); });
    const records = within(screen.getByRole("list", { name: "Top drops ranked by all-time unwraps" })).getAllByRole("listitem");
    expect(records).toHaveLength(1);
    expect(within(records[0]).getByText("Sample drop 12")).toBeVisible();
    expect(within(records[0]).getByText("sample-drop-12")).toBeVisible();
    expect(within(records[0]).getByText("43")).toBeVisible();
    expect(within(records[0]).getByText("67")).toBeVisible();
    expect(within(records[0]).getByText("375 GD")).toBeVisible();
    fireEvent.change(search, { target: { value: "does-not-exist" } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.getByText("No drops match this search.")).toBeVisible();
    fireEvent.change(search, { target: { value: "" } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.getByText("Showing 1-5 of 12")).toBeVisible();
  });

  it("keeps transaction amount, currency, identity and descriptions together across bounded pages", () => {
    const transactions: AdminOverviewTransactionRecord[] = Array.from({ length: 8 }, (_, index) => ({
      id: "sample-transaction-" + index, userId: index === 2 ? "" : "sample-user-" + index, username: index === 2 ? undefined : "sample-user-" + index,
      type: index === 0 ? "purchase_currency" : index % 2 ? "unlock_content" : "daily_reward", amount: index === 0 ? 550 : index % 2 ? -75 : 100,
      grossRevenueCents: index === 0 ? 500 : undefined, timestamp: 1790985600000 + index, sourceScope: "overview_snapshot",
      description: "Distinct controlled transaction " + index,
    }));
    render(<RecentTransactionsPanel transactions={transactions} />);
    const list = screen.getByRole("list", { name: "Recent transaction records" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    const purchase = within(list).getAllByRole("listitem")[0];
    expect(within(purchase).getByText("+550")).toBeVisible();
    expect(within(purchase).getByText("$5.00")).toBeVisible();
    expect(within(purchase).getByText("@sample-user-0")).toBeVisible();
    expect(within(purchase).getByText("Distinct controlled transaction 0")).toBeVisible();
    expect(within(list).getByText("Guest activity")).toBeVisible();
    const navigation = within(screen.getByRole("navigation", { name: "Recent transactions pagination" }));
    expect(navigation.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(navigation.getByRole("button", { name: "Next page" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).queryByText("Distinct controlled transaction 0")).toBeNull();
    expect(within(list).getByText("Distinct controlled transaction 7")).toBeVisible();
    expect(navigation.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("keeps operator, target, detail, age and source meaning separate through activity paging", () => {
    const activity: AdminOverviewActivityItem[] = Array.from({ length: 8 }, (_, index) => ({
      id: "sample-activity-" + index, domain: "admin", source: index % 2 ? "analytics_event_facts" : "transactions",
      type: "admin_adjustment", label: "Controlled action " + index, actorLabel: "Operator " + index,
      targetLabel: index === 0 ? undefined : "Target " + index, detail: "Distinct detail " + index,
      timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000,
    }));
    render(<AdminActivityLogPanel activity={activity} truthNote="Cached bounded source" />);
    const list = screen.getByRole("list", { name: "Admin activity records" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).queryByText("Target")).toBeNull();
    expect(within(rows[1]).getByText("Operator 1").closest("dd")?.textContent).toBe("Operator 1");
    expect(within(rows[1]).getByText("Target 1").closest("dd")?.textContent).toBe("Target 1");
    expect(within(rows[1]).getByText("Distinct detail 1").closest("dd")?.textContent).toBe("Distinct detail 1");
    expect(screen.getByText("Cached")).toBeVisible();
    expect(screen.getByText(/Latest admin action:/)).toHaveTextContent("15 days ago");
    const navigation = within(screen.getByRole("navigation", { name: "Admin activity pagination" }));
    fireEvent.click(navigation.getByRole("button", { name: "Next page" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("Controlled action 7")).toBeVisible();
    expect(within(list).queryByText("Controlled action 0")).toBeNull();
    expect(navigation.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("keeps empty transaction and activity evidence source-qualified rather than displaying zero records as healthy", () => {
    render(<><RecentTransactionsPanel transactions={[]} /><AdminActivityLogPanel activity={[]} truthNote="Cached bounded source" /></>);
    expect(screen.getByText("No recent transactions are available from the current source.")).toBeVisible();
    expect(screen.getByText("No admin actions were found in the current source window.")).toBeVisible();
    expect(screen.queryByRole("list", { name: "Recent transaction records" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Admin activity records" })).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });
});


describe("Debug source value and shared disclosure behavior", () => {
  it.each(["unavailable", "blocked", "loading"] as const)("keeps %s numeric source counts distinct from observed zero", (truthState) => {
    render(<Pill label="Sample count" value={0} truthState={truthState} />);
    expect(screen.queryByText("0", { exact: true })).toBeNull();
    expect(screen.getAllByText("No source", { exact: true }).length).toBeGreaterThan(0);
    expect(screen.getByText("Sample count")).toBeVisible();
  });
  it.each(["live", "cached", "refreshing", "degraded"] as const)("preserves a source-backed zero in %s state", (truthState) => {
    render(<Pill label="Sample count" value={0} truthState={truthState} />);
    expect(screen.getByText("0", { exact: true })).toBeVisible();
  });
  it("retains unavailable source metadata strings and their badge without treating them as numeric samples", () => {
    render(<Pill label="Runtime verification" value="separate verification required" truthState="unavailable" />);
    expect(screen.getByText("separate verification required")).toBeVisible();
    expect(screen.getByText("No source", { exact: true })).toBeVisible();
  });
  it("keeps an unavailable StatCard metric distinct from zero while retaining its explanation", () => {
    const copy = { operatorSummary: "Current source is missing.", whyItMatters: "It cannot clear the lane.", recommendedNextCheck: "Load the owning source.", technicalEvidence: "Typed source_missing.", sourceDetails: "Sample window unknown." } as Parameters<typeof StatCard>[0]["copy"];
    render(<StatCard label="Source metric" value={0} truthState="unavailable" copy={copy} />);
    expect(screen.queryByText("0", { exact: true })).toBeNull();
    const summary = screen.getByText("Explain this");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(screen.getByText("Current source is missing.")).toBeVisible();
    expect(screen.getByText("Typed source_missing.")).toBeVisible();
  });
  it("preserves a Debug section's closed summary and reconnects the actual disclosure content", () => {
    render(<Section title="Current source" subtitle="Original source boundary" summary={<Pill label="Writer count" value={3} truthState="live" />} defaultOpen={false}><p>Protected source detail</p></Section>);
    expect(screen.getByText("Writer count")).toBeVisible();
    expect(screen.getByText("3", {exact:true})).toBeVisible();
    expect(screen.queryByText("Protected source detail")).toBeNull();
    const expand=screen.getByRole("button",{name:"Expand Current source"});
    fireEvent.click(expand);
    const collapse=screen.getByRole("button",{name:"Collapse Current source"});
    expect(screen.getByText("Protected source detail").parentElement?.id).toBe(collapse.getAttribute("aria-controls"));
    fireEvent.click(collapse);
    expect(screen.queryByText("Protected source detail")).toBeNull();
    expect(screen.getByText("Writer count")).toBeVisible();
    fireEvent.click(screen.getByRole("button",{name:"Expand Current source"}));
    expect(screen.getByText("Protected source detail")).toBeVisible();
  });
  it("does not toggle a closed panel when its independent summary action is activated", () => {
    const summaryAction=vi.fn();
    render(<AdminDashboardModule title="Source summary" summary={<button type="button" onClick={summaryAction}>Inspect summary</button>}><p>Source detail</p></AdminDashboardModule>);
    fireEvent.click(screen.getByRole("button",{name:"Inspect summary"}));
    expect(summaryAction).toHaveBeenCalledOnce();
    expect(screen.getByRole("button",{name:"Expand Source summary"})).toHaveAttribute("aria-expanded","false");
    expect(screen.queryByText("Source detail")).toBeNull();
  });
});

const monitoringNow = Date.UTC(2026, 9, 3, 12, 0, 0);
function monitoringProps(overrides: Record<string, any> = {}) {
  const sampledRoute: RouteRuntimeHealthItem = { key: "support/threads:GET", routeName: "support/threads", method: "GET", title: "Support inbox runtime", slowThresholdMs: 800, successCount: 5, clientErrorCount: 0, serverErrorCount: 1, slowCount: 0, averageLatencyMs: 140, maxLatencyMs: 220, lastLatencyMs: 120, lastResult: "server_error", lastStatusCode: 503, lastErrorMessage: "Controlled source failed", firstObservedAtMs: monitoringNow - 10000, updatedAtMs: monitoringNow - 500, lastSuccessAtMs: monitoringNow - 5000, lastClientErrorAtMs: 0, lastServerErrorAtMs: monitoringNow - 500 };
  const routeRuntimeHealth: RouteRuntimeHealthItem[] = [sampledRoute, { ...sampledRoute, key: "chat/threads:GET", routeName: "chat/threads", title: "Native chat runtime", lastResult: "success", lastStatusCode: 200, serverErrorCount: 0, lastErrorMessage: null }, { ...sampledRoute, key: "creator/relationships:GET", routeName: "creator/relationships", title: "Unseen relationship runtime", successCount: 0, serverErrorCount: 0, lastResult: "no_sample", updatedAtMs: 0, lastLatencyMs: 0, lastSuccessAtMs: 0, lastServerErrorAtMs: 0 }];
  const queueRuntimeSummary = { jobHeartbeats: { total: 0, stale: 0, failed: 0, running: 0 }, warnings: { total: 0, failed: 0, degraded: 0, fallback: 0, legacyAdapterUses: 0, queueDriftWarnings: 0 }, missingNotificationOutcomes: 0, heartbeatState: "missing_heartbeat", schedulerHeartbeat: {status:"missing"}, dispatchOutcomes:{status:"observed_current"}, continuityStatus:"degraded_missing_heartbeat", warningReasons:["scheduler_heartbeat_missing"], nextAction:"Inspect retained heartbeat evidence before declaring continuity.", queueDrift:{sourceLoaded:false,status:"unknown"}, liveStatusAllowed:false };
  const data = { section:"all", stats:{ orchestrationEvents:0, orchestrationLowConfidence:0, receiptsLast7d:0 }, orchestration:{events:[]}, recentTaskEvents:[],taskRollups:[],dailyTaskSeries:[],recentReceipts:[],receiptSummary:[],opsHealth:{runtime:{gaPropertyConfigured:true,vapidConfigured:false,databaseUrlConfigured:true,navigationSessionSigningReady:true,projectId:"controlled-maintenance-project",warnings:["push_config_missing"]}} };
  const recentTransactions = [{id:"controlled-payment", userId:"controlled-full-private-uid", userDisplayName:"River admin",shortUserId:"river…uid",userIdRedacted:"river…uid",adminUserHref:"/admin/user/controlled-member",userIdentityState:"resolved",amount:550,amountDisplay:"550 GD",unit:"GD",direction:"credit",type:"gumdrop_purchase",typeLabel:"Package purchase",sourceOfFunds:"paid_purchase",sourceLabel:"Paid-source GumDrops",description:"Controlled ledger entry; purchase bonus remains paid source.",continuityLabel:"Bounded ledger sample",timestamp:monitoringNow,createdAtUtc:"2026-10-03T12:00:00.000Z",timestampLabel:"Oct 3, 12:00 PM"}];
  const notificationDispatchOutcomes=[{stable_id:"controlled-outcome",queueKind:"drop_activation",dropId:"controlled-drop",shortDropId:"control…drop",dropTitle:"A long controlled drop title for an ordinary queue row",creatorName:"Controlled creator",dropMetadataState:"resolved",dropMetadataSource:"controlled_existing_contract",dropMetadataConfidence:"exact",dropIdentityState:"resolved",schedulerKeyParsed:true,schedulerKey:"queue:controlled-drop:2026-10-03",outcome:"skipped",status:"skipped",scheduledForUtc:"2026-10-03T12:00:00.000Z",lastOutcomeAtUtc:"2026-10-03T12:00:01.000Z",recipientCount:0,notificationCount:0,adminDropHref:"/admin/drops?drop=controlled-drop",adminCreatorHref:"/admin/user/controlled-creator"}];
  return {data,user:{uid:"controlled-admin-private-uid",email:"controlled@example.invalid"},userProfile:{role:"admin",username:"An administrator with a long readable display name"},isCompactViewport:false,routeRuntimeHealthSummary:{fail:1,warn:0,stale:0},nativeChatRouteRuntimeSummary:{},compatibilityChatRouteRuntimeSummary:{},recentTransactions,queueRuntimeSummary,queueJobHeartbeats:[],runtimeWarnings:[],notificationDispatchOutcomes,routeRuntimeFilter:"all" as const,routeRuntimeHealth,filteredRouteRuntimeHealth:routeRuntimeHealth,nativeChatRouteRuntimeHealth:[],nativeChatRouteRuntimeRates:{},compatibilityChatRouteRuntimeHealth:[],compatibilityChatRouteRuntimeRates:{},onRouteRuntimeFilterChange:vi.fn(),...overrides};
}
function monitoringSection(title:string) { return screen.getByRole("heading", {name:title}).closest("section") as HTMLElement; }

describe("Monitoring actual body controls and source boundaries", () => {
  afterEach(() => vi.useRealTimers());
  it("names the actual route selector and sends every existing filter to its callback", () => {
    vi.useFakeTimers(); vi.setSystemTime(monitoringNow);const change=vi.fn();render(<DebugTabMonitoring {...monitoringProps({onRouteRuntimeFilterChange:change})}/>);
    const selector=screen.getByRole("combobox",{name:"Route filter"});
    for(const filter of ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS) { fireEvent.change(selector,{target:{value:filter}});expect(change).toHaveBeenLastCalledWith(filter); }
  });
  it("uses one commerce record with a canonical profile destination and a closed private drilldown", () => {
    vi.useFakeTimers();vi.setSystemTime(monitoringNow);render(<DebugTabMonitoring {...monitoringProps()}/>);
    const section=monitoringSection("Recent transactions");const links=within(section).getAllByRole("link",{name:"River admin"});expect(links).toHaveLength(1);expect(links[0]).toHaveAttribute("href","/admin/user/controlled-member");
    expect(within(section).getAllByText("550 GD",{exact:true})).toHaveLength(1);expect(within(section).getByText("Paid-source GumDrops")).toBeVisible();
    const privateDetails=within(section).getByText("Transaction details").closest("details");expect(privateDetails).not.toHaveAttribute("open");expect(privateDetails).toHaveTextContent("controlled-full-private-uid");
  });
  it("retains manual filter selection through real route disclosure close and reopen", () => {
    vi.useFakeTimers();vi.setSystemTime(monitoringNow);
    function Surface(){const[filter,setFilter]=useMonitoringFilterState<AdminDebugRouteRuntimeFilter>("all");const props=monitoringProps();return <DebugTabMonitoring {...props} routeRuntimeFilter={filter} filteredRouteRuntimeHealth={filterAdminDebugRouteRuntimeHealth(props.routeRuntimeHealth,filter)} onRouteRuntimeFilterChange={setFilter}/>;}
    render(<Surface/>);fireEvent.change(screen.getByRole("combobox",{name:"Route filter"}),{target:{value:"failing"}});expect(screen.getByText("Support inbox runtime")).toBeVisible();expect(screen.queryByText("Native chat runtime")).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Collapse Tracked route runtime"}));fireEvent.click(screen.getByRole("button",{name:"Expand Tracked route runtime"}));expect(screen.getByRole("combobox",{name:"Route filter"})).toHaveValue("failing");expect(screen.getByText("Support inbox runtime")).toBeVisible();
    fireEvent.change(screen.getByRole("combobox",{name:"Route filter"}),{target:{value:"all"}});expect(screen.getByText("Native chat runtime")).toBeVisible();
  });
  it("shows dispatch outcomes while retaining missing heartbeat and non-live continuity meaning", () => {
    render(<DebugTabMonitoring {...monitoringProps()}/>);const section=monitoringSection("Queue runtime continuity");expect(section.querySelector('[data-queue-continuity-status]')).toHaveAttribute("data-queue-continuity-status","degraded_missing_heartbeat");expect(within(section).getByText("No heartbeat records, but dispatch outcome records exist. Treat heartbeat evidence as missing while outcome rows remain readable.")).toBeVisible();
    expect(within(section).getByRole("link",{name:"View drop"})).toHaveAttribute("href","/admin/drops?drop=controlled-drop");expect(within(section).getByRole("link",{name:"View creator"})).toHaveAttribute("href","/admin/user/controlled-creator");expect(within(section).getByText("Raw queue details").closest("details")).not.toHaveAttribute("open");
  });
  it("preserves unseen latency and sample meaning rather than healthy numeric zero", () => {
    vi.useFakeTimers();vi.setSystemTime(monitoringNow);render(<DebugTabMonitoring {...monitoringProps()}/>);const row=screen.getByText("Unseen relationship runtime").closest('[data-route-runtime-has-sample]') as HTMLElement;expect(row).toHaveAttribute("data-route-runtime-has-sample","false");expect(within(row).queryAllByText("0",{exact:true})).toHaveLength(0);expect(within(row).getAllByText("—",{exact:true}).length).toBeGreaterThan(0);
  });
  it("does not turn deferred event detail into a loaded empty event sample", () => {
    render(<DebugTabMonitoring {...monitoringProps({data:{success:true,section:"summary",truthState:"deferred",deferredSections:["orchestration details"]}})}/>);const section=monitoringSection("Recent event flow");expect(section.querySelector('[data-event-flow-grouped-count]')).toHaveAttribute("data-event-flow-grouped-count","Not loaded");expect(within(section).getAllByText("Not loaded").length).toBeGreaterThan(0);expect(within(section).queryByText("No sample",{exact:true})).toBeNull();
  });
  it("distinguishes absent config evidence from a loaded missing config and recovers", () => {
    const{rerender}=render(<DebugTabMonitoring {...monitoringProps({data:{section:"summary",truthState:"deferred"}})}/>);fireEvent.click(screen.getByRole("button",{name:"Expand Admin session + config readiness"}));const source=monitoringSection("Admin session + config readiness");expect(source.querySelector('[data-admin-config-ga-state]')).toHaveAttribute("data-admin-config-ga-state","source_missing");expect(within(source).queryAllByText("Config missing",{exact:true})).toHaveLength(0);expect(within(source).queryByText("Config present, signing runtime not exercised",{exact:true})).toBeNull();expect(within(source).getByText("Signing config not loaded; runtime not exercised",{exact:true})).toBeVisible();
    rerender(<DebugTabMonitoring {...monitoringProps()}/>);expect(source.querySelector('[data-admin-config-ga-state]')).toHaveAttribute("data-admin-config-ga-state","configPresent");expect(source.querySelector('[data-admin-config-vapid-state]')).toHaveAttribute("data-admin-config-vapid-state","configMissing");expect(source.querySelector('[data-admin-prereq-runtime-verified]')).toHaveAttribute("data-admin-prereq-runtime-verified","false");expect(within(source).getByText("Session details").closest("details")).not.toHaveAttribute("open");
  });
  it("keeps loaded empty grouping as a sample state while honoring bounded zero counters", () => {
    render(<DebugTabMonitoring {...monitoringProps()}/>);const section=monitoringSection("Recent event flow");expect(section.querySelector('[data-event-flow-grouped-count]')).toHaveAttribute("data-event-flow-grouped-count","0");expect(within(section).getAllByText("No sample",{exact:true}).length).toBeGreaterThan(0);expect(within(section).getByText("Unique rows").closest("div")).toHaveTextContent("No sample");
  });
  it.each(["resolved", "fallback_uid", "missing"] as const)("renders canonical %s transaction identity in its one retained record", (state) => {
    const props=monitoringProps();render(<DebugTabMonitoring {...props} recentTransactions={props.recentTransactions.map(entry=>({...entry,userIdentityState:state}))}/>);
    const section=monitoringSection("Recent transactions");expect(section.querySelectorAll("[data-transaction-user-identity-state]")).toHaveLength(1);expect(section.querySelector("[data-transaction-user-identity-state]")).toHaveAttribute("data-transaction-user-identity-state",state);
    expect(within(section).getByText("Identity",{exact:true})).toBeVisible();expect(within(section).getByText(state,{exact:true})).toBeVisible();expect(within(section).getByText("Transaction details").closest("details")).not.toHaveAttribute("open");
  });

});

describe("Admin Users directory task composition", () => {
  function directoryBodyRecord(uid: string, overrides: Partial<AdminUserDirectoryRecord["behavior"]> = {}): AdminUserDirectoryRecord {
    return {
      user: { uid, displayName: "Shared display name", username: "record_" + uid, email: uid + "@example.test", photoURL: "", role: "user", status: "active", gumDropsBalance: 0, unlockedContent: [], createdAt: 1, securityFlags: { ripAttempts: 2 } } as UserProfile,
      joined: "Recorded join date", lastSeen: "Recorded activity", lastPurchase: "Recorded purchase", onboarding: { label: "Recorded onboarding", className: "" }, guestLinkLabel: "Recorded guest link",
      behavior: { loaded: true, engagement: "Recorded engagement", engagementReason: "Canonical engagement reason", value: "Recorded value", valueReason: "Canonical value reason", mathMode: "unavailable", mathVerdict: "unavailable", availability: "source_missing", issueCount: 1, consent: "minimal", lowConfidence: 1, activitySource: "No source", walletSource: "Recorded wallet", missingMetric: "Required activity source missing", activityEvents: "No source", unwraps: "No source", watchTime: "No source", source: "unavailable", confidence: "unknown", reviewDecision: null, ...overrides },
    };
  }
  function directoryBodyProps(records = [directoryBodyRecord("one"), directoryBodyRecord("two")]) {
    return { records, loading: false, searchQuery: "", selectedDetailUserId: null as string | null, getStatusColor: () => "", onEditUsername: vi.fn(), onEditBalance: vi.fn(), onViewHistory: vi.fn(), onLoadDetail: vi.fn(), onOpenContent: vi.fn(), onViewSecurity: vi.fn(), onPromoteCreator: vi.fn(), onChangeRole: vi.fn(), onToggleVerification: vi.fn(), onSetStatus: vi.fn() };
  }
  function directoryBodyRow(container: HTMLElement, uid: string) {
    const destination = container.querySelector('a[href="/admin/user/' + uid + '"]');
    expect(destination, "actual user navigation destination").not.toBeNull();
    return (destination!.closest("article") ?? destination!.closest("tr")) as HTMLElement;
  }
  it("renders one navigation destination and one canonical reason per actual user", () => {
    const props = directoryBodyProps(); const { container } = render(<AdminUserDirectory {...props} />);
    for (const record of props.records) {
      expect(container.querySelectorAll('a[href="/admin/user/' + record.user.uid + '"]')).toHaveLength(1);
      const row = directoryBodyRow(container, record.user.uid);
      expect(within(row).getAllByText("Engagement: Canonical engagement reason", { exact: true })).toHaveLength(1);
      expect(within(row).getAllByText("Value: Canonical value reason", { exact: true })).toHaveLength(1);
    }
  });
  it("keeps decision-critical status, consent, source and security review outside closed actions", () => {
    const props = directoryBodyProps(); const { container } = render(<AdminUserDirectory {...props} />);
    const row = directoryBodyRow(container, "two"); const summary = within(row).getByText("Account details and actions", { exact: true }); const details = summary.closest("details")!;
    expect(details).not.toHaveAttribute("open");
    for (const node of [within(row).getByText("active", { exact: true }), within(row).getByText("Source: unavailable / unknown", { exact: true }), within(row).getByText("Consent: minimal / 1 low-confidence", { exact: true }), within(row).getByRole("button", { name: "View security dossier" })]) expect(node.closest("details")).toBeNull();
    expect(within(row).getByText("Metric source", { exact: true }).closest("details")).not.toHaveAttribute("open");
    expect(Object.entries(props).filter(([key]) => key.startsWith("on")).every(([, spy]) => (spy as ReturnType<typeof vi.fn>).mock.calls.length === 0)).toBe(true);
  });
  it("discloses account actions without invoking them and binds every management callback to the selected record", () => {
    const props = directoryBodyProps(); const { container } = render(<AdminUserDirectory {...props} />); const row = directoryBodyRow(container, "two");
    fireEvent.click(within(row).getByText("Account details and actions", { exact: true }));
    expect(Object.entries(props).filter(([key]) => key.startsWith("on")).every(([, spy]) => (spy as ReturnType<typeof vi.fn>).mock.calls.length === 0)).toBe(true);
    for (const [label, owner] of [["Edit username", "onEditUsername"], ["Edit balance", "onEditBalance"], ["View history", "onViewHistory"], ["Manage content access", "onOpenContent"], ["View security dossier", "onViewSecurity"], ["Promote to creator", "onPromoteCreator"], ["Add verification badge", "onToggleVerification"]] as const) {
      fireEvent.click(within(row).getByRole("button", { name: label })); expect(props[owner]).toHaveBeenCalledExactlyOnceWith(props.records[1].user);
    }
    fireEvent.change(within(row).getByRole("combobox", { name: "Account role" }), { target: { value: "admin" } });
    expect(props.onChangeRole).toHaveBeenCalledExactlyOnceWith(props.records[1].user, "admin");
    fireEvent.click(within(row).getByRole("button", { name: "Suspend" })); expect(props.onSetStatus).toHaveBeenLastCalledWith(props.records[1].user, "suspend");
    fireEvent.click(within(row).getByRole("button", { name: "Ban" })); expect(props.onSetStatus).toHaveBeenLastCalledWith(props.records[1].user, "ban");
    expect(props.onSetStatus).toHaveBeenCalledTimes(2);
  });
  it("retains reactivation and verified state without exposing Ban for suspended or banned accounts", () => {
    const record = directoryBodyRecord("suspended"); record.user.status = "suspended"; record.user.role = "creator"; record.user.isVerified = true;
    const props = directoryBodyProps([record]); const { container, rerender } = render(<AdminUserDirectory {...props} />); const row = directoryBodyRow(container, record.user.uid);
    fireEvent.click(within(row).getByText("Account details and actions", { exact: true }));
    expect(props.onSetStatus).not.toHaveBeenCalled(); expect(props.onToggleVerification).not.toHaveBeenCalled();
    expect(within(row).queryByRole("button", { name: "Promote to creator" })).toBeNull();
    expect(within(row).queryByRole("button", { name: "Suspend" })).toBeNull();
    expect(within(row).queryByRole("button", { name: "Ban" })).toBeNull();
    fireEvent.click(within(row).getByRole("button", { name: "Reactivate" })); expect(props.onSetStatus).toHaveBeenCalledExactlyOnceWith(record.user, "activate");
    fireEvent.click(within(row).getByRole("button", { name: "Remove verification badge" })); expect(props.onToggleVerification).toHaveBeenCalledExactlyOnceWith(record.user);
    const banned = directoryBodyRecord("banned"); banned.user.status = "banned";
    rerender(<AdminUserDirectory {...props} records={[banned]} />); const bannedRow = directoryBodyRow(container, banned.user.uid);
    fireEvent.click(within(bannedRow).getByText("Account details and actions", { exact: true }));
    expect(props.onSetStatus).toHaveBeenCalledTimes(1);
    expect(within(bannedRow).queryByRole("button", { name: "Ban" })).toBeNull();
    expect(within(bannedRow).queryByRole("button", { name: "Suspend" })).toBeNull();
    fireEvent.click(within(bannedRow).getByRole("button", { name: "Reactivate" })); expect(props.onSetStatus).toHaveBeenLastCalledWith(banned.user, "activate");
    expect(props.onSetStatus).toHaveBeenCalledTimes(2);
  });
  it.each(["source_missing", "stale", "privacy_limited"])("keeps %s distinct from bounded zero and preserves its actual explanation", (state) => {
    const record = directoryBodyRecord(state, { availability: state, engagementReason: "Canonical " + state + " reason", activityEvents: "No source", unwraps: "No source", watchTime: "No source" });
    const props = directoryBodyProps([record]); const { container, rerender } = render(<AdminUserDirectory {...props} />); let row = directoryBodyRow(container, state);
    expect(within(row).getByText(state + " / 1 issues", { exact: true })).toBeVisible(); expect(within(row).getByText("Engagement: Canonical " + state + " reason", { exact: true })).toBeVisible();
    expect(row).not.toHaveTextContent("Math: deterministic"); expect(row.querySelector('[data-user-behavior-math-mode]')).toHaveAttribute("data-user-behavior-math-mode", "unavailable");
    const loaded = { ...record, behavior: { ...record.behavior, activityEvents: "0", unwraps: "0", watchTime: "0m", availability: "full_signal", issueCount: 0, source: "canonical", confidence: "high", mathMode: "deterministic", mathVerdict: "deterministic_active" } };
    rerender(<AdminUserDirectory {...props} records={[loaded]} />); row = directoryBodyRow(container, state);
    expect(row.querySelector('[data-user-behavior-rollup-source]')).toHaveAttribute("data-user-behavior-rollup-source", "canonical"); expect(row.querySelector('[data-user-behavior-math-mode]')).toHaveAttribute("data-user-behavior-math-mode", "deterministic");
    expect(within(row).getAllByText("0", { exact: true })).toHaveLength(3); expect(within(row).getByText("0m", { exact: true })).toBeInTheDocument();
  });
  it("targets pending detail explicitly and blocks repeat activation only for that same pending record", () => {
    const props = directoryBodyProps([directoryBodyRecord("one", { loaded: false }), directoryBodyRecord("two", { loaded: false })]); const { container, rerender } = render(<AdminUserDirectory {...props} selectedDetailUserId="one" />);
    expect(within(directoryBodyRow(container, "one")).getByRole("button", { name: "Loading detail" })).toBeDisabled();
    const load = within(directoryBodyRow(container, "two")).getByRole("button", { name: "Load detail" }); fireEvent.click(load); expect(props.onLoadDetail).toHaveBeenCalledExactlyOnceWith(props.records[1].user);
    expect(within(directoryBodyRow(container, "two")).queryByText("Metric source", { exact: true })).toBeNull();
    rerender(<AdminUserDirectory {...props} records={[directoryBodyRecord("two")]} />); expect(within(directoryBodyRow(container, "two")).getByText("Metric source", { exact: true })).toBeInTheDocument();
  });
  it("preserves controller loading and search-empty copy without rendering account actions", () => {
    const props = directoryBodyProps(); const { container, rerender } = render(<AdminUserDirectory {...props} loading />);
    expect(screen.getByRole("status", { name: "Loading user records" })).toBeInTheDocument(); expect(container.querySelector("article")).toBeNull();
    rerender(<AdminUserDirectory {...props} records={[]} searchQuery=" specific member " />); expect(screen.getByText('No users match "specific member".', { exact: true })).toBeVisible(); expect(container.querySelector("article")).toBeNull();
  });
});


import { DebugTabInfrastructure } from "@/app/admin/debug/components/DebugTabInfrastructure";
import { buildCompleteDependencyInventory } from "@/lib/debug/dependency-inventory-engine";

function infrastructureInventory(runtimeChecks: Parameters<typeof buildCompleteDependencyInventory>[0]["runtimeChecks"] = { firestoreConnectivity: "unknown", lastTelemetryPingAtUtc: null }) {
    return buildCompleteDependencyInventory({
        generatedAtUtc: "2026-10-03T11:00:00.000Z",
        nodeVersion: "v22.14.0",
        rootPackage: {
            dependencies: { next: "^16.2.4", "@radix-ui/react-dialog": "^1.1.15" },
            devDependencies: { vitest: "^4.1.4" },
            optionalDependencies: { "optional-record-package-with-a-long-recognizable-name": "^2.3.4" },
            peerDependencies: { react: "^19.2.4" },
            overrides: { protobufjs: "^7.5.5", "long-security-pin-with-recognizable-source-name": "^9.8.7" },
        },
        rootLockfile: { packages: { "node_modules/next": { version: "16.2.4" }, "node_modules/react": { version: "19.2.4" }, "node_modules/@google-cloud/storage": { version: "7.17.0" } } },
        functionsPackage: { dependencies: { "firebase-admin": "^13.8.0" }, overrides: { "google-gax": "^5.0.6" } },
        functionsLockfile: { packages: { "node_modules/firebase-admin": { version: "13.8.0" } } },
        sourceFiles: { "package.json": true, "package-lock.json": true, "functions/package.json": true, "functions/package-lock.json": true, "firebase.json": true, "next.config.ts": true, ".env.example": true },
        envExampleText: "PAYPAL_CLIENT_ID=do-not-display-fixture-secret\nPAYPAL_CLIENT_SECRET=do-not-display-fixture-secret\nNEXT_PUBLIC_GA_MEASUREMENT_ID=\n",
        runtimeChecks,
        packageFreshness: { rootPackageUpdatedAtUtc: "1980-01-01T00:00:01.000Z", functionsPackageUpdatedAtUtc: "2026-10-03T10:00:00.000Z" },
    });
}

describe("Infrastructure body behavior", () => {
    function openInfrastructureSection(title: string) {
        const button = screen.queryByRole("button", { name: `Expand ${title}` });
        if (button) fireEvent.click(button);
    }

    it("settles absent inventory as missing and recovers visibly on the next supplied source", () => {
        const { rerender } = render(<DebugTabInfrastructure data={{ success: true }} />);
        expect(screen.queryByText("Loading dependency inventory...")).toBeNull();
        expect(screen.getByText("Not loaded", { exact: true })).toBeVisible();
        expect(screen.queryByText("0", { exact: true })).toBeNull();
        rerender(<DebugTabInfrastructure data={{ infrastructure: infrastructureInventory() }} />);
        expect(screen.getByText("v22.14.0", { exact: true })).toBeVisible();
        expect(screen.queryByText("Inventory is not loaded. Check the Debug source status above before treating package counts or runtime checks as current.")).toBeNull();
    });

    it("does not promote missing or nonfinite declared counts to healthy zeroes", () => {
        const inventory: any = infrastructureInventory();
        delete inventory.totals;
        const { rerender } = render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        for (const label of ["Runtime deps", "Dev deps", "Optional deps", "Peer deps", "Functions deps", "External services", "Expected absent", "Unknown direct deps"]) {
            const row = screen.getByText(label, { exact: true }).parentElement!;
            expect(within(row).queryByText("0", { exact: true }), label).toBeNull();
            expect(within(row).getByText("Not loaded", { exact: true }), label).toBeVisible();
        }
        inventory.totals = { ...infrastructureInventory().totals, runtimeDependencies: Number.NaN };
        rerender(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        const runtimeRow = screen.getByText("Runtime deps", { exact: true }).parentElement!;
        expect(within(runtimeRow).getByText("Not loaded", { exact: true })).toBeVisible();
        expect(within(runtimeRow).queryByText("NaN", { exact: true })).toBeNull();
    });

    it("retains a supplied declared zero and does not claim package counts establish provider health", () => {
        const inventory = infrastructureInventory();
        inventory.totals.optionalDependencies = 0;
        render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        const row = screen.getByText("Optional deps", { exact: true }).parentElement!;
        expect(within(row).getByText("0", { exact: true })).toBeVisible();
        expect(screen.getByText(/Package presence does not prove runtime use\./)).toBeVisible();
    });

    it("preserves unknown, failed and observed connectivity while unknown freshness stays unavailable", () => {
        const inventory = infrastructureInventory();
        inventory.freshnessState = "unknown";
        const { rerender } = render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        const freshnessRow = () => screen.getByText("Freshness", { exact: true }).parentElement!;
        const connectivityRow = () => screen.getByText("Firestore Connectivity", { exact: true }).parentElement!;
        expect(within(freshnessRow()).getByLabelText(/^Unavailable /i)).toBeVisible();
        expect(within(connectivityRow()).getByLabelText(/^Unavailable /i)).toBeVisible();
        inventory.runtimeConnectivityChecks.firestoreConnectivity.status = "failed";
        inventory.freshnessState = "stale";
        rerender(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        expect(within(connectivityRow()).getByLabelText(/The source could not be loaded/i)).toBeVisible();
        expect(within(freshnessRow()).getByLabelText(/Last verified data is older/i)).toBeVisible();
        inventory.runtimeConnectivityChecks.firestoreConnectivity.status = "live";
        inventory.freshnessState = "fresh";
        rerender(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        expect(within(connectivityRow()).getByLabelText(/^Live /i)).toBeVisible();
        expect(within(freshnessRow()).getByLabelText(/^Live /i)).toBeVisible();
    });

    it("renders the producer-owned telemetry timestamp and returns to unavailable when it is absent", () => {
        const ping = "2026-10-03T11:01:00.000Z";
        const { rerender } = render(<DebugTabInfrastructure data={{ infrastructure: infrastructureInventory({ firestoreConnectivity: "unknown", lastTelemetryPingAtUtc: ping }) }} />);
        const row = () => screen.getByText("Last Telemetry Ping", { exact: true }).parentElement!;
        expect(within(row()).getByText(ping, { exact: true })).toBeVisible();
        rerender(<DebugTabInfrastructure data={{ infrastructure: infrastructureInventory() }} />);
        expect(within(row()).getByText("unavailable", { exact: true })).toBeVisible();
        expect(screen.queryByText(ping, { exact: true })).toBeNull();
    });

    it("shows every producer-built direct dependency with truthful peer and lockfile attribution", () => {
        const inventory = infrastructureInventory();
        const { container } = render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        for (const group of inventory.groups) {
            const details = screen.getByText(group.label, { exact: true }).closest("details")!;
            fireEvent.click(details.querySelector("summary")!);
            expect(details.open).toBe(true);
            for (const entry of group.entries) for (const element of within(details).getAllByText(entry.name, { exact: true })) expect(element).toBeVisible();
        }
        const reactTitle = screen.getByText("react", { exact: true });
        const reactRecord = reactTitle.closest("article") ?? reactTitle.parentElement!.parentElement!;
        expect(within(reactRecord).getByText("Peer", { exact: true })).toBeVisible();
        expect(within(reactRecord).getByText("^19.2.4", { exact: true })).toBeVisible();
        expect(within(reactRecord).getByText("19.2.4", { exact: true })).toBeVisible();
        expect(container.textContent).not.toContain("do-not-display-fixture-secret");
        const group = screen.getByText(inventory.groups[0].label, { exact: true }).closest("details")!;
        fireEvent.click(group.querySelector("summary")!); expect(group.open).toBe(false);
        fireEvent.click(group.querySelector("summary")!); expect(group.open).toBe(true);
        for (const element of within(group).getAllByText(inventory.groups[0].entries[0].name, { exact: true })) expect(element).toBeVisible();
    });

    it("does not expose empty package-source disclosures and keeps missing file slots unavailable", () => {
        const inventory = infrastructureInventory();
        inventory.packageSources[0].present = false;
        render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        openInfrastructureSection("Package sources");
        const title = screen.getByText("root package.json", { exact: true });
        expect(title.closest("details")).toBeNull();
        const row = title.closest("article")!;
        expect(within(row).getByText("Absent", { exact: true })).toBeVisible();
        expect(within(row).getAllByText("Not loaded", { exact: true })).toHaveLength(4);
        expect(within(row).getByText("package.json", { exact: true })).toBeVisible();
    });

    it("retains configuration, runtime-unverified service evidence, key names, owners and next actions", () => {
        const inventory = infrastructureInventory();
        const { container } = render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        openInfrastructureSection("External services and config dependencies");
        const collapsed = screen.queryByText("External services and config dependencies", { exact: true })?.closest("details");
        if (collapsed) fireEvent.click(collapsed.querySelector("summary")!);
        for (const service of inventory.externalServiceDependencies) {
            const title = screen.getByText(service.serviceName, { exact: true });
            expect(title).toBeVisible();
            const record = title.closest("article") ?? title.parentElement!.parentElement!.parentElement!;
            expect(record).toHaveTextContent(service.owner);
            expect(within(record).getByText(service.nextAction, { exact: true })).toBeVisible();
        }
        expect(screen.getAllByText("not_verified_here", { exact: true })).toHaveLength(inventory.externalServiceDependencies.length);
        expect(container.textContent).toContain("PAYPAL_CLIENT_ID");
        expect(container.textContent).not.toContain("do-not-display-fixture-secret");
    });

    it("keeps every override and absent/transitive classification after native disclosure reopening", () => {
        const inventory = infrastructureInventory();
        render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        openInfrastructureSection("Overrides and not-direct packages");
        for (const overrides of inventory.overrides) {
            const details = screen.getByText(`${overrides.sourcePackage} overrides`, { exact: true }).closest("details")!;
            fireEvent.click(details.querySelector("summary")!);
            for (const name of overrides.names) expect(within(details).getByText(name, { exact: true })).toBeVisible();
        }
        const details = screen.getByText("Not directly installed / transitive or expected but absent", { exact: true }).closest("details")!;
        fireEvent.click(details.querySelector("summary")!);
        for (const entry of inventory.expectedButAbsentDependencies) {
            expect(within(details).getByText(entry.name, { exact: true })).toBeVisible();
            expect(within(details).getByText(entry.reason, { exact: true })).toBeVisible();
        }
        const storageTitle = within(details).getByText("@google-cloud/storage", { exact: true });
        const storage = storageTitle.closest("article") ?? storageTitle.parentElement!.parentElement!;
        expect(within(storage).getAllByText("transitive_only", { exact: true }).length).toBeGreaterThan(0);
        fireEvent.click(details.querySelector("summary")!); expect(details.open).toBe(false);
        fireEvent.click(details.querySelector("summary")!); expect(details.open).toBe(true);
        expect(within(details).getByText("stripe", { exact: true })).toBeVisible();
    });

    it("makes a failed inventory read explicit and restores real source fields on recovery", () => {
        const { rerender } = render(<DebugTabInfrastructure data={{ infrastructure: { error: "Controlled inventory read failed" } }} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Controlled inventory read failed");
        expect(screen.queryByText("0", { exact: true })).toBeNull();
        rerender(<DebugTabInfrastructure data={{ infrastructure: infrastructureInventory() }} />);
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.getByText("v22.14.0", { exact: true })).toBeVisible();
        expect(screen.getByText("timestamp unavailable", { exact: true })).toBeVisible();
        expect(screen.queryByText("1980-01-01T00:00:01.000Z", { exact: true })).toBeNull();
    });
    it("does not call an undeclared or partial service configuration Configured", () => {
        const inventory = infrastructureInventory();
        render(<DebugTabInfrastructure data={{ infrastructure: inventory }} />);
        openInfrastructureSection("External services and config dependencies");
        const priorDetail = screen.getByText("External services and config dependencies", { exact: true }).closest("details");
        if (priorDetail) fireEvent.click(priorDetail.querySelector("summary")!);
        for (const service of inventory.externalServiceDependencies) {
            const title = screen.getByText(service.serviceName, { exact: true });
            const record = title.closest("article") ?? title.parentElement!.parentElement!.parentElement!;
            const config = within(record).getByText("Config", { exact: true }).parentElement!;
            expect(within(config).getByText(service.configPresenceStatus, { exact: true })).toBeVisible();
            const badge = config.querySelector("[data-admin-truth-state]");
            expect(badge).toHaveAttribute("data-admin-truth-state", service.configPresenceStatus === "declared" ? "live" : "unavailable");
            if (service.configPresenceStatus !== "declared") expect(within(config).queryByLabelText(/^Configured\./i), service.serviceName).toBeNull();
        }
    });

});

describe("Admin Users summary metric source bindings", () => {
  it.each([
    { state: "live", value: "0", source: "canonical", usable: true, pending: false },
    { state: "unavailable", value: "Unknown", source: "unavailable", usable: false, pending: false },
    { state: "unavailable", value: "Unknown", source: "unavailable", usable: false, pending: true },
    { state: "stale", value: "17", source: "retained_verified_snapshot", usable: true, pending: false },
  ] as const)("preserves supplied $state / $value with pending=$pending", ({ state, value, source, usable, pending }) => {
    const { container } = render(<AdminUserMetricCard
      id="returned_7d"
      label="Returned in last 7 days"
      primaryValue={value}
      secondaryValue="Recorded seven-day return summary"
      title="Recorded explanation. Formula: supplied canonical formula."
      state={state}
      pendingInitialLoad={pending}
      hasUsableValue={usable}
      reviewDecision={null}
      source={source}
      freshness={state}
      scope="rolling_7d"
      reason="supplied_source_reason"
      generatedAtUtc="2026-10-03T00:00:00.000Z"
      sourceDetail="rolling 7d | supplied source"
      footerReason="supplied source reason"
    />);
    const metric = container.querySelector('[data-admin-users-kpi-id="returned_7d"]')!;
    expect(metric).toHaveAttribute("data-admin-users-metric-state", state);
    expect(metric).toHaveAttribute("data-admin-users-kpi-source-truth", source);
    expect(metric).toHaveAttribute("data-admin-users-kpi-freshness", state);
    expect(metric).toHaveAttribute("data-admin-users-kpi-scope", "rolling_7d");
    expect(metric).toHaveAttribute("data-admin-users-kpi-reason", "supplied_source_reason");
    expect(metric).toHaveAttribute("title", "Recorded explanation. Formula: supplied canonical formula.");
    const badge = metric.querySelector("[data-admin-truth-state]")!;
    expect(badge).toHaveAttribute("data-admin-truth-state", state);
    expect(badge).toHaveAttribute("data-admin-truth-has-usable-value", String(usable));
    expect(badge).toHaveAttribute("data-admin-truth-pending-initial-load", String(pending));
    expect(within(metric as HTMLElement).getByText(value, { exact: true })).toBeVisible();
    expect(within(metric as HTMLElement).getByText("Recorded seven-day return summary")).toBeVisible();
    expect(within(metric as HTMLElement).getByText("rolling 7d | supplied source")).toBeVisible();
    expect(within(metric as HTMLElement).getByText("supplied source reason")).toBeVisible();
  });
});
