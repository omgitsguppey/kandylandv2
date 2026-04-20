import * as z from "zod";
import { differenceInYears, parseISO } from "date-fns";
import { CREATOR_REVIEW_TIMELINE_COPY } from "@/lib/creator-onboarding";
import { SIGNUP_SUPPORT_COPY } from "@/lib/marketing-copy";

export const CREATOR_SIGNUP_STEPS = 3;
export const AUTH_SIGN_IN_FLOW = "auth_sign_in";
export const AUTH_SIGN_UP_FLOW = "auth_sign_up";
export const AUTH_GOOGLE_FLOW = "auth_google_sign_in";

export const CREATOR_PLATFORM_OPTIONS = [
    "Instagram",
    "TikTok",
    "YouTube",
    "X",
    "OnlyFans",
    "Twitch",
    "Independent / Other",
] as const;

export const authFormSchema = z.object({
    email: z.string().trim().min(1, "Email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    username: z.string().optional(),
    dob: z.string().optional(),
    creatorDisplayName: z.string().optional(),
    creatorPrimaryPlatform: z.string().optional(),
    creatorContentFocus: z.string().optional(),
});

export const signInIdentifierSchema = z.string().trim().min(1, "Enter your email or username");
export const emailAddressSchema = z.string().trim().email("Invalid email address");

export type AuthFormData = z.infer<typeof authFormSchema>;

export type AuthMode = "signin" | "signup" | "creator_signup" | "forgot_password";

export function isSignupMode(mode: AuthMode) {
    return mode === "signup" || mode === "creator_signup";
}

export function creatorStepFields(step: number): Array<keyof AuthFormData> {
    if (step === 0) {
        return ["creatorDisplayName", "creatorPrimaryPlatform", "creatorContentFocus"];
    }

    if (step === 1) {
        return ["username", "dob"];
    }

    return ["email", "password"];
}

export function getHeading(mode: AuthMode) {
    if (mode === "signin") {
        return "Welcome Back";
    }

    if (mode === "signup") {
        return "Unwrap your Kandy";
    }

    if (mode === "creator_signup") {
        return "Creator Signup";
    }

    return "Reset Password";
}

export function getSupportCopy(mode: AuthMode) {
    if (mode === "signin") {
        return "Jump back into your stash and keep unwrapping.";
    }

    if (mode === "signup") {
        return SIGNUP_SUPPORT_COPY;
    }

    if (mode === "creator_signup") {
        return `Three quick steps, then your creator application moves into manual review. ${CREATOR_REVIEW_TIMELINE_COPY}`;
    }

    return "We&apos;ll send a secure reset link to your inbox.";
}

export function buildSchema(mode: AuthMode) {
    if (mode === "creator_signup") {
        return authFormSchema.extend({
            email: emailAddressSchema,
            creatorDisplayName: z.string().min(2, "Tell us what you want to be called."),
            creatorPrimaryPlatform: z.string().min(2, "Choose the platform you use most."),
            creatorContentFocus: z.string().min(8, "Give admins a little context about your content."),
            username: z.string()
                .min(3, "Username must be at least 3 characters")
                .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, dashes, or underscores"),
            dob: z.string().refine((value) => differenceInYears(new Date(), parseISO(value)) >= 18, "You must be 18+ to join KandyDrops"),
        });
    }

    if (mode === "signup") {
        return authFormSchema.extend({
            email: emailAddressSchema,
            username: z.string()
                .min(3, "Username must be at least 3 characters")
                .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, dashes, or underscores"),
            dob: z.string().refine((value) => differenceInYears(new Date(), parseISO(value)) >= 18, "You must be 18+ to join KandyDrops"),
        });
    }

    if (mode === "forgot_password") {
        return authFormSchema.extend({
            email: emailAddressSchema,
        });
    }

    return authFormSchema.extend({
        email: signInIdentifierSchema,
    });
}
