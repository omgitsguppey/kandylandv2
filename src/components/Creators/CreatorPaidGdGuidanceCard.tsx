"use client";

import { ChevronRight, Circle, Wallet } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatCompactGd } from "@/lib/gumdrop-formatting";
import { cn } from "@/lib/utils";

export type CreatorPaidGdGuidanceReason = "chat" | "fan_pass" | "request" | "booking" | "paid_media";

type CreatorPaidGdGuidanceCardProps = {
    creatorName: string;
    currentPaidGd: number;
    requiredPaidGd: number;
    reason: CreatorPaidGdGuidanceReason;
    onOpenWallet: () => void;
    onOpenDrops: () => void;
    onClose?: () => void;
    compact?: boolean;
    className?: string;
};

const REASON_COPY: Record<CreatorPaidGdGuidanceReason, {
    eyebrow: string;
    title: string;
    body: string;
}> = {
    chat: {
        eyebrow: "Private chat",
        title: "Paid GumDrops are required to message creators",
        body: "Reward GumDrops do not count toward private chat.",
    },
    fan_pass: {
        eyebrow: "Fan Pass",
        title: "Fan Pass uses paid GumDrops only",
        body: "Reward GumDrops do not count toward Fan Pass.",
    },
    request: {
        eyebrow: "Custom request",
        title: "Custom requests need paid GumDrops",
        body: "Custom requests use paid GumDrops, not reward balance.",
    },
    booking: {
        eyebrow: "Live time",
        title: "Bookings need paid GumDrops",
        body: "Reward GumDrops do not cover live-time bookings.",
    },
    paid_media: {
        eyebrow: "Paid media",
        title: "Paid creator media needs paid GumDrops",
        body: "Reward GumDrops do not unlock paid creator media or chat.",
    },
};

const PAID_SOURCE_RULE_COPY = "Creator experiences use paid GumDrops only.";
const FREE_GD_RULE_COPY = "Free GumDrops are only for unwrapping Drops.";

export function CreatorPaidGdGuidanceCard({
    creatorName,
    currentPaidGd,
    requiredPaidGd,
    reason,
    onOpenWallet,
    onOpenDrops,
    onClose,
    compact = false,
    className,
}: CreatorPaidGdGuidanceCardProps) {
    const copy = REASON_COPY[reason];
    const deficit = Math.max(0, requiredPaidGd - currentPaidGd);

    return (
        <section
            className={cn(
                "rounded-[1.35rem] border border-brand-purple/25 bg-[linear-gradient(135deg,rgba(122,75,255,0.18),rgba(24,18,38,0.96))] px-4 py-3 text-white shadow-[0_16px_40px_rgba(56,23,112,0.26)] ring-1 ring-white/8",
                compact && "px-3 py-3",
                className,
            )}
            aria-label={`${copy.eyebrow} guidance`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ccb8ff]">
                        {copy.eyebrow}
                    </p>
                    <p className="mt-1 text-[15px] font-semibold leading-5 text-white">
                        {copy.title}
                    </p>
                    <p className="mt-2 text-[12px] leading-5 text-[#e5ddff]">
                        {copy.body} {PAID_SOURCE_RULE_COPY} {FREE_GD_RULE_COPY}
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#cdbdff]">
                        Paid GD {formatCompactGd(currentPaidGd)} / Need {formatCompactGd(requiredPaidGd)} for {creatorName}
                    </p>
                </div>
                {typeof onClose === "function" ? (
                    <button
                        type="button"
                        aria-label="Close guidance"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <Circle className="h-3.5 w-3.5 fill-current" />
                    </button>
                ) : null}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Button
                    type="button"
                    onClick={onOpenWallet}
                    className="flex min-h-11 w-full items-center justify-between rounded-xl border border-transparent bg-brand-purple px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 hover:bg-brand-purple/90"
                >
                    <span className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Open Wallet
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">
                        Add {deficit > 0 ? formatCompactGd(deficit) : "more"} GD
                    </span>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onOpenDrops}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/6 text-sm font-bold text-white hover:bg-white/10"
                >
                    Go unwrap drops
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </section>
    );
}
