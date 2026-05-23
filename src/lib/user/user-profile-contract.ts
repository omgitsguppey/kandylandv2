export const USER_PROFILE_CONTRACT_VERSION = "2026.05.user-profile-api.1";

export const USER_PROFILE_READABLE_FIELDS = [
  "uid",
  "email",
  "displayName",
  "username",
  "dateOfBirth",
  "photoURL",
  "bannerUrl",
  "bio",
  "role",
  "isVerified",
  "notificationSettings",
  "privacySettings",
  "accountSettings",
  "status",
  "onboardingCompleted",
  "createdAt",
] as const;

export const USER_PROFILE_WRITABLE_FIELDS = [
  "displayName",
  "username",
  "dateOfBirth",
  "photoURL",
  "bio",
  "notificationSettings",
  "privacySettings",
  "accountSettings",
  "browserPushToken",
] as const;

export const USER_PROFILE_SERVER_ONLY_FIELDS = [
  "uid",
  "userId",
  "email",
  "role",
  "status",
  "statusReason",
  "gumDropsBalance",
  "gumDropsPurchasedBalance",
  "gumDropsRewardBalance",
  "unlockedContent",
  "unlockedContentTimestamps",
  "creatorSettings",
  "fcmTokens",
  "isVerified",
  "createdAt",
  "dailyTasksState",
  "creatorApplication",
] as const;

export const USER_PROFILE_DISPLAY_ONLY_FIELDS = [
  "avatarFallback",
  "profileIdentityLabel",
  "profileIdentityDetail",
  "profileEmail",
  "profileName",
  "profileUsername",
] as const;

export const USER_PROFILE_IDENTITY_TELEMETRY_FIELDS = [
  "actorUserId",
  "targetUserId",
  "actorKind",
  "identityState",
  "identityConfidence",
  "consentMode",
] as const;

export const USER_PROFILE_ACCOUNT_SETTINGS_CONSUMERS = [
  "src/context/AuthContext.tsx",
  "src/app/dashboard/profile/hooks/useProfileState.tsx",
  "src/components/Settings/UserSettingsPage.tsx",
  "src/lib/settings/user-settings-contract.ts",
] as const;

export const USER_PROFILE_HUMAN_ERRORS = {
  invalidPayload: "Profile update could not be saved because the request was not valid.",
  noValidUpdates: "No supported profile changes were provided.",
  serverOnlyField: "Profile update could not be saved because it included account fields that only KandyDrops can change.",
} as const;

export type UserProfileReadableField = typeof USER_PROFILE_READABLE_FIELDS[number];
export type UserProfileWritableField = typeof USER_PROFILE_WRITABLE_FIELDS[number];
export type UserProfileServerOnlyField = typeof USER_PROFILE_SERVER_ONLY_FIELDS[number];
export type UserProfileDisplayOnlyField = typeof USER_PROFILE_DISPLAY_ONLY_FIELDS[number];
export type UserProfileIdentityTelemetryField = typeof USER_PROFILE_IDENTITY_TELEMETRY_FIELDS[number];

export type CanonicalUserProfileResponse = {
  success: true;
  profile: Record<string, unknown> | null;
  responseVersion: typeof USER_PROFILE_CONTRACT_VERSION;
  sourceTruth: "users/{uid}";
  accountSettingsConsumer: "Account Settings";
  identity: {
    actorKind: "signed_in_user" | "creator_user";
    identityState: "logged_in_unlinked" | "creator_logged_in";
    identityConfidence: "exact";
    userRef: string;
    actorUserId: string;
    targetUserId: string;
  };
};

const WRITABLE_FIELD_SET = new Set<string>(USER_PROFILE_WRITABLE_FIELDS);
const SERVER_ONLY_FIELD_SET = new Set<string>(USER_PROFILE_SERVER_ONLY_FIELDS);
const IDENTITY_TELEMETRY_FIELD_SET = new Set<string>(USER_PROFILE_IDENTITY_TELEMETRY_FIELDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isWritableUserProfileField(field: string) {
  return WRITABLE_FIELD_SET.has(field);
}

export function getServerOnlyUserProfilePayloadKeys(payload: unknown) {
  if (!isRecord(payload)) return [];

  return Object.keys(payload).filter((key) =>
    SERVER_ONLY_FIELD_SET.has(key)
    || IDENTITY_TELEMETRY_FIELD_SET.has(key)
  );
}

export function sanitizeUserProfileWritePayload(payload: unknown):
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; status: 400; error: string; blockedKeys: string[] } {
  if (!isRecord(payload)) {
    return {
      ok: false,
      status: 400,
      error: USER_PROFILE_HUMAN_ERRORS.invalidPayload,
      blockedKeys: [],
    };
  }

  const blockedKeys = getServerOnlyUserProfilePayloadKeys(payload);
  if (blockedKeys.length > 0) {
    return {
      ok: false,
      status: 400,
      error: USER_PROFILE_HUMAN_ERRORS.serverOnlyField,
      blockedKeys,
    };
  }

  return { ok: true, payload };
}

export function buildCanonicalUserProfileResponse(input: {
  userId: string;
  profile: Record<string, unknown> | null;
}): CanonicalUserProfileResponse {
  const role = typeof input.profile?.role === "string" ? input.profile.role : "";
  const isCreator = role === "creator";

  return {
    success: true,
    profile: input.profile,
    responseVersion: USER_PROFILE_CONTRACT_VERSION,
    sourceTruth: "users/{uid}",
    accountSettingsConsumer: "Account Settings",
    identity: {
      actorKind: isCreator ? "creator_user" : "signed_in_user",
      identityState: isCreator ? "creator_logged_in" : "logged_in_unlinked",
      identityConfidence: "exact",
      userRef: `user:${input.userId}`,
      actorUserId: input.userId,
      targetUserId: input.userId,
    },
  };
}
