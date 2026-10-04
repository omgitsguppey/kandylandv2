"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/context/AuthContext";
import type { AuthModalEntryMode } from "@/context/UIContext";
import {
    LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS,
    looksLikeEmailAddress,
    normalizeEmailAddress,
    resolveEmailAuthError,
} from "@/lib/auth-errors";
import type { AuthProviderConflict } from "@/lib/auth/auth-provider-conflict-contract";
import {
    buildAuthConflictTelemetry,
    resolveProviderConflictCta,
    resolveProviderConflictMessage,
    shouldOfferGoogleSignIn,
    shouldOfferPasswordReset,
} from "@/lib/auth/auth-provider-conflict-resolver";
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
import { clearTimedFlow, consumeTimedFlow, startTimedFlow, trackEvent } from "@/lib/telemetry";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import {
    createAuthAttemptTelemetryContext,
    emitAuthAttemptFailed,
    emitAuthAttemptStarted,
    emitAuthAttemptSucceeded,
    emitAuthAttemptUnfinished,
    emitAuthLifecycleEvent,
} from "@/lib/auth-outcome-telemetry";
import { buildAuthRuntimeTelemetry } from "@/lib/auth/auth-telemetry-contract";

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
import { KandyAuthEntryExperience } from "@/components/creative-tim/kandydrops/auth/KandyAuthEntryExperience";
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
    const [authConflict, setAuthConflict] = useState<AuthProviderConflict | null>(null);
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
            const event = buildAuthRuntimeTelemetry({
                eventName: "auth_surface_viewed",
                method: "unknown",
                route: typeof window !== "undefined" ? window.location.pathname : "/auth",
                sourceComponent: "AuthModal",
                sourceTruth: "client_auth",
                metadata: { mode },
            });
            trackEvent(event.eventName, event.params);
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
        setAuthConflict(null);
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
        const attempt = createAuthAttemptTelemetryContext({
            method: "google_sign_in",
            sourceComponent: "AuthModal",
        });
        startTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
        emitAuthAttemptStarted(attempt, { entry_mode: mode });
        const startedEvent = buildAuthRuntimeTelemetry({
            eventName: "auth_google_started",
            method: "google",
            authAttemptId: attempt.authAttemptId,
            route: attempt.route,
            sourceComponent: attempt.sourceComponent,
            sourceTruth: "client_auth",
            metadata: { entry_mode: mode },
        });
        trackEvent(startedEvent.eventName, startedEvent.params);
        trackEvent("auth_google_sign_in_attempted", { source_mode: mode });
        try {
            const result = await signInWithGoogle({
                authAttemptId: attempt.authAttemptId,
                method: "google_sign_in",
                route: attempt.route,
                sourceComponent: attempt.sourceComponent,
                startedAtUtc: attempt.startedAtUtc,
            });

            if (result.completion === "redirect_pending") {
                emitAuthAttemptUnfinished(attempt, {
                    reason: "redirect_pending",
                    entry_mode: mode,
                });
                return;
            }

            emitAuthAttemptSucceeded(attempt, {
                actorUserId: result.userId,
                sourceTruth: "server_session",
                extraParams: {
                    entry_mode: mode,
                },
            });
            const { mergedParams } = consumeTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
            const completedEvent = buildAuthRuntimeTelemetry({
                eventName: "auth_google_completed",
                method: "google",
                authAttemptId: attempt.authAttemptId,
                route: attempt.route,
                sourceComponent: attempt.sourceComponent,
                sourceTruth: "server_session",
                metadata: { entry_mode: mode },
            });
            trackEvent(completedEvent.eventName, completedEvent.params);
            trackEvent("auth_google_sign_in_success", mergedParams);
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
            const safeCode = (error as { code?: string }).code || "auth/google-sign-in-failed";
            emitAuthAttemptFailed(attempt, {
                failureCode: safeCode,
                sourceTruth: "client_auth",
                extraParams: {
                    entry_mode: mode,
                },
            });
            const { mergedParams } = consumeTimedFlow(AUTH_GOOGLE_FLOW, { source_mode: mode });
            const failedEvent = buildAuthRuntimeTelemetry({
                eventName: "auth_google_failed",
                method: "google",
                authAttemptId: attempt.authAttemptId,
                route: attempt.route,
                sourceComponent: attempt.sourceComponent,
                sourceTruth: "client_auth",
                failureCode: safeCode,
                metadata: { entry_mode: mode },
            });
            trackEvent(failedEvent.eventName, failedEvent.params);
            trackEvent("auth_google_sign_in_failed", mergedParams);
            const conflict = (error as { authProviderConflict?: AuthProviderConflict }).authProviderConflict ?? null;
            if (conflict) {
                const shown = buildAuthConflictTelemetry(conflict, {
                    authAttemptId: attempt.authAttemptId,
                    route: attempt.route,
                    sourceComponent: "AuthModal",
                }, "auth_provider_conflict_resolution_shown");
                trackEvent(shown.eventName, shown.params);
                setAuthConflict(conflict);
                setAuthError(resolveProviderConflictMessage(conflict));
            } else {
                setAuthError(error instanceof Error ? error.message : "Failed to sign in with Google.");
            }
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
        setAuthConflict(null);
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
        setAuthConflict(null);
        let authAttempt: ReturnType<typeof createAuthAttemptTelemetryContext> | null = null;

        try {
            if (isSignupMode(mode)) {
                if (usernameAvailable === false) {
                    throw new Error("Username is already taken.");
                }

                authAttempt = createAuthAttemptTelemetryContext({
                    method: "email_sign_up",
                    sourceComponent: "AuthModal",
                });
                startTimedFlow(AUTH_SIGN_UP_FLOW, { entry_mode: initialMode, signup_intent: signupIntent });
                emitAuthAttemptStarted(authAttempt, {
                    entry_mode: initialMode,
                    signup_intent: signupIntent,
                });
                const startedEvent = buildAuthRuntimeTelemetry({
                    eventName: "auth_email_signup_started",
                    method: "email_password",
                    authAttemptId: authAttempt.authAttemptId,
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    sourceTruth: "client_auth",
                    metadata: {
                        entry_mode: initialMode,
                        signup_intent: signupIntent,
                    },
                });
                trackEvent(startedEvent.eventName, startedEvent.params);
                emitAuthLifecycleEvent({
                    eventName: "auth_registration_started",
                    authAttemptId: authAttempt.authAttemptId,
                    method: "registration",
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    sourceTruth: "client_auth",
                    startedAtUtc: authAttempt.startedAtUtc,
                    extraParams: {
                        signup_intent: signupIntent,
                    },
                });
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
                }, {
                    authAttemptId: authAttempt.authAttemptId,
                    method: "email_sign_up",
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    startedAtUtc: authAttempt.startedAtUtc,
                });
                emitAuthAttemptSucceeded(authAttempt, {
                    actorUserId: result.userId,
                    sourceTruth: "server_session",
                    extraParams: {
                        entry_mode: initialMode,
                        signup_intent: signupIntent,
                    },
                });
                emitAuthLifecycleEvent({
                    eventName: "auth_registration_completed",
                    authAttemptId: authAttempt.authAttemptId,
                    method: "registration",
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    sourceTruth: "registration_api",
                    actorUserId: result.userId,
                    startedAtUtc: authAttempt.startedAtUtc,
                    finishedAtUtc: new Date().toISOString(),
                    extraParams: {
                        signup_intent: signupIntent,
                    },
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
                const completedEvent = buildAuthRuntimeTelemetry({
                    eventName: "auth_email_signup_completed",
                    method: "email_password",
                    authAttemptId: authAttempt.authAttemptId,
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    sourceTruth: "server_session",
                    metadata: {
                        entry_mode: initialMode,
                        signup_intent: signupIntent,
                    },
                });
                trackEvent(completedEvent.eventName, completedEvent.params);
                trackEvent("auth_sign_up_success", mergedParams);
            } else {
                authAttempt = createAuthAttemptTelemetryContext({
                    method: "email_sign_in",
                    sourceComponent: "AuthModal",
                });
                startTimedFlow(AUTH_SIGN_IN_FLOW, {
                    entry_mode: initialMode,
                    manual_identifier_type: manualIdentifierType,
                });
                emitAuthAttemptStarted(authAttempt, {
                    entry_mode: initialMode,
                    manual_identifier_type: manualIdentifierType,
                });
                const startedEvent = buildAuthRuntimeTelemetry({
                    eventName: "auth_email_login_started",
                    method: "email_password",
                    authAttemptId: authAttempt.authAttemptId,
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    sourceTruth: "client_auth",
                    metadata: {
                        entry_mode: initialMode,
                        manual_identifier_type: manualIdentifierType,
                    },
                });
                trackEvent(startedEvent.eventName, startedEvent.params);
                trackEvent("auth_sign_in_attempted", {
                    entry_mode: initialMode,
                    manual_identifier_type: manualIdentifierType,
                });
                const result = await signInWithEmail(data.email, data.password, {
                    authAttemptId: authAttempt.authAttemptId,
                    method: "email_sign_in",
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    startedAtUtc: authAttempt.startedAtUtc,
                });
                emitAuthAttemptSucceeded(authAttempt, {
                    actorUserId: result.userId,
                    sourceTruth: "server_session",
                    extraParams: {
                        entry_mode: initialMode,
                        manual_identifier_type: manualIdentifierType,
                    },
                });
                const { mergedParams } = consumeTimedFlow(AUTH_SIGN_IN_FLOW, {
                    entry_mode: initialMode,
                    manual_identifier_type: manualIdentifierType,
                });
                const completedEvent = buildAuthRuntimeTelemetry({
                    eventName: "auth_email_login_completed",
                    method: "email_password",
                    authAttemptId: authAttempt.authAttemptId,
                    route: authAttempt.route,
                    sourceComponent: authAttempt.sourceComponent,
                    sourceTruth: "server_session",
                    metadata: {
                        entry_mode: initialMode,
                        manual_identifier_type: manualIdentifierType,
                    },
                });
                trackEvent(completedEvent.eventName, completedEvent.params);
                trackEvent("auth_sign_in_success", mergedParams);
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
            const failureCode = firebaseError.code || "auth/unknown";
            const { mergedParams } = consumeTimedFlow(flowKey, {
                error_code: failureCode,
                entry_mode: initialMode,
                manual_identifier_type: manualIdentifierType,
                signup_intent: signupIntent,
            });
            if (authAttempt) {
                emitAuthAttemptFailed(authAttempt, {
                    failureCode,
                    sourceTruth: failureCode.includes("navigation-session") ? "server_session" : "client_auth",
                    extraParams: {
                        entry_mode: initialMode,
                        manual_identifier_type: manualIdentifierType,
                        signup_intent: signupIntent,
                    },
                });
            }
            if (isSignupMode(mode)) {
                const failedEvent = buildAuthRuntimeTelemetry({
                    eventName: "auth_email_signup_failed",
                    method: "email_password",
                    authAttemptId: authAttempt?.authAttemptId,
                    route: authAttempt?.route,
                    sourceComponent: authAttempt?.sourceComponent || "AuthModal",
                    sourceTruth: failureCode.includes("navigation-session") ? "server_session" : "client_auth",
                    failureCode,
                    metadata: {
                        entry_mode: initialMode,
                        signup_intent: signupIntent,
                    },
                });
                trackEvent(failedEvent.eventName, failedEvent.params);
                trackEvent("auth_sign_up_failed", mergedParams);
            } else {
                const failedEvent = buildAuthRuntimeTelemetry({
                    eventName: "auth_email_login_failed",
                    method: "email_password",
                    authAttemptId: authAttempt?.authAttemptId,
                    route: authAttempt?.route,
                    sourceComponent: authAttempt?.sourceComponent || "AuthModal",
                    sourceTruth: failureCode.includes("navigation-session") ? "server_session" : "client_auth",
                    failureCode,
                    metadata: {
                        entry_mode: initialMode,
                        manual_identifier_type: manualIdentifierType,
                    },
                });
                trackEvent(failedEvent.eventName, failedEvent.params);
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
            const conflict = (error as { authProviderConflict?: AuthProviderConflict }).authProviderConflict ?? null;
            if (conflict) {
                const shown = buildAuthConflictTelemetry(conflict, {
                    authAttemptId: authAttempt?.authAttemptId,
                    route: authAttempt?.route,
                    sourceComponent: "AuthModal",
                }, "auth_provider_conflict_resolution_shown");
                trackEvent(shown.eventName, shown.params);
                setAuthConflict(conflict);
                setAuthError(resolveProviderConflictMessage(conflict));
            }
        } finally {
            setIsLoading(false);
            emailAuthSubmissionInFlightRef.current = false;
        }
    };

    const handleAuthConflictPrimaryCta = () => {
        if (!authConflict) {
            return;
        }

        const clicked = buildAuthConflictTelemetry(authConflict, {
            route: typeof window !== "undefined" ? window.location.pathname : "/auth",
            sourceComponent: "AuthModal",
        }, "auth_provider_conflict_cta_clicked");
        trackEvent(clicked.eventName, {
            ...clicked.params,
            cta: authConflict.primaryCta,
        });

        if (shouldOfferGoogleSignIn(authConflict)) {
            void handleGoogleSignIn();
            return;
        }

        if (shouldOfferPasswordReset(authConflict)) {
            switchMode("forgot_password");
            return;
        }

        if (authConflict.resolution === "use_email_password") {
            switchMode("signin");
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
        const requestedEvent = buildAuthRuntimeTelemetry({
            eventName: "auth_password_reset_requested",
            method: "password_reset",
            route: typeof window !== "undefined" ? window.location.pathname : "/auth",
            sourceComponent: "AuthModal",
            sourceTruth: "client_auth",
        });
        trackEvent(requestedEvent.eventName, requestedEvent.params);
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
                    emailPresent: Boolean(email),
                },
                consoleLabel: "[Auth Modal] password reset failed",
            });
            const resolution = resolveEmailAuthError(error, "password_reset");
            const firebaseError = error as { code?: string };
            if (firebaseError.code === "auth/user-not-found") {
                trackEvent("password_reset_sent");
                setResetSent(true);
            } else {
                const failedEvent = buildAuthRuntimeTelemetry({
                    eventName: "auth_password_reset_failed",
                    method: "password_reset",
                    route: typeof window !== "undefined" ? window.location.pathname : "/auth",
                    sourceComponent: "AuthModal",
                    sourceTruth: "client_auth",
                    failureCode: firebaseError.code || "unknown",
                });
                trackEvent(failedEvent.eventName, failedEvent.params);
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
    const creatorIntake = isCreatorSignupMode ? (
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
    ) : null;

    return (
        <KandyAuthEntryExperience
            mode={mode}
            heading={getHeading(mode)}
            supportCopy={getSupportCopy(mode)}
            isLoading={isLoading}
            showGoogleButton={showGoogleButton}
            onGoogleSignIn={() => void handleGoogleSignIn()}
            onClose={onClose}
            onSwitchMode={switchMode}
            resetSent={resetSent}
            onPasswordReset={handlePasswordReset}
            register={register}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            onCreatorKeyDown={handleCreatorKeyDown}
            errors={errors}
            checkingUsername={checkingUsername}
            usernameAvailable={usernameAvailable}
            markUsernameTouched={() => setUsernameTouched(true)}
            authError={authError}
            authConflictPrimaryCta={
                authConflict ? resolveProviderConflictCta(authConflict).primary : null
            }
            authConflictSecondaryCta={authConflict?.secondaryCta ?? null}
            onAuthConflictPrimaryCta={handleAuthConflictPrimaryCta}
            emailSignInBlocked={emailSignInBlocked}
            emailSignInCooldownSeconds={Math.round(LOCAL_EMAIL_AUTH_SIGN_IN_COOLDOWN_MS / 1_000)}
            signupActionLabel={SECONDARY_UNWRAP_CTA}
            isCreatorSignupMode={isCreatorSignupMode}
            creatorStep={creatorStep}
            creatorStepCount={CREATOR_SIGNUP_STEPS}
            isCreatorFinalStep={isCreatorFinalStep}
            creatorIntake={creatorIntake}
            onCreatorBack={() => {
                if (creatorStep > 0) {
                    setAuthError(null);
                    setCreatorStep((previous) => Math.max(previous - 1, 0));
                    return;
                }

                switchMode("signin");
            }}
            onAdvanceCreatorStep={() => void handleAdvanceCreatorStep()}
        />
    );
}