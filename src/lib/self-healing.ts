import { classifyFirestoreClientRetry } from "@/lib/firestore-client-errors";

export interface AutoHealingObserverControl {
    /**
     * Classifies a listener failure and schedules finite recovery.
     * Omitting the error is an explicit request to start a new recovery epoch.
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
    isDocumentScrollLockExpected?: () => boolean;
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
        const documentScrollLockExpected = input.isDocumentScrollLockExpected?.() === true;
        const hasUnexpectedLock = !documentScrollLockExpected && (snapshot.htmlOverflow === "hidden"
            || snapshot.bodyOverflow === "hidden"
            || snapshot.mainOverflow === "hidden"
            || snapshot.htmlOverscrollBehaviorY === "none"
            || snapshot.bodyOverscrollBehaviorY === "none"
            || snapshot.mainOverscrollBehaviorY === "none");

        if (!snapshot.targetFocused && !hasUnexpectedLock) {
            return false;
        }

        if (snapshot.targetFocused) {
            target?.blur();
        }

        if (!documentScrollLockExpected && snapshot.htmlOverflow === "hidden") {
            document.documentElement.style.overflow = "";
        }
        if (!documentScrollLockExpected && snapshot.bodyOverflow === "hidden") {
            document.body.style.overflow = "";
        }

        const main = document.querySelector("main");
        if (!documentScrollLockExpected && main instanceof HTMLElement && main.style.overflow === "hidden") {
            main.style.overflow = "";
        }

        if (!documentScrollLockExpected && snapshot.htmlOverscrollBehaviorY === "none") {
            document.documentElement.style.overscrollBehaviorY = "";
        }
        if (!documentScrollLockExpected && snapshot.bodyOverscrollBehaviorY === "none") {
            document.body.style.overscrollBehaviorY = "";
        }
        if (!documentScrollLockExpected && main instanceof HTMLElement && main.style.overscrollBehaviorY === "none") {
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
 * @param setupObserver - A function that establishes the connection and returns an un-subscribe function (or null/void).
 * @param onDisconnectNotify - An optional callback to hook telemetry.
 * @param retryDelayMs - Initial reconnect delay, growing within one finite recovery epoch. Defaults to 2000ms.
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
    let settled: "permanent" | "exhausted" | null = null;
    const maxReconnectAttempts = 4;

    const clearRetry = () => {
        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
            timeoutId = undefined;
        }
    };

    const detach = () => {
        const currentUnsubscribe = unsubscribe;
        unsubscribe = null;
        if (currentUnsubscribe) {
            currentUnsubscribe();
        }
    };

    const connect = () => {
        if (!active || settled) {
            return;
        }
        timeoutId = undefined;
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

        if (typeof error === "undefined") {
            clearRetry();
            retryCount = 0;
            settled = null;
        } else {
            if (settled) return;
            if (!classifyFirestoreClientRetry(error).retryable) {
                settled = "permanent";
                clearRetry();
                detach();
            } else if (timeoutId !== undefined) {
                return;
            }
        }

        if (onDisconnectNotify && typeof error !== "undefined") {
            try {
                onDisconnectNotify(error);
            } catch {
                // Ignore telemetry errors from crashing the loop
            }
        }

        detach();
        if (settled) return;
        if (retryCount >= maxReconnectAttempts) {
            settled = "exhausted";
            return;
        }

        const delay = Math.min(retryDelayMs * Math.pow(2, retryCount), maxDelayMs);
        retryCount++;

        timeoutId = window.setTimeout(connect, delay);
    };

    const recoverOnline = () => {
        if (active && settled === "exhausted") triggerReconnect();
    };

    if (typeof window !== "undefined") window.addEventListener("online", recoverOnline);

    connect();

    return {
        triggerReconnect,
        cleanup: () => {
            active = false;
            clearRetry();
            if (typeof window !== "undefined") window.removeEventListener("online", recoverOnline);
            detach();
        },
    };
}
