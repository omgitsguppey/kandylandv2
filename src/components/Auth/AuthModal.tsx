"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertCircle,
    Calendar,
    ChevronLeft,
    Loader2,
    Lock,
    Mail,
    User,
    X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import type { AuthModalEntryMode } from "@/context/UIContext";
import {
    LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS,
    looksLikeEmailAddress,
    normalizeEmailAddress,
    resolveEmailAuthError,
} from "@/lib/auth-errors";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { getClientAnalyticsIdentitySnapshot } from "@/lib/client-session";
import {
    buildCreatorIntakeTelemetryPayload,
    CREATOR_INTAKE_STEPS,
    recommendCreatorSetupFromGoals,
    sanitizeCreatorIntakeFields,
    type CreatorIntakeStepKey,
    type CreatorMonetizationGoal,
} from "@/lib/creator-intake-flow";
import { clearTimedFlow, consumeTimedFlow, startTimedFlow, trackEvent, trackIdentityLinked } from "@/lib/telemetry";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { auth } from "@/lib/firebase";

import {
    CREATOR_SIGNUP_STEPS,
    AUTH_SIGN_IN_FLOW,
    AUTH_SIGN_UP_FLOW,
    AUTH_GOOGLE_FLOW,
    type AuthFormData,
    type AuthMode,
    isSignupMode,
    creatorStepFields,
    getHeading,
    getSupportCopy,
    buildSchema,
} from "./AuthHelpers";
import { CreatorIntakeFlow } from "./CreatorIntakeFlow";

interface AuthModalProps {
    isOpen: boolean;
    mode: AuthModalEntryMode;
    onClose: () => void;
}

