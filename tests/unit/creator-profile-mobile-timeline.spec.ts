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

  it("cancels stale hydration and isolates paid actions across creator route changes", () => {
    const client = read("src/app/creators/[username]/CreatorProfileClient.tsx");

    expect(client).toContain("const controller = new AbortController()");
    expect(client).toContain("signal: controller.signal");
    expect(client).toContain("if (controller.signal.aborted)");
    expect(client).toContain("controller.abort()");
    expect(client).toContain('setActiveTab("drops")');
    expect(client).toContain('setSelectedExperience(null)');
    expect(client).toContain('setRequestCategoryId("")');
    expect(client).toContain('setRequestDetails("")');
    expect(client).toContain('setBookingStartAt("")');
    expect(client).toContain('setMonetizationGuidance(null)');
    expect(client).toContain("setFollowLoading(false)");
    expect(client).toContain("setRelationshipLoading(false)");
    expect(client).toContain("creatorRouteGenerationRef.current.generation + 1");
    expect(client).toContain('const creatorRouteIdentity = `${username}:${currentUser?.uid ?? "guest"}`');
    expect(client).toContain("creatorRouteGenerationRef.current.identity !== creatorRouteIdentity");
    expect(client).toContain("const [viewerStateOwnerIdentity, setViewerStateOwnerIdentity] = useState(creatorRouteIdentity)");
    expect(client).toContain("setViewerStateOwnerIdentity(creatorRouteIdentity)");
    expect(client).toContain("if (loading || viewerStateOwnerIdentity !== creatorRouteIdentity)");
    expect(client).toContain('const viewerActorId = currentUser?.uid ?? "guest"');
    expect(client).toContain("const broadcastKey = `${viewerActorId}:${creator.uid}:${latestBroadcastId}:${broadcasts.length}`");
    expect(client).toContain("}, [creatorRouteIdentity, username]);");
    expect(client).toContain("isCurrentCreatorRouteGeneration");
    expect(client).toContain("buildPaidActionSlot");
    expect(client).toContain("`${userId}:${creatorId}:${slot}:${action}`");
    expect(client).not.toContain("pendingPaidActionRef.current = {}");
    expect(client).toContain("resolveDurableClientIdempotencyKey");
    expect(client).toContain("clearDurableClientIdempotencyKey(pending)");
    expect(client).toContain('action: `creator-${slot}-${action}`');
    expect(client).toContain('const idempotencyAction = subscriptionActive ? "fan-pass-cancel" : "fan-pass-start"');
    expect(client).toContain("currentUser.uid");
    expect(client).toContain("isDefinitiveClientRejectionStatus");
    expect(client).not.toContain("responseStatus !== null && responseStatus < 500");
    expect(client).toContain("if (!isCurrentAction())");

    const followAction = client.slice(
      client.indexOf("const handleFollow"),
      client.indexOf("const handleRelationshipAction"),
    );
    const notificationAction = client.slice(
      client.indexOf("const handleRelationshipAction"),
      client.indexOf("const handleSubscription"),
    );
    expect(followAction).toContain("const actionRouteGeneration = creatorRouteGenerationRef.current.generation");
    expect(followAction).toContain("refreshCreatorBroadcasts(creator.uid, isCurrentAction)");
    expect(followAction).toContain("if (isCurrentAction())");
    expect(notificationAction).toContain("const actionRouteGeneration = creatorRouteGenerationRef.current.generation");
    expect(notificationAction).toContain("if (!isCurrentAction())");
    expect(notificationAction).toContain("if (isCurrentAction())");
  });

  it("keeps public timelines limited to approved drops and ignores broadcasts", () => {
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
        { id: "broadcast_followers", status: "published", timelineEligible: true, audience: "followers", body: "Private update", createdAtMs: 4_000 },
        { id: "broadcast_public_like", status: "published", timelineEligible: true, audience: "public", body: "Synthetic public update", createdAtMs: 5_000 },
      ],
    });

    expect(timeline.items.map((item) => item.id)).toEqual(["drop_live"]);
    expect(timeline.excludedCounts).toEqual({
      pendingDrops: 1,
      draftBroadcasts: 0,
    });
  });

  it("wires the validator and package check without touching protected shells", () => {
    const validator = read("scripts/agent/validate-creator-profile-mobile-timeline.ts");
    const packageJson = read("package.json");

    expect(validator).toContain("creator-profile-mobile-timeline");
    expect(validator).toContain("protectedNavChatUntouched");
    expect(validator).toContain("isCreatorProfileTimelineRelatedDiff");
    expect(validator).toContain("separateProtectedFileDiffs");
    expect(validator).toContain("releaseNotesRequired = false");
    expect(validator).toContain("releaseNoteRequirementSatisfied");
    expect(packageJson).toContain("\"check:creator-profile-mobile-timeline\"");
  });
});
