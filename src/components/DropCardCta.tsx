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
                className="flex min-h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.7rem] border border-brand-purple bg-gradient-to-r from-brand-purple to-purple-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(164,118,255,0.24)] transition-all active:scale-95 md:px-4 md:py-2 md:text-xs"
            >
                <Unlock className="h-3 w-3" />
                View Content
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
                "relative flex min-h-10 w-full items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[0.7rem] border px-2.5 py-1.5 text-[10px] font-bold shadow-lg transition-all active:scale-95 md:px-4 md:py-2 md:text-xs",
                !canAfford
                    ? "border-brand-purple bg-gradient-to-r from-brand-purple to-purple-500 text-white shadow-[0_0_15px_rgba(164,118,255,0.3)] hover:opacity-95"
                    : confirming
                        ? "border-white bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.22)]"
                        : "border-brand-purple bg-gradient-to-r from-brand-purple to-purple-500 text-white shadow-[0_0_15px_rgba(164,118,255,0.28)] hover:opacity-95",
                "disabled:cursor-not-allowed disabled:opacity-50",
            )}
        >
            {unlocking ? (
                <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    <span>Unwrapping...</span>
                </>
            ) : !user || ctaState === "create_profile" ? (
                <>
                    <Lock className="h-3 w-3" />
                    <span>Create account to unwrap</span>
                </>
            ) : ctaState === "preview" ? (
                <>
                    <Eye className="h-3 w-3" />
                    <span>Preview cover</span>
                </>
            ) : !canAfford || ctaState === "refill" ? (
                <>
                    <Wallet className="h-3 w-3" />
                    <span>Refill to unwrap</span>
                </>
            ) : confirming ? (
                <>
                    <Lock className="h-3 w-3" />
                    <span>Confirm {drop.unlockCost} GD?</span>
                </>
            ) : (
                <>
                    <Lock className="h-3 w-3" />
                    <span>Unwrap</span>
                </>
            )}
        </button>
    );
}
