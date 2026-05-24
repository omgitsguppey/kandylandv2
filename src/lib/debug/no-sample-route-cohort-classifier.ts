import { classifyRouteSampleFreshness, type RouteSampleFreshnessStatus } from "@/lib/debug/route-sample-freshness-classifier";

export type NoSampleRouteCohort =
    | "auth_proxy_high_risk"
    | "firebase_proxy_infra"
    | "creator_monetization_write"
    | "creator_settings_write"
    | "creator_requests_write"
    | "creator_payouts_write"
    | "creator_legacy_messages_compat"
    | "notification_dispatch_write"
    | "task_materializer_write"
    | "cron_subscription_processor"
    | "drops_tracking_write"
    | "support_guest_intake"
    | "support_thread_write"
    | "settings_landing_config"
    | "user_profile_read"
    | "user_follow_write"
    | "user_security_write"
    | "manual_operator_action"
    | "optional_quiet"
    | "unknown";

export type NoSampleRouteCohortRecord = {
    routeKey: string;
    method: string;
    cohort: NoSampleRouteCohort;
    status: RouteSampleFreshnessStatus;
    risk: "low" | "medium" | "high" | "critical";
    sampleRequiredForBeta: boolean;
    sampleRequiredForLaunch: boolean;
    canBeQuiet: boolean;
    displaysLive: false;
    drilldownOnly: boolean;
    scoreImpact: number;
    nextAction: string;
};

export const BATCH21_NO_SAMPLE_ROUTE_KEYS = [
    "creator/payouts:POST",
    "creator/payouts:PUT",
    "creator/requests:POST",
    "creator/requests:PUT",
    "creator/settings:PUT",
    "cron/process-creator-subscriptions:GET",
    "drops/track:POST",
    "__/auth/[...path]:GET",
    "__/auth/[...path]:HEAD",
    "__/auth/[...path]:POST",
    "__/firebase/[...path]:HEAD",
    "creator/messages:DELETE",
    "creator/messages:POST",
    "notifications:POST",
    "settings/landing:GET",
    "settings/landing/upload:POST",
    "support/threads/[threadId]:PATCH",
    "support/threads/guest:POST",
    "tasks/materialize:POST",
    "user/follow:POST",
    "user/profile:GET",
    "user/revoke-sessions:POST",
] as const;

function inferCohort(routeKey: string): NoSampleRouteCohort {
    if (routeKey.startsWith("__/auth/")) return "auth_proxy_high_risk";
    if (routeKey.startsWith("__/firebase/")) return "firebase_proxy_infra";
    if (routeKey.startsWith("creator/messages:")) return "creator_legacy_messages_compat";
    if (routeKey.startsWith("creator/payouts:")) return "creator_payouts_write";
    if (routeKey.startsWith("creator/requests:")) return "creator_requests_write";
    if (routeKey.startsWith("creator/settings:")) return "creator_settings_write";
    if (routeKey.startsWith("cron/process-creator-subscriptions:")) return "cron_subscription_processor";
    if (routeKey.startsWith("drops/track:")) return "drops_tracking_write";
    if (routeKey.startsWith("notifications:POST")) return "notification_dispatch_write";
    if (routeKey.startsWith("settings/landing")) return "settings_landing_config";
    if (routeKey.startsWith("support/threads/guest:")) return "support_guest_intake";
    if (routeKey.startsWith("support/threads/[threadId]:")) return "support_thread_write";
    if (routeKey.startsWith("tasks/materialize:")) return "task_materializer_write";
    if (routeKey.startsWith("user/follow:")) return "user_follow_write";
    if (routeKey.startsWith("user/profile:GET")) return "user_profile_read";
    if (routeKey.startsWith("user/revoke-sessions:")) return "user_security_write";
    if (routeKey.includes("manual") || routeKey.includes("balance-adjust")) return "manual_operator_action";
    if (routeKey.includes(":DELETE")) return "optional_quiet";
    return "unknown";
}

function methodFromRouteKey(routeKey: string) {
    return routeKey.split(":").pop() || "GET";
}

