import type { Route4xxClass } from "./route-4xx-taxonomy";

export type RouteParamName =
  | "username"
  | "creatorId"
  | "userId"
  | "dropId"
  | "threadId"
  | "messageId"
  | "taskId"
  | "packageId"
  | "notificationId"
  | "slug"
  | "sessionId"
  | "unknown";

export type RouteResourceClass =
  | "user"
  | "creator"
  | "drop"
  | "media"
  | "chat_thread"
  | "message"
  | "task"
  | "wallet_package"
  | "notification"
  | "support_ticket"
  | "admin_resource"
  | "unknown";

export interface RouteParamBehavior {
  errorClass: Route4xxClass | "resource_unavailable";
  reasonClass: string;
  shouldRetry: boolean;
  recoveryAction: string;
  safeUserCopy: string;
}

export interface RouteParamAvailabilityEntry {
  routePath: string;
  params: readonly RouteParamName[];
  resourceClass: RouteResourceClass;
  invalidParamBehavior: RouteParamBehavior;
  missingResourceBehavior: RouteParamBehavior;
  expiredResourceBehavior: RouteParamBehavior;
  deletedResourceBehavior: RouteParamBehavior;
  privateResourceBehavior: RouteParamBehavior;
  recoveryAction: string;
  shouldRetry: boolean;
  diagnosticClass: string;
  clientSurfaceOwner: string;
}

const invalidParam = (param: string): RouteParamBehavior => ({
  errorClass: "validation_error",
  reasonClass: `invalid_${param}`,
  shouldRetry: false,
  recoveryAction: "Stop the request, refresh route state, and show safe recovery copy.",
  safeUserCopy: "That link is missing required information. Please return to the previous screen.",
});

const missingResource = (resource: string, recoveryAction: string): RouteParamBehavior => ({
  errorClass: "not_found",
  reasonClass: `${resource}_missing_or_unavailable`,
  shouldRetry: false,
  recoveryAction,
  safeUserCopy: "That item is no longer available. Use the recovery action shown on this screen.",
});

const expiredResource = (resource: string, recoveryAction: string): RouteParamBehavior => ({
  errorClass: "not_found",
  reasonClass: "resource_unavailable_expired",
  shouldRetry: false,
  recoveryAction,
  safeUserCopy: `That ${resource} link has expired. Open the current version from the app.`,
});

const deletedResource = (resource: string, recoveryAction: string): RouteParamBehavior => ({
  errorClass: "not_found",
  reasonClass: "resource_unavailable_deleted",
  shouldRetry: false,
  recoveryAction,
  safeUserCopy: `That ${resource} was removed or is no longer available.`,
});

const privateResource = (recoveryAction: string): RouteParamBehavior => ({
  errorClass: "permission_denied",
  reasonClass: "resource_private_or_role_blocked",
  shouldRetry: false,
  recoveryAction,
  safeUserCopy: "You do not have access to this item. Sign in with an allowed account or return to a safe screen.",
});

