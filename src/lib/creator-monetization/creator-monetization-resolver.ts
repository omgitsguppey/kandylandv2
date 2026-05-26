import {
  CREATOR_BOOKING_RATES,
  CREATOR_MESSAGE_COSTS,
  CREATOR_SUBSCRIPTION_MIN_GD,
  DEFAULT_CREATOR_SETTINGS,
  normalizeCreatorRestrictions,
  normalizeCreatorSettings,
  type CreatorRestrictions,
} from "@/lib/creator-experiences";
import {
  resolveCreatorFanPassPricing,
  resolveCreatorPricing,
} from "@/lib/creator-settings/creator-pricing-resolver";
import {
  CREATOR_MONETIZATION_CREATOR_CONTROLS,
  CREATOR_MONETIZATION_EVENTS,
  CREATOR_MONETIZATION_USER_CONSUMERS,
  buildCreatorMonetizationDebugVisibility,
  type CreatorMonetizationSettings,
  type CreatorMonetizationSourceTruth,
  type CreatorMonetizationUserConsumer,
} from "@/lib/creator-monetization/creator-monetization-contract";

export type CreatorMonetizationSettingsInput = {
  creatorId?: string | null;
  rawSettings?: unknown;
  rawRestrictions?: unknown;
  settingsConfigured?: boolean;
  updatedAt?: number | null;
  profileHidden?: boolean;
  dropManagerRestricted?: boolean;
};

export type CreatorMonetizationUpdateInput = Partial<{
  fanPassEnabled: boolean;
  fanPassPrice: number;
  chatTextPriceGd: number;
  chatImagePriceGd: number;
  chatVideoPriceGd: number;
  subscriberFreeChatEnabled: boolean;
  gumdropExperiencesEnabled: boolean;
  broadcastsEnabled: boolean;
  timelineEnabled: boolean;
  profileVisibility: "public" | "hidden" | "restricted";
  dropManagerEnabled: boolean;
}>;

export type CreatorMonetizationUpdateValidation =
  | {
      ok: true;
      errors: [];
      paymentRuntimeTouched: false;
      gumdropMathTouched: false;
    }
  | {
      ok: false;
      errors: string[];
      paymentRuntimeTouched: false;
      gumdropMathTouched: false;
    };

