export const DROP_COUNTDOWN_ONE_SECOND_MS = 1000;
export const DROP_COUNTDOWN_ONE_MINUTE_MS = 60 * DROP_COUNTDOWN_ONE_SECOND_MS;
export const DROP_COUNTDOWN_ONE_HOUR_MS = 60 * DROP_COUNTDOWN_ONE_MINUTE_MS;
export const DROP_COUNTDOWN_ONE_DAY_MS = 24 * DROP_COUNTDOWN_ONE_HOUR_MS;

export type DropCountdownUrgency = "calm" | "warm" | "critical";

export interface DropCountdownLabel {
    visibleLabel: string;
    fullLabel: string;
    urgencyState: DropCountdownUrgency;
    isCountdownOnly: boolean;
}

function padTimerPart(value: number) {
    return value.toString().padStart(2, "0");
}

function formatCountdownClock(msLeft: number) {
    const totalSeconds = Math.max(0, Math.floor(msLeft / DROP_COUNTDOWN_ONE_SECOND_MS));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${padTimerPart(hours)}:${padTimerPart(minutes)}:${padTimerPart(seconds)}`;
}

function formatFullCountdownLabel(msLeft: number) {
    const totalSeconds = Math.max(0, Math.floor(msLeft / DROP_COUNTDOWN_ONE_SECOND_MS));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [
        `${hours} hour${hours === 1 ? "" : "s"}`,
        `${minutes} minute${minutes === 1 ? "" : "s"}`,
        `${seconds} second${seconds === 1 ? "" : "s"}`,
    ];

    return `Ends in ${parts.join(", ")}`;
}

export function formatDropCountdown(validUntil: number | undefined, nowMs: number): DropCountdownLabel {
    if (!Number.isFinite(validUntil)) {
        return {
            visibleLabel: "Always",
            fullLabel: "Always available",
            urgencyState: "calm",
            isCountdownOnly: false,
        };
    }

    const msLeft = Math.max(0, (validUntil as number) - nowMs);
    if (msLeft === 0) {
        return {
            visibleLabel: "Expired",
            fullLabel: "Expired",
            urgencyState: "critical",
            isCountdownOnly: false,
        };
    }

    const urgencyState: DropCountdownUrgency = msLeft <= 4 * DROP_COUNTDOWN_ONE_HOUR_MS
        ? "critical"
        : msLeft <= DROP_COUNTDOWN_ONE_DAY_MS
            ? "warm"
            : "calm";

    if (msLeft > DROP_COUNTDOWN_ONE_DAY_MS) {
        const days = Math.ceil(msLeft / DROP_COUNTDOWN_ONE_DAY_MS);
        const dayLabel = `${days} day${days === 1 ? "" : "s"}`;

        return {
            visibleLabel: `Ends in ${dayLabel}`,
            fullLabel: `Ends in ${dayLabel}`,
            urgencyState,
            isCountdownOnly: false,
        };
    }

    return {
        visibleLabel: formatCountdownClock(msLeft),
        fullLabel: formatFullCountdownLabel(msLeft),
        urgencyState,
        isCountdownOnly: true,
    };
}
