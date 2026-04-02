"use client";

import type { SWRConfiguration, SWRResponse } from "swr";

import { useAuthSWR } from "@/hooks/useAuthSWR";

export function createAdminPollingConfig<T>(refreshInterval: number, config?: SWRConfiguration<T>) {
    return {
        keepPreviousData: true,
        revalidateOnFocus: true,
        refreshInterval,
        ...config,
    } satisfies SWRConfiguration<T>;
}

export function useAdminPollingSWR<T = unknown>(
    url: string | null,
    refreshInterval: number,
    config?: SWRConfiguration<T>,
): SWRResponse<T> {
    return useAuthSWR<T>(url, createAdminPollingConfig(refreshInterval, config));
}
