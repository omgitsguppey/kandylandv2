export type DeeplinkSource =
  | "notification_deeplink"
  | "creator_profile_link"
  | "drop_link"
  | "wallet_checkout_return"
  | "pwa_cached_route"
  | "release_notes_link"
  | "task_guidance_link"
  | "chat_deeplink"
  | "support_link"
  | "old_route_alias";

export interface DeeplinkBehavior {
  reasonClass: string;
  action: "redirect_to_canonical" | "gone_with_recovery" | "clear_cache_then_recover";
  safeCopy: string;
}

export interface StaleDeeplinkRouteAliasPolicyEntry {
  source: DeeplinkSource;
  examples: readonly string[];
  canonicalRoute: string;
  expiredBehavior: DeeplinkBehavior;
  deletedBehavior: DeeplinkBehavior;
  privateBehavior: DeeplinkBehavior;
  missingRouteRetryPolicy: "do_not_retry";
  telemetryEvent: string;
  debugLane: string;
  openRedirectRisk: "blocked";
}

export const STALE_DEEPLINK_ROUTE_ALIAS_POLICY: readonly StaleDeeplinkRouteAliasPolicyEntry[] = [
  {
    source: "notification_deeplink",
    examples: ["/notifications?target=drop", "/drops/[dropId]"],
    canonicalRoute: "/notifications",
    expiredBehavior: { reasonClass: "resource_unavailable_expired", action: "redirect_to_canonical", safeCopy: "That notification target expired. Showing current notifications." },
    deletedBehavior: { reasonClass: "resource_unavailable_deleted", action: "redirect_to_canonical", safeCopy: "That item is no longer available. Showing current notifications." },
    privateBehavior: { reasonClass: "resource_private_or_role_blocked", action: "gone_with_recovery", safeCopy: "That notification is not available for this account." },
    missingRouteRetryPolicy: "do_not_retry",
    telemetryEvent: "notification_deeplink_recovered",
    debugLane: "notifications",
    openRedirectRisk: "blocked",
  },
  {
    source: "pwa_cached_route",
    examples: ["/offline", "/drops/[dropId]"],
    canonicalRoute: "/",
    expiredBehavior: { reasonClass: "pwa_cache_stale_route", action: "clear_cache_then_recover", safeCopy: "This cached route is stale. Refreshing the app shell." },
    deletedBehavior: { reasonClass: "route_alias_removed", action: "clear_cache_then_recover", safeCopy: "This saved route is no longer available. Returning home." },
    privateBehavior: { reasonClass: "cached_private_route", action: "clear_cache_then_recover", safeCopy: "This cached screen needs a fresh sign-in." },
    missingRouteRetryPolicy: "do_not_retry",
    telemetryEvent: "pwa_stale_route_recovered",
    debugLane: "pwa_service_worker",
    openRedirectRisk: "blocked",
  },
  {
    source: "old_route_alias",
    examples: ["/creator/[username]", "/drop/[dropId]", "/account/support/[threadId]"],
    canonicalRoute: "/creators/[username] | /drops/[dropId] | /support",
    expiredBehavior: { reasonClass: "legacy_route_alias_expired", action: "gone_with_recovery", safeCopy: "That old link is expired. Open the current app route." },
    deletedBehavior: { reasonClass: "legacy_route_alias_removed", action: "gone_with_recovery", safeCopy: "That old route has been removed. Open the current app route." },
    privateBehavior: { reasonClass: "legacy_private_route_blocked", action: "gone_with_recovery", safeCopy: "That route is not available for this account." },
    missingRouteRetryPolicy: "do_not_retry",
    telemetryEvent: "legacy_route_alias_blocked",
    debugLane: "route_hardening",
    openRedirectRisk: "blocked",
  },
  {
    source: "chat_deeplink",
    examples: ["/chat/[threadId]"],
    canonicalRoute: "/chat",
    expiredBehavior: { reasonClass: "chat_thread_expired", action: "redirect_to_canonical", safeCopy: "That chat thread is no longer active. Showing current chats." },
    deletedBehavior: { reasonClass: "chat_thread_deleted", action: "redirect_to_canonical", safeCopy: "That chat thread was removed. Showing current chats." },
    privateBehavior: { reasonClass: "chat_thread_private", action: "gone_with_recovery", safeCopy: "You no longer have access to that chat." },
    missingRouteRetryPolicy: "do_not_retry",
    telemetryEvent: "chat_deeplink_recovered",
    debugLane: "chat",
    openRedirectRisk: "blocked",
  },
  {
    source: "task_guidance_link",
    examples: ["/tasks/[taskId]", "/daily-check-in"],
    canonicalRoute: "/dashboard",
    expiredBehavior: { reasonClass: "task_guidance_expired", action: "redirect_to_canonical", safeCopy: "That task changed. Showing current account actions." },
    deletedBehavior: { reasonClass: "task_guidance_removed", action: "redirect_to_canonical", safeCopy: "That task is no longer available. Showing current account actions." },
    privateBehavior: { reasonClass: "task_guidance_private", action: "gone_with_recovery", safeCopy: "Sign in to view your current account actions." },
    missingRouteRetryPolicy: "do_not_retry",
    telemetryEvent: "task_guidance_deeplink_recovered",
    debugLane: "tasks",
    openRedirectRisk: "blocked",
  },
];

export function validateStaleDeeplinkRouteAliasPolicy(entries = STALE_DEEPLINK_ROUTE_ALIAS_POLICY) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (!entry.canonicalRoute) failures.push(`${entry.source} lacks canonical route.`);
    if (entry.openRedirectRisk !== "blocked") failures.push(`${entry.source} redirect policy is unsafe.`);
    if (entry.missingRouteRetryPolicy !== "do_not_retry") failures.push(`${entry.source} can retry a missing route.`);
    for (const behavior of [entry.expiredBehavior, entry.deletedBehavior, entry.privateBehavior]) {
      if (!behavior.reasonClass || !behavior.safeCopy || /request failed|internal server error/iu.test(behavior.safeCopy)) {
        failures.push(`${entry.source} lacks safe behavior copy.`);
      }
    }
    if (!entry.telemetryEvent || !entry.debugLane) failures.push(`${entry.source} lacks telemetry/debug visibility.`);
  }
  return failures;
}

export function buildStaleDeeplinkRouteAliasPolicyReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateStaleDeeplinkRouteAliasPolicy();
  return {
    reportKey: "stale-deeplink-route-alias-policy",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    sourcesAudited: STALE_DEEPLINK_ROUTE_ALIAS_POLICY.length,
    staleDeepLinksFound: STALE_DEEPLINK_ROUTE_ALIAS_POLICY.filter((entry) => entry.source !== "old_route_alias").length,
    staleAliasesClassified: STALE_DEEPLINK_ROUTE_ALIAS_POLICY.filter((entry) => entry.source === "old_route_alias").length,
    validationFailures,
  };
}
