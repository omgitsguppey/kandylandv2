import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import { buildOrphanMetricRegistry } from "@/lib/debug/orphan-metric-registry";
import {
  FEATURE_REGISTRATION_REGISTRY,
  FEATURE_REGISTRATION_GATE_VERSION,
} from "@/lib/features/feature-registration-registry";
import type { FeatureRegistrationId } from "@/lib/features/feature-registration-contract";
import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import { TELEMETRY_EVENT_EXTENSION_METADATA } from "@/lib/telemetry-catalog";
import type {
  BodySystemId,
  LimbStatus,
  ProductBodyMapDebugLane,
  ProductBodyMapDirtyFile,
  ProductBodyMapOpenPullRequest,
  ProductBodyMapReport,
  ProductLimb,
} from "./product-body-system-contract";
import { BODY_SYSTEM_IDS, PRODUCT_LIMB_STATUSES } from "./product-body-system-contract";

export const PRODUCT_BODY_MAP_VERSION = "2026.05.product-body-map.1";

const PRODUCT_BODY_MAP_VALIDATOR = "check:product-body-map";
const PRODUCT_BODY_MAP_DEBUG_LANE = "Product body map";

const FEATURE_BODY_SYSTEMS: Record<FeatureRegistrationId | "chat_system_internal", {
  primary: BodySystemId;
  secondary: BodySystemId[];
}> = {
  wallet: { primary: "wallet_commerce", secondary: ["gumdrop_economy", "cost_runtime_infrastructure"] },
  user_dashboard: { primary: "onboarding_signup", secondary: ["account_settings_support", "telemetry_behavioral_intelligence"] },
  drops: { primary: "drops_unwrap_watch", secondary: ["gumdrop_economy", "telemetry_behavioral_intelligence"] },
  library: { primary: "drops_unwrap_watch", secondary: ["telemetry_behavioral_intelligence"] },
  creator_dashboard: { primary: "creator_monetization", secondary: ["creator_profile_discovery"] },
  creator_settings: { primary: "creator_monetization", secondary: ["fan_pass_entitlements"] },
  creator_drop_manager: { primary: "creator_monetization", secondary: ["drops_unwrap_watch"] },
  creator_profile: { primary: "creator_profile_discovery", secondary: ["creator_monetization"] },
  creator_timeline: { primary: "creator_profile_discovery", secondary: ["drops_unwrap_watch"] },
  broadcasts: { primary: "creator_monetization", secondary: ["creator_profile_discovery"] },
  fan_pass: { primary: "fan_pass_entitlements", secondary: ["creator_monetization", "gumdrop_economy"] },
  admin_debug: { primary: "admin_debug_ops", secondary: ["telemetry_behavioral_intelligence", "cost_runtime_infrastructure"] },
  analytics_telemetry: { primary: "telemetry_behavioral_intelligence", secondary: ["cost_runtime_infrastructure"] },
  cookie_consent_privacy: { primary: "identity_auth", secondary: ["account_settings_support"] },
  behavior_tracking: { primary: "telemetry_behavioral_intelligence", secondary: ["drops_unwrap_watch"] },
  runtime_smoke_substitutes: { primary: "cost_runtime_infrastructure", secondary: ["admin_debug_ops"] },
  daily_checkin: { primary: "daily_tasks_rewards", secondary: ["gumdrop_economy", "telemetry_behavioral_intelligence"] },
  notifications: { primary: "notifications_pwa", secondary: ["telemetry_behavioral_intelligence"] },
  auth_identity: { primary: "identity_auth", secondary: ["onboarding_signup"] },
  support: { primary: "account_settings_support", secondary: ["admin_debug_ops"] },
  security: { primary: "admin_debug_ops", secondary: ["cost_runtime_infrastructure"] },
  search_discovery: { primary: "creator_profile_discovery", secondary: ["drops_unwrap_watch", "telemetry_behavioral_intelligence"] },
  chat_system_internal: { primary: "chat_messaging", secondary: ["creator_monetization", "telemetry_behavioral_intelligence"] },
};

