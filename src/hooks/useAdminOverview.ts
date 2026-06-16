"use client";

import { useAdminOverviewRealtime } from "./useAdminOverviewRealtime";

export function useAdminOverview(options: { enabled?: boolean } = {}) {
    return useAdminOverviewRealtime(options);
}
