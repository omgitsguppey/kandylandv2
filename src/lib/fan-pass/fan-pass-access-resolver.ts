import {
  FAN_PASS_DEBUG_LANE,
  FAN_PASS_LIFECYCLE_EVENTS,
  FAN_PASS_UNLOCKED_FEATURES,
  type FanPassChatBypassStatus,
  type FanPassDropAccessStatus,
  type FanPassFailureClass,
  type FanPassLifecycleEventName,
  type FanPassLifecycleRecord,
  type FanPassLifecycleState,
  type FanPassNotificationEligibility,
  type FanPassSourceTruth,
  type FanPassUnlockedFeature,
} from "@/lib/fan-pass/fan-pass-lifecycle-contract";

export type FanPassCreatorSettingsSource = "creator_settings" | "legacy_default" | "missing" | "unavailable";
export type FanPassSubscriptionStatus = "active" | "expired" | "cancelled" | "canceled" | "refunded" | "missing" | "unknown";
export type FanPassSurface = "creator_profile" | "creator_settings" | "chat" | "drop" | "timeline" | "notifications" | "admin";

export type FanPassVisibilityInput = {
  creatorId?: string | null;
  enabledByCreator: boolean;
  price: number;
  creatorSettingsSource: FanPassCreatorSettingsSource;
  restrictedByCreator?: boolean;
};

export type FanPassVisibilityResult = {
  creatorId: string;
  visible: boolean;
  state: Extract<FanPassLifecycleState, "unavailable" | "not_configured" | "visible">;
  sourceTruth: FanPassSourceTruth;
  enabledByCreator: boolean;
  price: number;
  debugReason: string;
  humanReason: string;
};

export type FanPassAccessInput = {
  creatorId?: string | null;
  fanUserId?: string | null;
  fanPassId?: string | null;
  enabledByCreator: boolean;
  activeForUser: boolean;
  subscriptionStatus: FanPassSubscriptionStatus;
  sourceTruth: FanPassSourceTruth;
  price: number;
  accessStartAt?: number | null;
  accessEndAt?: number | null;
  chatFreeForSubscribers?: boolean;
  subscriberDropAccessEnabled?: boolean;
  fanPassNotificationsEnabled?: boolean;
  profileTimelineVisible?: boolean;
};

export type FanPassAccessExplanation = {
  humanReason: string;
  debugReason: string;
  nextAction: "start_fan_pass" | "renew_fan_pass" | "configure_creator_fan_pass" | "none";
};

export type FanPassTelemetryPayload = {
  eventName: FanPassLifecycleEventName;
  featureId: "fan_pass";
  surface: FanPassSurface;
  route: string;
  creatorId: string;
  fanUserIdPresent: boolean;
  fanPassIdPresent: boolean;
  state: FanPassLifecycleState;
  sourceTruth: FanPassSourceTruth;
  priceGd: number;
  debugLane: typeof FAN_PASS_DEBUG_LANE;
  materializerLane: "creator_subscription_materializer";
  identityAware: true;
  consentAware: true;
  debugVisible: true;
  paymentRuntimeTouched: false;
  gumdropMathTouched: false;
  failureReason: FanPassFailureClass;
};