export function AuthModal({ isOpen, mode: initialMode, onClose }: AuthModalProps) {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordResetLink } = useAuth();
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [resetSent, setResetSent] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameTouched, setUsernameTouched] = useState(false);
    const [creatorStep, setCreatorStep] = useState(0);
    const wasOpenRef = useRef(false);
    const suggestionRequestRef = useRef(0);
    const availabilityRequestRef = useRef(0);
    const emailAuthSubmissionInFlightRef = useRef(false);
    const creatorIntakeStartedRef = useRef(false);
    const creatorRecommendedSetupTrackedRef = useRef<string | null>(null);
    const [emailSignInCooldownUntil, setEmailSignInCooldownUntil] = useState<number | null>(null);

    const activeSchema = useMemo(() => buildSchema(mode), [mode]);
    const isCreatorSignupMode = mode === "creator_signup";
    const isCreatorFinalStep = isCreatorSignupMode && creatorStep === CREATOR_SIGNUP_STEPS - 1;

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        trigger,
        clearErrors,
        reset,
        formState: { errors },
    } = useForm<AuthFormData>({
        resolver: zodResolver(activeSchema),
        mode: "onBlur",
        defaultValues: {
            email: "",
            password: "",
            username: "",
            dob: "",
            creatorDisplayName: "",
            creatorMonetizationGoals: [],
            creatorPrimaryPlatform: "",
            creatorFollowerRange: "",
            creatorPostingFrequency: "",
            creatorContentFocus: "",
            fansAlreadyAskForAccess: "",
            creatorRecommendedSetup: "",
        },
    });

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            trackEvent("auth_modal_opened", { mode });
        }

        wasOpenRef.current = isOpen;
    }, [isOpen, mode]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setMode(initialMode);
        setAuthError(null);
        setResetSent(false);
        setCreatorStep(0);
        clearErrors();
        reset();
        clearTimedFlow(AUTH_SIGN_IN_FLOW);
        clearTimedFlow(AUTH_SIGN_UP_FLOW);
        clearTimedFlow(AUTH_GOOGLE_FLOW);
        setCheckingUsername(false);
        setUsernameAvailable(null);
        setUsernameTouched(false);
        emailAuthSubmissionInFlightRef.current = false;
        suggestionRequestRef.current += 1;
        availabilityRequestRef.current += 1;
    }, [clearErrors, initialMode, isOpen, reset]);

    useEffect(() => {
        if (emailSignInCooldownUntil === null || typeof window === "undefined") {
            return;
        }

        const remainingMs = emailSignInCooldownUntil - Date.now();
        if (remainingMs <= 0) {
            setEmailSignInCooldownUntil(null);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setEmailSignInCooldownUntil(null);
        }, remainingMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [emailSignInCooldownUntil]);

    const watchedEmail = watch("email");
    const watchedUsername = watch("username");
    const watchedCreatorGoals = watch("creatorMonetizationGoals");
    const watchedCreatorRecommendedSetup = watch("creatorRecommendedSetup");
    const emailSignInBlocked = mode === "signin" && emailSignInCooldownUntil !== null && emailSignInCooldownUntil > Date.now();

    useEffect(() => {
        if (!isOpen || !isSignupMode(mode) || usernameTouched || !watchedEmail) {
            suggestionRequestRef.current += 1;
            return;
        }

        const requestId = suggestionRequestRef.current + 1;
        suggestionRequestRef.current = requestId;
        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    mode: "suggest",
                    email: watchedEmail,
                    uid: "guest",
                });
                const response = await fetch(`/api/user/check-username?${params.toString()}`, { cache: "no-store" });
                const result = await response.json();
                if (
                    requestId === suggestionRequestRef.current
                    && response.ok
                    && typeof result.suggestedUsername === "string"
                    && !usernameTouched
                ) {
                    setValue("username", result.suggestedUsername, { shouldValidate: true, shouldDirty: false });
                    setUsernameAvailable(true);
                }
            } catch (error) {
                reportClientIssue({
                    channel: "auth",
                    severity: "warn",
                    message: "Username suggestion lookup failed",
                    error,
                    detail: {
                        action: "suggest_username",
                    },
                    consoleLabel: "[Auth Modal] username suggestion failed",
                });
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [isOpen, mode, setValue, usernameTouched, watchedEmail]);

    useEffect(() => {
        if (!isSignupMode(mode)) {
            availabilityRequestRef.current += 1;
            setCheckingUsername(false);
            return;
        }

        if (!watchedUsername || watchedUsername.length < 3) {
            availabilityRequestRef.current += 1;
            setUsernameAvailable(null);
            setCheckingUsername(false);
            return;
        }

        const requestId = availabilityRequestRef.current + 1;
        availabilityRequestRef.current = requestId;
        const timer = setTimeout(async () => {
            setCheckingUsername(true);
            try {
                const response = await fetch(`/api/user/check-username?username=${encodeURIComponent(watchedUsername)}`, { cache: "no-store" });
                const result = await response.json();
                if (requestId !== availabilityRequestRef.current) {
                    return;
                }

                setUsernameAvailable(Boolean(result.available));
                if (response.ok && typeof result.normalized === "string" && result.normalized !== watchedUsername && !usernameTouched) {
                    setValue("username", result.normalized, { shouldValidate: true, shouldDirty: false });
                }
            } catch (error) {
                reportClientIssue({
                    channel: "auth",
                    severity: "warn",
                    message: "Username availability lookup failed",
                    error,
                    detail: {
                        action: "check_username_availability",
                        username: watchedUsername,
                    },
                    consoleLabel: "[Auth Modal] username availability failed",
                });
            } finally {
                if (requestId === availabilityRequestRef.current) {
                    setCheckingUsername(false);
                }
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [mode, setValue, usernameTouched, watchedUsername]);

    const switchMode = (newMode: AuthMode) => {
        suggestionRequestRef.current += 1;
        availabilityRequestRef.current += 1;
        setCheckingUsername(false);
        setUsernameAvailable(null);
        emailAuthSubmissionInFlightRef.current = false;
        setMode(newMode);
        setAuthError(null);
        setResetSent(false);
        setCreatorStep(0);
        creatorIntakeStartedRef.current = false;
        creatorRecommendedSetupTrackedRef.current = null;
        clearErrors();
        reset();
        trackEvent("auth_mode_switched", { from_mode: mode, to_mode: newMode });
    };

    const buildCreatorIntakeTelemetry = useCallback((
        stepKey: CreatorIntakeStepKey,
        extra?: {
            selectedGoals?: unknown;
            creatorRecommendedSetup?: unknown;
        },
    ) => {
        const identity = getClientAnalyticsIdentitySnapshot();
        const actorUid = identity.anonymousVisitorId ?? identity.sessionId;
        const route = typeof window !== "undefined" ? window.location.pathname : "/creator-intake";

        return buildCreatorIntakeTelemetryPayload({
            actorType: "guest",
            actorUid,
            anonymousVisitorId: identity.anonymousVisitorId,
            sessionId: identity.sessionId,
            signupIntent: "creator",
            stepKey,
            selectedGoals: extra?.selectedGoals ?? watchedCreatorGoals,
            creatorRecommendedSetup: extra?.creatorRecommendedSetup ?? watchedCreatorRecommendedSetup,
            source: "creator_intake",
            route,
        });
    }, [watchedCreatorGoals, watchedCreatorRecommendedSetup]);

    const trackCreatorIntakeStepCompleted = (stepIndex: number) => {
        const stepKey = CREATOR_INTAKE_STEPS[stepIndex]?.key;
        if (!stepKey) {
            return;
        }

        trackEvent("creator_intake_step_completed", buildCreatorIntakeTelemetry(stepKey));
    };

    const handleCreatorGoalSelected = (
        selectedGoals: CreatorMonetizationGoal[],
        selectedGoal: CreatorMonetizationGoal,
    ) => {
        trackEvent("creator_intake_goal_selected", {
            ...buildCreatorIntakeTelemetry("monetization_goals", {
                selectedGoals,
                creatorRecommendedSetup: recommendCreatorSetupFromGoals(selectedGoals),
            }),
            selectedGoal,
            selected_goal: selectedGoal,
        });
    };

    useEffect(() => {
        if (!isOpen || !isCreatorSignupMode) {
            creatorIntakeStartedRef.current = false;
            creatorRecommendedSetupTrackedRef.current = null;
            return;
        }

        if (!creatorIntakeStartedRef.current) {
            creatorIntakeStartedRef.current = true;
            trackEvent("creator_intake_started", buildCreatorIntakeTelemetry("monetization_goals"));
        }
    }, [buildCreatorIntakeTelemetry, isOpen, isCreatorSignupMode]);

    useEffect(() => {
        if (!isOpen || !isCreatorSignupMode || creatorStep !== 2) {
            return;
        }

        const recommendedSetup = watchedCreatorRecommendedSetup || recommendCreatorSetupFromGoals(watchedCreatorGoals);
        if (!watchedCreatorRecommendedSetup) {
            setValue("creatorRecommendedSetup", recommendedSetup, { shouldDirty: true, shouldValidate: true });
        }

        if (creatorRecommendedSetupTrackedRef.current === recommendedSetup) {
            return;
        }

        creatorRecommendedSetupTrackedRef.current = recommendedSetup;
        trackEvent("creator_intake_recommended_setup_shown", buildCreatorIntakeTelemetry("recommended_setup", {
            creatorRecommendedSetup: recommendedSetup,
        }));
    }, [buildCreatorIntakeTelemetry, creatorStep, isCreatorSignupMode, isOpen, setValue, watchedCreatorGoals, watchedCreatorRecommendedSetup]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setAuthError(null);
        startTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
        trackEvent("auth_google_sign_in_attempted", { source_mode: mode });
        try {
            await signInWithGoogle();
            const { mergedParams } = consumeTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
            trackEvent("auth_google_sign_in_success", mergedParams);
            if (auth?.currentUser?.uid) {
                trackIdentityLinked({
                    userId: auth.currentUser.uid,
                    method: "login",
                });
            }
            onClose();
        } catch (error: unknown) {
            reportClientIssue({
                channel: "auth",
                message: "Google sign-in failed",
                error,
                detail: {
                    action: "google_sign_in",
                    sourceMode: mode,
                },
                consoleLabel: "[Auth Modal] Google sign-in failed",
            });
            const { mergedParams } = consumeTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
            trackEvent("auth_google_sign_in_failed", mergedParams);
            setAuthError(error instanceof Error ? error.message : "Failed to sign in with Google.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdvanceCreatorStep = async () => {
        const fields = creatorStepFields(creatorStep);
        const valid = fields.length > 0 ? await trigger(fields) : true;
        if (!valid) {
            return;
        }

        setAuthError(null);
        trackCreatorIntakeStepCompleted(creatorStep);
        setCreatorStep((previous) => Math.min(previous + 1, CREATOR_SIGNUP_STEPS - 1));
    };

    const handleCreatorKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (!isCreatorSignupMode || creatorStep >= CREATOR_SIGNUP_STEPS - 1 || event.key !== "Enter") {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.tagName === "TEXTAREA") {
            return;
        }

        event.preventDefault();
        void handleAdvanceCreatorStep();
    };

    const onSubmit = async (data: AuthFormData) => {
        const signupIntent = mode === "creator_signup" ? "creator" : "fan";
        const creatorIntake = signupIntent === "creator" ? sanitizeCreatorIntakeFields(data) : null;
        const manualIdentifierType = !isSignupMode(mode)
            ? looksLikeEmailAddress(data.email) ? "email" : "username"
            : undefined;
        if (emailAuthSubmissionInFlightRef.current) {
            return;
        }

        if (mode === "signin" && emailSignInBlocked) {
            setAuthError("Manual sign-in is temporarily paused in this browser. Wait a few moments, then try again or reset your password.");
            return;
        }

        emailAuthSubmissionInFlightRef.current = true;
        setIsLoading(true);
        setAuthError(null);

        try {
            if (isSignupMode(mode)) {
                if (usernameAvailable === false) {
                    throw new Error("Username is already taken.");
                }

                startTimedFlow(AUTH_SIGN_UP_FLOW, { entry_mode: initialMode, signup_intent: signupIntent });
                trackEvent("auth_sign_up_attempted", {
                    entry_mode: initialMode,
                    signup_intent: signupIntent,
                    creator_primary_platform: data.creatorPrimaryPlatform || "",
                });
                if (signupIntent === "creator") {
                    trackCreatorIntakeStepCompleted(CREATOR_SIGNUP_STEPS - 1);
                    trackEvent("creator_intake_submitted", buildCreatorIntakeTelemetry("submit_for_review", {
                        selectedGoals: creatorIntake?.creatorMonetizationGoals,
                        creatorRecommendedSetup: creatorIntake?.creatorRecommendedSetup,
                    }));
                }
                const result = await signUpWithEmail({
                    email: data.email,
                    password: data.password,
                    username: data.username || "",
                    dob: data.dob || "",
                    signupIntent,
                    creatorDisplayName: data.creatorDisplayName,
                    creatorMonetizationGoals: creatorIntake?.creatorMonetizationGoals,
                    creatorPrimaryPlatform: data.creatorPrimaryPlatform,
                    creatorFollowerRange: creatorIntake?.creatorFollowerRange,
                    creatorPostingFrequency: creatorIntake?.creatorPostingFrequency,
                    creatorContentFocus: data.creatorContentFocus,
                    fansAlreadyAskForAccess: creatorIntake?.fansAlreadyAskForAccess,
                    creatorRecommendedSetup: creatorIntake?.creatorRecommendedSetup,
                });
                const { mergedParams } = consumeTimedFlow(AUTH_SIGN_UP_FLOW, {
                    entry_mode: initialMode,
                    username_length: data.username?.length ?? 0,
                    signup_intent: signupIntent,
                    welcome_bonus_gd: result.welcomeBonus,
                    creator_primary_platform: data.creatorPrimaryPlatform || "",
                    creator_recommended_setup: creatorIntake?.creatorRecommendedSetup || "",
                    creator_has_content_focus: Boolean(data.creatorContentFocus?.trim()),
                });
                trackEvent("auth_sign_up_success", mergedParams);
                if (auth?.currentUser?.uid) {
                    trackIdentityLinked({
                        userId: auth.currentUser.uid,
                        method: "signup",
                    });
                }
            } else {
                startTimedFlow(AUTH_SIGN_IN_FLOW, {
                    entry_mode: initialMode,
                    manual_identifier_type: manualIdentifierType,
                });
                trackEvent("auth_sign_in_attempted", {
                    entry_mode: initialMode,
                    manual_identifier_type: manualIdentifierType,
                });
                await signInWithEmail(data.email, data.password);
                const { mergedParams } = consumeTimedFlow(AUTH_SIGN_IN_FLOW, {
                    entry_mode: initialMode,
                    manual_identifier_type: manualIdentifierType,
                });
                trackEvent("auth_sign_in_success", mergedParams);
                if (auth?.currentUser?.uid) {
                    trackIdentityLinked({
                        userId: auth.currentUser.uid,
                        method: "login",
                    });
                }
            }

            onClose();
            reset();
        } catch (error: unknown) {
            reportClientIssue({
                channel: "auth",
                message: isSignupMode(mode) ? "Email sign-up failed" : "Email sign-in failed",
                error,
                detail: {
                    action: isSignupMode(mode) ? "email_sign_up" : "email_sign_in",
                    entryMode: initialMode,
                    signupIntent,
                },
                consoleLabel: "[Auth Modal] email auth failed",
            });
            const firebaseError = error as { code?: string; message?: string };
            const flowKey = isSignupMode(mode) ? AUTH_SIGN_UP_FLOW : AUTH_SIGN_IN_FLOW;
            const { mergedParams } = consumeTimedFlow(flowKey, {
                error_code: firebaseError.code || "unknown",
                entry_mode: initialMode,
                manual_identifier_type: manualIdentifierType,
                signup_intent: signupIntent,
            });
            if (isSignupMode(mode)) {
                trackEvent("auth_sign_up_failed", mergedParams);
            } else {
                trackEvent("auth_sign_in_failed", mergedParams);
            }

            if (firebaseError.code === "auth/invalid-credential") {
                const resolution = resolveEmailAuthError(error, "sign_in");
                setAuthError(resolution.userMessage);
            } else {
                const resolution = resolveEmailAuthError(error, isSignupMode(mode) ? "sign_up" : "sign_in");
                if (!isSignupMode(mode) && resolution.localCooldownMs > 0) {
                    setEmailSignInCooldownUntil(Date.now() + resolution.localCooldownMs);
                }
                setAuthError(resolution.userMessage);
            }
        } finally {
            setIsLoading(false);
            emailAuthSubmissionInFlightRef.current = false;
        }
    };

    const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const email = (event.currentTarget.elements.namedItem("resetEmail") as HTMLInputElement).value;
        if (!email) {
            setAuthError("Please enter your email address.");
            return;
        }

        setIsLoading(true);
        setAuthError(null);
        trackEvent("password_reset_requested");
        try {
            await sendPasswordResetLink(normalizeEmailAddress(email));
            trackEvent("password_reset_sent");
            setResetSent(true);
        } catch (error: unknown) {
            reportClientIssue({
                channel: "auth",
                message: "Password reset failed",
                error,
                detail: {
                    action: "password_reset",
                    email,
                },
                consoleLabel: "[Auth Modal] password reset failed",
            });
            const resolution = resolveEmailAuthError(error, "password_reset");
            const firebaseError = error as { code?: string };
            if (firebaseError.code === "auth/user-not-found") {
                trackEvent("password_reset_sent");
                setResetSent(true);
            } else {
                trackEvent("password_reset_failed", { error_code: firebaseError.code || "unknown" });
                setAuthError(resolution.userMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    const showGoogleButton = mode !== "forgot_password" && mode !== "creator_signup";

    return (
        <>
            <div
                onClick={onClose}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity"
            />

            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                <div className="pointer-events-auto flex max-h-[min(92dvh,48rem)] w-full max-w-md min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-900 shadow-2xl sm:rounded-3xl">
                    <div className="relative shrink-0 border-b border-white/5 bg-zinc-900/95 px-5 py-4 backdrop-blur-sm sm:p-6">
                        {isCreatorSignupMode ? (
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-purple">
                                    Creator intake
                                </span>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                    Step {creatorStep + 1} of {CREATOR_SIGNUP_STEPS}
                                </span>
                            </div>
                        ) : null}

                        <h2 className="bg-gradient-to-r from-brand-purple to-purple-400 bg-clip-text text-center text-xl font-bold text-transparent sm:text-2xl">
                            {getHeading(mode)}
                        </h2>
                        <p className="mx-auto mt-2 max-w-sm px-4 text-center text-xs text-gray-500 sm:text-sm">
                            {getSupportCopy(mode)}
                        </p>

                        <button
                            onClick={onClose}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white sm:right-4"
                            aria-label="Close authentication modal"
                            title="Close authentication modal"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-4 py-4 sm:p-6">
                        {showGoogleButton ? (
                            <div className="space-y-4 sm:space-y-6">
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-purple/40 bg-gradient-to-r from-brand-purple to-purple-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-colors disabled:opacity-50 sm:py-3 sm:text-base"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    )}
                                    Continue with Google
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/10" />
                                    </div>
                                    <div className="relative flex justify-center text-xs sm:text-sm">
                                        <span className="bg-zinc-900 px-2 text-gray-500">Or continue with email</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {mode === "forgot_password" ? (
                            resetSent ? (
                                <div className="space-y-5 pt-4 text-center sm:space-y-6">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-purple/20 text-brand-purple">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="mb-2 text-lg font-bold text-white">Check your inbox</h3>
                                        <p className="text-sm text-gray-400">We&apos;ve sent a password reset link to your email address.</p>
                                    </div>
                                    <button
                                        onClick={() => switchMode("signin")}
                                        className="w-full rounded-xl border border-brand-purple/40 bg-gradient-to-r from-brand-purple to-purple-500 py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-colors hover:opacity-95"
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handlePasswordReset} className="space-y-3 pt-4 sm:space-y-4">
                                    <p className="mb-5 text-center text-sm text-gray-400 sm:mb-6">
                                        Enter your email address and we&apos;ll send you a link to reset your password.
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 sm:text-sm">Email</label>
                                        <div className="relative overflow-hidden">
                                            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                            <input
                                                name="resetEmail"
                                                type="email"
                                                required
                                                className="block w-full rounded-xl border border-white/10 bg-black/50 px-10 py-2.5 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none sm:py-3 sm:text-base"
                                                placeholder="Enter your email"
                                            />
                                        </div>
                                    </div>
                                    {authError ? (
                                        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <span>{authError}</span>
                                        </div>
                                    ) : null}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95"
                                    >
                                        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Send Reset Link"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signin")}
                                        className="w-full bg-transparent py-3 font-bold text-gray-400 transition-colors hover:text-white"
                                    >
                                        Back to Sign In
                                    </button>
                                </form>
                            )
                        ) : (
                            <form
                                onSubmit={handleSubmit(onSubmit)}
                                onKeyDown={handleCreatorKeyDown}
                                className="space-y-3 pt-4 sm:space-y-4"
                            >
                                {isCreatorSignupMode ? (
                                    <div className="mb-2 flex gap-2">
                                        {Array.from({ length: CREATOR_SIGNUP_STEPS }).map((_, index) => (
                                            <div
                                                key={`creator-step-${index}`}
                                                className={`h-2 flex-1 rounded-full transition-colors ${index <= creatorStep ? "bg-brand-purple" : "bg-white/10"}`}
                                            />
                                        ))}
                                    </div>
                                ) : null}

                                {mode === "signin" ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 sm:text-sm">Email or username</label>
                                            <div className="relative overflow-hidden">
                                                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    {...register("email")}
                                                    type="text"
                                                    autoComplete="username"
                                                    className="block w-full rounded-xl border border-white/10 bg-black/50 px-10 py-2.5 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none sm:py-3 sm:text-base"
                                                    placeholder="Email or username"
                                                />
                                            </div>
                                            {errors.email ? <p className="pl-1 text-xs text-red-400">{errors.email.message}</p> : null}
                                            {!errors.email ? <p className="pl-1 text-xs text-gray-500">Use the email you signed up with or your exact username.</p> : null}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="text-xs font-medium text-gray-400 sm:text-sm">Password</label>
                                                <button
                                                    type="button"
                                                    onClick={() => switchMode("forgot_password")}
                                                    className="text-[11px] font-semibold text-brand-purple transition-colors hover:text-purple-300"
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>
                                            <div className="relative overflow-hidden">
                                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    {...register("password")}
                                                    type="password"
                                                    autoComplete="current-password"
                                                    className="block w-full rounded-xl border border-white/10 bg-black/50 px-10 py-2.5 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none sm:py-3 sm:text-base"
                                                    placeholder="Password"
                                                />
                                            </div>
                                            {errors.password ? <p className="pl-1 text-xs text-red-400">{errors.password.message}</p> : null}
                                        </div>
                                    </>
                                ) : null}

                                {mode === "signup" ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 sm:text-sm">Email</label>
                                            <div className="relative overflow-hidden">
                                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    {...register("email")}
                                                    type="email"
                                                    autoComplete="email"
                                                    className="block w-full rounded-xl border border-white/10 bg-black/50 px-10 py-2.5 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none sm:py-3 sm:text-base"
                                                    placeholder="Email address"
                                                />
                                            </div>
                                            {errors.email ? <p className="pl-1 text-xs text-red-400">{errors.email.message}</p> : null}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 sm:text-sm">Username</label>
                                            <div className="relative overflow-hidden">
                                                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    {...register("username", {
                                                        onChange: () => setUsernameTouched(true),
                                                    })}
                                                    type="text"
                                                    autoComplete="username"
                                                    className="block w-full rounded-xl border border-white/10 bg-black/50 px-10 py-2.5 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none sm:py-3 sm:text-base"
                                                    placeholder="Choose a username"
                                                />
                                            </div>
                                            {errors.username ? <p className="pl-1 text-xs text-red-400">{errors.username.message}</p> : null}
                                            {!errors.username && checkingUsername ? <p className="pl-1 text-xs text-gray-400">Checking username...</p> : null}
                                            {!errors.username && !checkingUsername && usernameAvailable === true ? <p className="pl-1 text-xs text-brand-purple">Username available.</p> : null}
                                            {!errors.username && !checkingUsername && usernameAvailable === false ? <p className="pl-1 text-xs text-red-400">Username already taken.</p> : null}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 sm:text-sm">Date of birth</label>
                                            <div className="relative overflow-hidden">
                                                <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    {...register("dob")}
                                                    type="date"
                                                    className="block w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-10 py-2.5 pr-4 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none [color-scheme:dark] sm:py-3 sm:text-base"
                                                />
                                            </div>
                                            {errors.dob ? <p className="pl-1 text-xs text-red-400">{errors.dob.message}</p> : null}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 sm:text-sm">Password</label>
                                            <div className="relative overflow-hidden">
                                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    {...register("password")}
                                                    type="password"
                                                    autoComplete="new-password"
                                                    className="block w-full rounded-xl border border-white/10 bg-black/50 px-10 py-2.5 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none sm:py-3 sm:text-base"
                                                    placeholder="Create a password"
                                                />
                                            </div>
                                            {errors.password ? <p className="pl-1 text-xs text-red-400">{errors.password.message}</p> : null}
                                        </div>
                                    </>
                                ) : null}

                                {isCreatorSignupMode ? (
                                    <CreatorIntakeFlow
                                        step={creatorStep}
                                        register={register}
                                        setValue={setValue}
                                        watch={watch}
                                        errors={errors}
                                        checkingUsername={checkingUsername}
                                        usernameAvailable={usernameAvailable}
                                        markUsernameTouched={() => setUsernameTouched(true)}
                                        onGoalSelected={handleCreatorGoalSelected}
                                    />
                                ) : null}

                                {authError ? (
                                    <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{authError}</span>
                                    </div>
                                ) : null}

                                {mode === "signin" && emailSignInBlocked ? (
                                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-gray-300">
                                        Firebase is temporarily throttling manual sign-in attempts from this device. We pause retries locally for {Math.round(LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS / 1_000)} seconds so you do not keep hammering the same cooldown window. Use <span className="font-semibold text-white">Forgot password?</span> if you need a recovery path right now.
                                    </div>
                                ) : null}

                                {mode === "signin" ? (
                                    <button
                                        type="submit"
                                        disabled={isLoading || emailSignInBlocked}
                                        className="w-full rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95"
                                    >
                                        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Sign In"}
                                    </button>
                                ) : null}

                                {mode === "signup" ? (
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95"
                                    >
                                        {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : SECONDARY_UNWRAP_CTA}
                                    </button>
                                ) : null}

                                {isCreatorSignupMode ? (
                                    <div className="sticky bottom-0 z-10 flex gap-3 rounded-2xl border border-white/10 bg-black/95 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                                        {creatorStep > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAuthError(null);
                                                    setCreatorStep((previous) => Math.max(previous - 1, 0));
                                                }}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Back
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => switchMode("signin")}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-bold text-white transition-colors hover:bg-white/10"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Sign In
                                            </button>
                                        )}

                                        {isCreatorFinalStep ? (
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="flex-[1.25] rounded-xl bg-brand-purple py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95"
                                            >
                                                {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Submit creator application"}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void handleAdvanceCreatorStep()}
                                                disabled={isLoading}
                                                className="flex-[1.25] rounded-xl bg-brand-purple py-3 font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95"
                                            >
                                                Continue
                                            </button>
                                        )}
                                    </div>
                                ) : null}

                                <div className="space-y-2 pt-2 text-center text-sm text-gray-400">
                                    {mode === "signin" ? (
                                        <>
                                            <p>
                                                Don&apos;t have an account?{" "}
                                                <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-brand-purple transition-colors hover:text-purple-300">
                                                    Sign up
                                                </button>
                                            </p>
                                            <p>
                                                Joining as a creator?{" "}
                                                <button type="button" onClick={() => switchMode("creator_signup")} className="font-semibold text-brand-purple transition-colors hover:text-purple-300">
                                                    Start here
                                                </button>
                                            </p>
                                        </>
                                    ) : null}

                                    {mode === "signup" ? (
                                        <>
                                            <p>
                                                Already have an account?{" "}
                                                <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-brand-purple transition-colors hover:text-purple-300">
                                                    Sign in
                                                </button>
                                            </p>
                                            <p>
                                                Signing up as a creator?{" "}
                                                <button type="button" onClick={() => switchMode("creator_signup")} className="font-semibold text-brand-purple transition-colors hover:text-purple-300">
                                                    Start here
                                                </button>
                                            </p>
                                        </>
                                    ) : null}

                                    {isCreatorSignupMode ? (
                                        <>
                                            <p>
                                                Want the regular fan signup instead?{" "}
                                                <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-brand-purple transition-colors hover:text-purple-300">
                                                    Use the regular signup
                                                </button>
                                            </p>
                                            <p>
                                                Already have an account?{" "}
                                                <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-brand-purple transition-colors hover:text-purple-300">
                                                    Sign in
                                                </button>
                                            </p>
                                        </>
                                    ) : null}
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
