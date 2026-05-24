export type OptionalManualLegacyPolicy =
    | "optional_quiet"
    | "manual_operator_action"
    | "legacy_visible_until_removal"
    | "not_optional_manual_or_legacy";

export function classifyOptionalManualLegacyRoutePolicy(routeKey: string) {
    const policy: OptionalManualLegacyPolicy = routeKey.startsWith("creator/messages:")
        ? "legacy_visible_until_removal"
        : routeKey.includes("manual") || routeKey.includes("balance-adjust")
            ? "manual_operator_action"
            : routeKey.includes(":DELETE")
                ? "optional_quiet"
                : "not_optional_manual_or_legacy";

    return {
        routeKey,
        policy,
        displaysLive: false,
        affectsScore: policy === "not_optional_manual_or_legacy",
        removalPolicy: policy === "legacy_visible_until_removal" ? "legacy creator-message routes remain visible until product-approved removal." : null,
        nextAction: policy === "not_optional_manual_or_legacy"
            ? "Classify this route through the required no-sample route cohort."
            : "Keep no-sample route out of live diagnostic health.",
    };
}
