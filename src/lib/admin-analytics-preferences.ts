export const ADMIN_ANALYTICS_DEFAULT_RANGE = "all" as const;

export const ADMIN_ANALYTICS_RANGE_OPTIONS = ["24h", "7d", "30d", "all"] as const;

export type AdminAnalyticsRangeOption = (typeof ADMIN_ANALYTICS_RANGE_OPTIONS)[number];

export type AdminAnalyticsModuleRangeMap = Partial<Record<string, AdminAnalyticsRangeOption>>;

export function isAdminAnalyticsRangeOption(value: unknown): value is AdminAnalyticsRangeOption {
    return typeof value === "string" && ADMIN_ANALYTICS_RANGE_OPTIONS.includes(value as AdminAnalyticsRangeOption);
}

export function normalizeAdminAnalyticsModuleRangeMap(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {} as AdminAnalyticsModuleRangeMap;
    }

    return Object.entries(value as Record<string, unknown>).reduce<AdminAnalyticsModuleRangeMap>((accumulator, [key, entry]) => {
        if (typeof key === "string" && key.trim().length > 0 && isAdminAnalyticsRangeOption(entry)) {
            accumulator[key.trim()] = entry;
        }
        return accumulator;
    }, {});
}
