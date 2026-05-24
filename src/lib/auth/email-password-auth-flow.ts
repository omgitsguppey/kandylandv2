import { looksLikeEmailAddress, normalizeEmailAddress } from "@/lib/auth-errors";
import type {
  EmailAuthFailure,
  EmailAuthFailureKind,
  EmailAuthRegistrationRollbackPlan,
  EmailAuthRegistrationRollbackPlanInput,
  EmailAuthTelemetryInput,
  EmailPasswordSignupInput,
  EmailSignupValidationFailureCode,
  EmailSignupValidationResult,
  PreparedEmailLogin,
  PreparedEmailSignup,
} from "@/lib/auth/email-password-auth-contract";

type FirebaseLikeError = {
  code?: string;
  message?: string;
};

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function hashEmail(email: string | null | undefined) {
  const normalized = typeof email === "string" ? normalizeEmailAddress(email) : "";
  return normalized ? `email_${stableHash(normalized)}` : "";
}

function readErrorCode(error: unknown) {
  const firebaseError = error as FirebaseLikeError;
  return typeof firebaseError?.code === "string" && firebaseError.code.trim().length > 0
    ? firebaseError.code.trim()
    : "auth/unknown";
}

function trimOptional(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function validateEmailSignupInput(input: EmailPasswordSignupInput): EmailSignupValidationResult {
  const failureCodes: EmailSignupValidationFailureCode[] = [];

  if (!looksLikeEmailAddress(input.email)) {
    failureCodes.push("auth/invalid-email");
  }

  if (typeof input.password !== "string" || input.password.length < 8) {
    failureCodes.push("auth/weak-password");
  }

  if (typeof input.username !== "string" || input.username.trim().length < 3) {
    failureCodes.push("auth/invalid-username");
  }

  if (typeof input.dob !== "string" || input.dob.trim().length === 0) {
    failureCodes.push("auth/missing-date-of-birth");
  }

  return failureCodes.length === 0 ? { ok: true } : { ok: false, failureCodes };
}

export function prepareEmailSignup(input: EmailPasswordSignupInput): PreparedEmailSignup {
  const signupIntent = input.signupIntent === "creator" ? "creator" : "fan";
  const normalizedEmail = normalizeEmailAddress(input.email);
  const rawUsername = input.username.trim();
  const dateOfBirth = input.dob.trim();
  const creatorDisplayName = trimOptional(input.creatorDisplayName);
  const displayName = signupIntent === "creator"
    ? creatorDisplayName || rawUsername
    : rawUsername;

  return {
    normalizedEmail,
    password: input.password,
    rawUsername,
    dateOfBirth,
    signupIntent,
    registrationMethod: "email",
    registrationPayload: {
      displayName,
      username: rawUsername,
      dateOfBirth,
      registrationMethod: "email",
      signupIntent,
      creatorDisplayName,
      creatorMonetizationGoals: Array.isArray(input.creatorMonetizationGoals)
        ? input.creatorMonetizationGoals.filter((goal): goal is string => typeof goal === "string" && goal.trim().length > 0)
        : undefined,
      creatorPrimaryPlatform: trimOptional(input.creatorPrimaryPlatform),
      creatorFollowerRange: trimOptional(input.creatorFollowerRange),
      creatorPostingFrequency: trimOptional(input.creatorPostingFrequency),
      creatorContentFocus: trimOptional(input.creatorContentFocus),
      fansAlreadyAskForAccess: trimOptional(input.fansAlreadyAskForAccess),
      creatorRecommendedSetup: trimOptional(input.creatorRecommendedSetup),
    },
    welcomeBonusSource: "reward_gd_only",
    navigationSessionDependency: "after_profile_registration_success",
    profileBootstrapDependency: "api_user_register",
    rollbackPolicy: "delete_created_firebase_user_when_registration_fails",
    postAuthRouteIntent: signupIntent === "creator" ? "creator_waitlist" : "dashboard",
  };
}

export function prepareEmailLogin(identifier: string): PreparedEmailLogin {
  const rawIdentifier = identifier.trim();
  const identifierType = looksLikeEmailAddress(rawIdentifier) ? "email" : "username";

  return {
    rawIdentifier,
    normalizedIdentifier: identifierType === "email" ? normalizeEmailAddress(rawIdentifier) : rawIdentifier,
    identifierType,
  };
}

function failureKindFor(code: string): EmailAuthFailureKind {
  switch (code) {
    case "auth/email-already-in-use":
      return "email_already_in_use";
    case "auth/use-google-sign-in":
      return "google_account_email_password_attempt";
    case "auth/invalid-email":
      return "invalid_email";
    case "auth/wrong-password":
      return "wrong_password";
    case "auth/invalid-credential":
    case "auth/user-not-found":
      return "invalid_credentials";
    case "auth/username-already-in-use":
      return "username_conflict";
    case "auth/missing-password":
      return "missing_password";
    case "auth/weak-password":
      return "weak_password";
    case "auth/navigation-session-failed":
      return "navigation_session_failed";
    case "auth/profile-registration-failed":
    case "auth/registration-failed":
      return "profile_registration_failed";
    case "auth/manual-lookup-failed":
    case "auth/invalid-username":
      return "manual_identity_lookup_failed";
    case "auth/too-many-requests":
      return "too_many_requests";
    default:
      return code.startsWith("auth/navigation-session-")
        ? "navigation_session_failed"
        : "unknown";
  }
}

export function classifyEmailAuthFailure(error: unknown): EmailAuthFailure {
  const firebaseCode = readErrorCode(error);
  const kind = failureKindFor(firebaseCode);

  switch (kind) {
    case "email_already_in_use":
      return {
        kind,
        firebaseCode,
        resolution: "use_email_password",
        safeUserMessage: "An account already exists for this email. Sign in instead, or reset your password if you need access.",
        allowPasswordReset: true,
        sourceTruth: "firebase_auth",
      };
    case "google_account_email_password_attempt":
      return {
        kind,
        firebaseCode,
        resolution: "continue_with_google",
        safeUserMessage: "This email uses Google sign-in. Continue with Google to get back into your account.",
        allowPasswordReset: false,
        sourceTruth: "manual_identity_lookup",
      };
    case "wrong_password":
    case "invalid_credentials":
      return {
        kind,
        firebaseCode,
        resolution: "reset_password",
        safeUserMessage: "That email, username, or password did not match. Try again or reset your password.",
        allowPasswordReset: true,
        sourceTruth: "firebase_auth",
      };
    case "invalid_email":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "Enter a valid email address to continue.",
        allowPasswordReset: false,
        sourceTruth: "client_auth",
      };
    case "username_conflict":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "Username is already taken.",
        allowPasswordReset: false,
        sourceTruth: "profile_registration",
      };
    case "missing_password":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "Enter your password to continue.",
        allowPasswordReset: false,
        sourceTruth: "client_auth",
      };
    case "weak_password":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "Use a stronger password before creating your account.",
        allowPasswordReset: false,
        sourceTruth: "client_auth",
      };
    case "navigation_session_failed":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "Your account was created, but the app session could not finish loading. Sign in again to continue.",
        allowPasswordReset: false,
        sourceTruth: "server_session",
      };
    case "profile_registration_failed":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "Account setup could not finish. No reward GumDrops were granted. Try creating the account again.",
        allowPasswordReset: false,
        sourceTruth: "profile_registration",
      };
    case "manual_identity_lookup_failed":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "That email or username could not be resolved. Try your account email instead.",
        allowPasswordReset: false,
        sourceTruth: "manual_identity_lookup",
      };
    case "too_many_requests":
      return {
        kind,
        firebaseCode,
        resolution: "retry",
        safeUserMessage: "Too many attempts were blocked. Wait a few minutes before trying again.",
        allowPasswordReset: true,
        sourceTruth: "firebase_auth",
      };
    case "unknown":
    default:
      return {
        kind,
        firebaseCode,
        resolution: "safe_unknown",
        safeUserMessage: "Email sign-in could not finish. Try again or contact support.",
        allowPasswordReset: false,
        sourceTruth: "client_auth",
      };
  }
}

