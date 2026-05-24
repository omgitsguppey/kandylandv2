import { BATCH21_NO_SAMPLE_ROUTE_KEYS, classifyNoSampleRouteCohort } from "@/lib/debug/no-sample-route-cohort-classifier";

export type HighRiskRouteSmokeType =
    | "source_validator"
    | "local_safe_route_contract"
    | "formal_runtime_required"
    | "manual_operator_smoke"
    | "not_safe_to_auto_smoke";

export function buildHighRiskNoSampleRouteSmokePlan() {
    return BATCH21_NO_SAMPLE_ROUTE_KEYS
        .map((routeKey) => classifyNoSampleRouteCohort(routeKey))
        .filter((record) => record.risk === "high" || record.risk === "critical" || record.sampleRequiredForLaunch)
        .map((record) => {
            const smokeType: HighRiskRouteSmokeType = record.cohort === "creator_payouts_write"
                ? "manual_operator_smoke"
                : record.cohort === "auth_proxy_high_risk"
                    ? "formal_runtime_required"
                    : record.cohort === "user_security_write"
                        ? "local_safe_route_contract"
                        : record.method === "POST" || record.method === "PUT" || record.method === "PATCH"
                            ? "local_safe_route_contract"
                            : "source_validator";
            const owner = record.cohort === "creator_payouts_write"
                ? "creator_monetization"
                : record.cohort === "auth_proxy_high_risk" || record.cohort === "user_security_write"
                    ? "security"
                    : record.cohort.includes("support")
                        ? "support"
                        : record.cohort.includes("notification")
                            ? "notifications"
                            : "route_runtime";
            return {
                routeKey: record.routeKey,
                whyHighRisk: `${record.cohort} is ${record.risk} risk and has no runtime sample.`,
                smokeType,
                sampleRequired: record.sampleRequiredForLaunch || record.sampleRequiredForBeta,
                owner,
                productionRouteCallAllowed: false,
                nextAction: `${record.routeKey}: ${record.nextAction}`,
            };
        });
}
