"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Eye, Image as ImageIcon, Loader2, Lock, Share2, Unlock, Wallet } from "lucide-react";

import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import type {
    LockedDropPreviewCreator,
    LockedDropPreviewSafeDrop,
    LockedDropPreviewTruth,
} from "@/lib/locked-drop-preview-truth";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { cn } from "@/lib/utils";
interface LockedDropPreviewViewProps {
    drop: LockedDropPreviewSafeDrop;
    creator: LockedDropPreviewCreator | null;
    truth: LockedDropPreviewTruth;
    socialProof: { type: "views" | "unwraps"; label: string };
    mediaCounts: { images: number; videos: number };
    timerLabel: string;
    timerFullLabel: string;
    authLoading: boolean;
    unlocking: boolean;
    confirming: boolean;
    selectedReaction: string | null;
    onReact: (reactionKey: string, reactionLabel: string) => void;
    onCtaClick: () => void;
    onOpenLibrary: () => void;
    onKeepUnwrapping: () => void;
    onShare: () => void;
}
const FEEDBACK_REACTIONS = [
    { key: "interested", emoji: "👀", label: "interested" },
    { key: "need_this", emoji: "🔥", label: "need this" },
    { key: "sweet", emoji: "🍬", label: "sweet" },
    { key: "maybe_later", emoji: "🫣", label: "maybe later" },
    { key: "need_more_gd", emoji: "💸", label: "need more GD" },
] as const;

export function LockedDropPreviewView({
    drop,
    creator,
    truth,
    socialProof,
    mediaCounts,
    timerLabel,
    timerFullLabel,
    authLoading,
    unlocking,
    confirming,
    selectedReaction,
    onReact,
    onCtaClick,
    onOpenLibrary,
    onKeepUnwrapping,
    onShare,
}: LockedDropPreviewViewProps) {
    return (
        <div
            className="mx-auto flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px))] w-full max-w-5xl flex-col px-3 pb-4 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] selection:bg-brand-purple/30 sm:px-4 md:px-8 md:pb-8 md:pt-2"
            data-drop-preview-page="true"
            data-drop-preview-urgency-tier={truth.urgencyTier}
            data-drop-preview-cta-state={truth.ctaState}
            data-drop-preview-social-proof-type={truth.socialProofType}
            data-drop-preview-creator-cover-eligible={truth.creatorCoverPreviewEligible}
            data-safe-preview-fields-only="true"
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <Link href="/drops" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-gray-200 backdrop-blur-md transition-colors hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                    Drops
                </Link>
                <ReportBugButton context="drop-preview-page" variant="icon" label="Report a bug" />
            </div>

            <section className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] md:items-center md:gap-7">
                <CoverHero
                    drop={drop}
                    truth={truth}
                    mediaCounts={mediaCounts}
                    timerLabel={timerLabel}
                    timerFullLabel={timerFullLabel}
                    authLoading={authLoading}
                    unlocking={unlocking}
                    confirming={confirming}
                    onCtaClick={onCtaClick}
                    onShare={onShare}
                />

                <div className="space-y-4">
                    <SummaryPanel drop={drop} creator={creator} socialProof={socialProof} truth={truth} onShare={onShare} />
                    <UrgencyBand truth={truth} timerLabel={timerLabel} />

                    {truth.isUnlocked ? (
                        <SuccessPanel />
                    ) : (
                        <FeedbackStrip selectedReaction={selectedReaction} onReact={onReact} />
                    )}
                </div>
            </section>

            <StickyPreviewCta
                truth={truth}
                onCtaClick={onCtaClick}
                onOpenLibrary={onOpenLibrary}
                onKeepUnwrapping={onKeepUnwrapping}
            />
        </div>
    );
}

