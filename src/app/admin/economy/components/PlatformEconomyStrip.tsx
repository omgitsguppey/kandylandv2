"use client";

import { AlertTriangle, Candy, PiggyBank, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlatformEconomyTreasurySummary } from "@/lib/platform-economy";
import type { EconomyWarningSummary } from "./types";

export type PlatformEconomyStripSourceState = "live" | "review" | "collecting" | "failed" | "source_missing";

function formatGd(value: number | null) {
    return value == null ? "--" : `${value.toLocaleString()} GD`;
}
function formatUsdRate(value: number | null) {
    return value == null ? "--" : `$${value.toFixed(2)} / 100 GD`;
}
function formatStripSourceStateLabel(sourceState: PlatformEconomyStripSourceState) {
    if (sourceState === "source_missing") return "No source";
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

export function PlatformEconomyStrip({ treasury, warningSummary, sourceState }: {
    treasury: PlatformEconomyTreasurySummary | null; warningSummary: EconomyWarningSummary; sourceState: PlatformEconomyStripSourceState;
}) {
    const hidesValues = sourceState === "source_missing" || sourceState === "collecting" || sourceState === "failed";
    return <Card className="min-w-0 gap-0 py-0" data-admin-economy-strip-source-state={sourceState}>
        <CardContent className="min-w-0 p-4">
            <dl className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-6 gap-y-4">
                {STRIP_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const value = treasury?.[item.key] as number | null | undefined;
                    return <div key={item.key} className="min-w-0">
                        <dt className="flex items-start gap-2 text-sm text-muted-foreground"><Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{item.label}</span></dt>
                        <dd className="mt-1 break-words text-lg font-semibold tabular-nums text-foreground">{hidesValues ? "--" : formatGd(value ?? null)}</dd>
                    </div>;
                })}
                <div className="min-w-0"><dt className="break-words text-sm text-muted-foreground">Paid-source avg</dt>
                    <dd className="mt-1 break-words text-lg font-semibold tabular-nums text-foreground">{hidesValues ? "--" : formatUsdRate(treasury?.paidSourceAvgUsdPer100Gd ?? null)}</dd></div>
                <div className="min-w-0"><dt className="break-words text-sm text-muted-foreground">Floor state</dt>
                    <dd className="mt-1 break-words text-lg font-semibold text-foreground">{hidesValues ? formatStripSourceStateLabel(sourceState) : treasury?.floorState ?? "unknown"}</dd></div>
                <div className="min-w-0"><dt className="flex items-start gap-2 text-sm text-warning"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>Warnings</span></dt>
                    <dd className="mt-1 break-words text-lg font-semibold tabular-nums text-foreground">{warningSummary.count === null ? "--" : `${warningSummary.sourceState === "verified" ? "" : "≥"}${warningSummary.count.toLocaleString()}`}</dd></div>
            </dl>
        </CardContent>
    </Card>;
}
