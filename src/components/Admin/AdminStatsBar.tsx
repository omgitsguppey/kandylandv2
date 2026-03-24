"use client";

import { Users, Package, DollarSign, Activity } from "lucide-react";
import { useAdminOverview } from "@/hooks/useAdminOverview";

export interface AdminStats {
    totalUsers: number;
    activeDrops: number;
    totalDrops: number;
    grossRevenueCents: number;
    totalUnwraps: number;
}

/**
 * Owns the users, drops, and revenue onSnapshot listeners.
 * Renders the summary stat cards shown inside the analytics link banner.
 */
export function AdminStatsBar() {
    const { data } = useAdminOverview();
    const stats: AdminStats = data?.stats || {
        totalUsers: 0,
        activeDrops: 0,
        totalDrops: 0,
        grossRevenueCents: 0,
        totalUnwraps: 0,
    };

    return (
        <div className="grid grid-cols-2 gap-px bg-white/5">
            <div className="bg-black/60 p-3.5 backdrop-blur-md md:p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500"><Users className="h-3 w-3 text-brand-purple" /> Accounts</p>
                <p className="text-lg font-black text-white md:text-xl">{stats.totalUsers}</p>
            </div>
            <div className="bg-black/60 p-3.5 backdrop-blur-md md:p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500"><Activity className="h-3 w-3 text-brand-purple" /> Active / All</p>
                <p className="text-lg font-black text-white md:text-xl">{stats.activeDrops} / {stats.totalDrops}</p>
            </div>
            <div className="bg-black/60 p-3.5 backdrop-blur-md md:p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500"><DollarSign className="h-3 w-3 text-brand-purple" /> Lifetime Rev</p>
                <p className="font-mono text-base font-black text-white md:text-xl">${(stats.grossRevenueCents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-black/60 p-3.5 backdrop-blur-md md:p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500"><Package className="h-3 w-3 text-brand-purple" /> Unwraps</p>
                <p className="text-lg font-black text-white md:text-xl">{stats.totalUnwraps.toLocaleString()}</p>
            </div>
        </div>
    );
}
