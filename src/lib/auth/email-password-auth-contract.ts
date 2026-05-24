import type { AuthProviderConflictResolution } from "@/lib/auth/auth-provider-conflict-contract";

export type EmailPasswordSignupIntent = "fan" | "creator";
export type EmailPasswordRegistrationMethod = "email";
export type EmailPasswordWelcomeBonusSource = "reward_gd_only";
export type EmailPasswordNavigationSessionDependency = "after_profile_registration_success";

export type EmailPasswordSignupInput = {
  email: string;
  password: string;
  username: string;
  dob: string;
  signupIntent?: EmailPasswordSignupIntent;
  creatorDisplayName?: string;
  creatorMonetizationGoals?: string[];
  creatorPrimaryPlatform?: string;
  creatorFollowerRange?: string;
  creatorPostingFrequency?: string;
  creatorContentFocus?: string;
  fansAlreadyAskForAccess?: string;
  creatorRecommendedSetup?: string;
};

export type EmailPasswordRegistrationPayload = {
  displayName: string;
  username: string;
  dateOfBirth: string;
  registrationMethod: EmailPasswordRegistrationMethod;
  signupIntent: EmailPasswordSignupIntent;
  creatorDisplayName?: string;
  creatorMonetizationGoals?: string[];
  creatorPrimaryPlatform?: string;
  creatorFollowerRange?: string;
  creatorPostingFrequency?: string;
  creatorContentFocus?: string;
  fansAlreadyAskForAccess?: string;
  creatorRecommendedSetup?: string;
  referredBy?: string;
};

export type PreparedEmailSignup = {
  normalizedEmail: string;
  password: string;
  rawUsername: string;
  dateOfBirth: string;
  signupIntent: EmailPasswordSignupIntent;
  registrationMethod: EmailPasswordRegistrationMethod;
  registrationPayload: EmailPasswordRegistrationPayload;
  welcomeBonusSource: EmailPasswordWelcomeBonusSource;
  navigationSessionDependency: EmailPasswordNavigationSessionDependency;
  profileBootstrapDependency: "api_user_register";
  rollbackPolicy: "delete_created_firebase_user_when_registration_fails";
  postAuthRouteIntent: "dashboard" | "creator_waitlist";
};

export type PreparedEmailLogin = {
  rawIdentifier: string;
  normalizedIdentifier: string;
  identifierType: "email" | "username";
};

export type EmailSignupValidationFailureCode =
  | "auth/invalid-email"
  | "auth/weak-password"
  | "auth/invalid-username"
  | "auth/missing-date-of-birth";

export type EmailSignupValidationResult =
  | { ok: true }
  | { ok: false; failureCodes: EmailSignupValidationFailureCode[] };

export type EmailAuthFailureKind =
  | "email_already_in_use"
  | "google_account_email_password_attempt"
  | "invalid_email"
  | "wrong_password"
  | "invalid_credentials"
  | "username_conflict"
  | "missing_password"
  | "weak_password"
  | "navigation_session_failed"
  | "profile_registration_failed"
  | "manual_identity_lookup_failed"
  | "too_many_requests"
  | "unknown";

export type EmailAuthFailure = {
  kind: EmailAuthFailureKind;
  firebaseCode: string;
  resolution: AuthProviderConflictResolution;
  safeUserMessage: string;
  allowPasswordReset: boolean;
  sourceTruth:
    | "firebase_auth"
    | "manual_identity_lookup"
    | "profile_registration"
    | "server_session"
    | "client_auth";
};

export type EmailAuthTelemetryInput = {
  eventName: "auth_email_sign_in_failed" | "auth_email_sign_up_failed";
  failure: EmailAuthFailure;
  email?: string | null;
  authAttemptId?: string;
  route?: string;
  sourceComponent?: string;
  signupIntent?: EmailPasswordSignupIntent;
  identifierType?: PreparedEmailLogin["identifierType"];
};

export type EmailAuthRegistrationRollbackPlanInput = {
  firebaseUserCreated: boolean;
  profileRegistrationSucceeded: boolean;
  navigationSessionSucceeded: boolean;
};

export type EmailAuthRegistrationRollbackPlan = {
  rollbackRequired: boolean;
  deleteFirebaseUser: boolean;
  signOutAfterDeleteFailure: boolean;
  reportGhostUserRisk: boolean;
  reason:
    | "none"
    | "profile_registration_failed"
    | "navigation_session_failed_after_profile_registration";
};

export type EmailPasswordAuthDebugLane = {
  laneId: "email_password_auth_flow";
  status: "live" | "degraded" | "unavailable";
  registrationOutcomeClassified: boolean;
  rollbackReported: boolean;
  navigationAfterRegistration: boolean;
  creatorFanIntentPreserved: boolean;
  welcomeBonusSource: EmailPasswordWelcomeBonusSource;
  commonErrorsMapped: boolean;
  googleAuthUntouched: boolean;
  telemetryStatus: "mapped" | "missing";
};

export const EMAIL_PASSWORD_AUTH_CONTRACT = {
  provider: "email_password",
  registrationMethod: "email",
  welcomeBonusSource: "reward_gd_only",
  signupIntents: ["fan", "creator"],
  rollbackPolicy: "delete_created_firebase_user_when_registration_fails",
  navigationSessionDependency: "after_profile_registration_success",
  profileBootstrapDependency: "api_user_register",
} as const;

export function buildEmailAuthDebugLane(
  input: Partial<EmailPasswordAuthDebugLane> = {},
): EmailPasswordAuthDebugLane {
  return {
    laneId: "email_password_auth_flow",
    status: input.status ?? "live",
    registrationOutcomeClassified: input.registrationOutcomeClassified ?? true,
    rollbackReported: input.rollbackReported ?? true,
    navigationAfterRegistration: input.navigationAfterRegistration ?? true,
    creatorFanIntentPreserved: input.creatorFanIntentPreserved ?? true,
    welcomeBonusSource: input.welcomeBonusSource ?? "reward_gd_only",
    commonErrorsMapped: input.commonErrorsMapped ?? true,
    googleAuthUntouched: input.googleAuthUntouched ?? true,
    telemetryStatus: input.telemetryStatus ?? "mapped",
  };
}
