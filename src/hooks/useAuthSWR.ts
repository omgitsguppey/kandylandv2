"use client";

import useSWR, { SWRConfiguration, SWRResponse } from "swr";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";

type AuthSWRKey = readonly [string, string];

/**
 * SWR fetcher that uses authFetch to attach the Firebase ID token.
 * Throws on non-OK responses so SWR treats them as errors.
 */
async function authFetcher<T>([_userId, url]: AuthSWRKey): Promise<T> {
    const response = await authFetch(url);
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body.error || `Request failed with status ${response.status}`) as Error & { status: number; info: unknown };
        error.status = response.status;
        error.info = body;
        throw error;
    }
    return response.json() as Promise<T>;
}

/**
 * Authenticated SWR hook. Automatically skips fetching when the user is
 * not authenticated (returns `data: undefined, isLoading: false`).
 *
 * ```tsx
 * const { data, error, isLoading } = useAuthSWR<AnalyticsData>("/api/admin/analytics/realtime");
 * ```
 */
export function useAuthSWR<T = any>(
    url: string | null,
    config?: SWRConfiguration<T>,
): SWRResponse<T> {
    const { user } = useAuth();

    return useSWR<T>(
        user && url ? [user.uid, url] as const : null,
        authFetcher<T>,
        config,
    );
}
