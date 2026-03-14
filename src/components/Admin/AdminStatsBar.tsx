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
            <div className="bg-black/60 p-4 md:p-5 backdrop-blur-md">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><Users className="w-3 h-3 text-brand-purple" /> Accounts</p>
                <p className="text-xl md:text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-black/60 p-4 md:p-5 backdrop-blur-md">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><Activity className="w-3 h-3 text-brand-purple" /> Active / All</p>
                <p className="text-xl md:text-2xl font-bold text-white">{stats.activeDrops} / {stats.totalDrops}</p>
            </div>
            <div className="bg-black/60 p-4 md:p-5 backdrop-blur-md">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><DollarSign className="w-3 h-3 text-brand-purple" /> Lifetime Rev</p>
                <p className="text-lg md:text-2xl font-bold text-white font-mono">${(stats.grossRevenueCents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-black/60 p-4 md:p-5 backdrop-blur-md">
                <p className="text-xs text-gray-400 flex items-center gap-2 mb-1"><Package className="w-3 h-3 text-brand-purple" /> Unwraps</p>
                <p className="text-xl md:text-2xl font-bold text-white">{stats.totalUnwraps.toLocaleString()}</p>
            </div>
        </div>
    );
}
