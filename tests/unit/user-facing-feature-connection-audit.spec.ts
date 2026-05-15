import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string) {
  return JSON.parse(read(relativePath)) as Record<string, unknown>;
}

describe("user-facing feature connection audit", () => {
  it("records the creator feature connection map artifact", () => {
    expect(existsSync(join(root, "agent/state/user-facing-feature-connection-audit.generated.json"))).toBe(true);
    const report = readJson("agent/state/user-facing-feature-connection-audit.generated.json");
    const summary = report.summary as Record<string, unknown>;

    expect(report.reportKey).toBe("user-facing-feature-connection-audit");
    expect(summary.surfacesScanned).toBe(9);
    expect(summary.fakeLiveRisks).toBe(0);
    expect(summary.raceConditionRisks).toBe(0);
    expect(summary.costBleedRisks).toBe(0);
    expect(summary.selfLoopLinks).toBe(0);
  });

  it("keeps creator dashboard state source-backed instead of stats-object-backed", () => {
    const hub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");

    expect(hub).toContain("statsEvidence");
    expect(hub).toContain("creatorSectionStateFromEvidence");
    expect(hub).toContain("dashboardRequestIdRef");
    expect(hub).toContain("messageSectionHref");
    expect(hub).toContain("CreatorRequestsManager");
    expect(hub).toContain("CreatorBookingsManager");
    expect(hub).toContain("CreatorFanPassManager");
    expect(hub).toContain("data-creator-fan-pass-management-state");
    expect(hub).toContain("data-creator-bookings-management-state");
    expect(hub).toContain("data-creator-chat-route-connected");
    expect(hub).not.toContain('state: stats ? "live" : "unavailable"');
    expect(hub).not.toContain('href: "/dashboard/creator"');
    expect(hub).not.toContain('href="/dashboard/creator"');
  });

  it("keeps creator managers guarded without polling or realtime listeners", () => {
    const manager = read("src/components/Creators/CreatorBroadcastManager.tsx");
    const requestsManager = read("src/components/Creators/CreatorRequestsManager.tsx");
    const bookingsManager = read("src/components/Creators/CreatorBookingsManager.tsx");
    const fanPassManager = read("src/components/Creators/CreatorFanPassManager.tsx");
    const creatorSources = [
      read("src/components/Creators/CreatorDashboardSettingsHub.tsx"),
      manager,
      requestsManager,
      bookingsManager,
      fanPassManager,
    ].join("\n");

    expect(manager).toContain("canReadBroadcasts");
    expect(manager).toContain("canSendBroadcast");
    expect(manager).toContain("loadRequestIdRef");
    expect(manager).toContain("if (!canSendBroadcast)");
    expect(manager).toContain("if (sending)");
    expect(requestsManager).toContain("/api/creator/requests");
    expect(requestsManager).toContain("encodeURIComponent(creatorId)");
    expect(requestsManager).toContain("readOnly");
    expect(requestsManager).toContain("pendingActionId");
    expect(requestsManager).toContain("loadRequestIdRef");
    expect(bookingsManager).toContain("/api/creator/bookings");
    expect(bookingsManager).toContain("encodeURIComponent(creatorId)");
    expect(bookingsManager).toContain("readOnly");
    expect(bookingsManager).toContain("pendingActionId");
    expect(fanPassManager).toContain("/api/creator/subscriptions");
    expect(fanPassManager).toContain("encodeURIComponent(creatorId)");
    expect(fanPassManager).not.toContain('method: "POST"');
    expect(creatorSources).not.toMatch(/\bsetInterval\b/u);
    expect(creatorSources).not.toMatch(/\bonSnapshot\b/u);
  });

  it("keeps creator operation routes behind the bounded JSON parser", () => {
    expect(read("src/app/api/creator/settings/route.ts")).toContain("readBoundedJsonBody");
    expect(read("src/app/api/creator/settings/route.ts")).not.toContain("request.json()");
    expect(read("src/app/api/creator/broadcasts/route.ts")).toContain("readBoundedJsonBody");
    expect(read("src/app/api/creator/broadcasts/route.ts")).not.toContain("request.json()");
    expect(read("src/app/api/creator/requests/route.ts")).toContain("readBoundedJsonBody");
    expect(read("src/app/api/creator/requests/route.ts")).not.toContain("request.json()");
    expect(read("src/app/api/creator/bookings/route.ts")).toContain("readBoundedJsonBody");
    expect(read("src/app/api/creator/bookings/route.ts")).not.toContain("request.json()");
    expect(read("src/app/api/creator/subscriptions/route.ts")).toContain("readBoundedJsonBody");
    expect(read("src/app/api/creator/subscriptions/route.ts")).not.toContain("request.json()");
  });

  it("keeps paid-GD guidance paid-source only", () => {
    const guidance = read("src/components/Creators/CreatorPaidGdGuidanceCard.tsx");

    expect(guidance).toContain('"chat" | "fan_pass" | "request" | "booking" | "paid_media"');
    expect(guidance).toContain("Reward GumDrops do not count toward Fan Pass");
    expect(guidance).toContain("Paid GumDrops are required");
    expect(guidance).toContain("not reward balance");
    expect(guidance).not.toContain("Reward GumDrops can");
  });
});
