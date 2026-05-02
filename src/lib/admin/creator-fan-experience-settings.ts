import {
  CREATOR_BOOKING_MIN_MINUTES,
  CREATOR_BOOKING_RATES,
  CREATOR_SUBSCRIPTION_MIN_GD,
  DEFAULT_CREATOR_RESTRICTIONS,
  DEFAULT_CREATOR_SETTINGS,
  normalizeCreatorRestrictions,
  normalizeCreatorSettings,
  type CreatorAvailabilityWindow,
  type CreatorRequestCategoryConfig,
  type CreatorRestrictions,
  type CreatorSettings,
} from "@/lib/creator-experiences";

export const CREATOR_FAN_EXPERIENCE_ROUTE = "/admin/roster";

export const CREATOR_FAN_EXPERIENCE_SETTING_KEYS = [
  "messagingEnabled",
  "subscriptionsEnabled",
  "bookingsEnabled",
  "customRequestsEnabled",
  "broadcastsEnabled",
  "subscriptionPriceGd",
  "chatFreeForSubscribers",
  "phoneRatePerMinuteGd",
  "videoRatePerMinuteGd",
  "bookingMinimumMinutes",
  "videoSubscriberDiscountPercent",
  "requestCategories",
  "availabilityTimezone",
  "availabilityWindows",
] as const satisfies ReadonlyArray<keyof CreatorSettings>;

export const CREATOR_FAN_EXPERIENCE_RESTRICTION_KEYS = [
  "messagingRestricted",
  "subscriptionsRestricted",
  "bookingsRestricted",
  "customRequestsRestricted",
  "broadcastsRestricted",
  "payoutsRestricted",
  "dropSubmissionsRestricted",
] as const satisfies ReadonlyArray<keyof CreatorRestrictions>;

export type CreatorFanExperienceSettingKey = (typeof CREATOR_FAN_EXPERIENCE_SETTING_KEYS)[number];
export type CreatorFanExperienceRestrictionKey = (typeof CREATOR_FAN_EXPERIENCE_RESTRICTION_KEYS)[number];

export type CreatorFanExperienceSettingsCommand = {
  targetUserId: string;
  creatorSettings: CreatorSettings;
  creatorRestrictions: CreatorRestrictions;
  restrictionConfirmed: boolean;
};

export type CreatorFanExperienceSettingsParseResult =
  | { ok: true; command: CreatorFanExperienceSettingsCommand }
  | { ok: false; error: string };

export type CreatorFanExperienceSettingsValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  changedKeys: string[];
  settingChangedKeys: CreatorFanExperienceSettingKey[];
  restrictionChangedKeys: CreatorFanExperienceRestrictionKey[];
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function readWholeNumber(value: unknown, label: string, errors: string[]) {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    errors.push(`${label} must be a whole number.`);
    return 0;
  }
  if (value < 0) {
    errors.push(`${label} cannot be negative.`);
  }
  return value;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeCategories(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("Request categories must be a list.");
    return DEFAULT_CREATOR_SETTINGS.requestCategories;
  }

  const categories = value.flatMap((entry, index): CreatorRequestCategoryConfig[] => {
    if (!isRecord(entry)) {
      errors.push(`Request category ${index + 1} is invalid.`);
      return [];
    }
    const id = readString(entry.id);
    const label = readString(entry.label);
    const priceGd = readWholeNumber(entry.priceGd, `${label || `Request category ${index + 1}`} price`, errors);

    if (!id || !label) {
      errors.push(`Request category ${index + 1} needs a name.`);
      return [];
    }

    return [{
      id,
      label,
      description: readString(entry.description) || undefined,
      priceGd,
      enabled: entry.enabled !== false,
    }];
  });

  return categories.length > 0 ? categories : DEFAULT_CREATOR_SETTINGS.requestCategories;
}

