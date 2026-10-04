"use client";

import type { SWRConfiguration, SWRResponse } from "swr";

import { useAuthSWR } from "@/hooks/useAuthSWR";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { shouldRetry4xx } from "@/lib/route-hardening/route-4xx-mitigation";

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
        shouldRetryOnError: (error: Error & { status?: number; state?: string; retryable?: boolean }) => {
            if (error.retryable === false || (error.status === 503 && error.state === "maintenance")) {
                return false;
            }
            if (typeof error.status === "number" && error.status >= 400 && error.status < 500
                && !shouldRetry4xx({ route: "/api/admin", method: "GET", statusCode: error.status }).retry) {
                return false;
            }
            const callerPolicy = config?.shouldRetryOnError;
            return typeof callerPolicy === "function" ? callerPolicy(error) : callerPolicy !== false;
        },
    } satisfies SWRConfiguration<T>;
}

export function useAdminPollingSWR<T = unknown>(
    url: string | null,
    refreshInterval: number,
    config?: SWRConfiguration<T>,
): SWRResponse<T> {
    return useAuthSWR<T>(url, createAdminPollingConfig(refreshInterval, config));
}
