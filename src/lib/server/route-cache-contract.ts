export const SPEED_SECURITY_REPORT_PATH = "agent/state/speed-security-hardening.generated.json" as const;

export const ROUTE_CACHE_SURFACES = [
  "public",
  "user",
  "admin",
  "api",
  "payment",
  "creator",
  "support",
  "media",
  "analytics",
] as const;

export const ROUTE_CACHE_MODES = [
  "static",
  "force_cache",
  "swr",
  "hot_cache",
  "no_store",
  "must_not_cache",
] as const;

export const ROUTE_CACHE_DATA_SOURCES = [
  "firestore",
  "storage",
  "ga_data_api",
  "bigquery",
  "dataconnect",
  "paypal",
  "none",
] as const;

export type RouteCacheSurface = (typeof ROUTE_CACHE_SURFACES)[number];
export type RouteCacheMode = (typeof ROUTE_CACHE_MODES)[number];
export type RouteCacheDataSource = (typeof ROUTE_CACHE_DATA_SOURCES)[number];

export type RouteCacheContract = {
  routePattern: string;
  surface: RouteCacheSurface;
  cacheMode: RouteCacheMode;
  revalidateSeconds?: number;
  reason: string;
  dataSources: RouteCacheDataSource[];
  userSpecific: boolean;
  sensitive: boolean;
};

