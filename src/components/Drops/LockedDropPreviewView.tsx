"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Eye, Image as ImageIcon, Loader2, Lock, Share2, Unlock, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { Button, buttonVariants } from "@/components/ui/Button";
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
    drop, creator, truth, socialProof, mediaCounts, timerLabel, timerFullLabel,
    authLoading, unlocking, confirming, selectedReaction, onReact, onCtaClick,
    onOpenLibrary, onKeepUnwrapping, onShare,
}: LockedDropPreviewViewProps) {
    const creatorLabel = creator?.username
        ? `@${creator.username}`
        : creator?.displayName ?? "KandyDrops Creator";
    const tags = Array.isArray(drop.tags) ? drop.tags.slice(0, 2) : [];

    return (
        <div
            className="relative isolate mx-auto flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px))] w-full min-w-0 max-w-5xl flex-col px-4 pb-4 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] text-foreground"
            data-drop-preview-page="true"
            data-drop-preview-urgency-tier={truth.urgencyTier}
            data-drop-preview-cta-state={truth.ctaState}
            data-drop-preview-social-proof-type={truth.socialProofType}
            data-drop-preview-creator-cover-eligible={truth.creatorCoverPreviewEligible}
            data-safe-preview-fields-only="true"
        >
            <nav aria-label="Drop preview" className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3">
                <Link href="/drops" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-w-0 gap-2")}>
                    <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                    Drops
                </Link>
                <ReportBugButton context="drop-preview-page" variant="icon" label="Report a bug" />
            </nav>

            <header className="mb-6 min-w-0 space-y-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <p className="min-w-0 text-sm text-muted-foreground [overflow-wrap:anywhere]">{creatorLabel}</p>
                    <Button type="button" variant="ghost" size="sm" onClick={onShare} className="min-w-0 gap-2" data-drop-preview-share-button="true" data-drop-preview-creator-share-eligible={truth.creatorCoverPreviewEligible}>
                        <Share2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                        Share
                    </Button>
                </div>
                <h1 className="text-3xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere]">{drop.title}</h1>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="max-w-full min-w-0 whitespace-normal border-0 text-sm [overflow-wrap:anywhere]">{drop.unlockCost.toLocaleString()} GD</Badge>
                    {tags.map((tag) => (
                        <span key={tag} className="max-w-full min-w-0 text-sm text-muted-foreground [overflow-wrap:anywhere]">{tag}</span>
                    ))}
                </div>
            </header>

            <section aria-label="Drop details" className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-6">
                <CoverHero drop={drop} truth={truth} mediaCounts={mediaCounts} />

                <div className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
                    <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">{drop.description}</p>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground" data-drop-preview-social-proof-type={socialProof.type}>
                        <span className="inline-flex min-w-0 items-center gap-2">
                            {socialProof.type === "unwraps" ? <Unlock aria-hidden="true" className="h-4 w-4 shrink-0" /> : <Eye aria-hidden="true" className="h-4 w-4 shrink-0" />}
                            {socialProof.label}
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-2" aria-label={timerFullLabel} title={timerFullLabel}>
                            <Clock aria-hidden="true" className="h-4 w-4 shrink-0" />
                            {timerLabel}
                        </span>
                    </div>
                    <UrgencyBand truth={truth} />
                    {truth.isUnlocked ? <SuccessPanel /> : <FeedbackStrip selectedReaction={selectedReaction} onReact={onReact} />}
                </div>
            </section>

            <StickyPreviewCta
                truth={truth}
                unlockCost={drop.unlockCost}
                authLoading={authLoading}
                unlocking={unlocking}
                confirming={confirming}
                onCtaClick={onCtaClick}
                onOpenLibrary={onOpenLibrary}
                onKeepUnwrapping={onKeepUnwrapping}
                onShare={onShare}
            />
        </div>
    );
}

function CoverHero({ drop, truth, mediaCounts }: Pick<LockedDropPreviewViewProps, "drop" | "truth" | "mediaCounts">) {
    const imagePolicy = getImageLoadingPolicy("drop_preview", { isLcpCandidate: true });
    const mediaLabel = [
        mediaCounts.images > 0 ? `${mediaCounts.images} ${mediaCounts.images === 1 ? "image" : "images"}` : null,
        mediaCounts.videos > 0 ? `${mediaCounts.videos} ${mediaCounts.videos === 1 ? "video" : "videos"}` : null,
    ].filter(Boolean).join(", ");

    return (
        <Card className="mx-auto w-[min(100%,64vw,280px)] min-w-0 gap-0 overflow-hidden p-0 sm:w-[min(100%,52vw,320px)]" data-drop-preview-cover-treatment={truth.coverTreatment} data-drop-preview-cover-aspect="1:1">
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
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 p-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                <span>{drop.type === "promo" ? "Drop" : "Limited Release"}</span>
                {mediaLabel ? (
                    <span className="inline-flex min-w-0 flex-wrap items-center gap-2" aria-label={mediaLabel} title={mediaLabel}>
                        {mediaCounts.images > 0 ? <span className="inline-flex items-center gap-1"><ImageIcon aria-hidden="true" className="h-4 w-4 shrink-0" />{mediaCounts.images}</span> : null}
                        {mediaCounts.videos > 0 ? <span className="inline-flex items-center gap-1"><span aria-hidden="true">🎥</span>{mediaCounts.videos}</span> : null}
                    </span>
                ) : null}
            </div>
        </Card>
    );
}

