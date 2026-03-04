/**
 * Provides a deterministic, simulated unwrap count based on the current Central Standard Time (CST) hour.
 * This guarantees that all users globally see the exact same simulated "x people unwrapped this today" metric,
 * and that it resets identically for everyone at midnight CST.
 */

/**
 * Returns the current hour in Central Standard Time (0-23) and the day index.
 */
function getCSTTime(): { hour: number; daySeed: number } {
    const rawNow = new Date();
    // Use Intl.DateTimeFormat to force parsing exactly in CST/CDT
    const cstFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour12: false,
        hour: "numeric",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    });

    const parts = cstFormatter.formatToParts(rawNow);
    let hour = 0;
    let year = 0;
    let month = 0;
    let day = 0;

    for (const part of parts) {
        if (part.type === "hour") hour = parseInt(part.value, 10);
        if (part.type === "year") year = parseInt(part.value, 10);
        if (part.type === "month") month = parseInt(part.value, 10);
        if (part.type === "day") day = parseInt(part.value, 10);
    }

    // 24 is returned as 24 in some environments, normalize to 0
    if (hour === 24) hour = 0;

    // Create a stable daily seed combining the date string
    const daySeedStr = `${year}${month.toString().padStart(2, "0")}${day.toString().padStart(2, "0")}`;
    const daySeed = parseInt(daySeedStr, 10);

    return { hour, daySeed };
}

/**
 * Generates a pseudo-random baseline seed (between min and max) for a specific Drop ID on a specific Day.
 */
function generateDeterministicBase(dropId: string, daySeed: number, min: number, max: number): number {
    // Simple hash of dropId strings to integers
    let dropHash = 0;
    for (let i = 0; i < dropId.length; i++) {
        dropHash = (dropHash << 5) - dropHash + dropId.charCodeAt(i);
        dropHash |= 0;
    }

    // Combine hash with the day seed to ensure it changes every 24h CST
    const combinedSeed = Math.abs(dropHash ^ daySeed);

    // Mulberry32 pseudo-random generator
    let t = combinedSeed + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const randomFloat = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

    return Math.floor(randomFloat * (max - min + 1)) + min;
}

/**
 * Retrieves the simulated "Unwraps Today" count for any Drop ID.
 * Based heavily on CST current hour out of 24.
 * Base starting parameters: 10-34 (5-17 x2)
 * Peak EOD parameters: 907-1756
 */
export function getSimulatedUnwrapsToday(dropId: string | undefined | null): number {
    if (!dropId) return 0;

    const { hour, daySeed } = getCSTTime();

    // 1. Generate the deterministic starting count for Midnight-1AM (hour 0)
    // The requirement was baseline 5-17 x2 (so 10 to 34)
    const baseline = generateDeterministicBase(dropId, daySeed, 10, 34);

    // 2. Generate the deterministic peak cap for 11PM (hour 23)
    // The requirement was a max range of 907-1756
    const peakCap = generateDeterministicBase(dropId, daySeed, 907, 1756);

    // 3. Scale smoothly based on the current hour.
    // If hour === 0, result === baseline. If hour === 23, result === peakCap.
    // We use a slight exponential/log curve so it rises naturally (e.g. fewer early morning, faster mid-day)

    // Simple quadratic ease-in-out approximation for the day
    const progress = hour / 23; // 0.0 to 1.0
    // A linear growth scale: const currentFactor = progress;
    // An explosive growth scale: progress * progress

    // Let's use `progress ^ 1.5` to make it curve up toward the afternoon.
    const currentFactor = Math.pow(progress, 1.5);

    const currentUnwraps = Math.floor(baseline + (peakCap - baseline) * currentFactor);

    return currentUnwraps;
}
