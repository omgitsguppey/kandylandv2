"use client";

import { useEffect } from "react";
import { listenForAdminOverviewSync } from "@/hooks/client-runtime";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import type { AdminOverviewResponse } from "@/lib/admin-overview";

export function useAdminOverview() {
    const swr = useAdminPollingSWR<AdminOverviewResponse>("/api/admin/overview", 15_000, {
        revalidateOnFocus: false,
    });
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