function UrgencyBand({ truth }: { truth: LockedDropPreviewTruth }) {
    const phrase = !truth.isActive ? "Unavailable" : truth.urgencyTier === "critical" ? "Final minutes" : truth.urgencyTier === "urgent" ? "Window closing" : truth.urgencyTier === "warm" ? "Ends today" : "Available Now";
    return (
        <p className={cn("text-sm font-medium", truth.urgencyTier === "critical" ? "text-destructive" : truth.urgencyTier === "urgent" || truth.urgencyTier === "warm" ? "text-warning" : "text-muted-foreground")}>
            {phrase}
        </p>
    );
}

function SuccessPanel() {
    return (
        <div role="status" className="flex min-w-0 items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-success" />
            <div className="min-w-0">
                <h2 className="text-lg font-semibold">Saved to your KandyDrops.</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Open it now or keep browsing live Drops.</p>
            </div>
        </div>
    );
}

function FeedbackStrip({ selectedReaction, onReact }: Pick<LockedDropPreviewViewProps, "selectedReaction" | "onReact">) {
    return (
        <div className="min-w-0">
            <p className="mb-2 text-sm font-medium">Vibe check</p>
            <div className="flex min-w-0 flex-wrap gap-2">
                {FEEDBACK_REACTIONS.map((reaction) => (
                    <Button key={reaction.key} type="button" variant="ghost" size="icon" onClick={() => onReact(reaction.key, reaction.label)} aria-label={reaction.label} aria-pressed={selectedReaction === reaction.key} className={cn("text-xl", selectedReaction === reaction.key && "bg-secondary text-foreground")}>
                        <span aria-hidden="true">{reaction.emoji}</span>
                    </Button>
                ))}
            </div>
        </div>
    );
}

function StickyPreviewCta({ truth, unlockCost, authLoading, unlocking, confirming, onCtaClick, onOpenLibrary, onKeepUnwrapping, onShare }: Pick<LockedDropPreviewViewProps, "truth" | "authLoading" | "unlocking" | "confirming" | "onCtaClick" | "onOpenLibrary" | "onKeepUnwrapping" | "onShare"> & { unlockCost: number }) {
    const shouldShowLockedCta = truth.shouldShowSignupCta || truth.shouldShowTopUpCta || truth.shouldShowUnwrapCta;
    if (!truth.isUnlocked && !truth.shouldShowCreatorShareCta && !shouldShowLockedCta) return null;

    return (
        <div className="navigation-material sticky bottom-[calc(var(--user-mobile-bottom-nav-reserved-height,0px)+0.75rem)] z-30 mt-6 min-w-0 rounded-2xl p-3" data-drop-preview-sticky-cta-above-bottom-nav="true">
            {truth.isUnlocked ? (
                <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-2">
                    <Button type="button" variant="brand" onClick={onOpenLibrary} className="min-h-12 min-w-0 gap-2 whitespace-normal px-4 [overflow-wrap:anywhere]">
                        <Unlock aria-hidden="true" className="h-4 w-4 shrink-0" />
                        Open in My KandyDrops
                    </Button>
                    <Button type="button" variant="ghost" onClick={onKeepUnwrapping} className="min-h-12 min-w-0 whitespace-normal px-4 [overflow-wrap:anywhere]">Keep Unwrapping</Button>
                </div>
            ) : truth.shouldShowCreatorShareCta ? (
                <Button type="button" variant="brand" onClick={onShare} className="min-h-11 w-full min-w-0 gap-2 whitespace-normal px-4 [overflow-wrap:anywhere]">
                    <Share2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                    Share cover
                </Button>
            ) : (
                <Button type="button" variant="brand" onClick={onCtaClick} disabled={authLoading || unlocking} aria-busy={unlocking} className="min-h-[3.25rem] w-full min-w-0 gap-2 whitespace-normal px-4 [overflow-wrap:anywhere]">
                    <CoverCtaIcon truth={truth} unlocking={unlocking} />
                    {getCoverCtaLabel({ truth, authLoading, unlocking, confirming, unlockCost })}
                </Button>
            )}
        </div>
    );
}

function CoverCtaIcon({ truth, unlocking }: { truth: LockedDropPreviewTruth; unlocking: boolean }) {
    if (unlocking) return <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />;
    if (truth.shouldShowTopUpCta) return <Wallet aria-hidden="true" className="h-4 w-4 shrink-0" />;
    return <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />;
}

function getCoverCtaLabel({ truth, authLoading, unlocking, confirming, unlockCost }: { truth: LockedDropPreviewTruth; authLoading: boolean; unlocking: boolean; confirming: boolean; unlockCost: number }) {
    if (authLoading) return "Checking access";
    if (unlocking) return "Unwrapping...";
    if (truth.shouldShowSignupCta) return "Create account to unwrap";
    if (truth.shouldShowTopUpCta) return "Refill to unwrap";
    if (confirming) return `Confirm ${unlockCost.toLocaleString()} GD?`;
    return `Unwrap for ${unlockCost.toLocaleString()} GD`;
}
