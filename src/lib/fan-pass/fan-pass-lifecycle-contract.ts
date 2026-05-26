import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export const FAN_PASS_LIFECYCLE_STATES = [
  "unavailable",
  "not_configured",
  "visible",
  "viewed",
  "purchase_attempted",
  "purchase_succeeded",
  "purchase_failed",
  "active",
  "expired",
  "cancelled",
  "refunded",
  "access_granted",
  "access_denied",
  "unknown_legacy",
] as const;

export type FanPassLifecycleState = typeof FAN_PASS_LIFECYCLE_STATES[number];

export const FAN_PASS_LIFECYCLE_EVENTS = [
  "fan_pass_surface_viewed",
  "fan_pass_cta_clicked",
  "fan_pass_purchase_attempted",
  "fan_pass_purchase_succeeded",
  "fan_pass_purchase_failed",
  "fan_pass_access_granted",
  "fan_pass_access_denied",
  "fan_pass_cancelled",
  "fan_pass_expired",
] as const;

export type FanPassLifecycleEventName = typeof FAN_PASS_LIFECYCLE_EVENTS[number];

export const FAN_PASS_UNLOCKED_FEATURES = [
  "chat_free_bypass",
  "subscriber_drop_access",
  "fan_pass_notifications",
  "profile_timeline_visibility",
] as const;

export type FanPassUnlockedFeature = typeof FAN_PASS_UNLOCKED_FEATURES[number];

export const FAN_PASS_DEBUG_LANE = "Fan Pass lifecycle" as const;

export type FanPassSourceTruth =
  | "creator_settings"
  | "creator_subscription"
  | "server_entitlement"
  | "chat_pricing"
  | "drop_entitlement"
  | "notification_intent"
  | "legacy_unknown"
  | "missing";

export type FanPassBillingPeriod = "monthly" | "legacy_unknown" | "none";

export type FanPassChatBypassStatus = "granted" | "denied" | "not_enabled" | "not_applicable" | "unknown";
export type FanPassDropAccessStatus = "granted" | "denied" | "not_enabled" | "not_applicable" | "unknown";
export type FanPassNotificationEligibility = "eligible" | "ineligible" | "not_enabled" | "unknown";

export type FanPassFailureClass =
  | "none"
  | "creator_settings_missing"
  | "creator_disabled"
  | "subscription_missing"
  | "subscription_expired"
  | "subscription_cancelled"
  | "subscription_refunded"
  | "auth_required"
  | "unsafe_unknown";

export type FanPassLifecycleRecord = {
  creatorId: string;
  fanUserId?: string;
  fanPassId?: string;
  price: number;
  billingPeriod: FanPassBillingPeriod;
  accessStartAt?: number;
  accessEndAt?: number;
  sourceTruth: FanPassSourceTruth;
  enabledByCreator: boolean;
  activeForUser: boolean;
  state: FanPassLifecycleState;
  unlockedFeatures: FanPassUnlockedFeature[];
  chatBypassStatus: FanPassChatBypassStatus;
  dropAccessStatus: FanPassDropAccessStatus;
  notificationEligibility: FanPassNotificationEligibility;
  telemetryEvents: FanPassLifecycleEventName[];
  debugVisibility: {
    lane: typeof FAN_PASS_DEBUG_LANE;
    status: "debug_visible";
    rawPaymentProviderDumpDefault: false;
  };
  failureReason: FanPassFailureClass;
  humanReason: string;
  debugReason: string;
};

export type FanPassLifecycleDebugLane = {
  label: typeof FAN_PASS_DEBUG_LANE;
  status: "live" | "degraded" | "failed";
  configuredCreators: number;
  viewedCount: number;
  attemptedCount: number;
  succeededCount: number;
  failedCount: number;
  accessMismatchCount: number;
  chatBypassMismatchCount: number;
  notConfiguredSurfaceCount: number;
  rawPaymentProviderDumpDefault: false;
  paymentRuntimeTouched: false;
  gumdropMathTouched: false;
  scoreDimensionsAffected: readonly PublicBetaHealthDimension[];
};

export type FanPassLifecycleReportShape = {
  states: readonly FanPassLifecycleState[];
  events: readonly FanPassLifecycleEventName[];
  unlockedFeatures: readonly FanPassUnlockedFeature[];
  debugLane: typeof FAN_PASS_DEBUG_LANE;
  sourceTruthValues: readonly FanPassSourceTruth[];
};

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function buildFanPassLifecycleDebugLane(input: {
  configuredCreators?: number;
  viewedCount?: number;
  attemptedCount?: number;
  succeededCount?: number;
  failedCount?: number;
  accessMismatchCount?: number;
  chatBypassMismatchCount?: number;
  notConfiguredSurfaceCount?: number;
} = {}): FanPassLifecycleDebugLane {
  const accessMismatchCount = normalizeCount(input.accessMismatchCount);
  const chatBypassMismatchCount = normalizeCount(input.chatBypassMismatchCount);
  const failedCount = normalizeCount(input.failedCount);
  const notConfiguredSurfaceCount = normalizeCount(input.notConfiguredSurfaceCount);
  return {
    label: FAN_PASS_DEBUG_LANE,
    status: accessMismatchCount || chatBypassMismatchCount ? "failed" : failedCount || notConfiguredSurfaceCount ? "degraded" : "live",
    configuredCreators: normalizeCount(input.configuredCreators),
    viewedCount: normalizeCount(input.viewedCount),
    attemptedCount: normalizeCount(input.attemptedCount),
    succeededCount: normalizeCount(input.succeededCount),
    failedCount,
    accessMismatchCount,
    chatBypassMismatchCount,
    notConfiguredSurfaceCount,
    rawPaymentProviderDumpDefault: false,
    paymentRuntimeTouched: false,
    gumdropMathTouched: false,
    scoreDimensionsAffected: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"],
  };
}

export function buildFanPassLifecycleReportShape(): FanPassLifecycleReportShape {
  return {
    states: FAN_PASS_LIFECYCLE_STATES,
    events: FAN_PASS_LIFECYCLE_EVENTS,
    unlockedFeatures: FAN_PASS_UNLOCKED_FEATURES,
    debugLane: FAN_PASS_DEBUG_LANE,
    sourceTruthValues: [
      "creator_settings",
      "creator_subscription",
      "server_entitlement",
      "chat_pricing",
      "drop_entitlement",
      "notification_intent",
      "legacy_unknown",
      "missing",
    ],
  };
}

export function validateFanPassLifecycleReportShape(shape: FanPassLifecycleReportShape) {
  const failures: string[] = [];
  for (const state of FAN_PASS_LIFECYCLE_STATES) {
    if (!shape.states.includes(state)) failures.push(`Fan Pass lifecycle state missing: ${state}`);
  }
  for (const eventName of FAN_PASS_LIFECYCLE_EVENTS) {
    if (!shape.events.includes(eventName)) failures.push(`Fan Pass lifecycle event missing: ${eventName}`);
  }
  for (const feature of FAN_PASS_UNLOCKED_FEATURES) {
    if (!shape.unlockedFeatures.includes(feature)) failures.push(`Fan Pass unlocked feature missing: ${feature}`);
  }
  if (shape.debugLane !== FAN_PASS_DEBUG_LANE) failures.push("Fan Pass lifecycle debug lane missing.");
  if (!shape.sourceTruthValues.includes("creator_settings")) failures.push("Fan Pass creator settings source truth missing.");
  if (!shape.sourceTruthValues.includes("creator_subscription")) failures.push("Fan Pass creator subscription source truth missing.");
  return failures;
}
