type FirebaseLikeError = {
    code?: string;
    message?: string;
};

const SIMPLE_EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailAuthAction = "sign_in" | "sign_up" | "password_reset";

export type EmailAuthErrorResolution = {
    code?: string;
    userMessage: string;
    localCooldownMs: number;
    allowPasswordReset: boolean;
};

export const LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS = 30_000;

export function normalizeEmailAddress(email: string) {
    return email.trim();
}

export function looksLikeEmailAddress(value: string) {
    return SIMPLE_EMAIL_ADDRESS_PATTERN.test(normalizeEmailAddress(value));
}

export function buildFirebaseLikeAuthError(code: string, message?: string) {
    const error = new Error(message ?? code) as Error & FirebaseLikeError;
    error.code = code;
    return error;
}

export function resolveEmailAuthError(error: unknown, action: EmailAuthAction): EmailAuthErrorResolution {
    const firebaseError = error as FirebaseLikeError;
    const code = firebaseError?.code;
    const fallbackMessage = firebaseError?.message || "Authentication failed. Please try again.";

    if (code === "auth/username-already-in-use") {
        return {
            code,
            userMessage: "Username is already taken.",
            localCooldownMs: 0,
            allowPasswordReset: false,
        };
    }

    if (code === "auth/invalid-username") {
        return {
            code,
            userMessage: fallbackMessage,
            localCooldownMs: 0,
            allowPasswordReset: false,
        };
    }

    if (code === "auth/email-already-in-use") {
        return {
            code,
            userMessage: "Email is already registered.",
            localCooldownMs: 0,
            allowPasswordReset: false,
        };
    }

    if (code === "auth/invalid-credential") {
        return {
            code,
            userMessage: "Invalid email, username, or password.",
            localCooldownMs: 0,
            allowPasswordReset: true,
        };
    }

    if (code === "auth/too-many-requests") {
        const userMessage = action === "sign_up"
            ? "Too many email/password sign-up attempts were blocked from this device or network. Wait a few minutes before trying again."
            : "Too many manual sign-in attempts were blocked on this device. Wait a few minutes before trying again, or reset your password instead.";

        return {
            code,
            userMessage,
            localCooldownMs: action === "sign_in" ? LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS : 0,
            allowPasswordReset: action !== "sign_up",
        };
    }

    return {
        code,
        userMessage: fallbackMessage,
        localCooldownMs: 0,
        allowPasswordReset: action !== "sign_up",
    };
}
