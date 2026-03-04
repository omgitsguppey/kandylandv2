"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

/**
 * Global SWR configuration. Provides caching, deduplication, and
 * stale-while-revalidate defaults for all useAuthSWR consumers.
 */
export function SWRProvider({ children }: { children: ReactNode }) {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: true,
                dedupingInterval: 5000,
                errorRetryCount: 2,
            }}
        >
            {children}
        </SWRConfig>
    );
}
