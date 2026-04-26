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

export interface CompactInteractionRecoverySnapshot {
    activeTag: string | null;
    targetFocused: boolean;
    htmlOverflow: string;
    bodyOverflow: string;
    mainOverflow: string;
    htmlOverscrollBehaviorY: string;
    bodyOverscrollBehaviorY: string;
    mainOverscrollBehaviorY: string;
}

export interface CompactInteractionRecoveryControl {
    scheduleCheck: () => void;
    runCheck: () => boolean;
    cleanup: () => void;
}

function hasOpenDialog() {
    if (typeof document === "undefined") {
        return false;
    }

    return Boolean(document.querySelector(
        [
            "[aria-modal='true']",
            "[role='dialog']",
            "[data-radix-dialog-content]",
            "[data-state='open'][role='dialog']",
        ].join(", "),
    ));
}

function buildCompactInteractionRecoverySnapshot(target: HTMLElement | null): CompactInteractionRecoverySnapshot {
    const main = document.querySelector("main");
    const mainElement = main instanceof HTMLElement ? main : null;
    const activeElement = document.activeElement;

    return {
        activeTag: activeElement instanceof HTMLElement ? activeElement.tagName.toLowerCase() : null,
        targetFocused: Boolean(target && activeElement === target),
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body.style.overflow,
        mainOverflow: mainElement?.style.overflow ?? "",
        htmlOverscrollBehaviorY: document.documentElement.style.overscrollBehaviorY,
        bodyOverscrollBehaviorY: document.body.style.overscrollBehaviorY,
        mainOverscrollBehaviorY: mainElement?.style.overscrollBehaviorY ?? "",
    };
}

export function createCompactInteractionRecoveryGuard(input: {
    isEnabled: () => boolean;
    getTarget: () => HTMLElement | null;
    isOverlayOpen?: () => boolean;
    onRecovered?: (snapshot: CompactInteractionRecoverySnapshot) => void;
    delayMs?: number;
}): CompactInteractionRecoveryControl {
    let timeoutId: number | null = null;

    const runCheck = () => {
        timeoutId = null;

        if (typeof window === "undefined" || typeof document === "undefined" || !input.isEnabled()) {
            return false;
        }

        if (input.isOverlayOpen?.() || hasOpenDialog()) {
            return false;
        }

        const target = input.getTarget();
        const snapshot = buildCompactInteractionRecoverySnapshot(target);
        const hasUnexpectedLock = snapshot.htmlOverflow === "hidden"
            || snapshot.bodyOverflow === "hidden"
            || snapshot.mainOverflow === "hidden"
            || snapshot.htmlOverscrollBehaviorY === "none"
            || snapshot.bodyOverscrollBehaviorY === "none"
            || snapshot.mainOverscrollBehaviorY === "none";

        if (!snapshot.targetFocused && !hasUnexpectedLock) {
            return false;
        }

        if (snapshot.targetFocused) {
            target?.blur();
        }

        if (snapshot.htmlOverflow === "hidden") {
            document.documentElement.style.overflow = "";
        }
        if (snapshot.bodyOverflow === "hidden") {
            document.body.style.overflow = "";
        }

        const main = document.querySelector("main");
        if (main instanceof HTMLElement && main.style.overflow === "hidden") {
            main.style.overflow = "";
        }

        if (snapshot.htmlOverscrollBehaviorY === "none") {
            document.documentElement.style.overscrollBehaviorY = "";
        }
        if (snapshot.bodyOverscrollBehaviorY === "none") {
            document.body.style.overscrollBehaviorY = "";
        }
        if (main instanceof HTMLElement && main.style.overscrollBehaviorY === "none") {
            main.style.overscrollBehaviorY = "";
        }

        input.onRecovered?.(snapshot);
        return true;
    };

    return {
        scheduleCheck: () => {
            if (typeof window === "undefined") {
                return;
            }

            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }

            timeoutId = window.setTimeout(runCheck, input.delayMs ?? 180);
        },
        runCheck,
        cleanup: () => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
                timeoutId = null;
            }
        },
    };
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
    retryDelayMs: number = 2000,
    maxDelayMs: number = 60000
): AutoHealingObserverControl {
    let unsubscribe: (() => void) | null | undefined | void = null;
    let timeoutId: number | undefined;
    let active = true;
    let retryCount = 0;

    const connect = () => {
        if (!active) {
            return;
        }
        try {
            unsubscribe = setupObserver();
            // Reset retry count on successful connection attempt setup
            retryCount = 0;
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

        const delay = Math.min(retryDelayMs * Math.pow(2, retryCount), maxDelayMs);
        retryCount++;

        timeoutId = window.setTimeout(connect, delay);
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
