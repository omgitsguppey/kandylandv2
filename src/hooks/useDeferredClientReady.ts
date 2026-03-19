"use client";

import { useEffect, useState } from "react";

type DeferredClientReadyOptions = {
    enabled?: boolean;
    delayMs?: number;
    idle?: boolean;
};

export function useDeferredClientReady({
    enabled = true,
    delayMs = 0,
    idle = false,
}: DeferredClientReadyOptions = {}) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let cancelled = false;
        let timeoutId: number | null = null;
        let idleId: number | null = null;

        const markReady = () => {
            if (cancelled) {
                return;
            }

            if (delayMs > 0) {
                timeoutId = window.setTimeout(() => {
                    if (!cancelled) {
                        setReady(true);
                    }
                }, delayMs);
                return;
            }

            setReady(true);
        };

        if (idle && typeof window.requestIdleCallback === "function") {
            idleId = window.requestIdleCallback(() => {
                markReady();
            }, { timeout: Math.max(800, delayMs + 400) });
        } else if (idle) {
            timeoutId = window.setTimeout(markReady, Math.max(300, delayMs));
        } else {
            markReady();
        }

        return () => {
            cancelled = true;
            if (idleId !== null && typeof window.cancelIdleCallback === "function") {
                window.cancelIdleCallback(idleId);
            }
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [delayMs, enabled, idle]);

    return enabled && ready;
}