function normalizeAvailabilityWindows(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("Availability windows must be a list.");
    return DEFAULT_CREATOR_SETTINGS.availabilityWindows;
  }

  const windows = value.flatMap((entry, index): CreatorAvailabilityWindow[] => {
    if (!isRecord(entry)) {
      errors.push(`Availability window ${index + 1} is invalid.`);
      return [];
    }

    const dayOfWeek = readWholeNumber(entry.dayOfWeek, `Availability window ${index + 1} day`, errors);
    const startHour = readWholeNumber(entry.startHour, `Availability window ${index + 1} start hour`, errors);
    const startMinute = readWholeNumber(entry.startMinute, `Availability window ${index + 1} start minute`, errors);
    const endHour = readWholeNumber(entry.endHour, `Availability window ${index + 1} end hour`, errors);
    const endMinute = readWholeNumber(entry.endMinute, `Availability window ${index + 1} end minute`, errors);
    const serviceTypes = Array.isArray(entry.serviceTypes)
      ? entry.serviceTypes.filter((service): service is "phone" | "video" => service === "phone" || service === "video")
      : [];

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      errors.push(`Availability window ${index + 1} day must be Sunday through Saturday.`);
    }
    if (startHour > 23 || endHour > 23) {
      errors.push(`Availability window ${index + 1} hours must be between 0 and 23.`);
    }
    if (startMinute > 59 || endMinute > 59) {
      errors.push(`Availability window ${index + 1} minutes must be between 0 and 59.`);
    }
    if ((endHour * 60) + endMinute <= (startHour * 60) + startMinute) {
      errors.push(`Availability window ${index + 1} must end after it starts.`);
    }
    if (serviceTypes.length === 0) {
      errors.push(`Availability window ${index + 1} needs phone, video, or both.`);
    }

    return [{
      id: readString(entry.id) || `window_${index + 1}`,
      dayOfWeek,
      startHour,
      startMinute,
      endHour,
      endMinute,
      serviceTypes,
    }];
  });

  return windows.length > 0 ? windows : DEFAULT_CREATOR_SETTINGS.availabilityWindows;
}

export function parseCreatorFanExperienceSettingsCommand(body: unknown): CreatorFanExperienceSettingsParseResult {
  const source = isRecord(body) ? body : {};
  const targetUserId = readString(source.targetUserId);
  if (!targetUserId) {
    return { ok: false, error: "Select a creator before saving fan experience settings." };
  }

  const rawSettings = isRecord(source.creatorSettings) ? source.creatorSettings : {};
  const rawRestrictions = isRecord(source.creatorRestrictions) ? source.creatorRestrictions : {};
  const errors: string[] = [];

  const subscriptionPriceGd = readWholeNumber(rawSettings.subscriptionPriceGd, "Fan Pass price", errors);
  const phoneRatePerMinuteGd = readWholeNumber(rawSettings.phoneRatePerMinuteGd, "Phone live time rate", errors);
  const videoRatePerMinuteGd = readWholeNumber(rawSettings.videoRatePerMinuteGd, "Video live time rate", errors);
  const bookingMinimumMinutes = readWholeNumber(rawSettings.bookingMinimumMinutes, "Live time minimum", errors);
  const videoSubscriberDiscountPercent = readWholeNumber(rawSettings.videoSubscriberDiscountPercent, "Fan Pass video discount", errors);

  if (subscriptionPriceGd < CREATOR_SUBSCRIPTION_MIN_GD) {
    errors.push(`Fan Pass price must be at least ${CREATOR_SUBSCRIPTION_MIN_GD} GD.`);
  }
  if (phoneRatePerMinuteGd < CREATOR_BOOKING_RATES.phone) {
    errors.push(`Phone live time rate must be at least ${CREATOR_BOOKING_RATES.phone} GD.`);
  }
  if (videoRatePerMinuteGd < CREATOR_BOOKING_RATES.video) {
    errors.push(`Video live time rate must be at least ${CREATOR_BOOKING_RATES.video} GD.`);
  }
  if (bookingMinimumMinutes < CREATOR_BOOKING_MIN_MINUTES) {
    errors.push(`Live time minimum must be at least ${CREATOR_BOOKING_MIN_MINUTES} minutes.`);
  }
  if (videoSubscriberDiscountPercent > 100) {
    errors.push("Fan Pass video discount cannot be above 100%.");
  }

  const availabilityTimezone = readString(rawSettings.availabilityTimezone) || DEFAULT_CREATOR_SETTINGS.availabilityTimezone;
  if (!availabilityTimezone) {
    errors.push("Availability timezone is required.");
  }

  const command: CreatorFanExperienceSettingsCommand = {
    targetUserId,
    restrictionConfirmed: readBoolean(source.restrictionConfirmed),
    creatorSettings: {
      messagingEnabled: rawSettings.messagingEnabled !== false,
      broadcastsEnabled: rawSettings.broadcastsEnabled !== false,
      subscriptionsEnabled: rawSettings.subscriptionsEnabled !== false,
      bookingsEnabled: rawSettings.bookingsEnabled !== false,
      customRequestsEnabled: rawSettings.customRequestsEnabled !== false,
      subscriptionPriceGd,
      chatFreeForSubscribers: rawSettings.chatFreeForSubscribers !== false,
      phoneRatePerMinuteGd,
      videoRatePerMinuteGd,
      bookingMinimumMinutes,
      videoSubscriberDiscountPercent,
      requestCategories: normalizeCategories(rawSettings.requestCategories, errors),
      availabilityTimezone,
      availabilityWindows: normalizeAvailabilityWindows(rawSettings.availabilityWindows, errors),
    },
    creatorRestrictions: {
      messagingRestricted: rawRestrictions.messagingRestricted === true,
      broadcastsRestricted: rawRestrictions.broadcastsRestricted === true,
      subscriptionsRestricted: rawRestrictions.subscriptionsRestricted === true,
      bookingsRestricted: rawRestrictions.bookingsRestricted === true,
      customRequestsRestricted: rawRestrictions.customRequestsRestricted === true,
      payoutsRestricted: rawRestrictions.payoutsRestricted === true,
      dropSubmissionsRestricted: rawRestrictions.dropSubmissionsRestricted === true,
      moderationNote: readString(rawRestrictions.moderationNote) || undefined,
    },
  };

  if (errors.length > 0) {
    return { ok: false, error: errors[0] };
  }

  return { ok: true, command };
}

