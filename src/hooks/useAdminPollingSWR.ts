"use client";

import type { SWRConfiguration, SWRResponse } from "swr";

import { useAuthSWR } from "@/hooks/useAuthSWR";
import { reportClientIssue } from "@/lib/client-error-reporting";

export function createAdminPollingConfig<T>(refreshInterval: number, config?: SWRConfiguration<T>) {
    return {
        keepPreviousData: true,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        refreshInterval,
        onError: (error: Error, key: string) => {
            reportClientIssue({
                channel: "swr",
                severity: "warn",
                message: `Admin polling SWR error on ${key}`,
                error,
                detail: { key, refreshInterval },
                consoleLabel: `[AdminPollingSWR] ${key} failed`,
            });
        },
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
