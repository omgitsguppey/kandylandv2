import {
  TELEMETRY_EVENT_EXTENSION_METADATA,
  type TelemetryConsentRequirement,
  type TelemetryEventExtensionMetadata,
  type TelemetryIdentityRequirement,
} from "@/lib/telemetry-catalog";
import {
  buildOrphanMetricRegistry,
  type OrphanMetricRegistryItem,
} from "@/lib/debug/orphan-metric-registry";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type {
  FeatureLegacyOrphanRecoveryStatus,
  FeatureMetricRegistration,
  FeatureRegistration,
  FeatureRegistrationGateReport,
  FeatureRegistrationId,
  FeatureRolloutStatus,
  FeatureRouteRegistration,
} from "./feature-registration-contract";

export const FEATURE_REGISTRATION_GATE_VERSION = "2026.05.feature-registration.1";

type BehaviorFeatureName = TelemetryEventExtensionMetadata["feature"];

type FeatureSeed = {
  featureId: FeatureRegistrationId;
  behaviorFeatures: BehaviorFeatureName[];
  owner: string;
  routePaths: string[];
  uiSurfaces: string[];
  scoreDimensionsAffected: PublicBetaHealthDimension[];
  userCreatorAdminParityRequirements: string[];
  rolloutStatus: FeatureRolloutStatus;
  legacyOrphanRecoveryStatus: FeatureLegacyOrphanRecoveryStatus;
  metricIds: string[];
};

const route = (path: string, owner: string, reason = "Registered feature route."): FeatureRouteRegistration => ({
  path,
  classification: "feature",
  owner,
  reason,
});

