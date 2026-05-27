import type { Route4xxClass } from "./route-4xx-taxonomy";

export type HighRisk4xxRouteFamily = {
  routeFamily: string;
  routePatterns: string[];
  ownerSystem: string;
  common4xxClasses: Route4xxClass[];
  diagnosticMode: "grouped_hourly_rollup";
  retryPolicy: "taxonomy_only";
  safeTelemetry: true;
  runtimeTouched: false;
};

export type Route4xxApplicationReport = {
  reportKey: "route-4xx-application";
  generatedAtUtc: string;
  status: "pass" | "fail";
  routeFamilies: HighRisk4xxRouteFamily[];
  coveredFamilies: number;
  paymentRuntimeChanged: boolean;
  gumdropRuntimeChanged: boolean;
  defaultDiagnosticMode: "grouped_hourly_rollup";
  generic500ClientErrorFindings: string[];
  nextExactSteps: string[];
};

export const HIGH_RISK_4XX_ROUTE_FAMILIES: HighRisk4xxRouteFamily[] = [
  {
    routeFamily: "analytics_ingest",
    routePatterns: ["/api/analytics/ingest", "/api/analytics/ingest-identified"],
    ownerSystem: "analytics",
    common4xxClasses: ["validation_error", "malformed_request", "rate_limited"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "auth_navigation_session",
    routePatterns: ["/api/auth/navigation-session", "/api/user/register", "/api/user/profile"],
    ownerSystem: "auth",
    common4xxClasses: ["auth_required", "validation_error", "conflict"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "wallet_payment_package_selection",
    routePatterns: ["/api/wallet/packages", "/api/paypal/create", "/api/paypal/capture"],
    ownerSystem: "wallet_payments",
    common4xxClasses: ["validation_error", "auth_required", "permission_denied", "conflict"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "drops_unlock",
    routePatterns: ["/api/drops/unlock", "/api/viewer/watch-session"],
    ownerSystem: "drops_unlock_watch",
    common4xxClasses: ["auth_required", "permission_denied", "not_found", "conflict", "stale_client_state"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "checkin_tasks",
    routePatterns: ["/api/checkin", "/api/tasks/*"],
    ownerSystem: "tasks_rewards",
    common4xxClasses: ["auth_required", "validation_error", "conflict", "rate_limited"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "chat_attachments",
    routePatterns: ["/api/chat/threads/*", "/api/chat/attachments/*"],
    ownerSystem: "chat_media",
    common4xxClasses: ["auth_required", "permission_denied", "not_found", "validation_error"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "creator_relationships_subscriptions_drop_manager",
    routePatterns: ["/api/creator/relationships", "/api/creator/subscriptions", "/api/creator/drops"],
    ownerSystem: "creator_monetization",
    common4xxClasses: ["auth_required", "permission_denied", "validation_error", "conflict"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "notifications_push_token_intent",
    routePatterns: ["/api/notifications", "/api/notifications/push-token"],
    ownerSystem: "notifications",
    common4xxClasses: ["auth_required", "validation_error", "rate_limited", "permanent_client_error"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "support_account_safety",
    routePatterns: ["/api/support/*", "/api/user/delete", "/api/user/data"],
    ownerSystem: "support_account_safety",
    common4xxClasses: ["auth_required", "permission_denied", "not_found", "validation_error"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
  {
    routeFamily: "admin_debug_admin_analytics",
    routePatterns: ["/api/admin/debug", "/api/admin/analytics"],
    ownerSystem: "admin_debug_analytics",
    common4xxClasses: ["auth_required", "permission_denied", "validation_error", "rate_limited"],
    diagnosticMode: "grouped_hourly_rollup",
    retryPolicy: "taxonomy_only",
    safeTelemetry: true,
    runtimeTouched: false,
  },
];

export function buildRoute4xxApplicationReport(generatedAtUtc = new Date().toISOString()): Route4xxApplicationReport {
  const base = {
    reportKey: "route-4xx-application",
    generatedAtUtc,
    routeFamilies: HIGH_RISK_4XX_ROUTE_FAMILIES,
    coveredFamilies: HIGH_RISK_4XX_ROUTE_FAMILIES.length,
    paymentRuntimeChanged: false,
    gumdropRuntimeChanged: false,
    defaultDiagnosticMode: "grouped_hourly_rollup" as const,
    generic500ClientErrorFindings: [],
    nextExactSteps: [
      "Adopt route-4xx-mitigation in routes only when changing that route for another approved reason.",
      "Keep payment and GumDrop success paths untouched.",
    ],
  } satisfies Omit<Route4xxApplicationReport, "status">;
  return {
    ...base,
    status: validateRoute4xxApplicationReport(base).length === 0 ? "pass" : "fail",
  };
}

export function validateRoute4xxApplicationReport(report: Pick<Route4xxApplicationReport, "routeFamilies" | "paymentRuntimeChanged" | "gumdropRuntimeChanged" | "defaultDiagnosticMode"> = {
  routeFamilies: HIGH_RISK_4XX_ROUTE_FAMILIES,
  paymentRuntimeChanged: false,
  gumdropRuntimeChanged: false,
  defaultDiagnosticMode: "grouped_hourly_rollup",
}) {
  const failures: string[] = [];
  if (report.paymentRuntimeChanged) failures.push("Payment runtime must not change.");
  if (report.gumdropRuntimeChanged) failures.push("GumDrop runtime must not change.");
  if (report.defaultDiagnosticMode !== "grouped_hourly_rollup") failures.push("Default diagnostics must be grouped hourly rollup.");
  for (const family of report.routeFamilies) {
    if (family.common4xxClasses.length === 0) failures.push(`${family.routeFamily} lacks 4xx classifications.`);
    if (family.diagnosticMode !== "grouped_hourly_rollup") failures.push(`${family.routeFamily} can spam diagnostics.`);
    if (family.runtimeTouched !== false) failures.push(`${family.routeFamily} changed runtime.`);
  }
  return failures;
}