function CoverHero({ drop, truth, mediaCounts, timerLabel, timerFullLabel, authLoading, unlocking, confirming, onCtaClick, onShare }: Pick<LockedDropPreviewViewProps, "drop" | "truth" | "mediaCounts" | "timerLabel" | "timerFullLabel" | "authLoading" | "unlocking" | "confirming" | "onCtaClick" | "onShare">) {
    const imagePolicy = getImageLoadingPolicy("drop_preview", { isLcpCandidate: true });

    return (
        <div className="relative mx-auto w-[min(64vw,280px)] overflow-hidden rounded-[1.6rem] border border-white/10 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:w-[min(52vw,320px)] md:max-w-[320px] md:rounded-[2rem]" data-drop-preview-cover-treatment={truth.coverTreatment} data-drop-preview-cover-aspect="1:1">
            <div className="relative aspect-square w-full">
                <Image
                    src={drop.imageUrl || "/placeholder.jpg"}
                    alt={drop.title}
                    fill
                    loading={imagePolicy.loading}
                    preload={imagePolicy.preload}
                    fetchPriority={imagePolicy.fetchPriority}
                    quality={imagePolicy.quality}
                    sizes={imagePolicy.sizes}
                    className={cn("object-cover object-center", truth.shouldBlurCover && "blur-[6px] brightness-[0.76] saturate-[0.9]")}
                    {...getImagePolicyDataAttributes(imagePolicy)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/15 to-black/25" />
                <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2">
                    <PreviewChip label={drop.type === "promo" ? "Drop" : "Limited Release"} />
                    <PreviewTimerChip urgencyTier={truth.urgencyTier} label={timerLabel} fullLabel={timerFullLabel} />
                </div>
                <div className="absolute bottom-3 left-3 right-3 space-y-2">
                    <PreviewFileChip images={mediaCounts.images} videos={mediaCounts.videos} />
                    <TitleMarquee title={drop.title} delaySeed={drop.id.charCodeAt(0) % 6} className="text-xl font-black leading-[1.04] tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] md:text-2xl" />
                    <CoverPreviewCta
                        truth={truth}
                        unlockCost={drop.unlockCost}
                        authLoading={authLoading}
                        unlocking={unlocking}
                        confirming={confirming}
                        onCtaClick={onCtaClick}
                        onShare={onShare}
                    />
                </div>
            </div>
        </div>
    );
}

function CoverPreviewCta({ truth, unlockCost, authLoading, unlocking, confirming, onCtaClick, onShare }: Pick<LockedDropPreviewViewProps, "truth" | "authLoading" | "unlocking" | "confirming" | "onCtaClick" | "onShare"> & { unlockCost: number }) {
    if (truth.isUnlocked || truth.ctaState === "unavailable") return null;
    const action = truth.shouldShowCreatorShareCta ? onShare : onCtaClick;

    return (
        <button type="button" onClick={action} disabled={authLoading || unlocking} aria-busy={unlocking} className={cn("mx-auto flex min-h-11 w-full max-w-[15rem] items-center justify-center gap-2 rounded-[0.95rem] border border-brand-purple/70 bg-black/70 px-3 py-2 text-xs font-black text-white shadow-[0_0_22px_rgba(164,118,255,0.24)] backdrop-blur-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", truth.shouldShowUnwrapCta && "bg-gradient-to-r from-brand-purple to-purple-500", truth.shouldShowCreatorShareCta && "border-white/20 bg-white/12")}>
            <CoverCtaIcon truth={truth} unlocking={unlocking} />
            {getCoverCtaLabel({ truth, authLoading, unlocking, confirming, unlockCost })}
        </button>
    );
}

function SummaryPanel({ drop, creator, socialProof, truth, onShare }: Pick<LockedDropPreviewViewProps, "drop" | "creator" | "socialProof" | "truth" | "onShare">) {
    return (
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-md md:rounded-[1.6rem] md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">{creator?.displayName ?? "KandyDrops Creator"}</p>
                    {creator?.username ? <p className="mt-1 text-xs font-semibold text-gray-400">@{creator.username}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-bold text-white/80" data-drop-preview-social-proof-type={socialProof.type}>
                        {socialProof.type === "unwraps" ? <Unlock className="h-3.5 w-3.5 text-brand-purple" /> : <Eye className="h-3.5 w-3.5 text-brand-purple" />}
                        {socialProof.label}
                    </div>
                    <button type="button" onClick={onShare} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-brand-purple/35 bg-brand-purple/12 px-3 text-xs font-black text-[#efe8ff] active:scale-[0.98]" data-drop-preview-share-button="true" data-drop-preview-creator-share-eligible={truth.creatorCoverPreviewEligible}>
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                    </button>
                </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-300 md:text-base">{drop.description}</p>
        </div>
    );
}

function UrgencyBand({ truth, timerLabel }: { truth: LockedDropPreviewTruth; timerLabel: string }) {
    const phrase = truth.urgencyTier === "critical" ? "Final minutes" : truth.urgencyTier === "urgent" ? "Window closing" : truth.urgencyTier === "warm" ? "Ends today" : truth.urgencyTier === "expired" ? "Unavailable" : "Available Now";
    return (
        <div className={cn("rounded-[1.2rem] border p-3 text-sm font-semibold", truth.urgencyTier === "critical" ? "border-fuchsia-300/50 bg-fuchsia-500/14 text-fuchsia-100 motion-safe:animate-pulse" : truth.urgencyTier === "urgent" ? "border-fuchsia-300/35 bg-fuchsia-500/10 text-fuchsia-100" : truth.urgencyTier === "warm" ? "border-brand-purple/30 bg-brand-purple/10 text-[#e4d4ff]" : "border-white/10 bg-white/[0.035] text-gray-200")}>
            <div className="flex items-center justify-between gap-3">
                <span>{phrase}</span>
                <span className="text-xs text-white/65">{timerLabel}</span>
            </div>
        </div>
    );
}

function SuccessPanel() {
    return (
        <div className="rounded-[1.35rem] border border-brand-purple/25 bg-brand-purple/10 p-4 text-center md:rounded-[1.6rem]">
            <CheckCircle2 className="mx-auto h-9 w-9 text-brand-purple" />
            <h2 className="mt-3 text-xl font-black text-white">Saved to your KandyDrops.</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">Open it now or keep browsing live Drops.</p>
        </div>
    );
}

function FeedbackStrip({ selectedReaction, onReact }: Pick<LockedDropPreviewViewProps, "selectedReaction" | "onReact">) {
    return (
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Vibe check</p>
            <div className="grid grid-cols-5 gap-1.5">
                {FEEDBACK_REACTIONS.map((reaction) => (
                    <button key={reaction.key} type="button" onClick={() => onReact(reaction.key, reaction.label)} aria-label={reaction.label} className={cn("flex min-h-11 items-center justify-center rounded-[0.9rem] border text-lg transition-colors active:scale-95", selectedReaction === reaction.key ? "border-brand-purple/50 bg-brand-purple/18" : "border-white/10 bg-black/24 hover:border-brand-purple/30")}>
                        <span aria-hidden="true">{reaction.emoji}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function StickyPreviewCta({ truth, onCtaClick, onOpenLibrary, onKeepUnwrapping }: Pick<LockedDropPreviewViewProps, "truth" | "onCtaClick" | "onOpenLibrary" | "onKeepUnwrapping">) {
    if (truth.isUnlocked) {
        return (
            <div className="sticky bottom-[calc(var(--user-mobile-bottom-nav-reserved-height,0px)+0.75rem)] z-30 mt-4 rounded-[1.35rem] border border-white/10 bg-black/78 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.52)] backdrop-blur-xl md:bottom-4">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <button type="button" onClick={onOpenLibrary} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] border border-brand-purple bg-gradient-to-r from-brand-purple to-purple-500 px-4 text-sm font-black text-white active:scale-[0.98]">
                        <Unlock className="h-4 w-4" />
                        Open in My KandyDrops
                    </button>
                    <button type="button" onClick={onKeepUnwrapping} className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-white/12 bg-white/[0.06] px-4 text-sm font-bold text-white active:scale-[0.98]">
                        Keep Unwrapping
                    </button>
                </div>
            </div>
        );
    }

    if (truth.shouldShowCreatorShareCta) {
        return (
            <div className="sticky bottom-[calc(var(--user-mobile-bottom-nav-reserved-height,0px)+0.75rem)] z-30 mt-4 rounded-[1.35rem] border border-white/10 bg-black/70 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.52)] backdrop-blur-xl md:bottom-4">
                <button type="button" onClick={onCtaClick} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white active:scale-[0.98]">
                    <Eye className="h-4 w-4 text-brand-purple" />
                    Full access follows unlock rules
                </button>
            </div>
        );
    }

    return null;
}

function CoverCtaIcon({ truth, unlocking }: { truth: LockedDropPreviewTruth; unlocking: boolean }) {
    if (unlocking) return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
    if (truth.shouldShowTopUpCta) return <Wallet className="h-4 w-4" />;
    if (truth.shouldShowCreatorShareCta) return <Share2 className="h-4 w-4" />;
    return <Lock className="h-4 w-4" />;
}

function getCoverCtaLabel({ truth, authLoading, unlocking, confirming, unlockCost }: { truth: LockedDropPreviewTruth; authLoading: boolean; unlocking: boolean; confirming: boolean; unlockCost: number }) {
    if (authLoading) return "Checking access";
    if (unlocking) return "Unwrapping...";
    if (truth.shouldShowSignupCta) return "Create account to unwrap";
    if (truth.shouldShowCreatorShareCta) return "Share cover";
    if (truth.shouldShowTopUpCta) return "Refill to unwrap";
    if (confirming) return `Confirm ${unlockCost.toLocaleString()} GD?`;
    return `Unwrap for ${unlockCost.toLocaleString()} GD`;
}

function PreviewChip({ label }: { label: string }) {
    return <span className="rounded-[0.85rem] border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur-xl">{label}</span>;
}

function PreviewTimerChip({ urgencyTier, label, fullLabel }: { urgencyTier: LockedDropPreviewTruth["urgencyTier"]; label: string; fullLabel: string }) {
    return (
        <span className={cn("inline-flex max-w-[9rem] items-center gap-1.5 rounded-[0.85rem] border bg-black/62 px-3 py-1 text-[11px] font-black text-white shadow-lg backdrop-blur-xl", urgencyTier === "urgent" && "border-fuchsia-300/45 text-fuchsia-100", urgencyTier === "critical" && "border-fuchsia-300/60 text-fuchsia-100 motion-safe:animate-pulse")} aria-label={fullLabel} title={fullLabel}>
            <Clock className="h-3.5 w-3.5 text-brand-purple" />
            <span className="truncate">{label}</span>
        </span>
    );
}

function PreviewFileChip({ images, videos }: { images: number; videos: number }) {
    const label = [images > 0 ? `${images} ${images === 1 ? "image" : "images"}` : null, videos > 0 ? `${videos} ${videos === 1 ? "video" : "videos"}` : null].filter(Boolean).join(", ");
    if (!label) return null;
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-xl" aria-label={label} title={label}>
            {images > 0 ? <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5 text-gray-300" />{images}</span> : null}
            {videos > 0 ? <span className="inline-flex items-center gap-1"><span aria-hidden="true">🎥</span>{videos}</span> : null}
        </div>
    );
}
