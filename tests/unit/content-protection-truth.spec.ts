// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { toLockedDropPreviewSafeDrop, resolveLockedDropPreviewTruth } from "@/lib/locked-drop-preview-truth";
import { sanitizeDropForClient } from "@/lib/server/drops";
import type { Drop } from "@/types/db";
import { LockedDropPreviewView } from "@/components/Drops/LockedDropPreviewView";

vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.ComponentProps<"a">) => React.createElement("a", { href, ...props }, children) }));
vi.mock("@/components/Feedback/ReportBugButton", () => ({ ReportBugButton: () => React.createElement("button", { type: "button" }, "Report a bug") }));

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

    const mediaSource = readFileSync(join(process.cwd(), "src/components/ui/media-card.tsx"), "utf8");
    const layoutSource = readFileSync(join(process.cwd(), "src/components/ui/content-layout.tsx"), "utf8");
    expect(viewSource).toContain("<MediaCover>");
    expect(mediaSource).toContain("aspect-square");
    expect(viewSource).toContain("<DetailLayout");
    expect(layoutSource).toContain("md:grid-cols-2");
    expect(viewSource).toContain("data-drop-preview-cover-aspect=\"1:1\"");
    expect(viewSource).toContain("getCoverCtaLabel");
    expect(imagePolicySource).toContain("const DROP_GRID_STANDARD_SIZES");
    expect(imagePolicySource).toContain("const DROP_PREVIEW_SIZES");
  });

  it("keeps every locked primary action in the bottom-nav-safe sticky owner", () => {
    const viewSource = readFileSync(join(process.cwd(), "src/components/Drops/LockedDropPreviewView.tsx"), "utf8");

    expect(viewSource).toContain("truth.shouldShowSignupCta || truth.shouldShowTopUpCta || truth.shouldShowUnwrapCta");
    expect(viewSource).toContain("data-drop-preview-sticky-cta-above-bottom-nav=\"true\"");
    expect(viewSource).toContain("bottom-[calc(var(--user-mobile-bottom-nav-reserved-height,0px)+0.75rem)]");
    expect(viewSource).toContain("min-h-[3.25rem]");
    expect(viewSource).toContain("disabled={authLoading || unlocking}");
    expect(viewSource).toContain("aria-busy={unlocking}");
    expect(viewSource).toContain('onShare={onShare}');
    expect(viewSource).toContain('onClick={onShare}');
    expect(viewSource).toContain("Share cover");
    expect(viewSource).not.toContain("Full access follows unlock rules");
    expect(viewSource).not.toContain("function CoverCreatorShareCta");
    expect(viewSource.match(/Share cover/g)).toHaveLength(1);
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

describe("locked preview content and action composition", () => {
  function preview(overrides: Partial<React.ComponentProps<typeof LockedDropPreviewView>> = {}) {
    const drop = toLockedDropPreviewSafeDrop(sanitizeDropForClient({ ...lockedDrop, tags: ["launch", "first release", "not in preview"] }));
    const props: React.ComponentProps<typeof LockedDropPreviewView> = {
      drop,
      creator: { uid: "creator_1", username: "local_creator", displayName: "Local creator", photoURL: null, isVerified: false },
      truth: resolveLockedDropPreviewTruth({ drop, isAuthenticated: true, isUnlocked: false, gumDropsBalance: 25, actorUserId: "fan_1" }),
      socialProof: { type: "views", label: "12 views" },
      mediaCounts: { images: 1, videos: 1 },
      timerLabel: "23h 59m",
      timerFullLabel: "23 hours, 59 minutes remaining",
      authLoading: false,
      unlocking: false,
      confirming: false,
      selectedReaction: null,
      onReact: vi.fn(),
      onCtaClick: vi.fn(),
      onOpenLibrary: vi.fn(),
      onKeepUnwrapping: vi.fn(),
      onShare: vi.fn(),
      ...overrides,
    };
    return { props, view: render(React.createElement(LockedDropPreviewView, props)) };
  }

  it("renders one full title and public description, creator, cost and first two tags without protected media", () => {
    preview();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(lockedDrop.title);
    expect(screen.getAllByText(lockedDrop.description)).toHaveLength(1);
    expect(screen.getByText("@local_creator")).toBeInTheDocument();
    expect(screen.getByText("25 GD")).toBeInTheDocument();
    expect(screen.getByText("launch")).toBeInTheDocument();
    expect(screen.getByText("first release")).toBeInTheDocument();
    expect(screen.queryByText("not in preview")).not.toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAttribute("src", lockedDrop.imageUrl);
    expect(document.body.innerHTML).not.toContain("internal-video");
    expect(document.body.innerHTML).not.toContain("internal-photo");
    expect(screen.getByLabelText("23 hours, 59 minutes remaining")).toHaveTextContent("23h 59m");
    expect(screen.getByLabelText("1 image, 1 video")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Drops" })).toHaveAttribute("href", "/drops");
  });

  it.each([
    { creator: null, label: "KandyDrops Creator" },
    { creator: { uid: "creator_1", username: "", displayName: "Local creator", photoURL: null, isVerified: false }, label: "Local creator" },
  ])("keeps the existing creator label fallback $label", ({ creator, label }) => {
    preview({ creator });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("preserves all five reaction keys and labels, selected state and the Share callback", async () => {
    const { props, view } = preview();
    for (const [key, label] of [["interested", "interested"], ["need_this", "need this"], ["sweet", "sweet"], ["maybe_later", "maybe later"], ["need_more_gd", "need more GD"]]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toHaveAttribute("aria-pressed", "false");
      await userEvent.click(button);
      expect(props.onReact).toHaveBeenLastCalledWith(key, label);
    }
    expect(props.onReact).toHaveBeenCalledTimes(5);
    view.rerender(React.createElement(LockedDropPreviewView, { ...props, selectedReaction: "sweet" }));
    expect(screen.getByRole("button", { name: "sweet" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(props.onShare).toHaveBeenCalledTimes(1);
  });

  it.each([
    { actor: false, balance: 0, confirming: false, label: "Create account to unwrap" },
    { actor: true, balance: 0, confirming: false, label: "Refill to unwrap" },
    { actor: true, balance: 25, confirming: false, label: "Unwrap for 25 GD" },
    { actor: true, balance: 25, confirming: true, label: "Confirm 25 GD?" },
  ])("uses the canonical action for $label without adding a second primary action", async ({ actor, balance, confirming, label }) => {
    const drop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({ drop, isAuthenticated: actor, isUnlocked: false, gumDropsBalance: balance, actorUserId: "fan_1" });
    const { props } = preview({ drop, truth, confirming });
    const button = screen.getByRole("button", { name: label });
    expect(button).toBeEnabled();
    expect(button.closest('[data-drop-preview-sticky-cta-above-bottom-nav="true"]')).not.toBeNull();
    await userEvent.click(button);
    expect(props.onCtaClick).toHaveBeenCalledTimes(1);
    expect(props.onOpenLibrary).not.toHaveBeenCalled();
    expect(props.onShare).not.toHaveBeenCalled();
  });

  it.each([
    { authLoading: true, unlocking: false, label: "Checking access" },
    { authLoading: false, unlocking: true, label: "Unwrapping..." },
  ])("keeps $label non-activatable without publishing an action", async ({ authLoading, unlocking, label }) => {
    const { props } = preview({ authLoading, unlocking });
    const button = screen.getByRole("button", { name: label });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", String(unlocking));
    await userEvent.click(button);
    expect(props.onCtaClick).not.toHaveBeenCalled();
  });

  it.each(["scheduled", "expired"] as const)("does not describe %s source state as available or render an unwrap action", (status) => {
    const drop = toLockedDropPreviewSafeDrop(sanitizeDropForClient({ ...lockedDrop, status, validFrom: status === "scheduled" ? Date.now() + 86_400_000 : Date.now() - 1_000, validUntil: status === "expired" ? Date.now() - 1 : Date.now() + 172_800_000 }));
    const truth = resolveLockedDropPreviewTruth({ drop, isAuthenticated: true, isUnlocked: false, gumDropsBalance: 25, actorUserId: "fan_1" });
    preview({ drop, truth });
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Available Now")).not.toBeInTheDocument();
    expect(document.querySelector('[data-drop-preview-sticky-cta-above-bottom-nav="true"]')).toBeNull();
  });

  it("keeps owned actions separate from reactions and delegates both navigation callbacks once", async () => {
    const drop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({ drop, isAuthenticated: true, isUnlocked: true, gumDropsBalance: 0, actorUserId: "fan_1" });
    const { props } = preview({ drop, truth });
    expect(screen.getByRole("status")).toHaveTextContent("Saved to your KandyDrops.");
    expect(screen.queryByRole("button", { name: "sweet" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open in My KandyDrops" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep Unwrapping" }));
    expect(props.onOpenLibrary).toHaveBeenCalledTimes(1);
    expect(props.onKeepUnwrapping).toHaveBeenCalledTimes(1);
    expect(props.onCtaClick).not.toHaveBeenCalled();
  });

  it("keeps creator cover sharing distinct from content entitlement", async () => {
    const drop = toLockedDropPreviewSafeDrop(sanitizeDropForClient(lockedDrop));
    const truth = resolveLockedDropPreviewTruth({ drop, isAuthenticated: true, isUnlocked: false, gumDropsBalance: 0, actorUserId: "creator_1" });
    const { props } = preview({ drop, truth });
    expect(screen.queryByRole("button", { name: "Open in My KandyDrops" })).not.toBeInTheDocument();
    expect(screen.queryByText("Saved to your KandyDrops.")).not.toBeInTheDocument();
    expect(document.querySelector('[data-drop-preview-cover-treatment="creator_preview"] img')).not.toHaveClass("blur-[6px]");
    await userEvent.click(screen.getByRole("button", { name: "Share cover" }));
    expect(props.onShare).toHaveBeenCalledTimes(1);
    expect(props.onOpenLibrary).not.toHaveBeenCalled();
  });
});
