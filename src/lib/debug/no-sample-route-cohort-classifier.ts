import { classifyRouteSampleFreshness, type RouteSampleFreshnessStatus } from "@/lib/debug/route-sample-freshness-classifier";

export type NoSampleRouteCohort =
    | "required_admin_write"
    | "optional_admin_delete"
    | "manual_operator_action"
    | "ai_admin_config"
    | "creator_intake"
    | "creator_content"
    | "native_chat_optional"
    | "support_operator"
    | "legacy_or_deprecated"
    | "public_user"
    | "unknown";

export type NoSampleRouteCohortRecord = {
    routeKey: string;
    cohort: NoSampleRouteCohort;
    status: RouteSampleFreshnessStatus;
    displaysLive: false;
    nextAction: string;
};

function inferCohort(routeKey: string): NoSampleRouteCohort {
    if (routeKey.includes(":DELETE")) return "optional_admin_delete";
    if (routeKey.includes("manual") || routeKey.includes("balance-adjust")) return "manual_operator_action";
    if (routeKey.startsWith("admin/creator-account-controls") || routeKey.startsWith("admin/creator-agreements")) return "required_admin_write";
    if (routeKey.startsWith("admin/ai/")) return "ai_admin_config";
    if (routeKey.startsWith("support/") || routeKey.startsWith("admin/support/")) return "support_operator";
    if (routeKey.startsWith("chat/")) return "native_chat_optional";
    if (routeKey.startsWith("creator/messages")) return "legacy_or_deprecated";
    if (routeKey.startsWith("creator/requests") || routeKey.startsWith("creator/onboarding")) return "creator_intake";
    if (routeKey.startsWith("creator/")) return "creator_content";
    if (routeKey.startsWith("user/") || routeKey.startsWith("drops/")) return "public_user";
    return "unknown";
}

function optionalityFor(cohort: NoSampleRouteCohort) {
    if (cohort === "optional_admin_delete" || cohort === "native_chat_optional") return "optional";
    if (cohort === "manual_operator_action") return "manual";
    if (cohort === "legacy_or_deprecated") return "legacy";
    return "required";
}

export function classifyNoSampleRouteCohort(routeKey: string): NoSampleRouteCohortRecord {
    const cohort = inferCohort(routeKey);
    const record = classifyRouteSampleFreshness({
        routeKey,
        method: routeKey.split(":").pop() || "GET",
        risk: cohort === "required_admin_write" || cohort === "support_operator" ? "high" : "medium",
        optionality: optionalityFor(cohort),
        cluster: cohort,
        hasSample: false,
        lastResult: "no_sample",
        lastSampleAgeMs: null,
        freshnessWindowMs: 24 * 60 * 60 * 1000,
        sampleRequiredForBeta: cohort === "required_admin_write" || cohort === "support_operator",
    });

    return {
        routeKey,
        cohort,
        status: record.status,
        displaysLive: false,
        nextAction: record.nextAction,
    };
}
