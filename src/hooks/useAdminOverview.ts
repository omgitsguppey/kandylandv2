"use client";

import { useEffect } from "react";
import { listenForAdminOverviewSync } from "@/hooks/client-runtime";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import type { Drop, Transaction } from "@/types/db";

export interface AdminOverviewResponse {
    success: boolean;
    issues?: string[];
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
        key: string;
        date: string;
        revenue: number;
        unwraps: number;
    }>;
}

export function useAdminOverview() {
    const swr = useAdminPollingSWR<AdminOverviewResponse>("/api/admin/overview", 5_000);
    const { mutate } = swr;

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handleSync = () => {
            void mutate();
        };

        return listenForAdminOverviewSync(handleSync);
    }, [mutate]);

    return swr;
}