export function buildEmailAuthTelemetry(input: EmailAuthTelemetryInput) {
  return {
    eventName: input.eventName,
    params: {
      authAttemptId: input.authAttemptId || "",
      route: input.route || "",
      sourceComponent: input.sourceComponent || "AuthContext",
      failureCode: input.failure.firebaseCode,
      failure_code: input.failure.firebaseCode,
      failureKind: input.failure.kind,
      resolution: input.failure.resolution,
      sourceTruth: input.failure.sourceTruth,
      signupIntent: input.signupIntent || "",
      identifierType: input.identifierType || "",
      emailHash: hashEmail(input.email),
      piiRedacted: true,
      passwordIncluded: false,
    },
  };
}

export function buildRegistrationRollbackPlan(
  input: EmailAuthRegistrationRollbackPlanInput,
): EmailAuthRegistrationRollbackPlan {
  if (input.firebaseUserCreated && !input.profileRegistrationSucceeded) {
    return {
      rollbackRequired: true,
      deleteFirebaseUser: true,
      signOutAfterDeleteFailure: true,
      reportGhostUserRisk: true,
      reason: "profile_registration_failed",
    };
  }

  if (input.firebaseUserCreated && input.profileRegistrationSucceeded && !input.navigationSessionSucceeded) {
    return {
      rollbackRequired: true,
      deleteFirebaseUser: false,
      signOutAfterDeleteFailure: false,
      reportGhostUserRisk: false,
      reason: "navigation_session_failed_after_profile_registration",
    };
  }

  return {
    rollbackRequired: false,
    deleteFirebaseUser: false,
    signOutAfterDeleteFailure: false,
    reportGhostUserRisk: false,
    reason: "none",
  };
}
