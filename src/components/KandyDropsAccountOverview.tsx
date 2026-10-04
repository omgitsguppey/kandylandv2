"use client";

import NextImage from "next/image";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type AccountOverviewState = "loading" | "authenticated" | "guest";
export interface KandyDropsAccountOverviewProps {
    state: AccountOverviewState;
    displayName: string;
    subtitle: string;
    avatarUrl: string | null;
    avatarFallback: string;
    balanceLabel: string;
    onProfilePress: () => void;
    onWalletPress: () => void;
}

export function KandyDropsAccountOverview({ state, displayName, subtitle, avatarUrl, avatarFallback, balanceLabel, onProfilePress, onWalletPress }: KandyDropsAccountOverviewProps) {
    if (state === "loading") {
        return <p role="status" className="flex min-h-11 items-center text-sm text-muted-foreground">Checking your account…</p>;
    }
    return (
        <div className="flex min-w-0 flex-wrap items-start gap-2">
            <Button type="button" variant="ghost" className="min-w-0 max-w-full flex-1 basis-48 gap-3 whitespace-normal text-left" onClick={onProfilePress} aria-label="Open profile menu">
                <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary">
                    {avatarUrl ? <NextImage src={avatarUrl} alt="" fill sizes="44px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center">{avatarFallback}</span>}
                </span>
                <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block font-medium">{displayName}</span>
                    <span className="block text-sm text-muted-foreground">{subtitle}</span>
                </span>
            </Button>
            <Button type="button" variant="brand" className="max-w-full gap-2 whitespace-normal [overflow-wrap:anywhere]" onClick={onWalletPress} aria-label="Open wallet">
                <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{balanceLabel}</span>
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
        </div>
    );
}