export function validateCreatorFanExperienceSettingsCommand(input: {
  command: CreatorFanExperienceSettingsCommand;
  currentSettings?: CreatorSettings | null;
  currentRestrictions?: CreatorRestrictions | null;
}): CreatorFanExperienceSettingsValidation {
  const currentSettings = normalizeCreatorSettings(input.currentSettings ?? DEFAULT_CREATOR_SETTINGS);
  const currentRestrictions = normalizeCreatorRestrictions(input.currentRestrictions ?? DEFAULT_CREATOR_RESTRICTIONS);
  const nextSettings = normalizeCreatorSettings(input.command.creatorSettings);
  const nextRestrictions = normalizeCreatorRestrictions(input.command.creatorRestrictions);
  const settingChangedKeys = CREATOR_FAN_EXPERIENCE_SETTING_KEYS.filter((key) => stableStringify(currentSettings[key]) !== stableStringify(nextSettings[key]));
  const restrictionChangedKeys = CREATOR_FAN_EXPERIENCE_RESTRICTION_KEYS.filter((key) => stableStringify(currentRestrictions[key]) !== stableStringify(nextRestrictions[key]));
  const errors: string[] = [];
  const warnings: string[] = [];
  const revenueRestrictionKeys = restrictionChangedKeys.filter((key) => nextRestrictions[key] === true);

  if (revenueRestrictionKeys.length > 0 && !input.command.restrictionConfirmed) {
    errors.push("Confirm revenue restrictions before saving.");
  }
  if (settingChangedKeys.length === 0 && restrictionChangedKeys.length === 0) {
    warnings.push("No fan experience settings changed.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    changedKeys: [...settingChangedKeys, ...restrictionChangedKeys],
    settingChangedKeys,
    restrictionChangedKeys,
  };
}

export function summarizeCreatorFanExperienceValue(value: unknown) {
  const text = stableStringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

export function buildCreatorFanExperienceDebugPatch(input: {
  nowMs: number;
  actorUid?: string;
  warnings: string[];
  changedKeys: string[];
}) {
  return {
    creatorSettingsSource: "admin_roster",
    settingsNormalized: true,
    settingsValidationWarnings: input.warnings,
    lastSettingsUpdatedAt: input.nowMs,
    lastSettingsUpdatedBy: input.actorUid ?? "admin",
    changedKeys: input.changedKeys,
  };
}

export function formatCreatorFanExperienceSettingLabel(key: string) {
  switch (key) {
    case "messagingEnabled":
      return "Private chat";
    case "subscriptionsEnabled":
      return "Fan Pass";
    case "bookingsEnabled":
      return "Live time";
    case "customRequestsEnabled":
      return "Custom requests";
    case "broadcastsEnabled":
      return "Broadcasts";
    case "subscriptionPriceGd":
      return "Fan Pass price";
    case "phoneRatePerMinuteGd":
      return "Phone live time rate";
    case "videoRatePerMinuteGd":
      return "Video live time rate";
    case "bookingMinimumMinutes":
      return "Live time minimum";
    case "videoSubscriberDiscountPercent":
      return "Fan Pass video discount";
    case "chatFreeForSubscribers":
      return "Subscriber chat";
    case "requestCategories":
      return "Custom request menu";
    case "availabilityTimezone":
      return "Availability timezone";
    case "availabilityWindows":
      return "Availability windows";
    case "messagingRestricted":
      return "Private chat paused";
    case "subscriptionsRestricted":
      return "Fan Pass paused";
    case "bookingsRestricted":
      return "Live time paused";
    case "customRequestsRestricted":
      return "Custom requests paused";
    case "broadcastsRestricted":
      return "Broadcasts paused";
    case "payoutsRestricted":
      return "Payouts paused";
    case "dropSubmissionsRestricted":
      return "Drop submissions paused";
    default:
      return "Fan setting";
  }
}