export const ROUTE_CACHE_CONTRACTS: RouteCacheContract[] = [
  {
    routePattern: "/",
    surface: "public",
    cacheMode: "swr",
    revalidateSeconds: 300,
    reason: "Homepage is public and server-seeded; freshness can revalidate without blocking hero/CTA hydration.",
    dataSources: ["firestore", "storage"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/drops",
    surface: "public",
    cacheMode: "swr",
    revalidateSeconds: 60,
    reason: "Public Drops feed needs bounded freshness through SWR/ETag and the approved runtime invalidation exception.",
    dataSources: ["firestore"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/drops/**",
    surface: "public",
    cacheMode: "swr",
    revalidateSeconds: 60,
    reason: "Drop preview/detail routes may be public but must only use sanitized safe preview fields before entitlement.",
    dataSources: ["firestore", "storage"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/creators/**",
    surface: "creator",
    cacheMode: "swr",
    revalidateSeconds: 300,
    reason: "Creator public profiles are merchandised public surfaces with bounded creator/drop/experience data.",
    dataSources: ["firestore", "storage"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/experiences",
    surface: "public",
    cacheMode: "swr",
    revalidateSeconds: 300,
    reason: "Public experiences hub can revalidate while preserving account-specific actions in client/user routes.",
    dataSources: ["firestore"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/dashboard/**",
    surface: "user",
    cacheMode: "no_store",
    reason: "Dashboard/library/viewer routes are user-specific and may include ownership, notifications, balances, or private media state.",
    dataSources: ["firestore", "storage"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/admin/**",
    surface: "admin",
    cacheMode: "hot_cache",
    revalidateSeconds: 60,
    reason: "Admin truth surfaces should prefer materialized hot-cache snapshots but remain admin-gated and source-state labeled.",
    dataSources: ["firestore", "ga_data_api", "bigquery"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/health",
    surface: "api",
    cacheMode: "static",
    reason: "Health check is public and must stay free of paid-service reads.",
    dataSources: ["none"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/api/wallet/packages",
    surface: "api",
    cacheMode: "static",
    reason: "Wallet package metadata is static product configuration; payment/capture state remains no-store elsewhere.",
    dataSources: ["none"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/api/drops",
    surface: "api",
    cacheMode: "swr",
    revalidateSeconds: 60,
    reason: "Public Drops API uses SWR/ETag/focus refresh and bounded expiration refresh; no raw locked content URLs.",
    dataSources: ["firestore"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/api/creator/discovery",
    surface: "api",
    cacheMode: "swr",
    revalidateSeconds: 300,
    reason: "Public creator discovery should be cached/revalidated, not fetched as live user-specific state.",
    dataSources: ["firestore"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/api/creators/**",
    surface: "creator",
    cacheMode: "swr",
    revalidateSeconds: 300,
    reason: "Public creator profile APIs return sanitized public state and should avoid no-store unless freshness requires it.",
    dataSources: ["firestore"],
    userSpecific: false,
    sensitive: false,
  },
  {
    routePattern: "/api/admin/analytics/**",
    surface: "analytics",
    cacheMode: "hot_cache",
    revalidateSeconds: 60,
    reason: "Admin analytics should prefer snapshots/materialized truth and avoid direct live GA/Data API calls during render.",
    dataSources: ["firestore", "ga_data_api", "bigquery"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/admin/**",
    surface: "admin",
    cacheMode: "no_store",
    reason: "Default admin route stance is authenticated no-store unless a hot-cache admin analytics contract is more specific.",
    dataSources: ["firestore", "storage"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/analytics/**",
    surface: "analytics",
    cacheMode: "must_not_cache",
    reason: "Analytics ingest is consent-sensitive write traffic and must not be cached.",
    dataSources: ["firestore"],
    userSpecific: false,
    sensitive: true,
  },
  {
    routePattern: "/api/paypal/**",
    surface: "payment",
    cacheMode: "must_not_cache",
    reason: "Payment capture/order/webhook state is sensitive, idempotent, and never cacheable.",
    dataSources: ["paypal", "firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/drops/unlock",
    surface: "payment",
    cacheMode: "must_not_cache",
    reason: "Drop unlock mutates GumDrops and entitlement state through idempotent server logic.",
    dataSources: ["firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/drops/content",
    surface: "media",
    cacheMode: "must_not_cache",
    reason: "Unlocked media proxy requires entitlement and must not expose reusable cacheable locked-content URLs.",
    dataSources: ["firestore", "storage"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/chat/**",
    surface: "user",
    cacheMode: "must_not_cache",
    reason: "Chat routes are user-scoped and can spend paid-source GumDrops.",
    dataSources: ["firestore", "storage"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/support/**",
    surface: "support",
    cacheMode: "must_not_cache",
    reason: "Support routes are owner/admin-scoped and can contain private report context.",
    dataSources: ["firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/creator/bookings",
    surface: "creator",
    cacheMode: "must_not_cache",
    reason: "Creator booking spends paid-source GumDrops and writes creator/user ledger state.",
    dataSources: ["firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/creator/subscriptions",
    surface: "creator",
    cacheMode: "must_not_cache",
    reason: "Fan Pass subscription spends paid-source GumDrops and writes subscription/accrual state.",
    dataSources: ["firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/creator/requests",
    surface: "creator",
    cacheMode: "must_not_cache",
    reason: "Creator request lanes are paid-source monetization routes.",
    dataSources: ["firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/media/**",
    surface: "media",
    cacheMode: "must_not_cache",
    reason: "Media proxy/export routes require entitlement, byte/rate guards, and no-store defaults.",
    dataSources: ["storage", "firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/api/cron/**",
    surface: "api",
    cacheMode: "must_not_cache",
    reason: "Cron routes are secret-guarded compute work and must be bounded, never cached.",
    dataSources: ["firestore", "storage", "ga_data_api"],
    userSpecific: false,
    sensitive: true,
  },
  {
    routePattern: "/api/**",
    surface: "api",
    cacheMode: "no_store",
    reason: "Conservative fallback for API routes until a specific public/cacheable contract exists.",
    dataSources: ["firestore"],
    userSpecific: true,
    sensitive: true,
  },
  {
    routePattern: "/**",
    surface: "public",
    cacheMode: "swr",
    revalidateSeconds: 300,
    reason: "Conservative fallback for public pages; user-specific data must use explicit no-store contracts.",
    dataSources: ["firestore"],
    userSpecific: false,
    sensitive: false,
  },
] as const satisfies RouteCacheContract[];

function routePatternToRegExp(pattern: string) {
  const deepWildcardPlaceholder = "__KD_DEEP_WILDCARD__";
  const escaped = pattern
    .replace(/\*\*/g, deepWildcardPlaceholder)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replaceAll(deepWildcardPlaceholder, ".*");
  return new RegExp(`^${escaped}$`, "u");
}

function patternSpecificity(pattern: string) {
  return pattern.replace(/\*\*/g, "").replace(/\*/g, "").length;
}

export function matchRouteCacheContract(routePath: string) {
  return [...ROUTE_CACHE_CONTRACTS]
    .sort((left, right) => patternSpecificity(right.routePattern) - patternSpecificity(left.routePattern))
    .find((contract) => routePatternToRegExp(contract.routePattern).test(routePath)) ?? null;
}
