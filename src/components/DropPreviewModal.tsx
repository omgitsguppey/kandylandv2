"use client";

// Legacy fallback only. Locked Drop preview ownership moved to /drops/[id]/preview.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X, Images, Clock, Lock, Unlock, Loader2, Share2, Eye, Wallet } from "lucide-react";
import { Drop } from "@/types/db";
import { getAspectRatioCssValue, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { formatDistanceToNow } from "date-fns";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { clearTimedFlow, consumeTimedFlow, startTimedFlow, trackEvent } from "@/lib/telemetry";
import {
  GUMDROPS_SUPPORT_COPY,
  GUMDROPS_URGENCY_CTA,
  SECONDARY_UNWRAP_CTA,
} from "@/lib/marketing-copy";
import { showUnwrapSuccessToast } from "@/components/Toasts/UnwrapSuccessToast";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { LAUNCH_BADGE_CONTAINMENT_CLASSNAME, LAUNCH_STATIC_BADGE_CLASSNAME } from "@/lib/design-system";
import { formatDropCountdown } from "@/lib/drop-countdown";
import { getUnlockProblemCopy } from "@/lib/problem-state-copy";

interface DropPreviewModalProps {
  drop: Drop | null;
  onClose: () => void;
}

function useModalTimer(validFrom: number, validUntil?: number) {
    const [label, setLabel] = useState("");
    const [fullLabel, setFullLabel] = useState("");
    const [urgencyState, setUrgencyState] = useState<"calm" | "warm" | "critical">("calm");

    useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            if (now < validFrom) {
                const startsLabel = `Starts in ${formatDistanceToNow(validFrom)}`;
                setLabel(startsLabel);
                setFullLabel(startsLabel);
                setUrgencyState("calm");
                return;
            }

            if (!validUntil) {
                setLabel("Always available");
                setFullLabel("Always available");
                setUrgencyState("calm");
                return;
            }

            const countdown = formatDropCountdown(validUntil, now);
            setLabel(countdown.visibleLabel);
            setFullLabel(countdown.fullLabel);
            setUrgencyState(countdown.urgencyState);
        };

        updateTimer();
        const interval = window.setInterval(updateTimer, 1000);
        return () => window.clearInterval(interval);
    }, [validFrom, validUntil]);

    return { label, fullLabel, urgencyState };
}

function FileCountBadge({ drop }: { drop: Drop }) {
  const mediaSummary = getDropMediaSummary(drop);
  const numFiles = mediaSummary.total;

  if (numFiles <= 0) {
    return null;
  }

  return (
    <span className={cn(
      "flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200",
      LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
      LAUNCH_STATIC_BADGE_CLASSNAME,
    )}>
      <Images className="w-3.5 h-3.5" /> +{numFiles} {numFiles === 1 ? 'File' : 'Files'}
    </span>
  );
}

interface UnwrapButtonContentProps {
  unlocking: boolean;
  hasUser: boolean;
  canAfford: boolean;
  confirming: boolean;
  unlockCost: number;
}

function UnwrapButtonContent({ unlocking, hasUser, canAfford, confirming, unlockCost }: UnwrapButtonContentProps) {
  if (unlocking) {
    return (
      <>
        <Loader2 className="h-5 w-5 animate-spin" />
        Unwrapping...
      </>
    );
  }

  if (!hasUser) {
    return (
      <>
        <Lock className="h-5 w-5" />
        {SECONDARY_UNWRAP_CTA}
      </>
    );
  }

  if (!canAfford) {
    return (
      <>
        <Wallet className="h-5 w-5 shrink-0" />
        <span>{GUMDROPS_URGENCY_CTA}</span>
      </>
    );
  }

  if (confirming) {
    return (
      <>
        <Lock className="h-5 w-5" />
        Confirm {unlockCost} GD?
      </>
    );
  }

  return (
    <>
      <Lock className="h-5 w-5" />
      Unwrap for {unlockCost} GD
    </>
  );
}

