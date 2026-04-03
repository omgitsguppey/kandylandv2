"use client";

import { useEffect, useState } from "react";
import type { SWRConfiguration, SWRResponse } from "swr";

import { useAuth } from "@/context/AuthContext";
import { reportStorageIssue } from "@/lib/client-error-reporting";
import { useAuthSWR } from "@/hooks/useAuthSWR";

type CachedEnvelope<T> = {
    value: T;
    savedAtMs: number;
};

type CachedAuthSWRConfig<T> = SWRConfiguration<T> & {
    cacheKey: string;
    ttlMs: number;
};

type CachedAuthSWRResponse<T> = SWRResponse<T> & {
    cacheHydrated: boolean;
    cacheAgeMs: number | null;
    hydratedFromCache: boolean;
};

function readCachedEnvelope<T>(cacheKey: string, ttlMs: number) {
    if (typeof window === "undefined") {
        return { value: undefined, ageMs: null as number | null };
    }

    try {
        const raw = window.sessionStorage.getItem(cacheKey);
        if (!raw) {
            return { value: undefined, ageMs: null as number | null };
        }

        const parsed = JSON.parse(raw) as Partial<CachedEnvelope<T>>;
        const savedAtMs = typeof parsed.savedAtMs === "number" ? parsed.savedAtMs : 0;
        if (!savedAtMs || Date.now() - savedAtMs > ttlMs) {
            window.sessionStorage.removeItem(cacheKey);
            return { value: undefined, ageMs: null as number | null };
        }

        return {
            value: parsed.value as T,
            ageMs: Math.max(0, Date.now() - savedAtMs),
        };
    } catch (error) {
        reportStorageIssue("cached auth swr read", error, {
            cacheKey,
        });
        return { value: undefined, ageMs: null as number | null };
    }
}

function writeCachedEnvelope<T>(cacheKey: string, value: T) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const envelope: CachedEnvelope<T> = {
            value,
            savedAtMs: Date.now(),
        };
        window.sessionStorage.setItem(cacheKey, JSON.stringify(envelope));
    } catch (error) {
        reportStorageIssue("cached auth swr write", error, {
            cacheKey,
        });
    }
}

export function useCachedAuthSWR<T = unknown>(
    url: string | null,
    config: CachedAuthSWRConfig<T>,
): CachedAuthSWRResponse<T> {
    const { user } = useAuth();
    const { cacheKey, ttlMs, ...swrConfig } = config;
    const ownerKey = user?.uid ?? "anonymous";
    const scopedCacheKey = user ? `${user.uid}:${cacheKey}` : cacheKey;
    const [cacheState, setCacheState] = useState<{
        key: string;
        ownerKey: string;
        cacheHydrated: boolean;
        fallbackData: T | undefined;
        displayData: T | undefined;
        cacheAgeMs: number | null;
    }>({
        key: url ? "" : scopedCacheKey,
        ownerKey,
        cacheHydrated: !url,
        fallbackData: undefined,
        displayData: undefined,
        cacheAgeMs: null,
    });

    const cacheMatchesKey = cacheState.key === scopedCacheKey;
    const cacheHydrated = url ? cacheMatchesKey && cacheState.cacheHydrated : true;
    const fallbackData = cacheMatchesKey ? cacheState.fallbackData : undefined;
    const cacheAgeMs = cacheMatchesKey ? cacheState.cacheAgeMs : null;
    const displayData = cacheState.ownerKey === ownerKey ? cacheState.displayData : undefined;

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const timerId = window.setTimeout(() => {
            if (!url) {
                setCacheState({
                    key: scopedCacheKey,
                    ownerKey,
                    cacheHydrated: true,
                    fallbackData: undefined,
                    displayData: undefined,
                    cacheAgeMs: null,
                });
                return;
            }

            const cached = readCachedEnvelope<T>(scopedCacheKey, ttlMs);
            setCacheState((current) => {
                const preservedDisplayData = current.ownerKey === ownerKey ? current.displayData : undefined;

                return {
                    key: scopedCacheKey,
                    ownerKey,
                    cacheHydrated: true,
                    fallbackData: cached.value,
                    displayData: cached.value ?? preservedDisplayData,
                    cacheAgeMs: cached.ageMs,
                };
            });
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [ownerKey, scopedCacheKey, ttlMs, url]);

    const response = useAuthSWR<T>(
        cacheHydrated ? url : null,
        {
            ...swrConfig,
            fallbackData,
            onSuccess: (data, key, swrOptions) => {
                writeCachedEnvelope(scopedCacheKey, data);
                setCacheState((current) => (
                    current.key === scopedCacheKey
                        ? {
                            key: scopedCacheKey,
                            ownerKey,
                            cacheHydrated: true,
                            fallbackData: data,
                            displayData: data,
                            cacheAgeMs: 0,
                        }
                        : current
                ));
                swrConfig.onSuccess?.(data, key, swrOptions);
            },
        },
    );

    const stableData = response.data ?? fallbackData ?? displayData;

    return {
        ...response,
        data: stableData,
        cacheHydrated,
        cacheAgeMs,
        hydratedFromCache: cacheMatchesKey && fallbackData !== undefined,
    };
}
