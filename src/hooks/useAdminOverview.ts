"use client";

import { useEffect } from "react";
import { useAuthSWR } from "@/hooks/useAuthSWR";
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
    const swr = useAuthSWR<AdminOverviewResponse>("/api/admin/overview", {
        refreshInterval: 30_000,
        revalidateOnFocus: true,
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