export type UserFacingCreatorMonetization = {
  creatorId: string;
  fanPass: { visible: boolean; enabled: boolean; priceGd: number; sourceTruth: CreatorMonetizationSourceTruth };
  chat: { visible: boolean; textPriceGd: number; imagePriceGd: number; videoPriceGd: number; subscriberFreeChatEnabled: boolean };
  gumdropExperiences: { visible: boolean };
  broadcasts: { visible: boolean };
  timeline: { visible: boolean };
  dropManager: { visibleToCreator: boolean };
  debugLane: CreatorMonetizationSettings["debugVisibility"]["lane"];
  telemetryEvents: typeof CREATOR_MONETIZATION_EVENTS;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toWholeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function hasOwn(source: unknown, key: string) {
  return Boolean(source && typeof source === "object" && !Array.isArray(source) && Object.prototype.hasOwnProperty.call(source, key));
}

function sourceTruth(input: CreatorMonetizationSettingsInput): CreatorMonetizationSourceTruth {
  if (input.settingsConfigured === false) return "safe_defaults_missing_settings_doc";
  if (!input.rawSettings || typeof input.rawSettings !== "object") return "legacy_default";
  return "creator_settings_doc";
}

function activeControls(input: {
  settings: ReturnType<typeof normalizeCreatorSettings>;
  restrictions: CreatorRestrictions;
}) {
  const controls = [...CREATOR_MONETIZATION_CREATOR_CONTROLS];
  if (input.restrictions.dropSubmissionsRestricted === true) {
    return controls.filter((control) => control !== "creator_settings_drop_manager");
  }
  return controls;
}

export function validateCreatorMonetizationUpdate(input: CreatorMonetizationUpdateInput): CreatorMonetizationUpdateValidation {
  const errors: string[] = [];
  if (input.fanPassEnabled !== false && Object.prototype.hasOwnProperty.call(input, "fanPassPrice")) {
    const fanPassPrice = toWholeNumber(input.fanPassPrice, 0);
    if (fanPassPrice < CREATOR_SUBSCRIPTION_MIN_GD) {
      errors.push(`fanPassPrice must be at least ${CREATOR_SUBSCRIPTION_MIN_GD} GD when Fan Pass is enabled.`);
    }
  }
  for (const key of ["chatTextPriceGd", "chatImagePriceGd", "chatVideoPriceGd"] as const) {
    const value = input[key];
    if (Object.prototype.hasOwnProperty.call(input, key) && typeof value === "number" && Number.isFinite(value) && value < 0) {
      errors.push(`${key} must be zero or greater.`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, "profileVisibility") && input.profileVisibility !== "public" && input.profileVisibility !== "hidden" && input.profileVisibility !== "restricted") {
    errors.push("profileVisibility must be public, hidden, or restricted.");
  }
  if (errors.length > 0) {
    return { ok: false, errors, paymentRuntimeTouched: false, gumdropMathTouched: false };
  }
  return { ok: true, errors: [], paymentRuntimeTouched: false, gumdropMathTouched: false };
}

export function resolveCreatorMonetizationSettings(input: CreatorMonetizationSettingsInput): CreatorMonetizationSettings {
  const settings = normalizeCreatorSettings(input.rawSettings ?? DEFAULT_CREATOR_SETTINGS);
  const restrictions = normalizeCreatorRestrictions(input.rawRestrictions);
  const pricing = resolveCreatorPricing(input.rawSettings);
  const fanPassPricing = resolveCreatorFanPassPricing(input.rawSettings);
  const truth = sourceTruth(input);
  const creatorId = cleanText(input.creatorId) || "unknown_creator";
  const fanPassEnabled = fanPassPricing.enabled && restrictions.subscriptionsRestricted !== true;
  const gumdropExperiencesEnabled = (
    (settings.customRequestsEnabled && restrictions.customRequestsRestricted !== true)
    || (settings.bookingsEnabled && restrictions.bookingsRestricted !== true)
  );
  const broadcastsEnabled = settings.broadcastsEnabled && restrictions.broadcastsRestricted !== true;
  const timelineEnabled = settings.profileTimelineEnabled !== false;
  const dropManagerEnabled = restrictions.dropSubmissionsRestricted !== true;
  const profileVisibility = input.profileHidden ? "hidden" : "public";
  const validation = validateCreatorMonetizationUpdate({
    fanPassEnabled,
    fanPassPrice: fanPassPricing.priceGd,
    chatTextPriceGd: CREATOR_MESSAGE_COSTS.text,
    chatImagePriceGd: CREATOR_MESSAGE_COSTS.image,
    chatVideoPriceGd: CREATOR_MESSAGE_COSTS.video,
    subscriberFreeChatEnabled: settings.chatFreeForSubscribers !== false,
    gumdropExperiencesEnabled,
    broadcastsEnabled,
    timelineEnabled,
    profileVisibility,
    dropManagerEnabled,
  });
  const warnings = [
    truth !== "creator_settings_doc" ? "creator_settings_not_configured" : null,
    pricing.requests.length === 0 && settings.customRequestsEnabled ? "request_categories_missing" : null,
    settings.bookingsEnabled && Math.max(settings.phoneRatePerMinuteGd, settings.videoRatePerMinuteGd) < CREATOR_BOOKING_RATES.phone ? "booking_price_review" : null,
  ].filter((warning): warning is string => Boolean(warning));
  const errors = validation.ok ? [] : validation.errors;

  return {
    creatorId,
    fanPassEnabled,
    fanPassPrice: fanPassPricing.priceGd,
    chatTextPriceGd: CREATOR_MESSAGE_COSTS.text,
    chatImagePriceGd: CREATOR_MESSAGE_COSTS.image,
    chatVideoPriceGd: CREATOR_MESSAGE_COSTS.video,
    subscriberFreeChatEnabled: settings.chatFreeForSubscribers !== false,
    gumdropExperiencesEnabled,
    broadcastsEnabled,
    timelineEnabled,
    profileVisibility,
    dropManagerEnabled,
    sourceTruth: truth,
    updatedAt: typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt) ? Math.trunc(input.updatedAt) : null,
    validation: {
      status: errors.length > 0 ? "invalid" : truth === "creator_settings_doc" ? "valid" : "not_configured",
      errors,
      warnings,
      invalidPricing: errors.some((error) => error.includes("Price") || error.includes("price") || error.includes("GD")),
      missingConsumerCount: 0,
    },
    userFacingConsumers: [...CREATOR_MONETIZATION_USER_CONSUMERS],
    creatorFacingControls: activeControls({ settings, restrictions }),
    normalizedSettings: settings,
    telemetryEvents: [...CREATOR_MONETIZATION_EVENTS],
    debugVisibility: buildCreatorMonetizationDebugVisibility({
      status: errors.length > 0 ? "blocked" : warnings.length > 0 ? "review" : "debug_visible",
      reason: errors[0] ?? warnings[0] ?? "creator monetization settings normalized from canonical creator settings",
    }),
  };
}

export function resolveUserFacingCreatorMonetization(settings: CreatorMonetizationSettings): UserFacingCreatorMonetization {
  return {
    creatorId: settings.creatorId,
    fanPass: {
      visible: settings.fanPassEnabled,
      enabled: settings.fanPassEnabled,
      priceGd: settings.fanPassPrice,
      sourceTruth: settings.sourceTruth,
    },
    chat: {
      visible: settings.normalizedSettings.messagingEnabled !== false,
      textPriceGd: settings.chatTextPriceGd,
      imagePriceGd: settings.chatImagePriceGd,
      videoPriceGd: settings.chatVideoPriceGd,
      subscriberFreeChatEnabled: settings.subscriberFreeChatEnabled,
    },
    gumdropExperiences: { visible: settings.gumdropExperiencesEnabled },
    broadcasts: { visible: settings.broadcastsEnabled && settings.normalizedSettings.showBroadcastsOnTimeline !== false },
    timeline: { visible: settings.timelineEnabled },
    dropManager: { visibleToCreator: settings.dropManagerEnabled },
    debugLane: settings.debugVisibility.lane,
    telemetryEvents: CREATOR_MONETIZATION_EVENTS,
  };
}

export function explainCreatorMonetizationMismatch(input: {
  expected: CreatorMonetizationSettings;
  consumer: CreatorMonetizationUserConsumer;
  observed: Record<string, unknown>;
}) {
  const mismatches: string[] = [];
  if (hasOwn(input.observed, "fanPassPrice") && input.observed.fanPassPrice !== input.expected.fanPassPrice) mismatches.push("fanPassPrice");
  if (hasOwn(input.observed, "chatTextPriceGd") && input.observed.chatTextPriceGd !== input.expected.chatTextPriceGd) mismatches.push("chatTextPriceGd");
  if (hasOwn(input.observed, "broadcastsEnabled") && input.observed.broadcastsEnabled !== input.expected.broadcastsEnabled) mismatches.push("broadcastsEnabled");
  if (hasOwn(input.observed, "timelineEnabled") && input.observed.timelineEnabled !== input.expected.timelineEnabled) mismatches.push("timelineEnabled");
  if (mismatches.length === 0) return `No creator monetization mismatch detected for ${input.consumer}.`;
  return `${input.consumer} creator monetization mismatch: ${mismatches.join(", ")}.`;
}
