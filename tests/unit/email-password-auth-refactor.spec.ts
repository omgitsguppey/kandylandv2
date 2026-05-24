import { describe, expect, it } from "vitest";

import {
  EMAIL_PASSWORD_AUTH_CONTRACT,
  buildEmailAuthDebugLane,
} from "@/lib/auth/email-password-auth-contract";
import {
  buildEmailAuthTelemetry,
  buildRegistrationRollbackPlan,
  classifyEmailAuthFailure,
  prepareEmailLogin,
  prepareEmailSignup,
  validateEmailSignupInput,
} from "@/lib/auth/email-password-auth-flow";

describe("email/password auth flow", () => {
  it("normalizes email signup input, preserves fan intent, and keeps welcome bonus as reward GumDrops", () => {
    const prepared = prepareEmailSignup({
      email: "  FAN@Example.COM ",
      password: "long-enough-password",
      username: "  Candy Fan ",
      dob: "1998-04-12",
      signupIntent: "fan",
    });

    expect(prepared.normalizedEmail).toBe("fan@example.com");
    expect(prepared.rawUsername).toBe("Candy Fan");
    expect(prepared.signupIntent).toBe("fan");
    expect(prepared.registrationMethod).toBe("email");
    expect(prepared.welcomeBonusSource).toBe("reward_gd_only");
    expect(prepared.navigationSessionDependency).toBe("after_profile_registration_success");
  });

  it("preserves creator signup intent and creator intake fields", () => {
    const prepared = prepareEmailSignup({
      email: "creator@example.com",
      password: "long-enough-password",
      username: "creatorname",
      dob: "1995-09-01",
      signupIntent: "creator",
      creatorDisplayName: "Creator Name",
      creatorMonetizationGoals: ["subscriptions", "custom_requests"],
      creatorPrimaryPlatform: "instagram",
      creatorFollowerRange: "10k_50k",
      creatorPostingFrequency: "weekly",
      creatorContentFocus: "behind the scenes",
      fansAlreadyAskForAccess: "yes",
      creatorRecommendedSetup: "fan_pass",
    });

    expect(prepared.signupIntent).toBe("creator");
    expect(prepared.registrationPayload.creatorDisplayName).toBe("Creator Name");
    expect(prepared.registrationPayload.creatorMonetizationGoals).toEqual(["subscriptions", "custom_requests"]);
    expect(prepared.registrationPayload.signupIntent).toBe("creator");
    expect(prepared.postAuthRouteIntent).toBe("creator_waitlist");
  });

  it("validates signup input before Firebase account creation", () => {
    expect(validateEmailSignupInput({
      email: "fan@example.com",
      password: "long-enough-password",
      username: "fanname",
      dob: "2000-01-01",
    }).ok).toBe(true);

    const invalid = validateEmailSignupInput({
      email: "not-an-email",
      password: "short",
      username: "",
      dob: "",
    });

    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.failureCodes).toEqual(expect.arrayContaining([
        "auth/invalid-email",
        "auth/weak-password",
        "auth/invalid-username",
        "auth/missing-date-of-birth",
      ]));
    }
  });

  it("prepares email login from either email or username without trusting raw whitespace", () => {
    expect(prepareEmailLogin("  USER@Example.COM ").normalizedIdentifier).toBe("user@example.com");
    expect(prepareEmailLogin("  Creator_Handle ").identifierType).toBe("username");
    expect(prepareEmailLogin("  Creator_Handle ").normalizedIdentifier).toBe("Creator_Handle");
  });

  it("classifies common email auth failures with safe guidance", () => {
    expect(classifyEmailAuthFailure({ code: "auth/email-already-in-use" }).resolution).toBe("use_email_password");
    expect(classifyEmailAuthFailure({ code: "auth/invalid-email" }).safeUserMessage).toBe("Enter a valid email address to continue.");
    expect(classifyEmailAuthFailure({ code: "auth/wrong-password" }).resolution).toBe("reset_password");
    expect(classifyEmailAuthFailure({ code: "auth/invalid-credential" }).resolution).toBe("reset_password");
    expect(classifyEmailAuthFailure({ code: "auth/username-already-in-use" }).resolution).toBe("retry");
    expect(classifyEmailAuthFailure({ code: "auth/navigation-session-failed" }).kind).toBe("navigation_session_failed");
  });

  it("plans rollback only after Firebase user creation and backend registration failure", () => {
    expect(buildRegistrationRollbackPlan({
      firebaseUserCreated: false,
      profileRegistrationSucceeded: false,
      navigationSessionSucceeded: false,
    }).rollbackRequired).toBe(false);

    expect(buildRegistrationRollbackPlan({
      firebaseUserCreated: true,
      profileRegistrationSucceeded: false,
      navigationSessionSucceeded: false,
    })).toMatchObject({
      rollbackRequired: true,
      deleteFirebaseUser: true,
      signOutAfterDeleteFailure: true,
      reportGhostUserRisk: true,
      reason: "profile_registration_failed",
    });

    expect(buildRegistrationRollbackPlan({
      firebaseUserCreated: true,
      profileRegistrationSucceeded: true,
      navigationSessionSucceeded: false,
    })).toMatchObject({
      rollbackRequired: true,
      deleteFirebaseUser: false,
      signOutAfterDeleteFailure: false,
      reportGhostUserRisk: false,
      reason: "navigation_session_failed_after_profile_registration",
    });
  });

  it("builds redacted telemetry and exposes a debug lane without passwords", () => {
    const telemetry = buildEmailAuthTelemetry({
      eventName: "auth_email_sign_up_failed",
      failure: classifyEmailAuthFailure({ code: "auth/email-already-in-use" }),
      email: "Person@Example.com",
      authAttemptId: "attempt_1",
      route: "/",
      sourceComponent: "AuthModal",
      signupIntent: "fan",
    });

    expect(telemetry.params.emailHash).toMatch(/^email_[a-z0-9]+$/u);
    expect(JSON.stringify(telemetry.params)).not.toContain("Person@Example.com");
    expect(JSON.stringify(telemetry.params)).not.toContain("long-enough-password");
    expect(buildEmailAuthDebugLane().status).toBe("live");
    expect(EMAIL_PASSWORD_AUTH_CONTRACT.welcomeBonusSource).toBe("reward_gd_only");
  });
});
