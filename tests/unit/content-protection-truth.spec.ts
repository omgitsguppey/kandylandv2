import { describe, expect, it } from "vitest";

import { toLockedDropPreviewSafeDrop, resolveLockedDropPreviewTruth } from "@/lib/locked-drop-preview-truth";
import { sanitizeDropForClient } from "@/lib/server/drops";
import type { Drop } from "@/types/db";

const lockedDrop = {
  id: "drop_locked_1",
  creatorId: "creator_1",
  title: "Locked Drop",
  description: "Safe public description",
  imageUrl: "https://cdn.example.com/cover.jpg",
  contentUrl: "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/internal-video.mp4?alt=media",
  contentUrls: [
    "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/internal-video.mp4?alt=media",
    "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/internal-photo.jpg?alt=media",
  ],
  unlockCost: 25,
  validFrom: Date.now() - 1_000,
  validUntil: Date.now() + 86_400_000,
  status: "active",
  totalUnlocks: 0,
  totalViews: 12,
  type: "video",
  tags: ["launch"],
  mediaCounts: { images: 1, videos: 1 },
} as Drop;

describe("locked content protection truth", () => {
  it("sanitizes client Drop payloads without exposing internal content URLs", () => {
    const sanitized = sanitizeDropForClient(lockedDrop);

    expect(sanitized.contentUrl).toBe("");
    expect(sanitized.contentUrls).toEqual(["", ""]);
    expect(JSON.stringify(sanitized)).not.toContain("firebasestorage.googleapis.com");
  });

  it("builds locked preview safe fields without contentUrl or contentUrls", () => {
    const safeDrop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const safePayload = JSON.stringify(safeDrop);

    expect(safePayload).not.toContain("contentUrl");
    expect(safePayload).not.toContain("contentUrls");
    expect(safePayload).not.toContain("firebasestorage.googleapis.com");
    expect(safeDrop.mediaCounts).toEqual({ images: 1, videos: 1 });
  });

  it("marks guest locked previews as safe-preview-only protected state", () => {
    const safeDrop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({
      drop: safeDrop,
      isAuthenticated: false,
      isUnlocked: false,
      nowMs: Date.now(),
    });

    expect(truth.safePreviewFieldsOnly).toBe(true);
    expect(truth.ctaState).toBe("signup");
    expect(truth.coverTreatment).toBe("guest_protected");
    expect(truth.reasonCodes).toContain("guest_protected");
  });

  it("marks unlocked previews as owned without changing safe-preview-only truth", () => {
    const safeDrop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({
      drop: safeDrop,
      isAuthenticated: true,
      isUnlocked: true,
      gumDropsBalance: 0,
      nowMs: Date.now(),
    });

    expect(truth.safePreviewFieldsOnly).toBe(true);
    expect(truth.ctaState).toBe("unlocked_success");
    expect(truth.coverTreatment).toBe("owned");
  });
});
