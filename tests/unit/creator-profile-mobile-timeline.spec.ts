import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildCreatorProfileTimeline } from "@/lib/creator/profile/timeline-contract";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("creator profile mobile timeline", () => {
  it("keeps the public creator profile header compact on mobile", () => {
    const header = read("src/components/Creators/CreatorProfileHeader.tsx");

    expect(header).toContain("data-creator-profile-mobile-scale=\"compact\"");
    expect(header).toContain("data-profile-count-density=\"compact\"");
    expect(header).toContain("text-lg font-black text-white");
    expect(header).toContain("sm:text-2xl");
    expect(header).not.toContain("mt-1 text-2xl font-black text-white");
    expect(header).not.toContain("text-2xl font-black tracking-tight text-white sm:text-4xl");
  });

  it("renders the shared timeline contract in the creator profile client", () => {
    const client = read("src/app/creators/[username]/CreatorProfileClient.tsx");
    const feed = read("src/components/Creators/CreatorProfileTimelineFeed.tsx");

    expect(client).toContain("import type { CreatorProfileTimelineItem }");
    expect(client).toContain("timelineItems");
    expect(client).toContain("CreatorProfileTimelineFeed");
    expect(feed).toContain("data-creator-profile-timeline-feed=\"true\"");
    expect(feed).toContain("data-creator-profile-timeline-source=\"creator_profile_timeline_contract\"");
    expect(feed).toContain("data-creator-profile-timeline-card");
    expect(client).toContain("handleCreatorTimelineDrop");
  });

  it("continues to exclude pending drops and draft broadcasts from public timelines", () => {
    const timeline = buildCreatorProfileTimeline({
      settings: {
        profileTimelineEnabled: true,
        showApprovedDropsOnTimeline: true,
        showBroadcastsOnTimeline: true,
      },
      drops: [
        { id: "drop_live", title: "Live drop", status: "active", validFrom: 2_000 },
        { id: "drop_pending", title: "Pending drop", status: "pending_review", validFrom: 3_000 },
      ],
      broadcasts: [
        { id: "broadcast_live", status: "published", timelineEligible: true, body: "Published update", createdAtMs: 4_000 },
        { id: "broadcast_draft", status: "draft", timelineEligible: true, body: "Draft update", createdAtMs: 5_000 },
      ],
    });

    expect(timeline.items.map((item) => item.id)).toEqual(["broadcast_live", "drop_live"]);
    expect(timeline.excludedCounts).toEqual({
      pendingDrops: 1,
      draftBroadcasts: 1,
    });
  });

  it("wires the validator and package check without touching protected shells", () => {
    const validator = read("scripts/agent/validate-creator-profile-mobile-timeline.ts");
    const packageJson = read("package.json");

    expect(validator).toContain("creator-profile-mobile-timeline");
    expect(validator).toContain("protectedNavChatUntouched");
    expect(packageJson).toContain("\"check:creator-profile-mobile-timeline\"");
  });
});