function cleanId(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGd(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function sourceTruthForSettings(source: FanPassCreatorSettingsSource): FanPassSourceTruth {
  return source === "creator_settings" || source === "legacy_default" ? "creator_settings" : "missing";
}

function activeWindow(input: Pick<FanPassAccessInput, "accessEndAt">) {
  return typeof input.accessEndAt === "number" && Number.isFinite(input.accessEndAt)
    ? input.accessEndAt > Date.now()
    : true;
}

function unlockedFeatures(input: FanPassAccessInput): FanPassUnlockedFeature[] {
  if (!input.activeForUser || input.subscriptionStatus !== "active" || !activeWindow(input)) {
    return [];
  }
  return FAN_PASS_UNLOCKED_FEATURES.filter((feature) => {
    if (feature === "chat_free_bypass") return input.chatFreeForSubscribers === true;
    if (feature === "subscriber_drop_access") return input.subscriberDropAccessEnabled === true;
    if (feature === "fan_pass_notifications") return input.fanPassNotificationsEnabled === true;
    if (feature === "profile_timeline_visibility") return input.profileTimelineVisible === true;
    return false;
  });
}

function chatBypassStatus(input: FanPassAccessInput, features: readonly FanPassUnlockedFeature[]): FanPassChatBypassStatus {
  if (input.chatFreeForSubscribers !== true) return "not_enabled";
  return features.includes("chat_free_bypass") ? "granted" : "denied";
}

function dropAccessStatus(input: FanPassAccessInput, features: readonly FanPassUnlockedFeature[]): FanPassDropAccessStatus {
  if (input.subscriberDropAccessEnabled !== true) return "not_enabled";
  return features.includes("subscriber_drop_access") ? "granted" : "denied";
}

function notificationEligibility(input: FanPassAccessInput, features: readonly FanPassUnlockedFeature[]): FanPassNotificationEligibility {
  if (input.fanPassNotificationsEnabled !== true) return "not_enabled";
  return features.includes("fan_pass_notifications") ? "eligible" : "ineligible";
}

function stateForAccess(input: FanPassAccessInput): FanPassLifecycleState {
  if (!cleanId(input.creatorId) || !input.enabledByCreator) return "not_configured";
  if (!cleanId(input.fanUserId)) return "access_denied";
  if (input.subscriptionStatus === "refunded") return "refunded";
  if (input.subscriptionStatus === "cancelled" || input.subscriptionStatus === "canceled") return "cancelled";
  if (input.subscriptionStatus === "expired" || !activeWindow(input)) return "expired";
  if (input.activeForUser && input.subscriptionStatus === "active") return "access_granted";
  if (input.subscriptionStatus === "unknown" || input.sourceTruth === "legacy_unknown") return "unknown_legacy";
  return "access_denied";
}

function failureForState(state: FanPassLifecycleState, input: FanPassAccessInput): FanPassFailureClass {
  if (state === "access_granted" || state === "active") return "none";
  if (!cleanId(input.creatorId) || !input.enabledByCreator) return "creator_disabled";
  if (!cleanId(input.fanUserId)) return "auth_required";
  if (state === "expired") return "subscription_expired";
  if (state === "cancelled") return "subscription_cancelled";
  if (state === "refunded") return "subscription_refunded";
  if (state === "unknown_legacy") return "unsafe_unknown";
  return "subscription_missing";
}

export function resolveFanPassVisibility(input: FanPassVisibilityInput): FanPassVisibilityResult {
  const creatorId = cleanId(input.creatorId);
  const sourceTruth = sourceTruthForSettings(input.creatorSettingsSource);
  const price = normalizeGd(input.price);
  if (!creatorId || input.creatorSettingsSource === "unavailable") {
    return {
      creatorId,
      visible: false,
      state: "unavailable",
      sourceTruth: "missing",
      enabledByCreator: false,
      price: 0,
      humanReason: "Fan Pass is unavailable for this creator right now.",
      debugReason: "creator unavailable or missing creator id",
    };
  }
  if (input.creatorSettingsSource === "missing") {
    return {
      creatorId,
      visible: false,
      state: "not_configured",
      sourceTruth,
      enabledByCreator: input.enabledByCreator,
      price,
      humanReason: "Fan Pass is not configured yet.",
      debugReason: "Fan Pass visible without creator settings source is blocked.",
    };
  }
  if (!input.enabledByCreator || input.restrictedByCreator || price <= 0) {
    return {
      creatorId,
      visible: false,
      state: "not_configured",
      sourceTruth,
      enabledByCreator: input.enabledByCreator,
      price,
      humanReason: "Fan Pass is not available for this creator right now.",
      debugReason: "creator disabled Fan Pass, restriction applied, or price is missing",
    };
  }
  return {
    creatorId,
    visible: true,
    state: "visible",
    sourceTruth,
    enabledByCreator: true,
    price,
    humanReason: "Fan Pass is available.",
    debugReason: "creator settings source confirms Fan Pass visibility",
  };
}

export function resolveFanPassAccess(input: FanPassAccessInput): FanPassLifecycleRecord {
  const creatorId = cleanId(input.creatorId);
  const fanUserId = cleanId(input.fanUserId);
  const state = stateForAccess(input);
  const features = state === "access_granted" ? unlockedFeatures(input) : [];
  const failureReason = failureForState(state, input);
  const explanation = explainFanPassAccess({
    creatorId,
    fanUserId,
    fanPassId: cleanId(input.fanPassId) || undefined,
    price: normalizeGd(input.price),
    billingPeriod: "monthly",
    accessStartAt: typeof input.accessStartAt === "number" ? input.accessStartAt : undefined,
    accessEndAt: typeof input.accessEndAt === "number" ? input.accessEndAt : undefined,
    sourceTruth: input.sourceTruth,
    enabledByCreator: input.enabledByCreator,
    activeForUser: state === "access_granted",
    state,
    unlockedFeatures: features,
    chatBypassStatus: chatBypassStatus(input, features),
    dropAccessStatus: dropAccessStatus(input, features),
    notificationEligibility: notificationEligibility(input, features),
    telemetryEvents: [...FAN_PASS_LIFECYCLE_EVENTS],
    debugVisibility: {
      lane: FAN_PASS_DEBUG_LANE,
      status: "debug_visible",
      rawPaymentProviderDumpDefault: false,
    },
    failureReason,
    humanReason: "",
    debugReason: "",
  });

  return {
    creatorId,
    fanUserId: fanUserId || undefined,
    fanPassId: cleanId(input.fanPassId) || undefined,
    price: normalizeGd(input.price),
    billingPeriod: "monthly",
    accessStartAt: typeof input.accessStartAt === "number" ? input.accessStartAt : undefined,
    accessEndAt: typeof input.accessEndAt === "number" ? input.accessEndAt : undefined,
    sourceTruth: input.sourceTruth,
    enabledByCreator: input.enabledByCreator,
    activeForUser: state === "access_granted",
    state,
    unlockedFeatures: features,
    chatBypassStatus: chatBypassStatus(input, features),
    dropAccessStatus: dropAccessStatus(input, features),
    notificationEligibility: notificationEligibility(input, features),
    telemetryEvents: [...FAN_PASS_LIFECYCLE_EVENTS],
    debugVisibility: {
      lane: FAN_PASS_DEBUG_LANE,
      status: "debug_visible",
      rawPaymentProviderDumpDefault: false,
    },
    failureReason,
    humanReason: explanation.humanReason,
    debugReason: explanation.debugReason,
  };
}

export function explainFanPassAccess(input: Pick<FanPassLifecycleRecord, "state" | "failureReason" | "sourceTruth"> & Partial<FanPassLifecycleRecord>): FanPassAccessExplanation {
  if (input.state === "access_granted" || input.state === "active") {
    return {
      humanReason: "Fan Pass is active for this creator.",
      debugReason: `Fan Pass access granted from ${input.sourceTruth}.`,
      nextAction: "none",
    };
  }
  if (input.failureReason === "creator_disabled" || input.failureReason === "creator_settings_missing") {
    return {
      humanReason: "Fan Pass is not configured for this creator yet.",
      debugReason: `Fan Pass denied because source truth is ${input.sourceTruth}.`,
      nextAction: "configure_creator_fan_pass",
    };
  }
  if (input.failureReason === "subscription_expired") {
    return {
      humanReason: "Renew Fan Pass to keep subscriber access.",
      debugReason: "Fan Pass denied because the subscription window expired.",
      nextAction: "renew_fan_pass",
    };
  }
  return {
    humanReason: "Start Fan Pass to unlock subscriber access.",
    debugReason: `Fan Pass denied because subscription is ${input.failureReason.replace(/^subscription_/u, "")}.`,
    nextAction: "start_fan_pass",
  };
}

export function classifyFanPassFailure(input: Pick<FanPassLifecycleRecord, "failureReason"> | FanPassFailureClass): FanPassFailureClass {
  return typeof input === "string" ? input : input.failureReason;
}

export function buildFanPassTelemetry(input: {
  eventName: FanPassLifecycleEventName;
  creatorId: string;
  fanUserId?: string | null;
  fanPassId?: string | null;
  state: FanPassLifecycleState;
  sourceTruth: FanPassSourceTruth;
  price?: number | null;
  surface: FanPassSurface;
  route?: string | null;
  failureReason?: FanPassFailureClass | "none" | null;
}): FanPassTelemetryPayload {
  return {
    eventName: input.eventName,
    featureId: "fan_pass",
    surface: input.surface,
    route: cleanId(input.route) || "/creators/[username]",
    creatorId: cleanId(input.creatorId),
    fanUserIdPresent: Boolean(cleanId(input.fanUserId)),
    fanPassIdPresent: Boolean(cleanId(input.fanPassId)),
    state: input.state,
    sourceTruth: input.sourceTruth,
    priceGd: normalizeGd(input.price),
    debugLane: FAN_PASS_DEBUG_LANE,
    materializerLane: "creator_subscription_materializer",
    identityAware: true,
    consentAware: true,
    debugVisible: true,
    paymentRuntimeTouched: false,
    gumdropMathTouched: false,
    failureReason: input.failureReason && input.failureReason !== "none" ? input.failureReason : "none",
  };
}
