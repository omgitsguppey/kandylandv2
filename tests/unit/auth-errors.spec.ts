import { describe, expect, it } from "vitest";

import {
    buildFirebaseLikeAuthError,
    LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS,
    looksLikeEmailAddress,
    normalizeEmailAddress,
    resolveEmailAuthError,
} from "@/lib/auth-errors";

describe("auth error helpers", () => {
    it("trims email addresses before Firebase auth calls", () => {
        expect(normalizeEmailAddress("  test@example.com  ")).toBe("test@example.com");
    });

    it("distinguishes likely email addresses from usernames for manual sign-in", () => {
        expect(looksLikeEmailAddress("test@example.com")).toBe(true);
        expect(looksLikeEmailAddress("creator_handle")).toBe(false);
    });

    it("maps email/password throttle errors to a recovery message and local cooldown", () => {
        const resolution = resolveEmailAuthError({ code: "auth/too-many-requests" }, "sign_in");

        expect(resolution.userMessage).toContain("Wait a few minutes");
        expect(resolution.userMessage).toContain("reset your password");
        expect(resolution.localCooldownMs).toBe(LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS);
        expect(resolution.allowPasswordReset).toBe(true);
    });

    it("keeps sign-up throttle errors truthful without pretending password recovery will help", () => {
        const resolution = resolveEmailAuthError({ code: "auth/too-many-requests" }, "sign_up");

        expect(resolution.userMessage).toContain("sign-up attempts");
        expect(resolution.localCooldownMs).toBe(0);
        expect(resolution.allowPasswordReset).toBe(false);
    });

    it("maps invalid credentials to a friendly sign-in error", () => {
        const resolution = resolveEmailAuthError({ code: "auth/invalid-credential" }, "sign_in");

        expect(resolution.userMessage).toBe("Invalid email, username, or password.");
        expect(resolution.localCooldownMs).toBe(0);
    });

    it("tells Google-only accounts to continue with Google sign-in", () => {
        const resolution = resolveEmailAuthError({ code: "auth/use-google-sign-in" }, "sign_in");

        expect(resolution.userMessage).toContain("Google sign-in");
        expect(resolution.allowPasswordReset).toBe(false);
    });

    it("maps username conflicts to a stable manual sign-up error", () => {
        const resolution = resolveEmailAuthError({ code: "auth/username-already-in-use" }, "sign_up");

        expect(resolution.userMessage).toBe("Username is already taken.");
        expect(resolution.allowPasswordReset).toBe(false);
    });

    it("can build Firebase-like auth errors for synthetic manual-sign-in failures", () => {
        const error = buildFirebaseLikeAuthError("auth/invalid-credential");

        expect(error.code).toBe("auth/invalid-credential");
        expect(error.message).toBe("auth/invalid-credential");
    });
});
