"use client";

import { AlertTriangle, Candy, PiggyBank, Sparkles } from "lucide-react";

import type { PlatformEconomyTreasurySummary } from "@/lib/platform-economy";

export type PlatformEconomyStripSourceState = "live" | "review" | "collecting" | "failed" | "source_missing";

function formatGd(value: number | null) {
    return value == null ? "--" : `${value.toLocaleString()} GD`;
}

function formatUsdRate(value: number | null) {
    return value == null ? "--" : `$${value.toFixed(2)} / 100 GD`;
}

function formatStripSourceStateLabel(sourceState: PlatformEconomyStripSourceState) {
    if (sourceState === "source_missing") return "Source missing";
    if (sourceState === "collecting") return "Collecting";
    if (sourceState === "failed") return "Failed";
    if (sourceState === "review") return "Needs review";
    return "Live";
}

const STRIP_ITEMS = [
    { key: "outstandingGd", label: "Outstanding GD", icon: Candy },
    { key: "paidGd", label: "Paid GD", icon: PiggyBank },
    { key: "paidBonusGd", label: "Bonus paid-source GD", icon: Sparkles },
    { key: "rewardFreeGd", label: "Reward/free GD", icon: Candy },
] as const;

export function PlatformEconomyStrip({
    treasury,
    warningCount,
    sourceState,
}: {
    treasury: PlatformEconomyTreasurySummary | null;
    warningCount: number;
    sourceState: PlatformEconomyStripSourceState;
}) {
    const hidesValues = sourceState === "source_missing" || sourceState === "collecting" || sourceState === "failed";

    return (
        <div
            className="sticky top-[72px] z-10 grid gap-2 rounded-[1.2rem] border border-white/10 bg-zinc-950/95 p-2 backdrop-blur md:grid-cols-7"
            data-admin-economy-strip-source-state={sourceState}
        >
            {STRIP_ITEMS.map((item) => {
                const Icon = item.icon;
                const value = treasury?.[item.key] as number | null | undefined;
                return (
                    <div key={item.key} className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-gray-500">
                            <Icon className="h-3.5 w-3.5 text-brand-purple" />
                            {item.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">{hidesValues ? "--" : formatGd(value ?? null)}</div>
                    </div>
                );
            })}
            <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Paid-source avg</div>
                <div className="mt-1 text-sm font-semibold text-white">{hidesValues ? "--" : formatUsdRate(treasury?.paidSourceAvgUsdPer100Gd ?? null)}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Floor state</div>
                <div className="mt-1 text-sm font-semibold text-white">{hidesValues ? formatStripSourceStateLabel(sourceState) : treasury?.floorState ?? "unknown"}</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warnings
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{hidesValues ? "--" : warningCount.toLocaleString()}</div>
            </div>
        </div>
    );
}
