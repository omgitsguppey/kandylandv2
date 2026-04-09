export const ADMIN_UI_CHART_HEALTH_CATEGORIES = [
    "overview",
    "operations",
    "audience",
    "commerce",
    "security",
] as const;

export const ADMIN_UI_CHART_HEALTH_PAGES = [
    "dashboard",
    "analytics",
    "moderation",
    "debug",
] as const;

export const ADMIN_UI_CHART_HEALTH_SOURCES = [
    "overview_snapshot",
    "historical_analytics",
    "realtime_analytics",
    "mixed_client_live",
] as const;

export const ADMIN_UI_CHART_HEALTH_STATES = [
    "loading",
    "loaded",
    "background_degraded",
    "empty",
    "failed",
] as const;

export const ADMIN_UI_CHART_HEALTH_STATUSES = [
    "healthy",
    "warn",
    "fail",
] as const;

export type AdminUiChartHealthCategory = typeof ADMIN_UI_CHART_HEALTH_CATEGORIES[number];
export type AdminUiChartHealthPage = typeof ADMIN_UI_CHART_HEALTH_PAGES[number];
export type AdminUiChartHealthSource = typeof ADMIN_UI_CHART_HEALTH_SOURCES[number];
export type AdminUiChartHydrationState = typeof ADMIN_UI_CHART_HEALTH_STATES[number];
export type AdminUiChartHealthStatus = typeof ADMIN_UI_CHART_HEALTH_STATUSES[number];
export type AdminUiChartHealthFreshness = "fresh" | "stale" | "unseen";

export type AdminUiChartHealthItem = {
    key: string;
    title: string;
    page: AdminUiChartHealthPage;
    category: AdminUiChartHealthCategory;
    source: AdminUiChartHealthSource;
    status: AdminUiChartHealthStatus;
    hydrationState: AdminUiChartHydrationState;
    hasData: boolean;
    summary: string;
    action: string;
    issueCount: number;
    issueMessages: string[];
    updatedAtMs: number;
};

type BuildAdminUiChartHealthItemInput = {
    key: string;
    title: string;
    page: AdminUiChartHealthPage;
    category: AdminUiChartHealthCategory;
    source: AdminUiChartHealthSource;
    updatedAtMs?: number;
    hasLoaded: boolean;
    loading?: boolean;
    hasData: boolean;
    blockingIssues?: Array<string | null | undefined>;
    backgroundIssues?: Array<string | null | undefined>;
    healthySummary: string;
    emptySummary: string;
    healthyAction?: string;
    loadingAction?: string;
    emptyAction?: string;
    degradedAction?: string;
    failedAction?: string;
};

export function getAdminUiChartHealthTone(status: AdminUiChartHealthStatus) {
    if (status === "healthy") {
        return "good" as const;
    }

    if (status === "fail") {
        return "bad" as const;
    }

    return "warn" as const;
}

export function getAdminUiChartHealthFreshness(
    item: Pick<AdminUiChartHealthItem, "updatedAtMs">,
    nowMs = Date.now(),
    staleAfterMs = 15 * 60_000,
): AdminUiChartHealthFreshness {
    if (!item.updatedAtMs || item.updatedAtMs <= 0) {
        return "unseen";
    }

    return nowMs - item.updatedAtMs > staleAfterMs ? "stale" : "fresh";
}

export function buildAdminUiChartHealthItem(input: BuildAdminUiChartHealthItemInput): AdminUiChartHealthItem {
    const blockingIssues = (input.blockingIssues ?? []).filter(
        (issue): issue is string => typeof issue === "string" && issue.trim().length > 0,
    );
    const backgroundIssues = (input.backgroundIssues ?? []).filter(
        (issue): issue is string => typeof issue === "string" && issue.trim().length > 0,
    );
    const updatedAtMs = input.updatedAtMs ?? Date.now();

    if (blockingIssues.length > 0) {
        return {
            key: input.key,
            title: input.title,
            page: input.page,
            category: input.category,
            source: input.source,
            status: "fail",
            hydrationState: "failed",
            hasData: input.hasData,
            summary: blockingIssues[0],
            action: input.failedAction ?? "Review the failing source before treating this admin surface as current.",
            issueCount: blockingIssues.length,
            issueMessages: blockingIssues,
            updatedAtMs,
        };
    }

    if (!input.hasLoaded && input.loading) {
        return {
            key: input.key,
            title: input.title,
            page: input.page,
            category: input.category,
            source: input.source,
            status: "warn",
            hydrationState: "loading",
            hasData: false,
            summary: "Still waiting on the first loaded snapshot.",
            action: input.loadingAction ?? "Wait for the first authenticated snapshot before trusting this section.",
            issueCount: 0,
            issueMessages: [],
            updatedAtMs,
        };
    }

    if (!input.hasData) {
        return {
            key: input.key,
            title: input.title,
            page: input.page,
            category: input.category,
            source: input.source,
            status: "warn",
            hydrationState: "empty",
            hasData: false,
            summary: input.emptySummary,
            action: input.emptyAction ?? "Confirm whether this section is truly empty or whether its source data is missing.",
            issueCount: backgroundIssues.length,
            issueMessages: backgroundIssues,
            updatedAtMs,
        };
    }

    if (backgroundIssues.length > 0) {
        return {
            key: input.key,
            title: input.title,
            page: input.page,
            category: input.category,
            source: input.source,
            status: "warn",
            hydrationState: "background_degraded",
            hasData: true,
            summary: backgroundIssues[0],
            action: input.degradedAction ?? "Review the degraded source before treating this section as fully current.",
            issueCount: backgroundIssues.length,
            issueMessages: backgroundIssues,
            updatedAtMs,
        };
    }

    return {
        key: input.key,
        title: input.title,
        page: input.page,
        category: input.category,
        source: input.source,
        status: "healthy",
        hydrationState: "loaded",
        hasData: true,
        summary: input.healthySummary,
        action: input.healthyAction ?? "No action required.",
        issueCount: 0,
        issueMessages: [],
        updatedAtMs,
    };
}

export function summarizeAdminUiChartHealth(items: readonly AdminUiChartHealthItem[]) {
    const summaryByCategory = ADMIN_UI_CHART_HEALTH_CATEGORIES.reduce<Record<AdminUiChartHealthCategory, {
        total: number;
        healthy: number;
        warn: number;
        fail: number;
    }>>((summary, category) => {
        summary[category] = {
            total: 0,
            healthy: 0,
            warn: 0,
            fail: 0,
        };
        return summary;
    }, {} as Record<AdminUiChartHealthCategory, {
        total: number;
        healthy: number;
        warn: number;
        fail: number;
    }>);

    items.forEach((item) => {
        const categorySummary = summaryByCategory[item.category];
        categorySummary.total += 1;
        categorySummary[item.status] += 1;
    });

    return {
        total: items.length,
        healthy: items.filter((item) => item.status === "healthy").length,
        warn: items.filter((item) => item.status === "warn").length,
        fail: items.filter((item) => item.status === "fail").length,
        byCategory: summaryByCategory,
    };
}
