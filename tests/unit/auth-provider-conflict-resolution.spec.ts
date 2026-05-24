import { describe, expect, it } from "vitest";

import {
  buildAuthConflictTelemetry,
  classifyAuthError,
  resolveProviderConflictCta,
  resolveProviderConflictMessage,
  shouldOfferGoogleSignIn,
  shouldOfferPasswordReset,
} from "@/lib/auth/auth-provider-conflict-resolver";

describe("auth provider conflict resolver", () => {
  it("guides Google-only accounts away from email/password without raw Firebase copy", () => {
    const conflict = classifyAuthError(
      { code: "auth/use-google-sign-in", message: "Firebase: Error (auth/use-google-sign-in)." },
      "email_password",
      "User@Example.com",
    );

    expect(conflict.kind).toBe("google_account_email_password_attempt");
    expect(conflict.resolution).toBe("continue_with_google");
    expect(shouldOfferGoogleSignIn(conflict)).toBe(true);
    expect(shouldOfferPasswordReset(conflict)).toBe(false);
    expect(resolveProviderConflictMessage(conflict)).toBe("This email uses Google sign-in. Continue with Google to get back into your account.");
    expect(resolveProviderConflictMessage(conflict)).not.toContain("Firebase");
    expect(resolveProviderConflictCta(conflict).primary).toBe("Continue with Google");
  });

  it("classifies Google attempts against email/password accounts as a safe reset path", () => {
    const conflict = classifyAuthError(
      { code: "auth/account-exists-with-different-credential" },
      "google",
      "person@example.com",
    );

    expect(conflict.kind).toBe("email_account_google_attempt");
    expect(conflict.resolution).toBe("reset_password");
    expect(shouldOfferPasswordReset(conflict)).toBe(true);
    expect(resolveProviderConflictMessage(conflict)).toContain("already uses email and password");
  });

  it("maps common email/password failures to bounded guidance", () => {
    expect(classifyAuthError({ code: "auth/email-already-in-use" }, "email_password", "person@example.com").resolution).toBe("use_email_password");
    expect(classifyAuthError({ code: "auth/wrong-password" }, "email_password", "person@example.com").resolution).toBe("reset_password");
    expect(classifyAuthError({ code: "auth/invalid-credential" }, "email_password", "person@example.com").resolution).toBe("reset_password");
    expect(classifyAuthError({ code: "auth/missing-password" }, "email_password", "person@example.com").resolution).toBe("retry");
  });

  it("redacts email from telemetry and keeps conflict metadata structured", () => {
    const conflict = classifyAuthError({ code: "auth/email-already-in-use" }, "email_password", "Person@Example.com");
    const telemetry = buildAuthConflictTelemetry(conflict, {
      authAttemptId: "attempt_1",
      route: "/",
      sourceComponent: "AuthModal",
    });

    expect(telemetry.eventName).toBe("auth_provider_conflict_detected");
    expect(telemetry.params.emailHash).toMatch(/^email_[a-z0-9]+$/u);
    expect(JSON.stringify(telemetry.params)).not.toContain("Person@Example.com");
    expect(telemetry.params.conflictKind).toBe("email_already_in_use");
  });
});
