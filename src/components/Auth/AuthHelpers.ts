import * as z from "zod";
import { differenceInYears, parseISO } from "date-fns";
import {
    CREATOR_FANS_ASK_FOR_ACCESS_OPTIONS,
    CREATOR_FOLLOWER_RANGE_OPTIONS,
    CREATOR_INTAKE_STEP_COUNT,
    CREATOR_MONETIZATION_GOAL_OPTIONS,
    CREATOR_PLATFORM_OPTIONS,
    CREATOR_POSTING_FREQUENCY_OPTIONS,
    CREATOR_RECOMMENDED_SETUP_OPTIONS,
} from "@/lib/creator-intake-flow";
import { SIGNUP_SUPPORT_COPY } from "@/lib/marketing-copy";

export const CREATOR_SIGNUP_STEPS = CREATOR_INTAKE_STEP_COUNT;
export const AUTH_SIGN_IN_FLOW = "auth_sign_in";
export const AUTH_SIGN_UP_FLOW = "auth_sign_up";
export const AUTH_GOOGLE_FLOW = "auth_google_sign_in";

export const authFormSchema = z.object({
    email: z.string().trim().min(1, "Email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    username: z.string().optional(),
    dob: z.string().optional(),
    creatorDisplayName: z.string().optional(),
    creatorMonetizationGoals: z.array(z.string()).optional(),
    creatorPrimaryPlatform: z.string().optional(),
    creatorFollowerRange: z.string().optional(),
    creatorPostingFrequency: z.string().optional(),
    creatorContentFocus: z.string().optional(),
    fansAlreadyAskForAccess: z.string().optional(),
    creatorRecommendedSetup: z.string().optional(),
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
        return ["creatorMonetizationGoals"];
    }

    if (step === 1) {
        return [
            "creatorDisplayName",
            "creatorPrimaryPlatform",
            "creatorFollowerRange",
            "creatorPostingFrequency",
            "creatorContentFocus",
            "fansAlreadyAskForAccess",
        ];
    }

    if (step === 2) {
        return ["creatorRecommendedSetup"];
    }

    if (step === 3) {
        return [];
    }

    return ["username", "dob", "email", "password"];
}

export function getHeading(mode: AuthMode) {
    if (mode === "signin") {
        return "Welcome Back";
    }

    if (mode === "signup") {
        return "Unwrap your Kandy";
    }

    if (mode === "creator_signup") {
        return "Creator Intake";
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
        return "Five short steps to shape your creator lane.";
    }

    return "We&apos;ll send a secure reset link to your inbox.";
}

export function buildSchema(mode: AuthMode) {
    if (mode === "creator_signup") {
        return authFormSchema.extend({
            email: emailAddressSchema,
            creatorDisplayName: z.string().min(2, "Tell us what you want to be called."),
            creatorMonetizationGoals: z.array(z.enum(CREATOR_MONETIZATION_GOAL_OPTIONS.map((option) => option.value) as [string, ...string[]]))
                .min(1, "Choose at least one creator lane."),
            creatorPrimaryPlatform: z.string().min(2, "Choose the platform you use most."),
            creatorFollowerRange: z.enum(CREATOR_FOLLOWER_RANGE_OPTIONS.map((option) => option.value) as [string, ...string[]], {
                message: "Choose the closest audience size.",
            }),
            creatorPostingFrequency: z.enum(CREATOR_POSTING_FREQUENCY_OPTIONS.map((option) => option.value) as [string, ...string[]], {
                message: "Choose how often you usually post.",
            }),
            creatorContentFocus: z.string().min(8, "Give admins a little context about your content."),
            fansAlreadyAskForAccess: z.enum(CREATOR_FANS_ASK_FOR_ACCESS_OPTIONS.map((option) => option.value) as [string, ...string[]], {
                message: "Choose the closest answer.",
            }),
            creatorRecommendedSetup: z.enum(CREATOR_RECOMMENDED_SETUP_OPTIONS.map((option) => option.value) as [string, ...string[]], {
                message: "Choose a creator setup.",
            }),
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
