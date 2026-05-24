export const AUTH_PROVIDER_KINDS = [
  "google",
  "email_password",
  "unknown",
] as const;

export type AuthProviderKind = typeof AUTH_PROVIDER_KINDS[number];

export const AUTH_PROVIDER_CONFLICT_KINDS = [
  "google_account_email_password_attempt",
  "email_account_google_attempt",
  "email_already_in_use",
  "account_exists_with_different_credential",
  "wrong_password",
  "invalid_credentials",
  "missing_password",
  "unsupported_provider",
  "unknown",
] as const;

export type AuthProviderConflictKind = typeof AUTH_PROVIDER_CONFLICT_KINDS[number];

export const AUTH_PROVIDER_CONFLICT_RESOLUTIONS = [
  "continue_with_google",
  "use_email_password",
  "reset_password",
  "retry",
  "contact_support",
  "safe_unknown",
] as const;

export type AuthProviderConflictResolution = typeof AUTH_PROVIDER_CONFLICT_RESOLUTIONS[number];

export type AuthProviderConflict = {
  kind: AuthProviderConflictKind;
  attemptedMethod: AuthProviderKind;
  resolution: AuthProviderConflictResolution;
  firebaseCode: string;
  emailHash: string | null;
  hasEmail: boolean;
  safeUserMessage: string;
  primaryCta: string;
  secondaryCta?: string;
};

export type AuthProviderConflictDebugLane = {
  laneId: "auth_provider_conflict";
  status: "live" | "degraded" | "unavailable";
  conflictTypesMapped: number;
  resolutionShown: boolean;
  unresolvedAuthFailures: number;
  rawEmailPasswordExposed: boolean;
  telemetryStatus: "mapped" | "missing";
};

export function buildAuthProviderConflictDebugLane(
  input: Partial<AuthProviderConflictDebugLane> = {},
): AuthProviderConflictDebugLane {
  return {
    laneId: "auth_provider_conflict",
    status: input.status ?? "live",
    conflictTypesMapped: input.conflictTypesMapped ?? AUTH_PROVIDER_CONFLICT_KINDS.length,
    resolutionShown: input.resolutionShown ?? true,
    unresolvedAuthFailures: input.unresolvedAuthFailures ?? 0,
    rawEmailPasswordExposed: input.rawEmailPasswordExposed ?? false,
    telemetryStatus: input.telemetryStatus ?? "mapped",
  };
}
