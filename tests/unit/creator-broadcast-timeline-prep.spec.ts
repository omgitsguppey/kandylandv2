import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreatorBroadcastSourceRecord,
  normalizeCreatorBroadcastAudience,
} from "@/lib/creator-broadcasts/broadcast-contract";
import {
  buildCreatorBroadcastNotificationIdentity,
  mergeCreatorBroadcastRecipients,
} from "@/lib/notifications/creator-broadcast-notifications";
import {
  buildCreatorProfileTimeline,
} from "@/lib/creator-profile/timeline-contract";

const root = process.cwd();

describe("creator broadcast timeline prep", () => {
  it("normalizes legacy broadcast audiences to follower-safe creator broadcast records", () => {
    expect(normalizeCreatorBroadcastAudience("all_fans")).toBe("followers");
    expect(normalizeCreatorBroadcastAudience("fan_pass_subscribers")).toBe("fan_pass_subscribers");

    const record = buildCreatorBroadcastSourceRecord({
      broadcastId: "broadcast_1",
      creatorId: "creator_1",
      creatorDisplayName: "Creator One",
      creatorUsername: "creatorone",
      title: "New post",
      body: "This is a creator update.",
      audience: "all_fans",
      notifyFollowers: true,
      createdAtMs: 1_000,
    });

    expect(record).toMatchObject({
      broadcastId: "broadcast_1",
      creatorId: "creator_1",
      audience: "followers",
      status: "published",
      notifyFollowers: true,
      timelineEligible: true,
      sourceTruth: "creator_broadcast_source_record",
    });
  });

  it("builds deterministic per-recipient notification identities without duplicate recipients", () => {
    expect(mergeCreatorBroadcastRecipients([
      { userId: "fan_1", source: "followers" },
      { userId: "fan_1", source: "fan_pass_subscribers" },
      { userId: "fan_2", source: "followers" },
    ])).toEqual([
      { userId: "fan_1", source: "followers_and_subscribers" },
      { userId: "fan_2", source: "followers" },
    ]);

    expect(buildCreatorBroadcastNotificationIdentity({
      creatorId: "creator_1",
      broadcastId: "broadcast_1",
      recipientUserId: "fan_1",
    })).toMatchObject({
      idempotencyKey: "creator_broadcast:published:creator_1:broadcast_1:fan_1",
    });
  });

  it("builds timeline items only from public drops and published eligible broadcasts", () => {
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
        { id: "broadcast_1", broadcastId: "broadcast_1", title: "Published", body: "Ready", status: "published", timelineEligible: true, createdAtMs: 4_000 },
        { id: "broadcast_2", broadcastId: "broadcast_2", title: "Draft", body: "Nope", status: "draft", timelineEligible: true, createdAtMs: 5_000 },
      ],
    });

    expect(timeline.sourceTruth).toBe("creator_profile_timeline_contract");
    expect(timeline.items.map((item) => item.id)).toEqual(["broadcast_1", "drop_live"]);
    expect(timeline.excludedCounts).toMatchObject({
      draftBroadcasts: 1,
      pendingDrops: 1,
    });
  });

  it("keeps route fanout bounded, idempotent, and telemetry-backed", () => {
    const route = readFileSync(join(root, "src/app/api/creator/broadcasts/route.ts"), "utf8");
    const validator = readFileSync(join(root, "scripts/agent/validate-creator-broadcast-timeline-prep.ts"), "utf8");

    expect(route).toContain("enqueueCreatorBroadcastNotifications");
    expect(route).toContain("trackServerEvent(\"creator_broadcast_created\"");
    expect(route).toContain("CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT");
    expect(route).not.toContain("audience: \"all_fans\"");
    expect(validator).toContain("creator-broadcast-timeline-prep");
  });
});
