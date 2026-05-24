import type {
  AuthProviderConflict,
  AuthProviderConflictKind,
  AuthProviderConflictResolution,
  AuthProviderKind,
} from "@/lib/auth/auth-provider-conflict-contract";

type FirebaseLikeError = {
  code?: string;
  message?: string;
};

type ConflictTelemetryContext = {
  authAttemptId?: string;
  route?: string;
  sourceComponent?: string;
};

function normalizeEmailForHash(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function hashEmail(email: string | null | undefined) {
  const normalized = normalizeEmailForHash(email);
  return normalized ? `email_${stableHash(normalized)}` : null;
}

function codeOf(error: unknown) {
  const firebaseError = error as FirebaseLikeError;
  return typeof firebaseError?.code === "string" && firebaseError.code.trim().length > 0
    ? firebaseError.code.trim()
    : "auth/unknown";
}

function resolveKind(code: string, attemptedMethod: AuthProviderKind): AuthProviderConflictKind {
  if (code === "auth/use-google-sign-in") return "google_account_email_password_attempt";
  if (code === "auth/account-exists-with-different-credential") {
    return attemptedMethod === "google" ? "email_account_google_attempt" : "account_exists_with_different_credential";
  }
  if (code === "auth/email-already-in-use") return "email_already_in_use";
  if (code === "auth/wrong-password") return "wrong_password";
  if (code === "auth/invalid-credential" || code === "auth/user-not-found") return "invalid_credentials";
  if (code === "auth/missing-password") return "missing_password";
  if (code === "auth/operation-not-allowed" || code === "auth/unsupported-provider") return "unsupported_provider";
  return "unknown";
}

function resolveResolution(kind: AuthProviderConflictKind): AuthProviderConflictResolution {
  switch (kind) {
    case "google_account_email_password_attempt":
      return "continue_with_google";
    case "email_account_google_attempt":
      return "reset_password";
    case "email_already_in_use":
      return "use_email_password";
    case "wrong_password":
    case "invalid_credentials":
      return "reset_password";
    case "missing_password":
      return "retry";
    case "unsupported_provider":
      return "contact_support";
    case "account_exists_with_different_credential":
    case "unknown":
    default:
      return "safe_unknown";
  }
}

function messageFor(kind: AuthProviderConflictKind) {
  switch (kind) {
    case "google_account_email_password_attempt":
      return "This email uses Google sign-in. Continue with Google to get back into your account.";
    case "email_account_google_attempt":
      return "This account already uses email and password. Sign in with your password or reset it if needed.";
    case "email_already_in_use":
      return "An account already exists for this email. Sign in instead, or reset your password if you need access.";
    case "wrong_password":
    case "invalid_credentials":
      return "That email, username, or password did not match. Try again or reset your password.";
    case "missing_password":
      return "Enter your password to continue.";
    case "unsupported_provider":
      return "This sign-in method is not available right now. Try another method or contact support.";
    case "account_exists_with_different_credential":
      return "This email is already connected to another sign-in method. Use the method you originally used or contact support.";
    case "unknown":
    default:
      return "Sign-in could not finish. Try again, use another sign-in method, or contact support.";
  }
}

function ctaFor(resolution: AuthProviderConflictResolution) {
  switch (resolution) {
    case "continue_with_google":
      return { primary: "Continue with Google", secondary: "Use another email" };
    case "use_email_password":
      return { primary: "Sign in with email", secondary: "Reset password" };
    case "reset_password":
      return { primary: "Reset password", secondary: "Try again" };
    case "retry":
      return { primary: "Try again" };
    case "contact_support":
      return { primary: "Contact support", secondary: "Try another method" };
    case "safe_unknown":
    default:
      return { primary: "Try again", secondary: "Contact support" };
  }
}

export function classifyAuthError(
  error: unknown,
  attemptedMethod: AuthProviderKind,
  email?: string | null,
): AuthProviderConflict {
  const firebaseCode = codeOf(error);
  const kind = resolveKind(firebaseCode, attemptedMethod);
  const resolution = resolveResolution(kind);
  const cta = ctaFor(resolution);
  const emailHash = hashEmail(email);

  return {
    kind,
    attemptedMethod,
    resolution,
    firebaseCode,
    emailHash,
    hasEmail: Boolean(emailHash),
    safeUserMessage: messageFor(kind),
    primaryCta: cta.primary,
    secondaryCta: cta.secondary,
  };
}

export function resolveProviderConflictMessage(input: AuthProviderConflict) {
  return input.safeUserMessage;
}

export function resolveProviderConflictCta(input: AuthProviderConflict) {
  return {
    primary: input.primaryCta,
    secondary: input.secondaryCta,
  };
}

export function shouldOfferPasswordReset(input: AuthProviderConflict) {
  return input.resolution === "reset_password" || input.resolution === "use_email_password";
}

export function shouldOfferGoogleSignIn(input: AuthProviderConflict) {
  return input.resolution === "continue_with_google";
}

export function buildAuthConflictTelemetry(
  input: AuthProviderConflict,
  context: ConflictTelemetryContext = {},
  eventName:
    | "auth_provider_conflict_detected"
    | "auth_provider_conflict_resolution_shown"
    | "auth_provider_conflict_cta_clicked" = "auth_provider_conflict_detected",
) {
  return {
    eventName,
    params: {
      authAttemptId: context.authAttemptId || "",
      route: context.route || "",
      sourceComponent: context.sourceComponent || "AuthContext",
      attemptedMethod: input.attemptedMethod,
      conflictKind: input.kind,
      resolution: input.resolution,
      firebaseCode: input.firebaseCode,
      emailHash: input.emailHash || "",
      hasEmail: input.hasEmail,
      piiRedacted: true,
    },
  };
}
