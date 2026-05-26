import type { CreatorSettings } from "@/types/db";

export const CREATOR_MONETIZATION_DEBUG_LANE = "Creator monetization settings" as const;

export const CREATOR_MONETIZATION_EVENTS = [
  "creator_monetization_settings_viewed",
  "creator_monetization_setting_changed",
  "creator_monetization_save_succeeded",
  "creator_monetization_save_failed",
  "creator_monetization_user_surface_applied",
  "creator_monetization_mismatch_detected",
] as const;

export const CREATOR_MONETIZATION_USER_CONSUMERS = [
  "public_creator_profile",
  "creator_profile_timeline",
  "creator_experiences_panel",
  "chat_pricing",
  "fan_pass_access",
  "broadcasts",
  "drop_manager",
] as const;

export const CREATOR_MONETIZATION_CREATOR_CONTROLS = [
  "creator_settings_fan_pass",
  "creator_settings_chat",
  "creator_settings_gumdrop_experiences",
  "creator_settings_broadcasts",
  "creator_settings_timeline",
  "creator_settings_drop_manager",
] as const;

export type CreatorMonetizationEventName = (typeof CREATOR_MONETIZATION_EVENTS)[number];
export type CreatorMonetizationUserConsumer = (typeof CREATOR_MONETIZATION_USER_CONSUMERS)[number];
export type CreatorMonetizationCreatorControl = (typeof CREATOR_MONETIZATION_CREATOR_CONTROLS)[number];
export type CreatorMonetizationSourceTruth =
  | "creator_settings_doc"
  | "safe_defaults_missing_settings_doc"
  | "legacy_default"
  | "unavailable";
export type CreatorMonetizationProfileVisibility = "public" | "hidden" | "restricted";
export type CreatorMonetizationValidationStatus = "valid" | "review" | "invalid" | "not_configured";

export type CreatorMonetizationValidation = {
  status: CreatorMonetizationValidationStatus;
  errors: string[];
  warnings: string[];
  invalidPricing: boolean;
  missingConsumerCount: number;
};

export type CreatorMonetizationSettings = {
  creatorId: string;
  fanPassEnabled: boolean;
  fanPassPrice: number;
  chatTextPriceGd: number;
  chatImagePriceGd: number;
  chatVideoPriceGd: number;
  subscriberFreeChatEnabled: boolean;
  gumdropExperiencesEnabled: boolean;
  broadcastsEnabled: boolean;
  timelineEnabled: boolean;
  profileVisibility: CreatorMonetizationProfileVisibility;
  dropManagerEnabled: boolean;
  sourceTruth: CreatorMonetizationSourceTruth;
  updatedAt: number | null;
  validation: CreatorMonetizationValidation;
  userFacingConsumers: CreatorMonetizationUserConsumer[];
  creatorFacingControls: CreatorMonetizationCreatorControl[];
  normalizedSettings: CreatorSettings;
  telemetryEvents: CreatorMonetizationEventName[];
  debugVisibility: {
    lane: typeof CREATOR_MONETIZATION_DEBUG_LANE;
    status: "debug_visible" | "review" | "blocked";
    reason: string;
    paymentRuntimeTouched: false;
    gumdropMathTouched: false;
  };
};

export type CreatorMonetizationContractShape = {
  requiredFields: readonly (keyof CreatorMonetizationSettings)[];
  userFacingConsumers: readonly CreatorMonetizationUserConsumer[];
  creatorFacingControls: readonly CreatorMonetizationCreatorControl[];
  telemetryEvents: readonly CreatorMonetizationEventName[];
  debugLane: typeof CREATOR_MONETIZATION_DEBUG_LANE;
  paymentRuntimeTouched: false;
  payoutMathTouched: false;
  gumdropMathTouched: false;
};

export function buildCreatorMonetizationDebugVisibility(input: {
  status?: CreatorMonetizationSettings["debugVisibility"]["status"];
  reason?: string;
} = {}): CreatorMonetizationSettings["debugVisibility"] {
  return {
    lane: CREATOR_MONETIZATION_DEBUG_LANE,
    status: input.status ?? "debug_visible",
    reason: input.reason ?? "creator monetization settings source truth is visible",
    paymentRuntimeTouched: false,
    gumdropMathTouched: false,
  };
}

export function buildCreatorMonetizationContractShape(): CreatorMonetizationContractShape {
  return {
    requiredFields: [
      "creatorId",
      "fanPassEnabled",
      "fanPassPrice",
      "chatTextPriceGd",
      "chatImagePriceGd",
      "chatVideoPriceGd",
      "subscriberFreeChatEnabled",
      "gumdropExperiencesEnabled",
      "broadcastsEnabled",
      "timelineEnabled",
      "profileVisibility",
      "dropManagerEnabled",
      "sourceTruth",
      "updatedAt",
      "validation",
      "userFacingConsumers",
      "creatorFacingControls",
    ],
    userFacingConsumers: CREATOR_MONETIZATION_USER_CONSUMERS,
    creatorFacingControls: CREATOR_MONETIZATION_CREATOR_CONTROLS,
    telemetryEvents: CREATOR_MONETIZATION_EVENTS,
    debugLane: CREATOR_MONETIZATION_DEBUG_LANE,
    paymentRuntimeTouched: false,
    payoutMathTouched: false,
    gumdropMathTouched: false,
  };
}

export function validateCreatorMonetizationContractShape(shape: CreatorMonetizationContractShape) {
  const failures: string[] = [];
  const requiredFields = buildCreatorMonetizationContractShape().requiredFields;
  for (const field of requiredFields) {
    if (!shape.requiredFields.includes(field)) failures.push(`Missing required monetization field: ${field}`);
  }
  for (const consumer of CREATOR_MONETIZATION_USER_CONSUMERS) {
    if (!shape.userFacingConsumers.includes(consumer)) failures.push(`Missing monetization consumer: ${consumer}`);
  }
  for (const eventName of CREATOR_MONETIZATION_EVENTS) {
    if (!shape.telemetryEvents.includes(eventName)) failures.push(`Missing monetization telemetry event: ${eventName}`);
  }
  if (shape.debugLane !== CREATOR_MONETIZATION_DEBUG_LANE) failures.push("Creator monetization debug lane missing.");
  if (shape.paymentRuntimeTouched) failures.push("Creator monetization settings must not touch payment runtime.");
  if (shape.payoutMathTouched) failures.push("Creator monetization settings must not touch payout math.");
  if (shape.gumdropMathTouched) failures.push("Creator monetization settings must not touch GumDrop math.");
  return failures;
}
