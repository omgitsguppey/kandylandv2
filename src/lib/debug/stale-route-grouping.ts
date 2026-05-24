import { classifyNoSampleRouteCohort } from "@/lib/debug/no-sample-route-cohort-classifier";

export type StaleRouteGroupingInput = {
    routeKey: string;
    risk: string;
    lastResult: string;
    ageDays: number | null;
    serverErrors: number;
    clientErrors: number;
    hasSample: boolean;
};

type Group = {
    routeKeys: string[];
};

function group(): Group {
    return { routeKeys: [] };
}

export function groupStaleRouteSamples(items: readonly StaleRouteGroupingInput[]) {
    const groups = {
        stale5To7Days: group(),
        stale8To14Days: group(),
        stale15DaysPlus: group(),
        criticalStale: group(),
        staleWithServerErrorHistory: group(),
        staleWithClientErrorHistory: group(),
        staleSuccessOnly: group(),
        noSampleRequired: group(),
        noSampleOptional: group(),
        defaultCollapsed: true,
        drilldownAvailable: true,
    };

    for (const item of items) {
        if (!item.hasSample) {
            const noSample = classifyNoSampleRouteCohort(item.routeKey);
            if (noSample.status === "unseen_optional_quiet" || noSample.status === "unseen_manual_operator_action" || noSample.status === "unseen_legacy_or_deprecated") {
                groups.noSampleOptional.routeKeys.push(item.routeKey);
            } else {
                groups.noSampleRequired.routeKeys.push(item.routeKey);
            }
            continue;
        }

        if (item.risk === "critical") groups.criticalStale.routeKeys.push(item.routeKey);
        if (item.serverErrors > 0 || item.lastResult === "server_error") groups.staleWithServerErrorHistory.routeKeys.push(item.routeKey);
        if (item.clientErrors > 0 || item.lastResult === "client_error") groups.staleWithClientErrorHistory.routeKeys.push(item.routeKey);
        if (item.lastResult === "success" && item.serverErrors === 0 && item.clientErrors === 0) groups.staleSuccessOnly.routeKeys.push(item.routeKey);

        const age = item.ageDays ?? 0;
        if (age >= 15) groups.stale15DaysPlus.routeKeys.push(item.routeKey);
        else if (age >= 8) groups.stale8To14Days.routeKeys.push(item.routeKey);
        else if (age >= 5) groups.stale5To7Days.routeKeys.push(item.routeKey);
    }

    return groups;
}