export const ROUTE_PARAM_AVAILABILITY_MAP: readonly RouteParamAvailabilityEntry[] = [
  {
    routePath: "/creators/[username]",
    params: ["username"],
    resourceClass: "creator",
    invalidParamBehavior: invalidParam("username"),
    missingResourceBehavior: missingResource("creator", "Open creator discovery or return home."),
    expiredResourceBehavior: expiredResource("creator", "Refresh creator discovery before retrying manually."),
    deletedResourceBehavior: deletedResource("creator", "Return to creator discovery."),
    privateResourceBehavior: privateResource("Ask the creator for access or return to discovery."),
    recoveryAction: "Open creator discovery or return home.",
    shouldRetry: false,
    diagnosticClass: "creator_profile_route_param_4xx",
    clientSurfaceOwner: "creator_profile",
  },
  {
    routePath: "/drops/[dropId]",
    params: ["dropId"],
    resourceClass: "drop",
    invalidParamBehavior: invalidParam("dropId"),
    missingResourceBehavior: missingResource("drop", "Return to the library or Drops feed."),
    expiredResourceBehavior: expiredResource("drop", "Return to the library and open a current drop."),
    deletedResourceBehavior: deletedResource("drop", "Return to the library and clear stale drop state."),
    privateResourceBehavior: privateResource("Sign in with an entitled account or return to the library."),
    recoveryAction: "Return to the library and clear stale drop state.",
    shouldRetry: false,
    diagnosticClass: "drop_route_param_4xx",
    clientSurfaceOwner: "drops_library",
  },
  {
    routePath: "/api/admin/user/[userId]",
    params: ["userId"],
    resourceClass: "user",
    invalidParamBehavior: invalidParam("userId"),
    missingResourceBehavior: missingResource("user", "Return to admin user search and refresh the list."),
    expiredResourceBehavior: expiredResource("user", "Refresh admin user search before opening detail."),
    deletedResourceBehavior: deletedResource("user", "Return to admin user search and clear selected user state."),
    privateResourceBehavior: privateResource("Admin access is required; refresh role state before retry."),
    recoveryAction: "Return to admin user search and clear selected user state.",
    shouldRetry: false,
    diagnosticClass: "admin_user_route_param_4xx",
    clientSurfaceOwner: "admin_user_management",
  },
  {
    routePath: "/api/chat/threads/[threadId]/messages",
    params: ["threadId", "messageId"],
    resourceClass: "chat_thread",
    invalidParamBehavior: invalidParam("threadId"),
    missingResourceBehavior: missingResource("chat thread", "Return to chat list and refresh thread membership."),
    expiredResourceBehavior: expiredResource("chat thread", "Return to chat list and open a current thread."),
    deletedResourceBehavior: deletedResource("chat thread", "Return to chat list and remove the stale thread from local state."),
    privateResourceBehavior: privateResource("Refresh chat membership or return to the chat list."),
    recoveryAction: "Return to chat list and remove stale thread state.",
    shouldRetry: false,
    diagnosticClass: "chat_thread_route_param_4xx",
    clientSurfaceOwner: "chat",
  },
  {
    routePath: "/api/support/threads/[threadId]",
    params: ["threadId"],
    resourceClass: "support_ticket",
    invalidParamBehavior: invalidParam("threadId"),
    missingResourceBehavior: missingResource("support thread", "Return to support inbox and refresh."),
    expiredResourceBehavior: expiredResource("support thread", "Return to support inbox and open the latest case."),
    deletedResourceBehavior: deletedResource("support thread", "Return to support inbox and clear stale selection."),
    privateResourceBehavior: privateResource("Use the account that owns this support case or return to inbox."),
    recoveryAction: "Return to support inbox and clear stale selection.",
    shouldRetry: false,
    diagnosticClass: "support_thread_route_param_4xx",
    clientSurfaceOwner: "support",
  },
];

export function validateRouteParamAvailabilityMap(entries = ROUTE_PARAM_AVAILABILITY_MAP) {
  const failures: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.routePath)) failures.push(`${entry.routePath} is duplicated.`);
    seen.add(entry.routePath);
    if (entry.params.length === 0 || entry.params.includes("unknown")) failures.push(`${entry.routePath} lacks classified route params.`);
    if (entry.resourceClass === "unknown") failures.push(`${entry.routePath} lacks resource class.`);
    if (entry.invalidParamBehavior.errorClass !== "validation_error" || entry.invalidParamBehavior.shouldRetry) {
      failures.push(`${entry.routePath} missing/invalid param must be non-retryable validation_error.`);
    }
    for (const key of ["missingResourceBehavior", "expiredResourceBehavior", "deletedResourceBehavior", "privateResourceBehavior"] as const) {
      const behavior = entry[key];
      if (behavior.shouldRetry) failures.push(`${entry.routePath}.${key} must not retry by default.`);
      if (!behavior.reasonClass || !behavior.recoveryAction || !behavior.safeUserCopy) {
        failures.push(`${entry.routePath}.${key} lacks safe reason, recovery, or copy.`);
      }
    }
    if (!entry.clientSurfaceOwner || entry.clientSurfaceOwner === "unknown") failures.push(`${entry.routePath} lacks client surface owner.`);
  }
  return failures;
}

export function buildRouteParamAvailabilityMapReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateRouteParamAvailabilityMap();
  return {
    reportKey: "route-param-availability-map",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    dynamicRoutesAudited: ROUTE_PARAM_AVAILABILITY_MAP.length,
    routeParamNamesCovered: Array.from(new Set(ROUTE_PARAM_AVAILABILITY_MAP.flatMap((entry) => entry.params))).sort(),
    unsafeUnknowns: validationFailures.filter((failure) => failure.includes("unknown")).length,
    summary: "Dynamic routes classify missing params, unavailable resources, private resources, and recovery actions without retrying permanent client failures.",
    validationFailures,
  };
}
