"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, DollarSign, ShoppingBag, Users, Zap } from "lucide-react";

import type { AdminOverviewResponse, AdminOverviewMetricDelta } from "@/lib/admin-overview";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { cn } from "@/lib/utils";

type AdminStatsBarProps = {
    stats: AdminOverviewResponse["stats"];
    deltas: AdminOverviewResponse["deltas"];
    issueCount: number;
    truthState: AdminSurfaceState;
};

function formatDelta(delta: AdminOverviewMetricDelta) {
    if (delta.percentChange === null) {
        return "New";
    }

    const absoluteValue = Math.abs(delta.percentChange);
    if (absoluteValue === 0) {
        return "0%";
    }

    return `${delta.percentChange > 0 ? "+" : "-"}${absoluteValue.toFixed(absoluteValue >= 10 ? 0 : 1)}%`;
}

function DeltaBadge({ delta }: { delta: AdminOverviewMetricDelta }) {
    const tone = delta.direction === "up"
        ? "text-emerald-300"
        : delta.direction === "down"
            ? "text-rose-300"
            : "text-gray-300";
    const Icon = delta.direction === "up"
        ? ArrowUpRight
        : delta.direction === "down"
            ? ArrowDownRight
            : ArrowRight;

    return (
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", tone)}>
            <Icon className="h-3.5 w-3.5" />
            {formatDelta(delta)}
        </span>
    );
}

export function AdminStatsBar({ stats, deltas, issueCount, truthState }: AdminStatsBarProps) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <div className="rounded-[1.35rem] border border-white/8 bg-black/35 px-3.5 py-3.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                        <Users className="h-3.5 w-3.5 text-brand-purple" />
                        Accounts
                        <AdminStatusBadge state={truthState} className="ml-auto py-0.5" />
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-2">
                        <p className="text-lg font-black text-white md:text-[1.45rem]">{stats.totalUsers.toLocaleString()}</p>
                        <DeltaBadge delta={deltas.accounts} />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-500">{stats.currentWindowNewUsers.toLocaleString()} new in 30d</p>
                </div>

                <div className="rounded-[1.35rem] border border-white/8 bg-black/35 px-3.5 py-3.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                        <ShoppingBag className="h-3.5 w-3.5 text-brand-purple" />
                        Purchases (30d)
                        <AdminStatusBadge state={truthState} className="ml-auto py-0.5" />
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-2">
                        <p className="text-lg font-black text-white md:text-[1.45rem]">{stats.currentWindowPurchases.toLocaleString()}</p>
                        <DeltaBadge delta={deltas.purchases} />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-500">{stats.liveDrops} live of {stats.totalDrops} drops</p>
                </div>

                <div className="rounded-[1.35rem] border border-white/8 bg-black/35 px-3.5 py-3.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                        <DollarSign className="h-3.5 w-3.5 text-brand-purple" />
                        Lifetime revenue
                        <AdminStatusBadge state={truthState} className="ml-auto py-0.5" />
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-2">
                        <p className="font-mono text-lg font-black text-white md:text-[1.45rem]">${(stats.grossRevenueCents / 100).toFixed(2)}</p>
                        <DeltaBadge delta={deltas.revenue} />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-500">vs. prior 30d</p>
                </div>

                <div className="rounded-[1.35rem] border border-white/8 bg-black/35 px-3.5 py-3.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                        <Zap className="h-3.5 w-3.5 text-brand-purple" />
                        Lifetime unwraps
                        <AdminStatusBadge state={truthState} className="ml-auto py-0.5" />
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-2">
                        <p className="text-lg font-black text-white md:text-[1.45rem]">{stats.totalUnwraps.toLocaleString()}</p>
                        <DeltaBadge delta={deltas.unwraps} />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-500">vs. prior 30d</p>
                </div>
            </div>

            {issueCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                        {issueCount} overview read issue{issueCount === 1 ? "" : "s"}
                    </span>
                </div>
            )}
        </div>
    );
}
