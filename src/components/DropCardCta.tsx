"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { User } from "firebase/auth";

import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { DropCtaState } from "@/lib/drop-card-visibility";
import type { Drop } from "@/types/db";

interface DropCardCtaProps {
    drop: Drop;
    user: User | null;
    isUnlocked: boolean;
    accessLoading?: boolean;
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
    accessLoading = false,
    canAfford,
    ctaState,
    unlocking,
    confirming,
    onUnlock,
    onHaptic,
}: DropCardCtaProps) {
    if (isUnlocked && !accessLoading) {
        return (
            <Link
                href={`/dashboard/viewer?id=${drop.id}`}
                onClick={onHaptic}
                className={cn(buttonVariants({ variant: "brand" }), "w-full flex-wrap gap-2 px-1 whitespace-normal [overflow-wrap:anywhere]")}
                data-drop-card-cta="view"
            >
                <span className="min-w-0 max-w-full">View Content</span>
            </Link>
        );
    }

    return (
        <Button
            variant={confirming ? "default" : "brand"}
            type="button"
            onClick={onUnlock}
            disabled={accessLoading || unlocking}
            aria-busy={accessLoading || unlocking}
            className="w-full flex-wrap gap-2 px-1 whitespace-normal [overflow-wrap:anywhere]"
            data-drop-card-cta={ctaState}
        >
            {accessLoading ? (
                <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    <span className="min-w-0 max-w-full">Checking access</span>
                </>
            ) : unlocking ? (
                <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    <span className="min-w-0 max-w-full">Unwrapping...</span>
                </>
            ) : !user || ctaState === "create_profile" ? (
                <>
                    <span className="min-w-0 max-w-full">Create account to unwrap</span>
                </>
            ) : ctaState === "preview" ? (
                <>
                    <span className="min-w-0 max-w-full">Preview cover</span>
                </>
            ) : !canAfford || ctaState === "refill" ? (
                <>
                    <span className="min-w-0 max-w-full">Refill to unwrap</span>
                </>
            ) : confirming ? (
                <>
                    <span className="min-w-0 max-w-full">Confirm {drop.unlockCost} GD?</span>
                </>
            ) : (
                <>
                    <span className="min-w-0 max-w-full">Unwrap</span>
                </>
            )}
        </Button>
    );
}