const JOURNEY_SYSTEMS: Record<string, BodySystemId> = {
  landing_to_signup: "onboarding_signup",
  signup_to_first_unwrap: "drops_unwrap_watch",
  wallet_to_checkout_to_payment: "wallet_commerce",
  drop_view_to_unlock_to_watch: "drops_unwrap_watch",
  creator_profile_to_fan_pass_chat_follow: "creator_profile_discovery",
  notification_prompt_to_permission: "notifications_pwa",
  daily_task_to_reward: "daily_tasks_rewards",
  chat_open_to_message_outcome: "chat_messaging",
};

const DEBUG_LANE_SYSTEMS: Record<string, BodySystemId> = {
  identity_handoff: "identity_auth",
  consent_tracking_mode: "identity_auth",
  event_envelope: "telemetry_behavioral_intelligence",
  global_user_dedupe: "telemetry_behavioral_intelligence",
  count_dedupe_math: "telemetry_behavioral_intelligence",
  duration_math: "telemetry_behavioral_intelligence",
  drop_watch_time: "drops_unwrap_watch",
  session_bounce: "telemetry_behavioral_intelligence",
  user_journey: "telemetry_behavioral_intelligence",
  sql_database_parity: "cost_runtime_infrastructure",
  event_translation_bridge: "telemetry_behavioral_intelligence",
  event_liveness: "telemetry_behavioral_intelligence",
  person_metrics_hydration: "telemetry_behavioral_intelligence",
  user_management: "admin_debug_ops",
  testing_coverage: "telemetry_behavioral_intelligence",
  product_body_map: "admin_debug_ops",
  central_normalizer: "telemetry_behavioral_intelligence",
  math_authority: "telemetry_behavioral_intelligence",
  behavior_math: "telemetry_behavioral_intelligence",
  feature_telemetry_coverage: "telemetry_behavioral_intelligence",
  settings_health: "account_settings_support",
  legacy_recovery: "telemetry_behavioral_intelligence",
  wallet_funnel: "wallet_commerce",
  auth_provider_conflict: "identity_auth",
  auth_persistence: "identity_auth",
  auth_runtime: "identity_auth",
  notification_permission: "notifications_pwa",
  push_token_health: "notifications_pwa",
  notification_targeting: "notifications_pwa",
  pwa_service_worker: "notifications_pwa",
  daily_tasks_reset: "daily_tasks_rewards",
  daily_task_guidance_health: "daily_tasks_rewards",
  daily_task_lifecycle: "daily_tasks_rewards",
  daily_task_reward_ledger: "daily_tasks_rewards",
  chat_gating_moderation: "chat_messaging",
  chat_telemetry_admin_truth: "chat_messaging",
  runtime_debug_evidence: "admin_debug_ops",
  cost_4xx: "cost_runtime_infrastructure",
  open_p1_p2_backlog: "admin_debug_ops",
};

const EXPECTED_DEBUG_LANES = Object.keys(DEBUG_LANE_SYSTEMS);

const SCORE_GATE_SYSTEMS: Record<PublicBetaHealthDimension, BodySystemId> = {
  sourceHealth: "telemetry_behavioral_intelligence",
  runtimeHealth: "cost_runtime_infrastructure",
  evidenceCompleteness: "admin_debug_ops",
  freshness: "admin_debug_ops",
  costRisk: "cost_runtime_infrastructure",
  regressionRisk: "admin_debug_ops",
};

const EXPECTED_ARTIFACTS = [
  { path: "agent/state/product-body-map.generated.json", owner: "product-integrity", system: "admin_debug_ops" as const, status: "connected" as const },
  { path: "agent/state/final-parity-telemetry-lock.generated.json", owner: "parity", system: "telemetry_behavioral_intelligence" as const, status: "connected" as const },
  { path: "agent/state/media-discovery-score-lock.generated.json", owner: "media-discovery", system: "media_storage_access" as const, status: "connected" as const },
  { path: "agent/state/creator-monetization-readiness-lock.generated.json", owner: "creator-monetization", system: "creator_monetization" as const, status: "connected" as const },
  { path: "agent/state/auth-readiness-lock.generated.json", owner: "auth", system: "identity_auth" as const, status: "connected" as const },
  { path: "agent/state/notification-pwa-score-lock.generated.json", owner: "notifications", system: "notifications_pwa" as const, status: "connected" as const },
  { path: "agent/state/daily-task-debug-score-lock.generated.json", owner: "daily-tasks", system: "daily_tasks_rewards" as const, status: "connected" as const },
  { path: "agent/state/chat-functionality-score-lock.generated.json", owner: "chat", system: "chat_messaging" as const, status: "connected" as const },
  { path: "agent/state/sql-database-parity-cost-lock.generated.json", owner: "sql-parity", system: "cost_runtime_infrastructure" as const, status: "connected" as const },
] as const;

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function routeKind(path: string): ProductLimb["kind"] {
  return path.includes("/api/") ? "api_route" : "route";
}

