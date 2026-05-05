import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { toLockedDropPreviewSafeDrop, resolveLockedDropPreviewTruth } from "@/lib/locked-drop-preview-truth";
import { sanitizeDropForClient } from "@/lib/server/drops";
import type { Drop } from "@/types/db";

const lockedDrop = {
  id: "drop_locked_1",
  creatorId: "creator_1",
  submittedByCreatorId: "creator_1",
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
  type: "content",
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
    expect(truth.shouldBlurCover).toBe(true);
    expect(truth.shouldShowSignupCta).toBe(true);
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
    expect(truth.hasUnlockedDrop).toBe(true);
    expect(truth.shouldShowViewOwnedCta).toBe(true);
    expect(truth.shouldBlurCover).toBe(false);
  });

  it("allows creators to preview their own cover without granting full content entitlement", () => {
    const safeDrop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({
      drop: safeDrop,
      isAuthenticated: true,
      isUnlocked: false,
      gumDropsBalance: 0,
      actorUserId: "creator_1",
      nowMs: Date.now(),
    });

    expect(truth.safePreviewFieldsOnly).toBe(true);
    expect(truth.isUnlocked).toBe(false);
    expect(truth.canPreviewCoverAsCreator).toBe(true);
    expect(truth.creatorCoverPreviewEligible).toBe(true);
    expect(truth.isCreatorPreview).toBe(true);
    expect(truth.isOwnerOrCreator).toBe(true);
    expect(truth.shouldBlurCover).toBe(false);
    expect(truth.shouldShowCreatorShareCta).toBe(true);
    expect(truth.ctaState).toBe("creator_preview");
    expect(truth.coverTreatment).toBe("creator_preview");
    expect(truth.reasonCodes).toContain("creator_cover_preview");
  });

  it("keeps insufficient non-owner previews blurred and refill-gated", () => {
    const safeDrop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({
      drop: safeDrop,
      isAuthenticated: true,
      isUnlocked: false,
      gumDropsBalance: 0,
      actorUserId: "fan_1",
      nowMs: Date.now(),
    });

    expect(truth.creatorCoverPreviewEligible).toBe(false);
    expect(truth.shouldBlurCover).toBe(true);
    expect(truth.shouldShowTopUpCta).toBe(true);
    expect(truth.ctaState).toBe("refill");
    expect(truth.coverTreatment).toBe("insufficient_softened");
  });

  it("shows enough-balance non-owner previews clear with unwrap CTA but no file entitlement", () => {
    const safeDrop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({
      drop: safeDrop,
      isAuthenticated: true,
      isUnlocked: false,
      gumDropsBalance: lockedDrop.unlockCost,
      actorUserId: "fan_1",
      nowMs: Date.now(),
    });

    expect(truth.hasEnoughGumDrops).toBe(true);
    expect(truth.hasUnlockedDrop).toBe(false);
    expect(truth.shouldBlurCover).toBe(false);
    expect(truth.shouldShowUnwrapCta).toBe(true);
    expect(truth.coverTreatment).toBe("clear");
    expect(truth.ctaState).toBe("unwrap");
  });

  it("treats matching active creator context as cover-preview eligible", () => {
    const safeDrop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({
      drop: safeDrop,
      isAuthenticated: true,
      isUnlocked: false,
      gumDropsBalance: 0,
      actorUserId: "operator_1",
      activeCreatorId: "creator_1",
      nowMs: Date.now(),
    });

    expect(truth.creatorCoverPreviewEligible).toBe(true);
    expect(truth.coverTreatment).toBe("creator_preview");
    expect(truth.isUnlocked).toBe(false);
  });

  it("keeps the drop preview cover bounded and square without changing grid cards", () => {
    const viewSource = readFileSync(join(process.cwd(), "src/components/Drops/LockedDropPreviewView.tsx"), "utf8");
    const imagePolicySource = readFileSync(join(process.cwd(), "src/lib/image-loading-policy.ts"), "utf8");

    expect(viewSource).toContain("aspect-square");
    expect(viewSource).toContain("w-[min(64vw,280px)]");
    expect(viewSource).toContain("sm:w-[min(52vw,320px)]");
    expect(viewSource).toContain("data-drop-preview-cover-aspect=\"1:1\"");
    expect(viewSource).toContain("getCoverCtaLabel");
    expect(imagePolicySource).toContain("const DROP_GRID_STANDARD_SIZES");
    expect(imagePolicySource).toContain("const DROP_PREVIEW_SIZES = \"(max-width: 640px) 64vw, 320px\"");
  });

  it("wires creator preview cover and share telemetry from the preview page", () => {
    const clientSource = readFileSync(join(process.cwd(), "src/components/Drops/LockedDropPreviewClient.tsx"), "utf8");
    const viewSource = readFileSync(join(process.cwd(), "src/components/Drops/LockedDropPreviewView.tsx"), "utf8");

    expect(clientSource).toContain("drop_preview_creator_cover_viewed");
    expect(clientSource).toContain("drop_preview_creator_share_clicked");
    expect(clientSource).toContain("drop_preview_guest_signup_cta_");
    expect(clientSource).toContain("drop_preview_topup_cta_");
    expect(clientSource).toContain("drop_preview_unwrap_cta_");
    expect(clientSource).toContain("drop_preview_owned_view_clicked");
    expect(clientSource).toContain("sourceComponent: \"drop_preview_page\"");
    expect(viewSource).toContain("data-drop-preview-share-button=\"true\"");
  });
});
