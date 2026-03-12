"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { X, Images, Video, Clock, Lock, Unlock, Loader2, Share2, Eye, Wallet } from "lucide-react";
import { Drop } from "@/types/db";
import { getAspectRatioCssValue, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { formatDistanceToNow } from "date-fns";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sendGAEvent } from "@next/third-parties/google";
import { getSimulatedUnwrapsToday } from "@/lib/unwrap-simulator";
import * as Dialog from "@radix-ui/react-dialog";
import { trackEvent } from "@/lib/telemetry";

interface DropPreviewModalProps {
  drop: Drop | null;
  onClose: () => void;
}

function getTimerLabel(validFrom: number, validUntil?: number): string {
  const now = Date.now();
  if (now < validFrom) {
    return `Starts in ${formatDistanceToNow(validFrom)}`;
  }

  if (!validUntil) {
    return "Always available";
  }

  if (now >= validUntil) {
    return "Expired";
  }

  return `${formatDistanceToNow(validUntil)} left`;
}

export function DropPreviewModal({ drop, onClose }: DropPreviewModalProps) {
  const { user } = useAuth();
  const { userProfile, setUserProfile } = useUserProfile();
  const { openAuthModal, openPurchaseModal } = useUI();
  const [unlocking, setUnlocking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (confirming) {
      timeout = setTimeout(() => setConfirming(false), 3500);
    }
    return () => clearTimeout(timeout);
  }, [confirming]);

  const mediaSummary = useMemo(() => (drop ? getDropMediaSummary(drop) : { imageCount: 0, videoCount: 0 }), [drop]);
  const timerLabel = useMemo(() => (drop ? getTimerLabel(drop.validFrom, drop.validUntil) : ""), [drop]);
  const aspectRatio = useMemo(() => (drop ? getSupportedDropAspectRatio(drop) : "1:1"), [drop]);
  const ratioStyle = useMemo(() => ({ aspectRatio: getAspectRatioCssValue(aspectRatio) }), [aspectRatio]);

  const simulativeUnwraps = useMemo(() => drop ? getSimulatedUnwrapsToday(drop.id) : 0, [drop]);
  const isUnlocked = !!(drop && Array.isArray(userProfile?.unlockedContent) && userProfile.unlockedContent.includes(drop.id));
  const canAfford = (userProfile?.gumDropsBalance ?? 0) >= (drop?.unlockCost ?? 0);

  useEffect(() => {
    if (!drop) {
      return;
    }

    trackEvent("drop_preview_opened", {
      drop_id: drop.id,
      drop_category: drop.type,
      is_unlocked: isUnlocked,
    });
  }, [drop, isUnlocked]);

  if (!drop) {
    return null;
  }

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleUnwrap = async () => {
    if (unlocking || isUnlocked) {
      return;
    }

    if (!user) {
      onClose();
      openAuthModal();
      return;
    }

    const balance = userProfile?.gumDropsBalance ?? 0;
    if (balance < drop.unlockCost) {
      onClose();
      openPurchaseModal();
      return;
    }

    if (!confirming) {
      setConfirming(true);
      triggerHaptic();
      trackEvent("drop_unlock_attempted", {
        drop_id: drop.id,
        drop_category: drop.type,
        unlock_cost: drop.unlockCost,
      });
      return;
    }

    setConfirming(false);
    setUnlocking(true);

    try {
      triggerHaptic();
      const response = await authFetch("/api/drops/unlock", {
        method: "POST",
        body: JSON.stringify({ dropId: drop.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.alreadyUnlocked) {
          toast.info("Already unwrapped!");
          return;
        }
        throw new Error(result.error || "Unlock failed");
      }

      toast.success(`Unwrapped: ${drop.title}`, {
        description: "Enjoy your exclusive content!",
        icon: "🔓",
        duration: 4000,
      });

      sendGAEvent("event", "spend_virtual_currency", {
        value: drop.unlockCost,
        virtual_currency_name: "Gum Drops",
        item_name: drop.title,
      });
      trackEvent("unlock_drop_success", {
        drop_id: drop.id,
        drop_category: drop.type,
        unlock_cost: drop.unlockCost,
      });

      if (userProfile) {
        const currentUnlocked = Array.isArray(userProfile.unlockedContent) ? userProfile.unlockedContent : [];
        const nextUnlockedContent = currentUnlocked.includes(drop.id) ? currentUnlocked : [...currentUnlocked, drop.id];
        const unwrappedAt = Number.isFinite(result.unwrappedAt) ? Math.floor(result.unwrappedAt) : Date.now();

        setUserProfile({
          ...userProfile,
          gumDropsBalance: result.newBalance !== undefined ? result.newBalance : userProfile.gumDropsBalance - drop.unlockCost,
          unlockedContent: nextUnlockedContent,
          unlockedContentTimestamps: {
            ...(userProfile.unlockedContentTimestamps || {}),
            [drop.id]: unwrappedAt,
          },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again later.";
      toast.error("Unwrap failed", { description: message });
    } finally {
      setUnlocking(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/dashboard/viewer?id=${drop.id}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success("Link copied to clipboard!");
        trackEvent("drop_share_copied", {
          drop_id: drop.id,
          drop_category: drop.type,
        });
        // Track share for daily tasks
        authFetch("/api/tasks/track-share", { method: "POST" }).catch(console.error);
      })
      .catch(() => toast.error("Failed to copy link"));
  };

  return (
    <Dialog.Root open={!!drop} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md" />
        <div className="fixed inset-x-0 bottom-0 top-12 sm:top-8 z-[120] flex items-end justify-center px-2 sm:px-4 pointer-events-none">
          <Dialog.Content
            className="pointer-events-auto w-full max-w-2xl max-h-full overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl bg-[#0A0A0F] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(164,118,255,0.15),rgba(0,0,0,0))] border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.55)] focus:outline-none relative ring-1 ring-white/5"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Preview Drop</Dialog.Title>
            <div className="flex h-full max-h-[92vh] flex-col">
              <div className="relative shrink-0 px-4 pt-3 pb-2 sm:px-5">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
                <div className="absolute right-4 top-2.5 flex items-center gap-2">
                  {isUnlocked && (
                    <button
                      onClick={handleShare}
                      className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-gray-200 flex items-center justify-center hover:bg-white/10 transition-colors"
                      aria-label="Share"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  )}
                  <Dialog.Close asChild>
                    <button
                      onClick={onClose}
                      className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-gray-200 flex items-center justify-center hover:bg-white/10 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 sm:px-5">
                <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#15151D]/50 p-2 shadow-inner" style={ratioStyle}>
                  <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
                    <Image
                      src={drop.imageUrl}
                      alt={drop.title}
                      fill
                      sizes="(max-width: 768px) 95vw, 640px"
                      className="object-cover object-center opacity-90"
                    />
                    {!user && (
                      <button
                        onClick={() => {
                          onClose();
                          openAuthModal();
                        }}
                        className="absolute inset-0 z-10 bg-black/50 backdrop-blur-xl flex flex-col items-center justify-center p-4 transition-all hover:bg-black/60 group focus:outline-none"
                      >
                        <div className="bg-black/80 p-5 rounded-3xl border border-white/15 shadow-[0_0_30px_rgba(164,118,255,0.1)] flex flex-col items-center justify-center gap-3 text-center max-w-[220px] transition-transform group-hover:scale-105">
                          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-white font-bold text-sm leading-tight">Sign in to Unwrap this collection</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="px-3 py-1 rounded-full bg-brand-purple/15 border border-brand-purple/30 text-brand-purple flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {timerLabel}
                  </span>
                  {(() => {
                    const numFiles = Array.isArray(drop.contentUrls) && drop.contentUrls.length > 0
                      ? drop.contentUrls.length
                      : (drop.contentUrl ? 1 : 0);
                    if (numFiles > 0) {
                      return (
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200 flex items-center gap-1.5">
                          <Images className="w-3.5 h-3.5" /> +{numFiles} {numFiles === 1 ? 'File' : 'Files'}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="mt-4 space-y-3 pb-3">
                  <div className="prose prose-invert prose-purple mb-4">
                    <p className="text-sm leading-relaxed text-gray-300 m-0 p-0 block">{drop.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#b28cff]">
                    <Eye className="w-4 h-4" />
                    {simulativeUnwraps} unwrapped today
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-white/10 bg-[#0A0A0F]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-5 backdrop-blur-md">
                {isUnlocked ? (
                  <Link
                    href={`/dashboard/viewer?id=${drop.id}`}
                    onClick={triggerHaptic}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-purple text-black font-bold text-lg hover:bg-[#b28cff] transition-colors active:scale-95 shadow-[0_0_20px_rgba(164,118,255,0.4)]"
                  >
                    <Unlock className="h-5 w-5" />
                    View Content
                  </Link>
                ) : (
                  <button
                    onClick={handleUnwrap}
                    disabled={unlocking || (!user && canAfford)}
                    className={cn(
                      "flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg border relative overflow-hidden",
                      !canAfford ? "bg-brand-purple text-black border-brand-purple hover:bg-[#b28cff] shadow-[0_0_20px_rgba(164,118,255,0.4)]"
                        : confirming ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                          : "bg-white text-black border-white hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.3)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {unlocking ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Unwrapping...
                      </>
                    ) : !canAfford ? (
                      <>
                        <Wallet className="h-5 w-5" />
                        Get more Gumdrops
                      </>
                    ) : confirming ? (
                      <>
                        <Lock className="h-5 w-5" />
                        Confirm {drop.unlockCost} GD?
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5" />
                        Unwrap for {drop.unlockCost} GD
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
