"use client";

import { useAuthSWR } from "@/hooks/useAuthSWR";
import type { Drop, Transaction } from "@/types/db";

export interface AdminOverviewResponse {
    success: boolean;
    stats: {
        totalUsers: number;
        activeDrops: number;
        totalDrops: number;
        grossRevenueCents: number;
        totalUnwraps: number;
    };
    recentTransactions: Array<Transaction & { username?: string }>;
    adminActivity: Array<Transaction & { username?: string }>;
    topDrops: Drop[];
    chartData: Array<{
        key: number;
        date: string;
        revenue: number;
        unwraps: number;
    }>;
}

export function useAdminOverview() {
    return useAuthSWR<AdminOverviewResponse>("/api/admin/overview", {
        refreshInterval: 30_000,
        revalidateOnFocus: true,
    });
}
