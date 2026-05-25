import { describe, expect, it } from "vitest";

import {
  MEDIA_ACCESS_EVENTS,
  MEDIA_ACCESS_REASONS,
  buildPrivateMediaAccessDebugLane,
  buildMediaAccessTelemetry,
  classifyMediaAccessFailure,
  explainMediaAccess,
  resolveMediaAccess,
  validateMediaAccessTelemetryPayload,
} from "@/lib/media/media-access-resolver";

describe("private media access resolver", () => {
  it("defines explicit access reasons and telemetry events", () => {
    expect(MEDIA_ACCESS_REASONS).toEqual([
      "public_allowed",
      "owner_allowed",
      "creator_allowed",
      "admin_allowed",
      "unlocked_allowed",
      "fan_pass_allowed",
      "chat_thread_participant_allowed",
      "expired_blocked",
      "locked_blocked",
      "purchase_required",
      "auth_required",
      "moderation_blocked",
      "not_found",
      "unsafe_unknown",
    ]);
    expect(MEDIA_ACCESS_EVENTS).toEqual([
      "media_access_allowed",
      "media_access_blocked",
      "media_access_failed",
      "media_asset_missing",
      "media_expired_blocked",
    ]);
  });

  it("allows chat media only for a thread participant and keeps telemetry redacted", () => {
    const denied = resolveMediaAccess({
      surface: "chat_attachment",
      mediaId: "message_1",
      assetId: "asset_1",
      viewerUserId: "fan_2",
      ownerUserId: "fan_1",
      creatorId: "creator_1",
      exists: true,
      isChatThreadParticipant: false,
      storagePath: "creator/messages/fan_1/thread_1/private.png",
      assetUrl: "https://firebasestorage.googleapis.com/v0/b/k/o/private.png?token=secret",
    });
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("locked_blocked");
    expect(classifyMediaAccessFailure(denied)).toBe("creator_ownership");

    const allowed = resolveMediaAccess({
      surface: "chat_attachment",
      mediaId: "message_1",
      assetId: "asset_1",
      viewerUserId: "fan_1",
      ownerUserId: "fan_1",
      creatorId: "creator_1",
      exists: true,
      isChatThreadParticipant: true,
      storagePath: "creator/messages/fan_1/thread_1/private.png",
      assetUrl: "https://firebasestorage.googleapis.com/v0/b/k/o/private.png?token=secret",
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.reason).toBe("owner_allowed");

    const telemetry = buildMediaAccessTelemetry({
      ...allowed,
      storagePath: "creator/messages/fan_1/thread_1/private.png",
      assetUrl: "https://firebasestorage.googleapis.com/v0/b/k/o/private.png?token=secret",
    });
    const serialized = JSON.stringify(telemetry);
    expect(serialized).not.toContain("creator/messages/");
    expect(serialized).not.toContain("firebasestorage.googleapis.com");
    expect(serialized).not.toContain("token=secret");
    expect(validateMediaAccessTelemetryPayload(telemetry)).toEqual([]);
  });

  it("blocks drop media until creator, unlock, or fan-pass access is proven", () => {
    const locked = resolveMediaAccess({
      surface: "drop_media",
      mediaId: "drop_1",
      assetId: "asset_1",
      viewerUserId: "fan_1",
      ownerUserId: "creator_1",
      creatorId: "creator_1",
      exists: true,
      isLocked: true,
      hasUnlockedDrop: false,
      hasFanPass: false,
    });
    expect(locked.allowed).toBe(false);
    expect(locked.reason).toBe("purchase_required");
    expect(classifyMediaAccessFailure(locked)).toBe("purchase_or_unlock");

    expect(resolveMediaAccess({
      surface: "drop_media",
      mediaId: "drop_1",
      assetId: "asset_1",
      viewerUserId: "fan_1",
      ownerUserId: "creator_1",
      creatorId: "creator_1",
      exists: true,
      isLocked: true,
      hasUnlockedDrop: true,
    }).reason).toBe("unlocked_allowed");

    expect(resolveMediaAccess({
      surface: "drop_media",
      mediaId: "drop_1",
      assetId: "asset_1",
      viewerUserId: "creator_1",
      ownerUserId: "creator_1",
      creatorId: "creator_1",
      exists: true,
      isLocked: true,
    }).reason).toBe("owner_allowed");
  });

  it("reports expired, moderation, missing, and unsafe states with human/debug explanations", () => {
    const expired = resolveMediaAccess({
      surface: "drop_media",
      mediaId: "drop_2",
      exists: true,
      viewerUserId: "fan_1",
      ownerUserId: "creator_1",
      creatorId: "creator_1",
      isExpired: true,
    });
    expect(expired.reason).toBe("expired_blocked");
    expect(expired.eventName).toBe("media_expired_blocked");
    expect(explainMediaAccess(expired).humanReason).toContain("expired");

    const moderated = resolveMediaAccess({
      surface: "creator_upload",
      mediaId: "asset_2",
      exists: true,
      viewerUserId: "fan_1",
      ownerUserId: "creator_1",
      creatorId: "creator_1",
      moderationState: "blocked",
    });
    expect(moderated.reason).toBe("moderation_blocked");
    expect(classifyMediaAccessFailure(moderated)).toBe("moderation");

    const missing = resolveMediaAccess({
      surface: "profile_timeline_media",
      mediaId: "asset_3",
      exists: false,
      viewerUserId: "fan_1",
    });
    expect(missing.reason).toBe("not_found");
    expect(missing.eventName).toBe("media_asset_missing");

    const unsafe = resolveMediaAccess({
      surface: "creator_upload",
      mediaId: "asset_4",
      exists: true,
      viewerUserId: "fan_1",
    });
    expect(unsafe.reason).toBe("unsafe_unknown");
    expect(explainMediaAccess(unsafe).debugReason).toContain("No allow condition");
  });

  it("builds the Private media access debug lane", () => {
    const lane = buildPrivateMediaAccessDebugLane([
      resolveMediaAccess({ surface: "drop_media", mediaId: "drop_1", exists: true, isPublic: true }),
      resolveMediaAccess({ surface: "drop_media", mediaId: "drop_2", exists: false }),
      resolveMediaAccess({ surface: "drop_media", mediaId: "drop_3", exists: true, isExpired: true }),
      resolveMediaAccess({ surface: "drop_media", mediaId: "drop_4", exists: true }),
    ]);

    expect(lane.label).toBe("Private media access");
    expect(lane.blockedByReason.not_found).toBe(1);
    expect(lane.missingAssets).toBe(1);
    expect(lane.expiredOrLockedMismatches).toBe(1);
    expect(lane.unsafeUnknown).toBe(1);
    expect(lane.ownerCreatorAdminBypassHealth).toBe("monitored");
  });
});
