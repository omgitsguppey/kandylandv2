"use client";

import Link from "next/link";
import { Eye, Lock, Loader2, Unlock, Wallet } from "lucide-react";
import type { User } from "firebase/auth";

import { cn } from "@/lib/utils";
import type { DropCtaState } from "@/lib/drop-card-visibility";
import type { Drop } from "@/types/db";

interface DropCardCtaProps {
    drop: Drop;
    user: User | null;
    isUnlocked: boolean;
    canAfford: boolean;
    ctaState: DropCtaState;
    unlocking: boolean;
    confirming: boolean;
    onUnlock: () => void;
    onHaptic: () => void;
}

export function DropCardCta({
    drop,
    user,
    isUnlocked,
    canAfford,
    ctaState,
    unlocking,
    confirming,
    onUnlock,
    onHaptic,
}: DropCardCtaProps) {
    if (isUnlocked) {
        return (
            <Link
                href={`/dashboard/viewer?id=${drop.id}`}
                onClick={onHaptic}
                className="group relative flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[1rem] border border-brand-purple/55 bg-[linear-gradient(110deg,rgba(178,140,255,0.94),rgba(120,74,222,0.96))] px-3 py-2 text-xs font-black text-white shadow-[0_14px_30px_rgba(164,118,255,0.24)] transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70 md:px-4"
                data-drop-card-cta="view"
            >
                <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/60" aria-hidden="true" />
                <Unlock className="h-4 w-4" aria-hidden="true" />
                <span>View Content</span>
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={onUnlock}
            disabled={unlocking}
            aria-busy={unlocking}
            className={cn(
                "group relative flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[1rem] border px-3 py-2 text-xs font-black shadow-[0_14px_30px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70 md:px-4",
                !canAfford
                    ? "border-fuchsia-300/45 bg-[linear-gradient(110deg,rgba(178,140,255,0.94),rgba(217,70,239,0.9))] text-white hover:brightness-110"
                    : confirming
                        ? "border-white/70 bg-white text-black shadow-[0_12px_28px_rgba(255,255,255,0.18)]"
                        : ctaState === "preview" || ctaState === "create_profile"
                            ? "border-white/16 bg-white/[0.075] text-white hover:border-brand-purple/45 hover:bg-brand-purple/12"
                            : "border-brand-purple/55 bg-[linear-gradient(110deg,rgba(178,140,255,0.94),rgba(120,74,222,0.96))] text-white hover:brightness-110",
                "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            data-drop-card-cta={ctaState}
        >
            <span className={cn(
                "pointer-events-none absolute inset-x-4 top-0 h-px",
                confirming ? "bg-black/10" : "bg-white/50",
            )} aria-hidden="true" />
            {unlocking ? (
                <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    <span>Unwrapping...</span>
                </>
            ) : !user || ctaState === "create_profile" ? (
                <>
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    <span>Create account to unwrap</span>
                </>
            ) : ctaState === "preview" ? (
                <>
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>Preview cover</span>
                </>
            ) : !canAfford || ctaState === "refill" ? (
                <>
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                    <span>Refill to unwrap</span>
                </>
            ) : confirming ? (
                <>
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    <span>Confirm {drop.unlockCost} GD?</span>
                </>
            ) : (
                <>
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    <span>Unwrap</span>
                </>
            )}
        </button>
    );
}
