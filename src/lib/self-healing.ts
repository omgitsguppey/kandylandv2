export interface AutoHealingObserverControl {
    /**
     * Manually triggers a disconnect and queues a reconnect loop.
     * Useful when capturing a snapshot error inside the callback to natively reattach.
     */
    triggerReconnect: (error?: unknown) => void;

    /**
     * Terminates the listener, halting both the active connection and any pending reconnection loops.
     */
    cleanup: () => void;
}

/**
 * Wraps a Firebase un-subscribable listener setup routine in an automatic healing loop.
 *
 * It is completely safe to call setupListener repeatedly, as the wrapper guards against memory leaks automatically.
 *
 * @param setupObserver - A function that establishes the connection and returns an un-subscribe function (or null/void).
 * @param onDisconnectNotify - An optional callback to hook telemetry.
 * @param retryDelayMs - The time (in milliseconds) to wait before re-acquiring the connection. Defaults to 5000ms.
 * @returns An object to manually control the listener status.
 */
export function createAutoHealingObserver(
    setupObserver: () => (() => void) | null | undefined | void,
    onDisconnectNotify?: (error: unknown) => void,
    retryDelayMs: number = 5000
): AutoHealingObserverControl {
    let unsubscribe: (() => void) | null | undefined | void = null;
    let timeoutId: number | undefined;
    let active = true;

    const connect = () => {
        if (!active) {
            return;
        }
        try {
            unsubscribe = setupObserver();
        } catch (error) {
            if (active) {
                triggerReconnect(error);
            }
        }
    };

    const triggerReconnect = (error?: unknown) => {
        if (!active) {
            return;
        }

        if (onDisconnectNotify && typeof error !== "undefined") {
            try {
                onDisconnectNotify(error);
            } catch {
                // Ignore telemetry errors from crashing the loop
            }
        }

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(connect, retryDelayMs);
    };

    connect();

    return {
        triggerReconnect,
        cleanup: () => {
            active = false;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        },
    };
}
