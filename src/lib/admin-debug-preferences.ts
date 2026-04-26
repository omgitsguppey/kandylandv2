export const ADMIN_DEBUG_DEFAULT_TAB = "now" as const;

export const ADMIN_DEBUG_TAB_OPTIONS = [
    "now",
    "actions",
    "monitoring",
    "infrastructure",
    "ai",
    "advanced",
] as const;

export const ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS = [
    "all",
    "failing",
    "stale",
    "unseen",
    "native_chat",
    "compatibility_chat",
] as const;

export type AdminDebugTabOption = (typeof ADMIN_DEBUG_TAB_OPTIONS)[number];
export type AdminDebugRouteRuntimeFilter = (typeof ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS)[number];

export type AdminDebugPreferences = {
    activeTab?: AdminDebugTabOption;
    routeRuntimeFilter?: AdminDebugRouteRuntimeFilter;
};

export function isAdminDebugTabOption(value: unknown): value is AdminDebugTabOption {
    return typeof value === "string" && ADMIN_DEBUG_TAB_OPTIONS.includes(value as AdminDebugTabOption);
}

export function isAdminDebugRouteRuntimeFilter(value: unknown): value is AdminDebugRouteRuntimeFilter {
    return typeof value === "string"
        && ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS.includes(value as AdminDebugRouteRuntimeFilter);
}

export function normalizeAdminDebugPreferences(value: unknown): AdminDebugPreferences {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    const source = value as {
        activeTab?: unknown;
        routeRuntimeFilter?: unknown;
    };

    return {
        activeTab: isAdminDebugTabOption(source.activeTab) ? source.activeTab : undefined,
        routeRuntimeFilter: isAdminDebugRouteRuntimeFilter(source.routeRuntimeFilter)
            ? source.routeRuntimeFilter
            : undefined,
    };
}