const FEATURE_SEEDS: FeatureSeed[] = [
  {
    featureId: "wallet",
    behaviorFeatures: ["wallet"],
    owner: "wallet-analytics",
    routePaths: ["src/app/api/wallet", "src/app/api/paypal", "src/app/api/checkout"],
    uiSurfaces: ["wallet mobile", "wallet modal", "checkout intent"],
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness", "costRisk"],
    userCreatorAdminParityRequirements: ["Server payment truth outranks telemetry; payment integrity events stay required under declined optional consent."],
    rolloutStatus: "runtime_unverified",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["purchase_events", "gumdrop_balance_events"],
  },
  {
    featureId: "user_dashboard",
    behaviorFeatures: ["general_engagement", "daily_checkin", "library"],
    owner: "user-dashboard-analytics",
    routePaths: ["src/app/dashboard/page.tsx", "src/app/account/page.tsx", "src/app/dashboard/profile", "src/app/dashboard/settings", "src/app/profile/settings", "src/app/settings", "src/app/api/user/activity", "src/app/api/user/data", "src/app/api/user/profile", "src/app/api/user/check-username", "src/app/api/user/complete-onboarding", "src/app/api/user/onboarding-progress"],
    uiSurfaces: ["user dashboard", "account profile", "settings"],
    scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["User dashboard metrics must map to telemetry events, materializers, and admin/debug evidence before complete."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["sessions", "auth_transitions", "behavior_signals"],
  },
  {
    featureId: "drops",
    behaviorFeatures: ["drops", "search_discovery"],
    owner: "drops-analytics",
    routePaths: ["src/app/drops", "src/app/experiences", "src/app/api/drops"],
    uiSurfaces: ["drops index", "locked drop preview", "experiences retention hub"],
    scoreDimensionsAffected: ["sourceHealth", "runtimeHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Drop interest must keep product-state blur, unlock truth, and behavior signals separate."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["page_views", "behavior_signals"],
  },
  {
    featureId: "library",
    behaviorFeatures: ["library"],
    owner: "library-analytics",
    routePaths: ["src/app/dashboard/library"],
    uiSurfaces: ["user library", "recent activity"],
    scoreDimensionsAffected: ["evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Library engagement must not infer unlock or purchase truth from UI-only state."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["behavior_signals"],
  },
  {
    featureId: "creator_dashboard",
    behaviorFeatures: ["broadcasts", "fan_pass", "creator_drop_manager", "creator_settings"],
    owner: "creator-dashboard-analytics",
    routePaths: ["src/app/creator/page.tsx", "src/app/dashboard/creator/page.tsx", "src/app/creators/dashboard/page.tsx", "src/app/api/creator/payouts"],
    uiSurfaces: ["creator dashboard", "creator overview stats"],
    scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Creator UI, telemetry, and admin evidence must preserve actor/target creator separation."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["creator_interactions", "fan_pass_subscribers"],
  },
  {
    featureId: "creator_settings",
    behaviorFeatures: ["creator_settings"],
    owner: "creator-settings-analytics",
    routePaths: ["src/app/dashboard/creator/settings", "src/app/api/creator/settings", "src/app/api/settings/landing"],
    uiSurfaces: ["creator settings", "pricing settings", "experience settings"],
    scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Settings saves need source truth, telemetry companions, and admin/debug visibility."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["creator_interactions"],
  },
  {
    featureId: "creator_drop_manager",
    behaviorFeatures: ["creator_drop_manager"],
    owner: "creator-drop-manager-analytics",
    routePaths: ["src/app/dashboard/creator/drops", "src/app/api/creator/drops", "src/app/api/admin/drops"],
    uiSurfaces: ["creator drop manager", "drop status metrics", "admin drop review"],
    scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Creator drop status metrics need producer, materializer, and admin/debug consumers."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["creator_drop_submissions", "creator_interactions"],
  },
  {
    featureId: "creator_profile",
    behaviorFeatures: ["creator_profile", "creator_timeline"],
    owner: "creator-profile-analytics",
    routePaths: ["src/app/creators/[username]", "src/app/dashboard/profile/creator", "src/app/api/creators/[username]", "src/app/api/creator/discovery", "src/app/api/user/follow"],
    uiSurfaces: ["creator profile", "creator profile timeline", "creator profile mobile"],
    scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Profile views and follows must require consent and identity-aware behavior attribution."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["creator_interactions", "behavior_signals"],
  },
  {
    featureId: "broadcasts",
    behaviorFeatures: ["broadcasts"],
    owner: "broadcasts-analytics",
    routePaths: ["src/app/dashboard/creator/page.tsx", "src/app/api/creator/broadcasts"],
    uiSurfaces: ["creator broadcasts", "broadcast source"],
    scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Broadcast source readiness is not runtime proof until formal runtime evidence exists."],
    rolloutStatus: "runtime_unverified",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["creator_interactions"],
  },
  {
    featureId: "fan_pass",
    behaviorFeatures: ["fan_pass"],
    owner: "fan-pass-analytics",
    routePaths: ["src/app/creators/[username]", "src/app/api/creator/subscriptions", "src/app/api/creator/bookings", "src/app/api/creator/relationships", "src/app/api/creator/requests"],
    uiSurfaces: ["Fan Pass", "creator monetization"],
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Fan Pass remains paid-source GumDrops only; telemetry cannot override subscription truth."],
    rolloutStatus: "runtime_unverified",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["fan_pass_subscribers", "creator_interactions"],
  },
  {
    featureId: "admin_debug",
    behaviorFeatures: ["admin_debug"],
    owner: "admin-debug-analytics",
    routePaths: ["src/app/admin", "src/app/api/admin", "src/app/admin/debug"],
    uiSurfaces: ["admin debug", "admin analytics", "admin control tower"],
    scoreDimensionsAffected: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness"],
    userCreatorAdminParityRequirements: ["Admin debug must show unknown/stale as unknown or stale, never healthy."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["admin_debug_evidence", "external_ga4_evidence"],
  },
  {
    featureId: "analytics_telemetry",
    behaviorFeatures: ["general_engagement", "auth", "security", "support", "viewer"],
    owner: "analytics-platform",
    routePaths: ["src/app/api/analytics", "src/app/api/telemetry", "src/app/%5F%5F/firebase"],
    uiSurfaces: ["telemetry dependency graph", "analytics ingest", "event facts"],
    scoreDimensionsAffected: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness"],
    userCreatorAdminParityRequirements: ["Telemetry platform changes must bind catalog, ingest, materializer, score, and debug evidence."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["page_views", "sessions", "guest_events", "auth_transitions", "identity_links"],
  },
  {
    featureId: "cookie_consent_privacy",
    behaviorFeatures: ["general_engagement", "auth"],
    owner: "privacy-analytics",
    routePaths: ["src/app/(legal)/privacy", "src/app/admin/privacy", "src/app/api/privacy", "src/app/api/consent"],
    uiSurfaces: ["cookie banner", "privacy settings", "admin privacy"],
    scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness", "regressionRisk"],
    userCreatorAdminParityRequirements: ["Consent mode must gate behavior tracking and account settings must override banner state."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["guest_events", "identity_links"],
  },
  {
    featureId: "behavior_tracking",
    behaviorFeatures: ["general_engagement", "drops", "creator_profile", "creator_timeline", "viewer"],
    owner: "behavioral-intelligence",
    routePaths: ["src/app/api/behavior", "src/app/api/analytics/identity-link", "src/app/dashboard/viewer", "src/app/api/viewer/watch-session"],
    uiSurfaces: ["DeepTracker", "behavior math", "identity handoff"],
    scoreDimensionsAffected: ["sourceHealth", "runtimeHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Behavior math must be consent-aware, identity-aware, deduped, and materializer-ready."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["behavior_signals", "runtime_watch_time", "identity_links"],
  },
  {
    featureId: "runtime_smoke_substitutes",
    behaviorFeatures: ["viewer", "admin_debug", "security"],
    owner: "runtime-evidence",
    routePaths: ["src/app/api/runtime", "src/app/banned", "src/app/offline", "src/app/%5F%5F/auth", "src/app/api/health", "src/app/api/cron", "src/app/api/debug/evidence"],
    uiSurfaces: ["runtime smoke substitute matrix", "route diagnostics", "error dictionary"],
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness", "regressionRisk"],
    userCreatorAdminParityRequirements: ["Source/debug/telemetry substitute rows are partial confidence and never clear deployed runtime smoke."],
    rolloutStatus: "runtime_unverified",
    legacyOrphanRecoveryStatus: "not_required",
    metricIds: ["runtime_watch_time", "admin_debug_evidence"],
  },
  {
    featureId: "daily_checkin",
    behaviorFeatures: ["daily_checkin"],
    owner: "retention-analytics",
    routePaths: ["src/app/experiences", "src/app/api/checkin", "src/app/api/tasks"],
    uiSurfaces: ["daily check-in", "retention hub"],
    scoreDimensionsAffected: ["evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Reward telemetry must not override canonical task or GumDrop ledger truth."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["gumdrop_balance_events", "behavior_signals"],
  },
  {
    featureId: "notifications",
    behaviorFeatures: ["notifications"],
    owner: "notifications-analytics",
    routePaths: ["src/app/api/notifications"],
    uiSurfaces: ["notification queue", "notification interactions"],
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Notification records reconcile with push/open/read telemetry and never fake delivery truth."],
    rolloutStatus: "runtime_unverified",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["behavior_signals"],
  },
  {
    featureId: "auth_identity",
    behaviorFeatures: ["auth"],
    owner: "identity-analytics",
    routePaths: ["src/app/api/auth", "src/app/creators/apply", "src/app/creators/waitlist", "src/app/api/user/register", "src/app/api/user/delete", "src/app/api/user/revoke-sessions", "src/app/api/creator/onboarding"],
    uiSurfaces: ["auth modal", "creator application", "identity handoff"],
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Guest-to-user handoff must be deterministic, idempotent, and consent-aware."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["auth_transitions", "identity_links"],
  },
  {
    featureId: "support",
    behaviorFeatures: ["support"],
    owner: "support-analytics",
    routePaths: ["src/app/dashboard/support", "src/app/api/support", "src/app/faq", "src/app/(legal)/privacy", "src/app/api/user/data", "src/app/api/bug-reports"],
    uiSurfaces: ["support", "FAQ", "policies", "privacy policy", "data export", "bug reports"],
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Support telemetry must stay scoped to user-owned support truth and admin inbox evidence.", "Support, FAQ, policy, privacy, and data export trust surfaces must stay route-mapped and debug-visible."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "orphan_registry_tracked",
    metricIds: ["behavior_signals"],
  },
  {
    featureId: "security",
    behaviorFeatures: ["security"],
    owner: "security-analytics",
    routePaths: ["src/app/api/security", "src/app/banned"],
    uiSurfaces: ["security diagnostics", "moderation evidence"],
    scoreDimensionsAffected: ["regressionRisk", "runtimeHealth"],
    userCreatorAdminParityRequirements: ["Weak browser/PWA screenshot heuristics cannot become confirmed moderation facts."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "not_required",
    metricIds: ["admin_debug_evidence"],
  },
  {
    featureId: "search_discovery",
    behaviorFeatures: ["search_discovery"],
    owner: "search-discovery-analytics",
    routePaths: ["src/app/drops", "src/app/faq"],
    uiSurfaces: ["search", "discovery filters", "category selections"],
    scoreDimensionsAffected: ["evidenceCompleteness"],
    userCreatorAdminParityRequirements: ["Search/discovery events require catalog registration before being treated as behavior signals."],
    rolloutStatus: "source_ready",
    legacyOrphanRecoveryStatus: "covered_by_legacy_recovery",
    metricIds: ["behavior_signals"],
  },
];

const SYSTEM_INTERNAL_ROUTE_PREFIXES = [
  "src/app/dashboard/chat",
  "src/app/api/chat",
  "src/app/api/creator/messages",
  "src/app/(legal)/terms",
  "src/app/page.tsx",
  "src/app/offline",
] as const;

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function metadataForFeatures(features: readonly BehaviorFeatureName[]) {
  return TELEMETRY_EVENT_EXTENSION_METADATA.filter((metadata) => features.includes(metadata.feature));
}

function metricRegistrations(metricIds: readonly string[], metricRegistry: readonly OrphanMetricRegistryItem[]): FeatureMetricRegistration[] {
  return unique(metricIds).map((metricId) => {
    const metric = metricRegistry.find((item) => item.metricId === metricId);
    return {
      metricId,
      producer: metric?.producer ?? "",
      consumer: metric?.uiConsumer || metric?.scoreEvidenceConsumer || "",
      sourcePath: metric?.sourceLaneId ? "src/lib/debug/orphan-metric-registry.ts" : "",
    };
  });
}

function buildFeature(seed: FeatureSeed, metricRegistry: readonly OrphanMetricRegistryItem[]): FeatureRegistration {
  const metadata = metadataForFeatures(seed.behaviorFeatures);
  const telemetryEvents = metadata.map((entry) => entry.eventName);
  const consentModeRequirements = unique(metadata.map((entry) => entry.consentRequirement));
  const identityRequirements = unique(metadata.map((entry) => entry.identityRequirement));
  const materializerLanes = unique(metadata.map((entry) => entry.materializerLane));

  return {
    featureId: seed.featureId,
    owner: seed.owner,
    routes: seed.routePaths.map((path) => route(path, seed.owner)),
    uiSurfaces: seed.uiSurfaces,
    telemetryEvents,
    consentModeRequirements,
    identityRequirements,
    materializerLanes,
    adminDebugVisibility: {
      debugVisible: true,
      owner: seed.owner,
      surfaces: ["admin debug", "debug backlog", "feature registration gate"],
    },
    scoreDimensionsAffected: seed.scoreDimensionsAffected,
    userCreatorAdminParityRequirements: seed.userCreatorAdminParityRequirements,
    rolloutStatus: seed.rolloutStatus,
    legacyOrphanRecoveryStatus: seed.legacyOrphanRecoveryStatus,
    uiMetrics: metricRegistrations(seed.metricIds, metricRegistry),
  };
}

export const FEATURE_REGISTRATION_REGISTRY: FeatureRegistration[] = FEATURE_SEEDS.map((seed) =>
  buildFeature(seed, buildOrphanMetricRegistry()),
);

function normalizeRoutePath(path: string) {
  return path.replace(/\\/gu, "/");
}

function routeMatches(registeredPath: string, appRouteFile: string) {
  const routePath = normalizeRoutePath(appRouteFile);
  const registered = normalizeRoutePath(registeredPath);
  return routePath === registered
    || (!registered.endsWith("/page.tsx") && routePath.startsWith(`${registered}/`));
}

function isSystemInternalRoute(appRouteFile: string) {
  const routePath = normalizeRoutePath(appRouteFile);
  return SYSTEM_INTERNAL_ROUTE_PREFIXES.some((prefix) => routeMatches(prefix, routePath));
}

function buildRouteCoverage(registry: readonly FeatureRegistration[], appRouteFiles: readonly string[]) {
  const mappedRoutes: string[] = [];
  const systemInternalRoutes: string[] = [];
  const unmappedRoutes: string[] = [];

  for (const routeFile of appRouteFiles.map(normalizeRoutePath)) {
    const mapped = registry.some((feature) => feature.routes.some((entry) => routeMatches(entry.path, routeFile)));
    if (mapped) {
      mappedRoutes.push(routeFile);
    } else if (isSystemInternalRoute(routeFile)) {
      systemInternalRoutes.push(routeFile);
    } else {
      unmappedRoutes.push(routeFile);
    }
  }

  return {
    totalRoutes: appRouteFiles.length,
    mappedRoutes: unique(mappedRoutes).sort(),
    systemInternalRoutes: unique(systemInternalRoutes).sort(),
    unmappedRoutes: unique(unmappedRoutes).sort(),
  };
}

function buildTelemetryCoverage(registry: readonly FeatureRegistration[]) {
  const registeredFeatures = new Set<BehaviorFeatureName>();
  for (const feature of registry) {
    for (const metadata of TELEMETRY_EVENT_EXTENSION_METADATA) {
      if (feature.telemetryEvents.includes(metadata.eventName)) {
        registeredFeatures.add(metadata.feature);
      }
    }
  }

  const mappedEvents: string[] = [];
  const unmappedEvents: string[] = [];
  for (const metadata of TELEMETRY_EVENT_EXTENSION_METADATA) {
    if (registeredFeatures.has(metadata.feature)) {
      mappedEvents.push(metadata.eventName);
    } else {
      unmappedEvents.push(metadata.eventName);
    }
  }

  return {
    totalEvents: TELEMETRY_EVENT_EXTENSION_METADATA.length,
    mappedEvents: unique(mappedEvents).sort(),
    unmappedEvents: unique(unmappedEvents).sort(),
  };
}

function buildMetricCoverage(registry: readonly FeatureRegistration[]) {
  const metrics = registry.flatMap((feature) => feature.uiMetrics);
  const producerLinkedMetrics = metrics
    .filter((metric) => metric.producer && metric.consumer && metric.sourcePath)
    .map((metric) => metric.metricId);
  const orphanMetrics = metrics
    .filter((metric) => !metric.producer || !metric.consumer || !metric.sourcePath)
    .map((metric) => metric.metricId);

  return {
    totalMetrics: unique(metrics.map((metric) => metric.metricId)).length,
    producerLinkedMetrics: unique(producerLinkedMetrics).sort(),
    orphanMetrics: unique(orphanMetrics).sort(),
  };
}

export function validateFeatureRegistrationGate(report: FeatureRegistrationGateReport) {
  const failures: string[] = [];
  const featureIds = new Set<FeatureRegistrationId>();

  for (const feature of report.features) {
    if (featureIds.has(feature.featureId)) failures.push(`${feature.featureId} is duplicated.`);
    featureIds.add(feature.featureId);

    if (!feature.owner) failures.push(`${feature.featureId} lacks owner.`);
    if (feature.routes.length === 0) failures.push(`${feature.featureId} lacks route registration.`);
    if (feature.uiSurfaces.length === 0) failures.push(`${feature.featureId} lacks UI surfaces.`);
    if (feature.telemetryEvents.length === 0) failures.push(`${feature.featureId} lacks telemetry events.`);
    if (feature.consentModeRequirements.length === 0) failures.push(`${feature.featureId} lacks consent mode requirements.`);
    if (feature.identityRequirements.length === 0) failures.push(`${feature.featureId} lacks identity requirements.`);
    if (feature.materializerLanes.length === 0 || feature.materializerLanes.some((lane) => !lane)) {
      failures.push(`${feature.featureId} lacks materializer lane.`);
    }
    if (!feature.adminDebugVisibility.debugVisible || !feature.adminDebugVisibility.owner || feature.adminDebugVisibility.surfaces.length === 0) {
      failures.push(`${feature.featureId} lacks debug visibility.`);
    }
    if (feature.scoreDimensionsAffected.length === 0) failures.push(`${feature.featureId} lacks score impact classification.`);
    if (feature.userCreatorAdminParityRequirements.length === 0) failures.push(`${feature.featureId} lacks user/creator/admin parity requirements.`);
    if (!feature.rolloutStatus) failures.push(`${feature.featureId} lacks rollout status.`);
    if (!feature.legacyOrphanRecoveryStatus) failures.push(`${feature.featureId} lacks legacy/orphan recovery status.`);

    for (const metric of feature.uiMetrics) {
      if (!metric.producer || !metric.consumer || !metric.sourcePath) {
        failures.push(`${feature.featureId} metric ${metric.metricId} lacks producer or consumer.`);
      }
    }
  }

  for (const routePath of report.routeCoverage.unmappedRoutes) {
    failures.push(`route ${routePath} lacks feature registration or system/internal classification.`);
  }
  for (const eventName of report.telemetryCoverage.unmappedEvents) {
    failures.push(`telemetry event ${eventName} lacks feature registration.`);
  }
  for (const metricId of report.metricCoverage.orphanMetrics) {
    failures.push(`UI metric ${metricId} lacks producer/source registration.`);
  }

  return unique(failures);
}

export function buildFeatureRegistrationGateReport(input?: {
  registry?: readonly FeatureRegistration[];
  appRouteFiles?: readonly string[];
  generatedAtUtc?: string;
  currentHead?: string;
}): FeatureRegistrationGateReport {
  const registry = [...(input?.registry ?? FEATURE_REGISTRATION_REGISTRY)];
  const routeCoverage = buildRouteCoverage(registry, input?.appRouteFiles ?? []);
  const telemetryCoverage = buildTelemetryCoverage(registry);
  const metricCoverage = buildMetricCoverage(registry);
  const baseReport: FeatureRegistrationGateReport = {
    reportKey: "feature-registration-gate",
    registryVersion: FEATURE_REGISTRATION_GATE_VERSION,
    generatedAtUtc: input?.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input?.currentHead,
    status: "pass",
    features: registry,
    routeCoverage,
    telemetryCoverage,
    metricCoverage,
    systemInternalRoutes: routeCoverage.systemInternalRoutes,
    validationFailures: [],
  };
  const validationFailures = validateFeatureRegistrationGate(baseReport);
  return {
    ...baseReport,
    status: validationFailures.length > 0 ? "fail" : "pass",
    validationFailures,
  };
}
