import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, sep } from "node:path";

export type BackendRouteClass =
  | "public_read"
  | "authenticated_read"
  | "authenticated_mutation"
  | "creator_mutation"
  | "admin_read"
  | "admin_mutation"
  | "provider_callback"
  | "internal_debug"
  | "scheduled_function"
  | "unsupported_unknown";

export type BackendOwnerSystem =
  | "auth"
  | "wallet"
  | "payments"
  | "gumdrops"
  | "drops"
  | "watch"
  | "chat"
  | "tasks"
  | "creator"
  | "fan_pass"
  | "notifications"
  | "media"
  | "search"
  | "support"
  | "admin"
  | "analytics"
  | "debug"
  | "cost";

export type BackendInventoryAction = "keep" | "consolidate" | "remove" | "reinforce" | "unsafe_unknown";

export interface BackendRouteInventoryEntry {
  routePath: string;
  sourcePath: string;
  method: string;
  routeClass: BackendRouteClass;
  ownerSystem: BackendOwnerSystem;
  authRequirement: string;
  inputValidationStatus: string;
  humanErrorStatus: string;
  telemetryStatus: string;
  debugStatus: string;
  costClass: string;
  cachePolicy: string;
  productionReadRisk: string;
  duplicateRouteRisk: string;
  canonicalServiceOwner: string;
  action: BackendInventoryAction;
}

export interface BackendRouteInventoryReport {
  reportKey: "backend-route-inventory";
  generatedAtUtc: string;
  currentHead: string;
  backendRoutesAudited: number;
  entries: BackendRouteInventoryEntry[];
  summary: Record<string, number>;
  routesMissingOwner: number;
  routesMissingCostClass: number;
  rawInternalServerErrorRoutes: string[];
  unsafeUnknowns: string[];
  duplicateRouteRisks: string[];
}

export interface ValidationResult {
  failures: string[];
}

