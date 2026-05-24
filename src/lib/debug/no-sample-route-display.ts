import type { NoSampleRouteCohort, NoSampleRouteCohortRecord } from "@/lib/debug/no-sample-route-cohort-classifier";

export type NoSampleRouteBadge =
    | "NO SAMPLE"
    | "REQUIRED SMOKE"
    | "OPTIONAL QUIET"
    | "LEGACY QUIET"
    | "MANUAL ACTION"
    | "SOURCE READY"
    | "UNKNOWN";

export function badgeForNoSampleRoute(record: NoSampleRouteCohortRecord): NoSampleRouteBadge {
    if (record.status === "unseen_required_smoke_needed") return "REQUIRED SMOKE";
    if (record.status === "unseen_optional_quiet") return "OPTIONAL QUIET";
    if (record.status === "unseen_manual_operator_action") return "MANUAL ACTION";
    if (record.status === "unseen_legacy_compat_quiet") return "LEGACY QUIET";
    if (record.status === "source_ready_no_sample_loaded") return "SOURCE READY";
    if (record.status === "unknown" || record.cohort === "unknown") return "UNKNOWN";
    return "NO SAMPLE";
}

export function buildNoSampleRouteDisplay(record: NoSampleRouteCohortRecord) {
    const badge = badgeForNoSampleRoute(record);
    return {
        routeKey: record.routeKey,
        badge,
        truthState: "unavailable" as const,
        liveBadgeAllowed: false,
        metricValue: "unavailable",
        drilldownOnly: record.drilldownOnly,
        copy: `No runtime sample has been recorded. Metrics are unavailable, not zero. ${record.nextAction}`,
    };
}

export function groupNoSampleRoutesByCohort(records: readonly NoSampleRouteCohortRecord[]) {
    const groups = {} as Record<NoSampleRouteCohort, { routeKeys: string[]; badge: NoSampleRouteBadge; nextActions: string[] }>;
    for (const record of records) {
        const group = groups[record.cohort] ?? { routeKeys: [], badge: badgeForNoSampleRoute(record), nextActions: [] };
        group.routeKeys.push(record.routeKey);
        group.nextActions.push(record.nextAction);
        groups[record.cohort] = group;
    }
    return {
        defaultCollapsed: true,
        drilldownAvailable: true,
        groups,
    };
}
