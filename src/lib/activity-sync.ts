export const ACTIVITY_SYNC_EVENT = "kandydrops:activity-sync";

export function dispatchActivitySync() {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(ACTIVITY_SYNC_EVENT));
}