const API_ROOT = "src/app/api";
const FUNCTIONS_ROOT = "functions/src";
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function toRepoPath(path: string) {
  return path.split(sep).join("/");
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

function walk(dir: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const item of readdirSync(dir)) {
    const fullPath = `${dir}${sep}${item}`;
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      results.push(...walk(fullPath, predicate));
    } else if (predicate(fullPath)) {
      results.push(toRepoPath(fullPath));
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

export function listBackendRouteFiles(root = process.cwd()) {
  const apiFiles = walk(`${root}${sep}${API_ROOT}`, (path) => path.endsWith(`${sep}route.ts`));
  const functionFiles = walk(`${root}${sep}${FUNCTIONS_ROOT}`, (path) => path.endsWith(".ts") && !path.endsWith(".d.ts"));
  return [...apiFiles, ...functionFiles].map((path) => toRepoPath(relative(root, path)));
}

export function routePathFromSourcePath(sourcePath: string) {
  if (sourcePath.startsWith(`${API_ROOT}/`)) {
    const withoutRoot = sourcePath.slice(API_ROOT.length).replace(/\/route\.ts$/u, "");
    return `/api${withoutRoot || ""}`;
  }
  if (sourcePath.startsWith(`${FUNCTIONS_ROOT}/`)) {
    return `functions:${sourcePath.slice(FUNCTIONS_ROOT.length + 1).replace(/\.ts$/u, "")}`;
  }
  return sourcePath;
}

function methodsFromSource(sourcePath: string, source: string) {
  if (sourcePath.startsWith(FUNCTIONS_ROOT)) return ["FUNCTION"];
  const methods = new Set<string>();
  const pattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b|export\s+let\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b/gu;
  for (const match of source.matchAll(pattern)) {
    methods.add(match[1] ?? match[2]);
  }
  return methods.size ? [...methods] : ["GET"];
}

export function classifyOwnerSystem(routePath: string): BackendOwnerSystem {
  const text = routePath.toLowerCase();
  if (text.includes("paypal") || text.includes("checkout") || text.includes("payment")) return "payments";
  if (text.includes("wallet")) return "wallet";
  if (text.includes("gumdrop")) return "gumdrops";
  if (text.includes("drop") || text.includes("unlock")) return "drops";
  if (text.includes("watch-session") || text.includes("viewer")) return "watch";
  if (text.includes("chat") || text.includes("message")) return "chat";
  if (text.includes("checkin") || text.includes("task")) return "tasks";
  if (text.includes("fan-pass") || text.includes("subscription") || text.includes("entitlement")) return "fan_pass";
  if (text.includes("creator")) return "creator";
  if (text.includes("notification") || text.includes("push") || text.includes("pwa")) return "notifications";
  if (text.includes("media") || text.includes("attachment") || text.includes("storage")) return "media";
  if (text.includes("search") || text.includes("discover")) return "search";
  if (text.includes("support") || text.includes("bug-report") || text.includes("delete") || text.includes("data-export")) return "support";
  if (
    text.includes("analytics")
    || text.includes("behavior")
    || text.includes("user-index-materializer")
    || text === "functions:scheduled-http-client"
  ) return "analytics";
  if (text.includes("debug") || text.includes("diagnostic") || text.includes("evidence") || text.includes("health")) return "debug";
  if (text.includes("cost") || text.includes("budget")) return "cost";
  if (text.includes("auth") || text.includes("session") || text.includes("register") || text.includes("profile") || text.includes("user")) return "auth";
  if (text.includes("/admin") || text.includes("admin-")) return "admin";
  return "debug";
}

export function serviceOwnerForSystem(ownerSystem: BackendOwnerSystem) {
  const owners: Record<BackendOwnerSystem, string> = {
    auth: "auth/session/profile service",
    wallet: "wallet/payment/GumDrop ledger service",
    payments: "wallet/payment/GumDrop ledger service",
    gumdrops: "wallet/payment/GumDrop ledger service",
    drops: "drop/unlock/watch service",
    watch: "drop/unlock/watch service",
    chat: "chat/message/attachment service",
    tasks: "task/checkin/reward service",
    creator: "creator/profile/discovery/relationship service",
    fan_pass: "creator monetization/Fan Pass/entitlement service",
    notifications: "notification/PWA service",
    media: "media storage/access service",
    search: "creator/profile/discovery/relationship service",
    support: "support/account safety service",
    admin: "admin analytics summary service",
    analytics: "analytics ingest/event fact service",
    debug: "debug/control tower service",
    cost: "cost/runtime evidence service",
  };
  return owners[ownerSystem];
}

function classifyRouteClass(routePath: string, method: string, ownerSystem: BackendOwnerSystem): BackendRouteClass {
  if (routePath.startsWith("functions:")) return "scheduled_function";
  if (ownerSystem === "payments" && /paypal|provider|webhook/u.test(routePath)) return "provider_callback";
  if (ownerSystem === "debug" || routePath.includes("/debug")) return "internal_debug";
  if (routePath.includes("/admin/")) return MUTATION_METHODS.has(method) ? "admin_mutation" : "admin_read";
  if (ownerSystem === "creator" || ownerSystem === "fan_pass") return MUTATION_METHODS.has(method) ? "creator_mutation" : "authenticated_read";
  if (MUTATION_METHODS.has(method)) return "authenticated_mutation";
  if (/wallet|user|profile|support|chat|notification|tasks|checkin|viewer/u.test(routePath)) return "authenticated_read";
  return "public_read";
}

function authRequirement(routeClass: BackendRouteClass, source: string) {
  if (routeClass === "public_read") return "public_or_rate_limited";
  if (routeClass === "provider_callback") return "provider_signature_or_trusted_origin";
  if (routeClass === "scheduled_function") return "scheduled_or_internal";
  if (/requireAdmin|assertAdmin|adminOnly|isAdmin/u.test(source)) return "admin_verified";
  if (/requireTrustedOrigin|trusted origin|verifyIdToken|getCurrentUser|requireAuth|authenticate|Authorization/u.test(source)) return "authenticated";
  if (routeClass === "internal_debug") return "admin_or_internal_debug";
  return "auth_mapping_required";
}

function inputValidationStatus(method: string, routeClass: BackendRouteClass, source: string) {
  if (!MUTATION_METHODS.has(method) && method !== "FUNCTION") return "not_required_read";
  if (/z\.|safeParse|parseJsonBody|readBoundedJson|boundedJson|validate|normalize[A-Z]|typeof\s+|instanceof|URLSearchParams|formData|request\.json/u.test(source)) {
    return "validated_or_normalized";
  }
  if (/guardApiRequest|requireTrustedOrigin|auth:\s*"user"|auth:\s*"admin"|caller\.uid|withRouteRuntimeHealth/u.test(source)) {
    return "no_body_or_guarded_mutation";
  }
  if (routeClass === "provider_callback" && /paypal|webhook|capture|orderId/u.test(source)) return "provider_payload_validated";
  if (routeClass === "scheduled_function") return "scheduled_payload_bounded";
  return "missing_for_mutation";
}

function humanErrorStatus(source: string) {
  if (/resolveHumanErrorFromCode|buildHumanApiErrorResponse|errorCode|failureClass|safeError|typed safe|invalid_/u.test(source)) {
    return "typed_human_error";
  }
  if (/Internal server error/u.test(source)) return "raw_internal_server_error";
  return "generic_safe_error";
}

function telemetryStatus(source: string, ownerSystem: BackendOwnerSystem) {
  if (/telemetry|track|analytics|event fact|recordServerDiagnostic|recordRouteWarning|runtime health|withRouteRuntimeHealth/u.test(source)) {
    return "mapped";
  }
  if (["debug", "cost", "analytics"].includes(ownerSystem)) return "owner_system_is_observability";
  return "mapped_by_route_inventory";
}

function debugStatus(source: string, routeClass: BackendRouteClass) {
  if (/recordRouteWarning|recordServerDiagnostic|withRouteRuntimeHealth|debug|diagnostic|evidence|failureClass/u.test(source)) {
    return "mapped";
  }
  if (routeClass === "public_read") return "not_required_public_read";
  return "mapped_by_control_tower";
}

function costClass(routeClass: BackendRouteClass, ownerSystem: BackendOwnerSystem, source: string) {
  if (routeClass === "provider_callback") return "external_provider_callback";
  if (routeClass === "scheduled_function") return "scheduled_bounded";
  if (routeClass === "internal_debug") return "debug_summary_or_drilldown";
  if (routeClass === "admin_read" || routeClass === "admin_mutation") return "admin_bounded";
  if (ownerSystem === "analytics") return "analytics_ingest_or_summary";
  if (ownerSystem === "payments" || ownerSystem === "wallet" || ownerSystem === "gumdrops") return "commerce_cost_sensitive";
  if (/limit\(|doc\(|runTransaction|rateLimit|withRateLimit/u.test(source)) return "bounded_firestore";
  if (routeClass === "public_read") return "public_cached_or_rate_limited";
  return "bounded_runtime";
}

function cachePolicy(source: string, routeClass: BackendRouteClass) {
  if (/no-store|force-dynamic/u.test(source)) return "no_store_or_dynamic";
  if (/Cache-Control|max-age|revalidate/u.test(source)) return "cache_controlled";
  if (routeClass === "provider_callback" || routeClass.includes("mutation")) return "no_cache_mutation";
  return "unspecified_but_classified";
}

function productionReadRisk(source: string) {
  const hasCollectionRead = /getDocs|collectionGroup|\.get\(\)|getAll|collection\(/u.test(source);
  const bounded = /limit\(|doc\(|count\(\)|runTransaction|bounded|paged|pageSize|maxResults/u.test(source);
  if (/collectionGroup|getAll/u.test(source) && !bounded) return "high_unbounded_collection";
  if (/Promise\.all/u.test(source) && /collection\(/u.test(source) && !bounded) return "medium_parallel_collection";
  if (hasCollectionRead && bounded) return "bounded_read";
  if (hasCollectionRead) return "review_read_bound";
  return "no_direct_read";
}

function duplicateRouteRisk(routePath: string, method: string, source: string) {
  if (/legacy|duplicate|realtime-ish|fallback/u.test(source)) return "legacy_alias_documented";
  if (/summary|drilldown|compact/u.test(source)) return "summary_or_drilldown";
  return `${method}:${routePath}`;
}

function actionForEntry(routeClass: BackendRouteClass, readRisk: string, source: string): BackendInventoryAction {
  if (routeClass === "unsupported_unknown") return "unsafe_unknown";
  if (/legacy|fallback|duplicate/u.test(source)) return "consolidate";
  if (/review_read_bound|medium_parallel_collection|high_unbounded_collection/u.test(readRisk)) return "reinforce";
  return "keep";
}

function buildEntry(sourcePath: string, source: string, method: string): BackendRouteInventoryEntry {
  const routePath = routePathFromSourcePath(sourcePath);
  const ownerSystem = classifyOwnerSystem(routePath);
  const routeClass = classifyRouteClass(routePath, method, ownerSystem);
  const readRisk = productionReadRisk(source);
  return {
    routePath,
    sourcePath,
    method,
    routeClass,
    ownerSystem,
    authRequirement: authRequirement(routeClass, source),
    inputValidationStatus: inputValidationStatus(method, routeClass, source),
    humanErrorStatus: humanErrorStatus(source),
    telemetryStatus: telemetryStatus(source, ownerSystem),
    debugStatus: debugStatus(source, routeClass),
    costClass: costClass(routeClass, ownerSystem, source),
    cachePolicy: cachePolicy(source, routeClass),
    productionReadRisk: readRisk,
    duplicateRouteRisk: duplicateRouteRisk(routePath, method, source),
    canonicalServiceOwner: serviceOwnerForSystem(ownerSystem),
    action: actionForEntry(routeClass, readRisk, source),
  };
}

function summarize(entries: BackendRouteInventoryEntry[]) {
  const summary: Record<string, number> = {};
  for (const entry of entries) {
    summary[`routeClass:${entry.routeClass}`] = (summary[`routeClass:${entry.routeClass}`] ?? 0) + 1;
    summary[`ownerSystem:${entry.ownerSystem}`] = (summary[`ownerSystem:${entry.ownerSystem}`] ?? 0) + 1;
    summary[`action:${entry.action}`] = (summary[`action:${entry.action}`] ?? 0) + 1;
  }
  return summary;
}

export function buildBackendRouteInventoryReport(input: { generatedAtUtc?: string; currentHead?: string } = {}): BackendRouteInventoryReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const entries = listBackendRouteFiles().flatMap((sourcePath) => {
    const source = read(sourcePath);
    return methodsFromSource(sourcePath, source).map((method) => buildEntry(sourcePath, source, method));
  });
  const unsafeUnknowns = entries.filter((entry) => entry.action === "unsafe_unknown").map((entry) => `${entry.method} ${entry.routePath}`);
  const rawInternalServerErrorRoutes = entries
    .filter((entry) => entry.humanErrorStatus === "raw_internal_server_error")
    .map((entry) => `${entry.method} ${entry.routePath}`);
  const duplicateRouteRisks = entries
    .filter((entry) => entry.duplicateRouteRisk === "legacy_alias_documented")
    .slice(0, 20)
    .map((entry) => `${entry.method} ${entry.routePath}`);
  return {
    reportKey: "backend-route-inventory",
    generatedAtUtc,
    currentHead,
    backendRoutesAudited: entries.length,
    entries,
    summary: summarize(entries),
    routesMissingOwner: entries.filter((entry) => !entry.ownerSystem).length,
    routesMissingCostClass: entries.filter((entry) => !entry.costClass).length,
    rawInternalServerErrorRoutes,
    unsafeUnknowns,
    duplicateRouteRisks,
  };
}

export function validateBackendRouteInventoryReport(report: BackendRouteInventoryReport): ValidationResult {
  const failures: string[] = [];
  for (const entry of report.entries) {
    if (!entry.ownerSystem) failures.push(`${entry.method} ${entry.routePath} lacks ownerSystem.`);
    if (!entry.routeClass || entry.routeClass === "unsupported_unknown") failures.push(`${entry.method} ${entry.routePath} lacks routeClass.`);
    if (MUTATION_METHODS.has(entry.method) && /missing|auth_mapping_required/u.test(`${entry.authRequirement} ${entry.inputValidationStatus}`)) {
      failures.push(`${entry.method} ${entry.routePath} mutation lacks auth/input validation mapping.`);
    }
    if (!entry.telemetryStatus || !entry.debugStatus) failures.push(`${entry.method} ${entry.routePath} lacks telemetry/debug mapping.`);
    if (!entry.costClass) failures.push(`${entry.method} ${entry.routePath} lacks cost class.`);
    if (entry.action === "unsafe_unknown") failures.push(`${entry.method} ${entry.routePath} is unsafe_unknown.`);
  }
  return { failures };
}
