"use client";

import { useEffect } from "react";
import { useCachedAuthSWR } from "@/hooks/useCachedAuthSWR";
import { CLIENT_RUNTIME_EVENTS } from "@/hooks/client-runtime";
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
        key: string;
        date: string;
        revenue: number;
        unwraps: number;
    }>;
}

export function useAdminOverview() {
    const swr = useCachedAuthSWR<AdminOverviewResponse>("/api/admin/overview", {
        cacheKey: "admin-overview",
        ttlMs: 20_000,
        refreshInterval: 5_000,
        revalidateOnFocus: true,
        keepPreviousData: true,
    });
    const { mutate } = swr;

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handleSync = () => {
            void mutate();
        };

        window.addEventListener(CLIENT_RUNTIME_EVENTS.adminOverviewSync, handleSync);
        return () => window.removeEventListener(CLIENT_RUNTIME_EVENTS.adminOverviewSync, handleSync);
    }, [mutate]);

    return swr;
}
