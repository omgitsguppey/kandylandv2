import { describe, expect, it } from "vitest";

import {
  buildCreatorDashboardErrorCostInventoryReport,
  validateCreatorDashboardErrorCostInventoryReport,
  type CreatorDashboardErrorCostInventoryReport,
} from "../../scripts/agent/validate-creator-dashboard-error-cost-inventory";

const sources = {
  "src/components/Creators/CreatorDashboardSettingsHub.tsx": `
    const isCreatorOrProjection = Boolean(viewAsState || userProfile?.role === "creator");
    if (!canLoadCreatorDashboard) { setSettings(null); setSettingsError(null); }
  `,
  "src/components/Creators/CreatorRequestsManager.tsx": `
    const canLoadRequests = Boolean(creatorId && enabled && !restricted);
    const pendingActionIdRef = useRef<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    authFetch(requestsUrl);
    No open requests.
  `,
  "src/components/Creators/CreatorBookingsManager.tsx": `
    const canLoadBookings = Boolean(creatorId && enabled && !restricted);
    const pendingActionIdRef = useRef<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    authFetch(bookingsUrl);
    No bookings
  `,
  "src/components/Creators/CreatorFanPassManager.tsx": `
    const canLoadSubscribers = Boolean(creatorId && enabled && !restricted && priceGd > 0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    authFetch(subscribersUrl);
    No subscribers yet.
  `,
  "src/components/Creators/CreatorBroadcastManager.tsx": `
    const canReadBroadcasts = Boolean(creatorId);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    authFetch(\`/api/creator/broadcasts\${query}\`);
    disabled={!canReadBroadcasts || loading}
    No broadcasts yet
  `,
  "apphosting.yaml": "runConfig:\n  concurrency: 80\n  minInstances: 1\n  maxInstances: 2\n",
  "dataconnect/dataconnect.yaml": "# Cloud SQL kandydrops-db\ninstance: kandydrops-db\n",
  "src/lib/server/api-cost-contract.ts": "notes: \"Admin-only Vertex/Gemini surface.\"",
};

describe("creator dashboard error and cost inventory", () => {
  it("builds a report with dashboard, 4xx, Cloud Run, Cloud SQL, and AI findings", () => {
    const report = buildCreatorDashboardErrorCostInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T06:00:00.000Z",
    });

    expect(report.summary.creatorDashboardErrorsFixed).toBe(2);
    expect(report.creatorDashboardFindings.length).toBeGreaterThanOrEqual(3);
    expect(report.route4xxFindings.some((entry) => entry.id.includes("unexpected"))).toBe(true);
    expect(report.cloudRunCostFindings).not.toHaveLength(0);
    expect(report.cloudSqlCostFindings).not.toHaveLength(0);
    expect(report.geminiCloudAssistCostFindings).not.toHaveLength(0);
    expect(report.nextFixOrder).not.toHaveLength(0);
    expect(validateCreatorDashboardErrorCostInventoryReport(report, sources, { currentHead: "head" })).toEqual([]);
  });

  it("fails when an unexpected 4xx finding lacks owner or action", () => {
    const report = buildCreatorDashboardErrorCostInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T06:00:00.000Z",
    });
    const badFinding = report.route4xxFindings.find((entry) => entry.id.includes("unexpected"));
    expect(badFinding).toBeTruthy();
    badFinding!.owner = "";

    expect(validateCreatorDashboardErrorCostInventoryReport(report, sources, { currentHead: "head" })).toContain(
      `unexpected 4xx finding ${badFinding!.id} lacks owner/action.`,
    );
  });

  it("fails when manager coverage or cost inventories are missing", () => {
    const report = buildCreatorDashboardErrorCostInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T06:00:00.000Z",
    }) as CreatorDashboardErrorCostInventoryReport;
    report.creatorDashboardFindings = [];
    report.cloudRunCostFindings = [];
    report.cloudSqlCostFindings = [];
    report.geminiCloudAssistCostFindings = [];

    const failures = validateCreatorDashboardErrorCostInventoryReport(report, sources, { currentHead: "head" });
    expect(failures).toEqual(expect.arrayContaining([
      "creator dashboard managers are not covered.",
      "Cloud Run inventory missing.",
      "Cloud SQL inventory missing.",
      "Gemini/Cloud Assist inventory missing.",
    ]));
  });

  it("fails when plain admin role still grants creator dashboard load eligibility", () => {
    const report = buildCreatorDashboardErrorCostInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T06:00:00.000Z",
    });
    const badSources = {
      ...sources,
      "src/components/Creators/CreatorDashboardSettingsHub.tsx": `
        const isCreatorOrProjection = Boolean(viewAsState || userProfile?.role === "creator" || userProfile?.role === "admin");
        if (!canLoadCreatorDashboard) { setSettings(null); setSettingsError(null); }
      `,
    };

    expect(validateCreatorDashboardErrorCostInventoryReport(report, badSources, { currentHead: "head" })).toContain(
      "CreatorDashboardSettingsHub must not load creator settings for plain admin accounts outside projection.",
    );
  });

  it("fails when changed files include forbidden admin runtime paths", () => {
    const report = buildCreatorDashboardErrorCostInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T06:00:00.000Z",
    });

    expect(validateCreatorDashboardErrorCostInventoryReport(report, sources, {
      currentHead: "head",
      changedPaths: ["src/app/api/admin/debug/route.ts"],
    })).toContain("Forbidden admin runtime file changed: src/app/api/admin/debug/route.ts");
  });
});