function scoreImpactForSystem(system: BodySystemId): PublicBetaHealthDimension[] {
  const dimensions = Object.entries(SCORE_GATE_SYSTEMS)
    .filter(([, bodySystem]) => bodySystem === system)
    .map(([dimension]) => dimension as PublicBetaHealthDimension);
  return dimensions.length > 0 ? dimensions : ["evidenceCompleteness"];
}

function systemsForFeature(featureId: string) {
  return FEATURE_BODY_SYSTEMS[featureId as keyof typeof FEATURE_BODY_SYSTEMS]
    ?? { primary: "telemetry_behavioral_intelligence" as const, secondary: ["admin_debug_ops" as const] };
}

function statusCounts(limbs: readonly ProductLimb[]): Record<LimbStatus, number> {
  return Object.fromEntries(PRODUCT_LIMB_STATUSES.map((status) => [
    status,
    limbs.filter((limb) => limb.status === status).length,
  ])) as Record<LimbStatus, number>;
}

function limb(input: Omit<ProductLimb, "validators" | "debugVisibility" | "scoreImpact" | "secondaryBodySystems"> & {
  validators?: string[];
  debugLane?: string;
  debugSource?: string;
  scoreImpact?: PublicBetaHealthDimension[];
  secondaryBodySystems?: BodySystemId[];
}): ProductLimb {
  return {
    ...input,
    secondaryBodySystems: unique(input.secondaryBodySystems ?? []),
    validators: unique(input.validators ?? [PRODUCT_BODY_MAP_VALIDATOR]),
    scoreImpact: unique(input.scoreImpact ?? scoreImpactForSystem(input.primaryBodySystem)),
    debugVisibility: {
      lane: input.debugLane ?? PRODUCT_BODY_MAP_DEBUG_LANE,
      defaultVisible: input.status === "connected" ? "catalog_drilldown" : "issues_only",
      source: input.debugSource ?? "src/lib/product-integrity/product-body-map.ts",
    },
  };
}

function dedupeLimbs(limbs: readonly ProductLimb[]) {
  const seen = new Set<string>();
  const output: ProductLimb[] = [];

  for (const entry of limbs) {
    if (seen.has(entry.limbId)) continue;
    seen.add(entry.limbId);
    output.push(entry);
  }

  return output;
}

export function getProductBodySystemForFeature(featureId: string): BodySystemId | undefined {
  return FEATURE_BODY_SYSTEMS[featureId as keyof typeof FEATURE_BODY_SYSTEMS]?.primary;
}

