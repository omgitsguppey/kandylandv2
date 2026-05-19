import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorFanPassCrmBroadcastReport,
  validateCreatorFanPassCrmBroadcastReport,
  type CreatorFanPassCrmBroadcastReport,
} from "../../scripts/agent/validate-creator-fan-pass-crm-broadcast";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function readIfExists(path: string) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readCreatorWorkspaceSurface() {
  const folder = join(root, "src/components/Dashboard/creator-workspace");
  const modules = readdirSync(folder)
    .filter((name) => /\.(ts|tsx)$/u.test(name))
    .sort()
    .map((name) => readIfExists(`src/components/Dashboard/creator-workspace/${name}`))
    .join("\n");
  return `${read("src/components/Dashboard/CreatorWorkspacePanel.tsx")}\n${modules}`;
}

describe("creator Fan Pass CRM and broadcast semantics", () => {
  it("keeps raw subscriber user ids out of normal creator-facing labels", () => {
    const workspace = readCreatorWorkspaceSurface();
    const manager = read("src/components/Creators/CreatorFanPassManager.tsx");
    const row = read("src/components/Creators/FanPassSubscriberRow.tsx");

    expect(workspace).not.toContain("subscription.userId || subscription.id");
    expect(manager).not.toContain("shortUserId(subscriber.userId)");
    expect(row).toContain("data-raw-user-id-hidden=\"true\"");
    expect(row).toContain("fanLabel");
    expect(row).toContain("maskedFanId");
  });

  it("adds mobile Fan Pass CRM markers and readable identity fields", () => {
    const workspace = readCreatorWorkspaceSurface();
    const manager = read("src/components/Creators/CreatorFanPassManager.tsx");
    const route = read("src/app/api/creator/subscriptions/route.ts");

    expect(workspace).toContain('data-fan-pass-crm="mobile_v1"');
    expect(workspace).toContain("Fan Pass CRM");
    expect(manager).toContain('data-fan-pass-crm="mobile_v1"');
    expect(route).toContain("fanUsername");
    expect(route).toContain("fanDisplayName");
    expect(route).toContain("fanPhotoURL");
    expect(route).toContain("fanIdentitySource");
  });

  it("makes broadcast audience explicit and removes follower copy from creator broadcast UI", () => {
    const workspace = readCreatorWorkspaceSurface();
    const manager = read("src/components/Creators/CreatorBroadcastManager.tsx");
    const broadcastsRoute = read("src/app/api/creator/broadcasts/route.ts");
    const combinedUi = `${workspace}\n${manager}`;

    expect(workspace).toContain('data-broadcast-audience="all_fans"');
    expect(workspace).toContain('data-broadcast-copy-audited="true"');
    expect(workspace).toContain("Audience: Fans");
    expect(workspace).toContain("Message your fans...");
    expect(combinedUi).not.toMatch(/all followers|blast to all followers|for followers/iu);
    expect(broadcastsRoute).toContain("CREATOR_BROADCAST_SUPPORTED_AUDIENCE");
    expect(broadcastsRoute).toContain("supportedAudience");
    expect(broadcastsRoute).toContain("all_fans");
  });

  it("documents CRM privacy and audience doctrine", () => {
    const doc = read("docs/agent-truth/creator-fan-pass-crm-broadcast.md");

    expect(doc).toContain("Creator Dashboard subscriber rows are CRM rows");
    expect(doc).toContain("Raw user IDs are debug/admin-only");
    expect(doc).toContain("Broadcast audience must be explicit");
    expect(doc).toContain("all_fans");
    expect(doc).toContain("fan_pass_subscribers");
  });

  it("validates generated report shape and required blockers", () => {
    const report = buildCreatorFanPassCrmBroadcastReport();
    expect(validateCreatorFanPassCrmBroadcastReport(report)).toEqual([]);
    expect(report.reportKey).toBe("creator-fan-pass-crm-broadcast");
    expect(report.summary.subscriberIdentityHydrated).toBe(true);
    expect(report.summary.rawUserIdsHidden).toBe(true);
    expect(report.summary.broadcastAudienceExplicit).toBe(true);
  });

  it("fails validation when raw user ids are not hidden", () => {
    const report = buildCreatorFanPassCrmBroadcastReport();
    const badReport: CreatorFanPassCrmBroadcastReport = {
      ...report,
      summary: {
        ...report.summary,
        rawUserIdsHidden: false,
      },
    };

    expect(validateCreatorFanPassCrmBroadcastReport(badReport)).toContain("raw subscriber user ids can appear in normal creator UI");
  });
});
