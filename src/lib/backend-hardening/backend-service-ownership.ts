import type { BackendRouteInventoryEntry, BackendRouteInventoryReport, ValidationResult } from "./backend-route-inventory";
import { buildBackendRouteInventoryReport, serviceOwnerForSystem } from "./backend-route-inventory";

export interface BackendCanonicalService {
  serviceName: string;
  ownerSystems: string[];
  costClass: string;
  sourceTruth: string;
  telemetryPath: string;
  debugLane: string;
  validator: string;
}

export interface BackendServiceOwnershipReport {
  reportKey: "backend-service-ownership";
  generatedAtUtc: string;
  currentHead: string;
  servicesCreatedOrReused: string[];
  services: BackendCanonicalService[];
  routeServiceMap: Record<string, string>;
  routesMissingOwner: string[];
  routesMissingValidator: string[];
  ownershipRules: string[];
}

export const BACKEND_CANONICAL_SERVICES: BackendCanonicalService[] = [
  { serviceName: "auth/session/profile service", ownerSystems: ["auth"], costClass: "bounded_auth", sourceTruth: "verified session/profile source", telemetryPath: "auth telemetry catalog", debugLane: "route runtime health", validator: "check:backend-service-ownership" },
  { serviceName: "wallet/payment/GumDrop ledger service", ownerSystems: ["wallet", "payments", "gumdrops"], costClass: "commerce_cost_sensitive", sourceTruth: "wallet capture and source-of-funds ledger", telemetryPath: "commerce telemetry", debugLane: "payment route diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "drop/unlock/watch service", ownerSystems: ["drops", "watch"], costClass: "bounded_runtime", sourceTruth: "unlock and watch canonical math", telemetryPath: "viewer/watch telemetry", debugLane: "viewer route diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "chat/message/attachment service", ownerSystems: ["chat"], costClass: "bounded_runtime", sourceTruth: "chat thread/message service", telemetryPath: "chat telemetry", debugLane: "chat route cohort runtime", validator: "check:backend-service-ownership" },
  { serviceName: "creator/profile/discovery/relationship service", ownerSystems: ["creator", "search"], costClass: "bounded_firestore", sourceTruth: "creator profile and relationship truth", telemetryPath: "creator telemetry", debugLane: "creator lane diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "creator monetization/Fan Pass/entitlement service", ownerSystems: ["fan_pass"], costClass: "commerce_cost_sensitive", sourceTruth: "creator entitlement ledger", telemetryPath: "creator monetization telemetry", debugLane: "creator monetization admin debug", validator: "check:backend-service-ownership" },
  { serviceName: "task/checkin/reward service", ownerSystems: ["tasks"], costClass: "bounded_runtime", sourceTruth: "task and checkin reward ledger", telemetryPath: "task telemetry mapping", debugLane: "task route diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "notification/PWA service", ownerSystems: ["notifications"], costClass: "bounded_runtime", sourceTruth: "notification consent and token truth", telemetryPath: "notification telemetry", debugLane: "notification lifecycle diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "media storage/access service", ownerSystems: ["media"], costClass: "storage_cost_sensitive", sourceTruth: "media access contract", telemetryPath: "media upload lifecycle telemetry", debugLane: "media access diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "support/account safety service", ownerSystems: ["support"], costClass: "bounded_runtime", sourceTruth: "support thread and account safety truth", telemetryPath: "support telemetry", debugLane: "support recovery diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "analytics ingest/event fact service", ownerSystems: ["analytics"], costClass: "analytics_ingest_or_summary", sourceTruth: "canonical event facts", telemetryPath: "telemetry catalog and event bridge", debugLane: "analytics route diagnostics", validator: "check:backend-service-ownership" },
  { serviceName: "admin analytics summary service", ownerSystems: ["admin"], costClass: "admin_bounded", sourceTruth: "admin analytics summary/read models", telemetryPath: "admin telemetry", debugLane: "admin control tower", validator: "check:backend-service-ownership" },
  { serviceName: "debug/control tower service", ownerSystems: ["debug"], costClass: "debug_summary_or_drilldown", sourceTruth: "interpretive brain and debug backlog", telemetryPath: "runtime observability", debugLane: "admin debug control tower", validator: "check:backend-service-ownership" },
  { serviceName: "cost/runtime evidence service", ownerSystems: ["cost"], costClass: "cost_guardrail", sourceTruth: "global cost surface contract", telemetryPath: "cost telemetry", debugLane: "cost runtime evidence", validator: "check:backend-service-ownership" },
];

function serviceForEntry(entry: BackendRouteInventoryEntry) {
  return serviceOwnerForSystem(entry.ownerSystem);
}

export function buildBackendServiceOwnershipReport(input: { generatedAtUtc?: string; currentHead?: string; inventory?: BackendRouteInventoryReport } = {}): BackendServiceOwnershipReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const inventory = input.inventory ?? buildBackendRouteInventoryReport({ generatedAtUtc, currentHead });
  const routeServiceMap: Record<string, string> = {};
  const routesMissingOwner: string[] = [];
  const routesMissingValidator: string[] = [];
  for (const entry of inventory.entries) {
    const service = serviceForEntry(entry);
    routeServiceMap[entry.routePath] = service;
    const declaration = BACKEND_CANONICAL_SERVICES.find((candidate) => candidate.serviceName === service);
    if (!declaration) routesMissingOwner.push(`${entry.method} ${entry.routePath}`);
    if (!declaration?.validator) routesMissingValidator.push(`${entry.method} ${entry.routePath}`);
  }
  return {
    reportKey: "backend-service-ownership",
    generatedAtUtc,
    currentHead,
    servicesCreatedOrReused: BACKEND_CANONICAL_SERVICES.map((service) => service.serviceName),
    services: BACKEND_CANONICAL_SERVICES,
    routeServiceMap,
    routesMissingOwner: [...new Set(routesMissingOwner)],
    routesMissingValidator: [...new Set(routesMissingValidator)],
    ownershipRules: [
      "Routes call services.",
      "Services call canonical math/normalizer/ledger helpers.",
      "Routes should not duplicate business math.",
      "Admin/debug routes are summary-first and drilldown second.",
      "Provider/payment routes remain isolated unless wrappers/tests are the only change.",
    ],
  };
}

export function validateBackendServiceOwnershipReport(report: BackendServiceOwnershipReport): ValidationResult {
  const failures = [
    ...report.routesMissingOwner.map((route) => `${route} lacks canonical service owner.`),
    ...report.routesMissingValidator.map((route) => `${route} lacks service validator.`),
  ];
  for (const service of BACKEND_CANONICAL_SERVICES) {
    if (!service.costClass) failures.push(`${service.serviceName} lacks cost class.`);
    if (!service.sourceTruth) failures.push(`${service.serviceName} lacks source truth.`);
    if (!service.debugLane) failures.push(`${service.serviceName} lacks debug lane.`);
  }
  return { failures };
}