export function DropPreviewModal({ drop, onClose }: DropPreviewModalProps) {
  const router = useRouter();
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
  const { label: timerLabel, fullLabel: timerFullLabel, urgencyState: timerUrgency } = useModalTimer(drop?.validFrom || 0, drop?.validUntil);
  const aspectRatio = useMemo(() => (drop ? getSupportedDropAspectRatio(drop) : "1:1"), [drop]);
  const ratioStyle = useMemo(() => ({ aspectRatio: getAspectRatioCssValue(aspectRatio) }), [aspectRatio]);

  const totalUnlocks = useMemo(
    () => (drop && Number.isFinite(drop.totalUnlocks) ? Math.max(0, Math.floor(drop.totalUnlocks)) : 0),
    [drop]
  );
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

  useEffect(() => {
    if (!drop) {
      clearTimedFlow("drop_unlock");
    }
  }, [drop]);

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
      openAuthModal("signup");
      return;
    }

    const balance = userProfile?.gumDropsBalance ?? 0;
    if (balance < drop.unlockCost) {
      trackEvent("drop_unwrap_intent_blocked_by_funds", {
        drop_id: drop.id,
        unlock_cost: drop.unlockCost,
        current_balance: balance,
        idempotency_key: `${user.uid}:unlock_blocked:${drop.id}`,
        source_component: "drop_preview_modal",
      });
      onClose();
      openPurchaseModal(Math.max(1, drop.unlockCost - balance));
      return;
    }

    if (!confirming) {
      setConfirming(true);
      triggerHaptic();
      startTimedFlow("drop_unlock", {
        drop_id: drop.id,
        drop_category: drop.type,
        unlock_cost: drop.unlockCost,
      });
      trackEvent("drop_unlock_attempted", {
        drop_id: drop.id,
        drop_category: drop.type,
        unlock_cost: drop.unlockCost,
        idempotency_key: `${user.uid}:unlock_attempt:${drop.id}`,
        drop_tags: (drop.tags || []).join("|"),
        source_component: "drop_preview_modal",
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

      trackEvent("spend_virtual_currency", {
        value: drop.unlockCost,
        virtual_currency_name: "Gum Drops",
        item_name: drop.title,
      });
      trackEvent("unlock_drop_success", {
        drop_id: drop.id,
        drop_category: drop.type,
        unlock_cost: drop.unlockCost,
        transaction_id: `${user.uid}:unlock:${drop.id}:${Number.isFinite(result.unwrappedAt) ? Math.floor(result.unwrappedAt) : "client"}`,
        idempotency_key: `${user.uid}:unlock:${drop.id}`,
        drop_tags: (drop.tags || []).join("|"),
        source_component: "drop_preview_modal",
        ...(consumeTimedFlow("drop_unlock").mergedParams ?? {}),
      });

      if (userProfile) {
        const unwrappedAt = Number.isFinite(result.unwrappedAt) ? Math.floor(result.unwrappedAt) : Date.now();

        setUserProfile((currentProfile) => {
          if (!currentProfile) {
            return currentProfile;
          }

          const currentUnlocked = Array.isArray(currentProfile.unlockedContent) ? currentProfile.unlockedContent : [];
          const nextUnlockedContent = currentUnlocked.includes(drop.id) ? currentUnlocked : [...currentUnlocked, drop.id];

          return {
            ...currentProfile,
            gumDropsBalance: result.newBalance !== undefined ? result.newBalance : currentProfile.gumDropsBalance - drop.unlockCost,
            unlockedContent: nextUnlockedContent,
            unlockedContentTimestamps: {
              ...(currentProfile.unlockedContentTimestamps || {}),
              [drop.id]: unwrappedAt,
            },
          };
        });
      }

      dispatchActivitySync();
      onClose();
      showUnwrapSuccessToast({
        dropTitle: drop.title,
        onTaste: () => {
          router.push(`/dashboard/viewer?id=${drop.id}`);
        },
      });
    } catch (err: unknown) {
      const problemCopy = getUnlockProblemCopy(err);
      const timedStats = consumeTimedFlow("drop_unlock");
      trackEvent("unlock_drop_failed", {
        drop_id: drop.id,
        drop_category: drop.type,
        unlock_cost: drop.unlockCost,
        idempotency_key: `${user.uid}:unlock_failed:${drop.id}`,
        source_component: "drop_preview_modal",
        error_message: problemCopy.headline,
        ...(timedStats.mergedParams ?? {}),
      });
      clearTimedFlow("drop_unlock");
      toast.error(problemCopy.headline, { description: problemCopy.body });
    } finally {
      setUnlocking(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/drops/${encodeURIComponent(drop.id)}/preview`;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success("Link copied to clipboard!");
        trackEvent("drop_share_copied", {
          drop_id: drop.id,
          drop_category: drop.type,
          share_url: url,
        });
      })
      .catch(() => toast.error("Failed to copy link"));
  };

  return (
    <Dialog.Root open={!!drop} onOpenChange={(open) => {
      if (!open) {
        if (!isUnlocked && drop) {
          trackEvent("drop_preview_closed_incomplete", { drop_id: drop.id });
        }
        onClose();
      }
    }}>
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
                  {drop.id && (
                    <button
                      onClick={handleShare}
                      className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-gray-200 flex items-center justify-center transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]"
                      aria-label="Share"
                      title="Share"
                    >
                      <Share2 aria-hidden="true" className="h-5 w-5" />
                    </button>
                  )}
                  <Dialog.Close asChild>
                    <button
                      onClick={onClose}
                      className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-gray-200 flex items-center justify-center transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]"
                      aria-label="Close"
                      title="Close"
                    >
                      <X aria-hidden="true" className="h-5 w-5" />
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
                          openAuthModal("signup");
                        }}
                        aria-label="Create a profile to unlock this Drop"
                        className="absolute inset-0 z-10 bg-black/50 backdrop-blur-xl flex flex-col items-center justify-center p-4 transition-all hover:bg-black/60 group focus:outline-none"
                      >
                        <div className="bg-black/80 p-5 rounded-3xl border border-white/15 shadow-[0_0_30px_rgba(164,118,255,0.1)] flex flex-col items-center justify-center gap-3 text-center max-w-[240px] transition-transform group-hover:scale-105">
                          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-white font-bold text-sm leading-tight">{SECONDARY_UNWRAP_CTA}</span>
                          <p className="text-xs leading-5 text-gray-400">
                            Create your free profile to reveal every file in this KandyDrop.
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className={cn(
                      "px-3 py-1 rounded-full border flex items-center gap-1.5 transition-colors",
                      LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
                      timerUrgency === "critical" ? "bg-fuchsia-900/30 border-fuchsia-500/40 text-fuchsia-200 animate-pulse" :
                      timerUrgency === "warm" ? "bg-[#b28cff]/15 border-[#b28cff]/30 text-[#e4d4ff]" :
                      "bg-brand-purple/15 border-brand-purple/30 text-brand-purple"
                  )}
                    aria-label={timerFullLabel || timerLabel || "Always available"}
                    aria-live="off"
                    title={timerFullLabel || timerLabel || "Always available"}
                  >
                    <Clock className={cn("w-3.5 h-3.5", timerUrgency === "critical" ? "text-fuchsia-400" : timerUrgency === "warm" ? "text-[#b28cff]" : "text-brand-purple")} /> 
                    {timerLabel || "Always available"}
                  </span>
                  <FileCountBadge drop={drop} />
                </div>

                <div className="mt-4 space-y-3 pb-3">
                  <div className="prose prose-invert prose-purple mb-4">
                    <p className="text-sm leading-relaxed text-gray-300 m-0 p-0 block">{drop.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#b28cff]">
                    <Eye className="w-4 h-4" />
                    {totalUnlocks.toLocaleString()} unwrapped
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-white/10 bg-[#0A0A0F]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-5 backdrop-blur-md">
                {isUnlocked ? (
                  <div className="space-y-3">
                    <Link
                      href={`/dashboard/viewer?id=${drop.id}`}
                      onClick={triggerHaptic}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-purple to-purple-500 text-lg font-bold text-white transition-colors active:scale-95 shadow-[0_0_20px_rgba(164,118,255,0.4)] hover:opacity-95"
                    >
                      <Unlock className="h-5 w-5" />
                      View Content
                    </Link>
                    <div className="flex justify-center">
                      <ReportBugButton context="drop-preview-unlocked" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(!user || !canAfford) && (
                      <p className="text-center text-xs leading-6 text-gray-400">{GUMDROPS_SUPPORT_COPY}</p>
                    )}
                    <button
                      onClick={handleUnwrap}
                      disabled={unlocking}
                      aria-pressed={confirming}
                      className={cn(
                        "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border relative overflow-hidden px-4 py-3 text-center text-base font-bold leading-5 transition-all active:scale-95 shadow-lg",
                        (!canAfford || !confirming) && "bg-gradient-to-r from-brand-purple to-purple-500 text-white border-brand-purple shadow-[0_0_20px_rgba(164,118,255,0.4)] hover:opacity-95",
                        canAfford && confirming && "bg-orange-500 text-white border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <UnwrapButtonContent
                        unlocking={unlocking}
                        hasUser={!!user}
                        canAfford={canAfford}
                        confirming={confirming}
                        unlockCost={drop.unlockCost}
                      />
                    </button>
                    <div className="flex justify-center">
                      <ReportBugButton context="drop-preview-locked" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
