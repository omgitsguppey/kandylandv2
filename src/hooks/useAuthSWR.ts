"use client";

import useSWR, { SWRConfiguration, SWRResponse } from "swr";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { readUiJson } from "@/lib/ui-continuity";

type AuthSWRKey = readonly [string, string];

/**
 * SWR fetcher that uses authFetch to attach the Firebase ID token.
 * Uses the canonical decoder so HTTP and explicit JSON failures reach SWR as errors.
 */
async function authFetcher<T>([_userId, url]: AuthSWRKey): Promise<T> {
    const response = await authFetch(url);
    return readUiJson<T>(response, { moduleLabel: "Authenticated request", url });
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