export function listProductBodyLimbs(): ProductLimb[] {
  const limbs: ProductLimb[] = [];
  const metricRegistry = buildOrphanMetricRegistry();

  for (const feature of FEATURE_REGISTRATION_REGISTRY) {
    const systems = systemsForFeature(feature.featureId);
    limbs.push(limb({
      limbId: `feature:${feature.featureId}`,
      kind: "feature",
      label: feature.featureId,
      status: feature.telemetryEvents.length > 0 ? "connected" : "orphaned",
      primaryBodySystem: systems.primary,
      secondaryBodySystems: systems.secondary,
      owner: feature.owner,
      sourceFiles: ["src/lib/features/feature-registration-registry.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:feature-registration-gate"],
      scoreImpact: feature.scoreDimensionsAffected,
      nextAction: feature.telemetryEvents.length > 0
        ? `Keep ${feature.featureId} routed through feature registration, telemetry, metrics, and debug evidence.`
        : `Add telemetry coverage before ${feature.featureId} is considered connected.`,
      metadata: {
        routes: feature.routes.map((route) => route.path),
        telemetryEventCount: feature.telemetryEvents.length,
        registryVersion: FEATURE_REGISTRATION_GATE_VERSION,
      },
    }));

    for (const route of feature.routes) {
      limbs.push(limb({
        limbId: `${routeKind(route.path)}:${route.path}`,
        kind: routeKind(route.path),
        label: route.path,
        status: "connected",
        primaryBodySystem: systems.primary,
        secondaryBodySystems: systems.secondary,
        owner: route.owner || feature.owner,
        sourceFiles: [route.path, "src/lib/features/feature-registration-registry.ts"],
        validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:feature-registration-gate"],
        scoreImpact: feature.scoreDimensionsAffected,
        nextAction: `Keep ${route.path} mapped to ${feature.featureId} before route-health or admin evidence is trusted.`,
      }));
    }

    for (const materializer of feature.materializerLanes) {
      limbs.push(limb({
        limbId: `materializer:${materializer}`,
        kind: "materializer",
        label: materializer,
        status: materializer ? "connected" : "orphaned",
        primaryBodySystem: systems.primary,
        secondaryBodySystems: systems.secondary,
        owner: feature.owner,
        sourceFiles: ["src/lib/telemetry-catalog.ts", "src/lib/features/feature-registration-registry.ts"],
        validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:feature-registration-gate"],
        scoreImpact: feature.scoreDimensionsAffected,
        nextAction: materializer
          ? `Keep ${materializer} bound to ${feature.featureId} telemetry and person/global metric hydration.`
          : `Add a materializer lane for ${feature.featureId}.`,
      }));
    }

    for (const metric of feature.uiMetrics) {
      const status: LimbStatus = metric.producer && metric.consumer && metric.sourcePath ? "connected" : "orphaned";
      limbs.push(limb({
        limbId: `metric:feature:${metric.metricId}`,
        kind: "metric",
        label: metric.metricId,
        status,
        primaryBodySystem: systems.primary,
        secondaryBodySystems: systems.secondary,
        owner: feature.owner,
        sourceFiles: [metric.sourcePath || "src/lib/debug/orphan-metric-registry.ts"],
        validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:feature-registration-gate"],
        scoreImpact: feature.scoreDimensionsAffected,
        nextAction: status === "connected"
          ? `Keep ${metric.metricId} linked to producer, consumer, and materializer truth.`
          : `Connect ${metric.metricId} to producer and consumer before displaying it as healthy.`,
        metadata: {
          producer: metric.producer,
          consumer: metric.consumer,
        },
      }));
    }
  }

  for (const surface of SURFACE_PARITY_REGISTRY) {
    const systems = systemsForFeature(surface.featureId);
    const status: LimbStatus = surface.requiredStates.length >= 7 && surface.telemetryEvents.length > 0 ? "connected" : "orphaned";
    limbs.push(limb({
      limbId: `surface:${surface.surfaceId}`,
      kind: "surface",
      label: surface.surfaceId,
      status,
      primaryBodySystem: systems.primary,
      secondaryBodySystems: systems.secondary,
      owner: surface.surfaceOwner,
      sourceFiles: ["src/lib/parity/surface-parity-registry.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:surface-parity-doctrine"],
      scoreImpact: surface.scoreDimensionImpact.dimensions,
      nextAction: status === "connected"
        ? `Keep ${surface.surfaceId} mapped through role, state, telemetry, and debug parity.`
        : `Repair ${surface.surfaceId} state/telemetry contract before treating it as connected.`,
      metadata: {
        canonicalRoute: surface.canonicalRoute,
        debugLane: surface.debugLane,
      },
    }));

    for (const backendRoute of surface.backendRoutesOrActions) {
      limbs.push(limb({
        limbId: `${routeKind(backendRoute)}:${backendRoute}`,
        kind: routeKind(backendRoute),
        label: backendRoute,
        status: "connected",
        primaryBodySystem: systems.primary,
        secondaryBodySystems: systems.secondary,
        owner: surface.surfaceOwner,
        sourceFiles: [backendRoute, "src/lib/parity/surface-parity-registry.ts"],
        validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:surface-parity-doctrine"],
        scoreImpact: surface.scoreDimensionImpact.dimensions,
        nextAction: `Keep ${backendRoute} paired with ${surface.surfaceId} before route-health evidence is trusted.`,
      }));
    }
  }

  for (const event of TELEMETRY_EVENT_EXTENSION_METADATA) {
    const systems = systemsForFeature(event.feature);
    limbs.push(limb({
      limbId: `telemetry_event:${event.eventName}`,
      kind: "telemetry_event",
      label: event.eventName,
      status: event.feature && event.materializerLane && event.debugVisibility ? "connected" : "orphaned",
      primaryBodySystem: systems.primary,
      secondaryBodySystems: systems.secondary,
      owner: event.owner,
      sourceFiles: ["src/lib/telemetry-catalog.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:event-translation-bridge"],
      scoreImpact: ["evidenceCompleteness", "runtimeHealth"],
      debugLane: event.debugVisibility,
      debugSource: "src/lib/telemetry-catalog.ts",
      nextAction: `Keep ${event.eventName} in the canonical envelope, event translation, materializer, and debug lanes.`,
      metadata: {
        feature: event.feature,
        surface: event.surface,
        materializerLane: event.materializerLane,
      },
    }));
  }

  for (const metric of PERSON_METRIC_DEFINITIONS) {
    const matchingEvent = metric.eventNames
      .map((eventName) => TELEMETRY_EVENT_EXTENSION_METADATA.find((event) => event.eventName === eventName))
      .find(Boolean);
    const systems = systemsForFeature(matchingEvent?.feature ?? "analytics_telemetry");
    limbs.push(limb({
      limbId: `metric:person:${metric.id}`,
      kind: "metric",
      label: metric.id,
      status: metric.materializer && metric.sourceOfTruth && metric.debugOwner ? "connected" : "orphaned",
      primaryBodySystem: systems.primary,
      secondaryBodySystems: unique([...systems.secondary, "telemetry_behavioral_intelligence"]),
      owner: metric.debugOwner,
      sourceFiles: ["src/lib/analytics/person-metrics-contract.ts", "src/lib/analytics/person-metrics-hydration.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:person-metrics-hydration"],
      scoreImpact: metric.scoreEvidenceImpact === "none" ? ["evidenceCompleteness"] : ["evidenceCompleteness", "runtimeHealth"],
      nextAction: `Keep ${metric.id} hydrated through person metrics with source truth and legacy confidence preserved.`,
      metadata: {
        materializer: metric.materializer,
        sourceOfTruth: metric.sourceOfTruth,
      },
    }));
  }

  for (const metric of metricRegistry) {
    const systems = systemsForFeature(
      metric.owner === "commerce" ? "wallet"
        : metric.owner === "economy" ? "daily_checkin"
          : metric.owner === "creator" ? "creator_dashboard"
            : metric.owner === "auth" ? "auth_identity"
              : "analytics_telemetry",
    );
    const status: LimbStatus = metric.orphanStatus === "linked"
      ? "connected"
      : metric.orphanStatus === "archived"
        ? "deprecated"
        : "orphaned";
    limbs.push(limb({
      limbId: `metric:global:${metric.metricId}`,
      kind: "metric",
      label: metric.metricId,
      status,
      primaryBodySystem: systems.primary,
      secondaryBodySystems: systems.secondary,
      owner: metric.owner,
      sourceFiles: [metric.persistenceSource || "src/lib/debug/orphan-metric-registry.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:feature-registration-gate"],
      scoreImpact: status === "connected" ? ["evidenceCompleteness"] : ["evidenceCompleteness", "freshness"],
      nextAction: metric.nextAction,
      metadata: {
        materializer: metric.materializer,
        freshness: metric.freshness,
        orphanStatus: metric.orphanStatus,
      },
    }));
  }

  for (const [journey, system] of Object.entries(JOURNEY_SYSTEMS)) {
    limbs.push(limb({
      limbId: `journey_step:${journey}`,
      kind: "journey_step",
      label: journey,
      status: "connected",
      primaryBodySystem: system,
      secondaryBodySystems: ["telemetry_behavioral_intelligence"],
      owner: "behavioral-intelligence",
      sourceFiles: ["src/lib/behavioral/user-journey-contract.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:user-journey-behavioral-intelligence"],
      scoreImpact: ["evidenceCompleteness", "runtimeHealth"],
      nextAction: `Keep ${journey} attached to event envelope, person metrics, and debug journey evidence.`,
    }));
  }

  for (const [debugLane, system] of Object.entries(DEBUG_LANE_SYSTEMS)) {
    limbs.push(limb({
      limbId: `debug_lane:${debugLane}`,
      kind: "debug_lane",
      label: debugLane,
      status: "connected",
      primaryBodySystem: system,
      secondaryBodySystems: system === "admin_debug_ops" ? ["telemetry_behavioral_intelligence"] : ["admin_debug_ops"],
      owner: system === "admin_debug_ops" ? "admin-debug" : "product-integrity",
      sourceFiles: ["src/lib/debug/debug-panel-tracking-summary.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR],
      scoreImpact: scoreImpactForSystem(system),
      debugLane: PRODUCT_BODY_MAP_DEBUG_LANE,
      nextAction: `Keep ${debugLane} sourced by its body system and visible only as issue-first summary unless drilled down.`,
    }));
  }

  for (const [dimension, system] of Object.entries(SCORE_GATE_SYSTEMS)) {
    limbs.push(limb({
      limbId: `score_gate:${dimension}`,
      kind: "score_gate",
      label: dimension,
      status: "connected",
      primaryBodySystem: system,
      secondaryBodySystems: ["telemetry_behavioral_intelligence"],
      owner: "beta-score",
      sourceFiles: ["src/lib/agent-score/core.ts", "src/lib/agent-score/weights.ts"],
      validators: [PRODUCT_BODY_MAP_VALIDATOR, "check:beta-score"],
      scoreImpact: [dimension as PublicBetaHealthDimension],
      nextAction: `Keep ${dimension} explained with score impact before beta-exit evidence is trusted.`,
    }));
  }

  for (const artifact of EXPECTED_ARTIFACTS) {
    limbs.push(limb({
      limbId: `artifact:${artifact.path}`,
      kind: "artifact",
      label: artifact.path,
      status: artifact.status,
      primaryBodySystem: artifact.system,
      secondaryBodySystems: ["admin_debug_ops"],
      owner: artifact.owner,
      sourceFiles: [artifact.path],
      validators: [PRODUCT_BODY_MAP_VALIDATOR],
      scoreImpact: ["evidenceCompleteness", "freshness"],
      nextAction: `Keep ${artifact.path} classified as generated evidence and never as runtime business truth.`,
    }));
  }

  limbs.push(limb({
    limbId: `validator:${PRODUCT_BODY_MAP_VALIDATOR}`,
    kind: "validator",
    label: PRODUCT_BODY_MAP_VALIDATOR,
    status: "connected",
    primaryBodySystem: "admin_debug_ops",
    secondaryBodySystems: ["telemetry_behavioral_intelligence"],
    owner: "product-integrity",
    sourceFiles: ["scripts/agent/validate-product-body-map.ts"],
    validators: [PRODUCT_BODY_MAP_VALIDATOR],
    scoreImpact: ["evidenceCompleteness", "freshness"],
    nextAction: "Keep product body map validation in package scripts and release evidence.",
  }));

  return dedupeLimbs(limbs);
}

export function buildProductBodyMapDebugLane(reportOrLimbs?: ProductBodyMapReport | readonly ProductLimb[]): ProductBodyMapDebugLane {
  const limbs: readonly ProductLimb[] = Array.isArray(reportOrLimbs)
    ? reportOrLimbs
    : reportOrLimbs && "limbs" in reportOrLimbs
      ? reportOrLimbs.limbs
      : listProductBodyLimbs();
  const counts = statusCounts(limbs);
  const disconnectedCount = limbs.filter((entry) => entry.status !== "connected" && entry.status !== "deprecated").length;

  return {
    label: "Product body map",
    systemsCovered: new Set(limbs.flatMap((entry) => [entry.primaryBodySystem, ...entry.secondaryBodySystems])).size,
    totalLimbs: limbs.length,
    connectedCount: counts.connected,
    disconnectedCount,
    orphanedCount: counts.orphaned,
    duplicatedCount: counts.duplicated,
    staleCount: counts.stale,
    inFlightCount: counts.in_flight,
    deprecatedCount: counts.deprecated,
    unsafeUnknownCount: counts.unsafe_unknown,
    defaultView: "disconnected_only",
    rawCatalogDefaultOpen: false,
    sourceOfTruth: "src/lib/product-integrity/product-body-map.ts",
  };
}

function scoreDimensionImpact(limbs: readonly ProductLimb[]): ProductBodyMapReport["scoreDimensionImpact"] {
  return Object.fromEntries(BODY_SYSTEM_IDS.map((system) => [
    system,
    unique(limbs
      .filter((limb) => limb.primaryBodySystem === system || limb.secondaryBodySystems.includes(system))
      .flatMap((limb) => limb.scoreImpact)),
  ])) as ProductBodyMapReport["scoreDimensionImpact"];
}

export function validateProductBodyMapReport(report: ProductBodyMapReport): string[] {
  const failures: string[] = [];
  const ids = new Set<string>();

  for (const system of BODY_SYSTEM_IDS) {
    const hasLimb = report.limbs.some((limb) => limb.primaryBodySystem === system || limb.secondaryBodySystems.includes(system));
    if (!hasLimb) failures.push(`${system} lacks body system limb coverage.`);
    if ((report.scoreDimensionImpact[system] ?? []).length === 0) failures.push(`${system} lacks score dimension impact.`);
  }

  for (const limbEntry of report.limbs) {
    if (ids.has(limbEntry.limbId)) failures.push(`${limbEntry.limbId} is duplicated.`);
    ids.add(limbEntry.limbId);
    if (!limbEntry.primaryBodySystem) failures.push(`${limbEntry.limbId} lacks primary body system.`);
    if (!limbEntry.owner) failures.push(`${limbEntry.limbId} lacks owner.`);
    if (limbEntry.sourceFiles.length === 0) failures.push(`${limbEntry.limbId} lacks source files.`);
    if (limbEntry.validators.length === 0) failures.push(`${limbEntry.limbId} lacks validators.`);
    if (limbEntry.scoreImpact.length === 0) failures.push(`${limbEntry.limbId} lacks score dimension impact.`);
    if (!limbEntry.debugVisibility.lane || !limbEntry.debugVisibility.source) failures.push(`${limbEntry.limbId} lacks debug visibility.`);
    if (!limbEntry.nextAction) failures.push(`${limbEntry.limbId} lacks next action.`);
    if (limbEntry.status === "unsafe_unknown") failures.push(`${limbEntry.limbId} is unsafe_unknown.`);
    if (limbEntry.kind === "metric" && (!limbEntry.owner || limbEntry.sourceFiles.length === 0)) failures.push(`${limbEntry.limbId} metric lacks owner/source.`);
  }

  for (const feature of FEATURE_REGISTRATION_REGISTRY) {
    if (!report.limbs.some((limbEntry) => limbEntry.limbId === `feature:${feature.featureId}`)) {
      failures.push(`${feature.featureId} lacks body system.`);
    }
  }

  for (const event of TELEMETRY_EVENT_EXTENSION_METADATA) {
    if (!report.limbs.some((limbEntry) => limbEntry.limbId === `telemetry_event:${event.eventName}`)) {
      failures.push(`${event.eventName} telemetry event lacks body system.`);
    }
  }

  for (const surface of SURFACE_PARITY_REGISTRY) {
    if (!report.limbs.some((limbEntry) => limbEntry.limbId === `surface:${surface.surfaceId}`)) {
      failures.push(`${surface.surfaceId} lacks surface/body mapping.`);
    }
  }

  if (!report.limbs.some((entry) => entry.limbId === "debug_lane:product_body_map")) {
    failures.push("Product body map debug lane lacks source system.");
  }
  if (!report.limbs.some((entry) => entry.limbId === `validator:${PRODUCT_BODY_MAP_VALIDATOR}`)) {
    failures.push("Product body map validator lacks package-script limb.");
  }
  if (report.debugLane.unsafeUnknownCount > 0) failures.push("Product body map has unsafe unknown limbs.");

  for (const dirtyFile of report.dirtyFiles) {
    if (dirtyFile.classification === "unsafe_unknown") failures.push(`Dirty file ${dirtyFile.path} is unsafe_unknown.`);
  }

  for (const pr of report.openPullRequests) {
    if (pr.classification === "unsafe_unknown") failures.push(`Open PR #${pr.number} is unsafe_unknown.`);
  }

  return unique([...failures, ...report.validationFailures]);
}

export function buildProductBodyMapReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: ProductBodyMapDirtyFile[];
  openPullRequests?: ProductBodyMapOpenPullRequest[];
  packageScripts?: Record<string, string>;
} = {}): ProductBodyMapReport {
  const limbs = listProductBodyLimbs();
  const disconnectedLimbs = limbs.filter((entry) => entry.status !== "connected");
  const disconnectedByStatus = statusCounts(limbs);
  const debugLane = buildProductBodyMapDebugLane(limbs);
  const remainingGaps = disconnectedLimbs
    .filter((entry) => entry.status !== "deprecated")
    .map((entry) => `${entry.limbId}: ${entry.nextAction}`);
  const nextExactSteps = remainingGaps.length > 0
    ? remainingGaps
    : ["Keep new product limbs registered in src/lib/product-integrity/product-body-map.ts before adding user/admin surfaces or metrics."];
  const validationFailures: string[] = [];

  if (!input.packageScripts?.[PRODUCT_BODY_MAP_VALIDATOR]) {
    validationFailures.push(`${PRODUCT_BODY_MAP_VALIDATOR} package script is missing.`);
  }

  const report: ProductBodyMapReport = {
    reportKey: "product-body-map",
    contractVersion: PRODUCT_BODY_MAP_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    bodySystemsCovered: debugLane.systemsCovered,
    bodySystems: BODY_SYSTEM_IDS.slice(),
    totalLimbs: limbs.length,
    majorFeaturesMapped: FEATURE_REGISTRATION_REGISTRY.length,
    majorSurfacesMapped: SURFACE_PARITY_REGISTRY.length,
    telemetryEventsMapped: TELEMETRY_EVENT_EXTENSION_METADATA.length,
    metricsMapped: limbs.filter((entry) => entry.kind === "metric").length,
    routesMapped: limbs.filter((entry) => entry.kind === "route" || entry.kind === "api_route").length,
    materializersMapped: limbs.filter((entry) => entry.kind === "materializer").length,
    disconnectedByStatus,
    disconnectedLimbs,
    limbs,
    dirtyFiles: input.dirtyFiles ?? [],
    openPullRequests: input.openPullRequests ?? [],
    debugLane,
    scoreDimensionImpact: scoreDimensionImpact(limbs),
    remainingGaps,
    nextExactSteps,
    validationFailures,
  };

  const failures = validateProductBodyMapReport(report);
  return {
    ...report,
    status: failures.length > 0 ? "fail" : "pass",
    validationFailures: failures,
  };
}

export function classifyProductBodyMapDirtyFile(path: string): ProductBodyMapDirtyFile["classification"] {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/state/product-body-map.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/product-body-map.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/product-integrity/product-body-system-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/product-body-map.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/central-normalizer-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/central-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-product-body-map.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-central-normalizer-spine.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/product-body-map.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/central-normalizer-spine.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md") return "release_artifact_expected";
  if (normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/paypal|wallet|payment|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|navbar/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function classifyProductBodyMapOpenPullRequest(input: { title?: string; number?: number }): string {
  const title = String(input.title ?? "");
  const number = Number(input.number ?? 0);
  if (/dependency|npm|knip|syncpack|puppeteer/i.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/i.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/i.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/i.test(title)) return "accessibility_patch_external_review_required";
  if (/doctrine|banned-pattern|drift/i.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries|file risk/i.test(title)) return "architecture_refactor_external_review_required";
  if (/onboarding|friction|rescue signals/i.test(title)) return "onboarding_telemetry_external_review_required";
  return number > 0 ? "open_pr_external_review_required" : "unsafe_unknown";
}

export { EXPECTED_DEBUG_LANES };