function optionalityFor(cohort: NoSampleRouteCohort, routeKey: string) {
    if (cohort === "creator_legacy_messages_compat") return "legacy_compat";
    if (cohort === "manual_operator_action") return "manual";
    if (cohort === "optional_quiet") return "optional";
    if (
        cohort === "auth_proxy_high_risk"
        || cohort === "firebase_proxy_infra"
        || cohort === "notification_dispatch_write"
        || cohort === "drops_tracking_write"
        || cohort === "settings_landing_config"
        || cohort === "user_profile_read"
    ) return "source_ready";
    if (routeKey.includes("deprecated")) return "deprecated";
    return "required";
}

function riskFor(cohort: NoSampleRouteCohort): NoSampleRouteCohortRecord["risk"] {
    if (cohort === "creator_payouts_write") return "critical";
    if (
        cohort === "auth_proxy_high_risk"
        || cohort === "creator_settings_write"
        || cohort === "creator_requests_write"
        || cohort === "cron_subscription_processor"
        || cohort === "notification_dispatch_write"
        || cohort === "task_materializer_write"
        || cohort === "support_guest_intake"
        || cohort === "support_thread_write"
        || cohort === "user_follow_write"
        || cohort === "user_security_write"
    ) return "high";
    if (cohort === "unknown") return "medium";
    return "medium";
}

function nextActionFor(cohort: NoSampleRouteCohort, routeKey: string, status: RouteSampleFreshnessStatus) {
    if (status === "unseen_required_smoke_needed") return `${routeKey} needs approved source/contract smoke evidence before it can be treated as current.`;
    if (cohort === "auth_proxy_high_risk") return `${routeKey} is Firebase auth proxy infrastructure; keep source-ready no-sample until formal runtime evidence is attached.`;
    if (cohort === "firebase_proxy_infra") return `${routeKey} is Firebase proxy infrastructure; keep metrics unavailable until sampled.`;
    if (cohort === "creator_legacy_messages_compat") return `${routeKey} stays visible under legacy creator-message compatibility policy until removal is approved.`;
    if (cohort === "notification_dispatch_write") return `${routeKey} has source dispatch coverage but needs a safe contract or runtime sample before current health.`;
    if (cohort === "manual_operator_action") return `${routeKey} is manual/operator-only and must not affect live health.`;
    if (cohort === "optional_quiet") return `${routeKey} is optional quiet no-sample; keep out of live health unless sampled.`;
    return `${routeKey} has no runtime sample; metrics are unavailable, not zero.`;
}

export function classifyNoSampleRouteCohort(routeKey: string): NoSampleRouteCohortRecord {
    const cohort = inferCohort(routeKey);
    const method = methodFromRouteKey(routeKey);
    const optionality = optionalityFor(cohort, routeKey);
    const risk = riskFor(cohort);
    const canBeQuiet = optionality === "optional" || optionality === "manual" || optionality === "legacy_compat";
    const sampleRequiredForBeta = !canBeQuiet && (
        risk === "high"
        || risk === "critical"
        || cohort === "creator_payouts_write"
        || cohort === "user_security_write"
    );
    const sampleRequiredForLaunch = sampleRequiredForBeta || cohort === "auth_proxy_high_risk";
    const record = classifyRouteSampleFreshness({
        routeKey,
        method,
        risk,
        optionality,
        cluster: cohort,
        hasSample: false,
        lastResult: "no_sample",
        lastSampleAgeMs: null,
        freshnessWindowMs: 24 * 60 * 60 * 1000,
        sampleRequiredForBeta,
    });

    return {
        routeKey,
        method,
        cohort,
        status: record.status,
        risk,
        sampleRequiredForBeta,
        sampleRequiredForLaunch,
        canBeQuiet,
        displaysLive: false,
        drilldownOnly: canBeQuiet,
        scoreImpact: canBeQuiet ? 0 : risk === "critical" ? 3 : risk === "high" ? 2 : 1,
        nextAction: nextActionFor(cohort, routeKey, record.status),
    };
}
