"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Gift, BellRing, ChevronRight, Compass, CalendarCheck2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { buildOnboardingCompletionStorageKey } from "@/hooks/client-runtime";
import { db } from "@/lib/firebase-data";
import { trackEvent } from "@/lib/telemetry";
import { authFetch } from "@/lib/authFetch";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { shouldBypassFanOnboarding } from "@/lib/creator-application";

import {
    type FlavorPreference,
    type OnboardingStepMetric,
    DASHBOARD_ONBOARDING_PATH,
    STEP_DEFINITIONS,
    FLAVOR_OPTIONS,
    hasClaimedToday,
    focusDashboardHome,
} from "./OnboardingHelpers";

export function GuidedOnboarding() {
    const { user, userProfile: profile, setUserProfile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [completionStorageKey, setCompletionStorageKey] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) {
            setCompletionStorageKey(null);
            return;
        }

        let cancelled = false;
        setIsCheckingKey(true);
        void buildOnboardingCompletionStorageKey(user.uid)
            .then((key) => {
                if (!cancelled) {
                    setCompletionStorageKey(key);
                    setIsCheckingKey(false);
                }
            })
            .catch((err) => {
                reportClientIssue({
                    channel: "storage",
                    severity: "warn",
                    message: "Onboarding storage key generation failed",
                    error: err,
                    detail: {
                        action: "build_onboarding_completion_storage_key",
                    },
                    consoleLabel: "[Onboarding] storage key generation failed",
                });
                if (!cancelled) {
                    setCompletionStorageKey(`kandydrops_onboarding_fallback_${user.uid}`);
                    setIsCheckingKey(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    const [isCheckingKey, setIsCheckingKey] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [flavorPreference, setFlavorPreference] = useState<FlavorPreference>("");
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const flowStartedAtRef = useRef(0);
    const activeStepIdRef = useRef<string | null>(null);
    const stepStartedAtRef = useRef<Record<string, number>>({});
    const completedStepIdsRef = useRef<Set<string>>(new Set());
    const stepMetricsRef = useRef<Record<string, OnboardingStepMetric>>({});
    const serverProgressKeysRef = useRef<Set<string>>(new Set());
    const viewedStepKeysRef = useRef<Set<string>>(new Set());
    const stepStalledTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (stepStalledTimeoutRef.current) {
                clearTimeout(stepStalledTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isVisible) {
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
    }, [isVisible]);

    const buildViewportPayload = useCallback(() => ({
        viewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
        viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
        isMobileViewport: typeof window !== "undefined" ? window.innerWidth < 768 : false,
    }), []);

    const sendCanonicalProgressEvent = useCallback(async (
        eventName: "guided_onboarding_started" | "guided_onboarding_step_started" | "guided_onboarding_step_completed" | "onboarding_step_viewed",
        dedupeKey: string,
        payload: Record<string, string | number | boolean>,
    ) => {
        if (serverProgressKeysRef.current.has(dedupeKey)) {
            return;
        }

        serverProgressKeysRef.current.add(dedupeKey);
        try {
            const response = await authFetch("/api/user/onboarding-progress", {
                method: "POST",
                body: JSON.stringify({
                    eventName,
                    ...payload,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to sync onboarding progress");
            }
        } catch (error) {
            serverProgressKeysRef.current.delete(dedupeKey);
            recordClientDiagnostic("telemetry", "Onboarding progress sync failed", {
                eventName,
                dedupeKey,
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }, []);

    const startOnboardingFlow = useCallback(() => {
        if (!user || !profile?.username || isVisible) {
            return;
        }

        const startedAtMs = Date.now();
        const registrationMethod = user.providerData[0]?.providerId === "google.com" ? "google" : "email";
        flowStartedAtRef.current = startedAtMs;
        activeStepIdRef.current = null;
        stepStartedAtRef.current = {};
        completedStepIdsRef.current = new Set();
        stepMetricsRef.current = {};
        serverProgressKeysRef.current = new Set();
        viewedStepKeysRef.current = new Set();

        trackEvent("guided_onboarding_started", {
            source: "auto_after_signup",
            registration_method: registrationMethod,
            overall_started_at_ms: startedAtMs,
        });
        void sendCanonicalProgressEvent("guided_onboarding_started", `flow:${startedAtMs}`, {
            flowStartedAtMs: startedAtMs,
            registrationMethod,
            stepPath: STEP_DEFINITIONS[0]?.path || "/dashboard",
            ...buildViewportPayload(),
        });
        setCurrentStep(0);
        setIsVisible(true);
    }, [buildViewportPayload, isVisible, profile?.username, sendCanonicalProgressEvent, user]);

    useEffect(() => {
        if (!user || !profile || isCheckingKey) {
            return;
        }

        const completedLocally = completionStorageKey
            ? window.sessionStorage.getItem(completionStorageKey) === "true"
            : false;

        if (profile.onboardingCompleted === true || completedLocally || shouldBypassFanOnboarding(profile)) {
            setIsVisible(false);
            return;
        }

        if (pathname !== DASHBOARD_ONBOARDING_PATH) {
            router.replace(DASHBOARD_ONBOARDING_PATH);
            return;
        }

        let cancelled = false;

        const hydrateLegacyCompletion = async () => {
            try {
                const legacyProfileRef = doc(db, "users", user.uid, "profile", "default");
                const legacyProfileSnap = await getDoc(legacyProfileRef);
                const legacyCompleted = legacyProfileSnap.exists() && legacyProfileSnap.data()?.onboardingCompleted === true;

                if (cancelled) {
                    return;
                }

                if (legacyCompleted) {
                    if (completionStorageKey) {
                        window.sessionStorage.setItem(completionStorageKey, "true");
                    }
                    await setDoc(doc(db, "users", user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => { });
                    setIsVisible(false);
                    return;
                }

                startOnboardingFlow();
            } catch {
                if (!cancelled) {
                    startOnboardingFlow();
                }
            }
        };

        void hydrateLegacyCompletion();

        return () => {
            cancelled = true;
        };
    }, [completionStorageKey, isCheckingKey, pathname, profile, router, startOnboardingFlow, user]);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const step = STEP_DEFINITIONS[currentStep];
        if (!step) {
            return;
        }

        if (activeStepIdRef.current !== step.id) {
            if (stepStalledTimeoutRef.current) {
                clearTimeout(stepStalledTimeoutRef.current);
            }

            const startedAtMs = Date.now();
            activeStepIdRef.current = step.id;
            stepStartedAtRef.current[step.id] = startedAtMs;
            const registrationMethod = user?.providerData[0]?.providerId === "google.com" ? "google" : "email";

            stepStalledTimeoutRef.current = setTimeout(() => {
                trackEvent("onboarding_friction", {
                    friction_type: "stalled_on_step",
                    step_key: step.id,
                    time_spent_ms: 60000,
                });
            }, 60000);

            trackEvent("guided_onboarding_step_started", {
                step_key: step.id,
                step_index: currentStep + 1,
                step_title: step.title,
                step_path: step.path,
                overall_started_at_ms: flowStartedAtRef.current,
            });
            void sendCanonicalProgressEvent(
                "guided_onboarding_step_started",
                `step-start:${flowStartedAtRef.current}:${step.id}:${startedAtMs}`,
                {
                    flowStartedAtMs: flowStartedAtRef.current,
                    stepId: step.id,
                    stepIndex: currentStep + 1,
                    stepTitle: step.title,
                    stepPath: step.path,
                    startedAtMs,
                    registrationMethod,
                    ...buildViewportPayload(),
                },
            );
        }
    }, [buildViewportPayload, currentStep, isVisible, sendCanonicalProgressEvent, user]);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const step = STEP_DEFINITIONS[currentStep];
        if (!step || pathname !== step.path) {
            return;
        }

        const viewKey = `${flowStartedAtRef.current}:${step.id}`;
        if (viewedStepKeysRef.current.has(viewKey)) {
            return;
        }

        viewedStepKeysRef.current.add(viewKey);
        const startedAtMs = Date.now();
        const registrationMethod = user?.providerData[0]?.providerId === "google.com" ? "google" : "email";
        trackEvent("onboarding_step_viewed", {
            step: currentStep + 1,
            step_key: step.id,
            step_title: step.title,
            step_path: step.path,
        });
        void sendCanonicalProgressEvent("onboarding_step_viewed", `step-view:${flowStartedAtRef.current}:${step.id}:${startedAtMs}`, {
            flowStartedAtMs: flowStartedAtRef.current,
            stepId: step.id,
            stepIndex: currentStep + 1,
            stepTitle: step.title,
            stepPath: step.path,
            startedAtMs,
            registrationMethod,
            ...buildViewportPayload(),
        });
    }, [buildViewportPayload, currentStep, isVisible, pathname, sendCanonicalProgressEvent, user]);

    const isNotificationStepCompleted = useMemo(
        () => profile?.notificationSettings?.browserPushEnabled === true,
        [profile?.notificationSettings?.browserPushEnabled],
    );
    const hasCheckedInToday = hasClaimedToday(profile?.lastCheckIn);

    const progressPercent = ((currentStep + 1) / STEP_DEFINITIONS.length) * 100;

    const goToNextStep = (nextStep?: number) => {
        setCurrentStep((previous) => {
            const computed = typeof nextStep === "number" ? nextStep : previous + 1;
            return Math.min(computed, STEP_DEFINITIONS.length - 1);
        });
    };

    const buildStepMetric = (stepIndex: number, completionReason: string) => {
        const step = STEP_DEFINITIONS[stepIndex];
        if (!step) {
            return null;
        }

        const completedAtMs = Date.now();
        const startedAtMs = stepStartedAtRef.current[step.id] || completedAtMs;
        return {
            stepId: step.id,
            stepIndex: stepIndex + 1,
            stepTitle: step.title,
            stepPath: step.path,
            startedAtMs,
            completedAtMs,
            durationMs: Math.max(0, completedAtMs - startedAtMs),
            completionReason,
        } satisfies OnboardingStepMetric;
    };

    const commitStepMetric = (metric: OnboardingStepMetric | null, extraParams?: Record<string, string | number | boolean>) => {
        if (!metric || completedStepIdsRef.current.has(metric.stepId)) {
            return;
        }

        completedStepIdsRef.current.add(metric.stepId);
        stepMetricsRef.current[metric.stepId] = metric;
        trackEvent("guided_onboarding_step_completed", {
            step_key: metric.stepId,
            step_index: metric.stepIndex,
            step_title: metric.stepTitle,
            step_path: metric.stepPath,
            completion_reason: metric.completionReason,
            duration_ms: metric.durationMs,
            duration_seconds: Math.round(metric.durationMs / 1000),
            overall_started_at_ms: flowStartedAtRef.current,
            ...extraParams,
        });
        void sendCanonicalProgressEvent(
            "guided_onboarding_step_completed",
            `step-complete:${flowStartedAtRef.current}:${metric.stepId}:${metric.completedAtMs}`,
            {
                flowStartedAtMs: flowStartedAtRef.current,
                stepId: metric.stepId,
                stepIndex: metric.stepIndex,
                stepTitle: metric.stepTitle,
                stepPath: metric.stepPath,
                startedAtMs: metric.startedAtMs,
                completedAtMs: metric.completedAtMs,
                durationMs: metric.durationMs,
                completionReason: metric.completionReason,
                selectedFlavor: metric.stepId === "flavor_preference" ? (typeof extraParams?.selected_flavor === "string" ? extraParams.selected_flavor : flavorPreference || "Sweet") : "",
                ...buildViewportPayload(),
            },
        );
    };

    const completeCurrentStep = (completionReason: string, extraParams?: Record<string, string | number | boolean>) => {
        const metric = buildStepMetric(currentStep, completionReason);
        commitStepMetric(metric, extraParams);
    };

    const completeStepAndAdvance = (completionReason: string, extraParams?: Record<string, string | number | boolean>) => {
        if (stepStalledTimeoutRef.current) {
            clearTimeout(stepStalledTimeoutRef.current);
        }
        completeCurrentStep(completionReason, extraParams);
        goToNextStep();
    };

    const handleCheckInAndContinue = async () => {
        if (hasCheckedInToday) {
                toast.success("Daily check-in already claimed. Let's keep going.");
            completeStepAndAdvance("already_claimed");
            return;
        }

        setIsCheckingIn(true);
        try {
            const response = await authFetch("/api/checkin", {
                method: "POST",
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok && payload?.alreadyClaimed !== true) {
                throw new Error(typeof payload?.error === "string" ? payload.error : "We could not complete your check-in.");
            }

            toast.success(payload?.alreadyClaimed ? "Daily check-in already claimed." : `+${payload?.reward || 0} Gum Drops added.`);
            completeStepAndAdvance(payload?.alreadyClaimed ? "already_claimed" : "claimed", {
                reward_amount: Number(payload?.reward || 0),
                already_claimed: payload?.alreadyClaimed === true,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "We could not complete your check-in.";
            reportClientIssue({
                channel: "auth",
                message: "Onboarding daily check-in failed",
                error,
                detail: {
                    action: "onboarding_checkin",
                },
                consoleLabel: "[Onboarding] daily check-in failed",
            });
            toast.error(message);
        } finally {
            setIsCheckingIn(false);
        }
    };

    const handleEnableNotifications = async () => {
        if (!profile || isNotificationStepCompleted) {
            completeStepAndAdvance("already_enabled");
            return;
        }

        setIsEnablingNotifications(true);
        try {
            const result = await enableBrowserNotifications(profile);
            if (result.status === "enabled") {
                toast.success("Browser notifications enabled.");
                completeStepAndAdvance("enabled");
                return;
            }

            if (result.status === "not_granted") {
                toast.info(result.needsStandaloneInstall
                    ? "Add KandyDrops to your Home Screen first, then open it there to enable notifications."
                    : "Notifications were not enabled just yet.");
                return;
            }

            toast.error(result.message);
        } catch (error) {
            reportClientIssue({
                channel: "notifications",
                message: "Onboarding notification enable failed",
                error,
                detail: {
                    action: "enable_notifications",
                },
                consoleLabel: "[Onboarding] notification enable failed",
            });
            toast.error("We could not enable notifications right now.");
        } finally {
            setIsEnablingNotifications(false);
        }
    };

    const applyCompletedOnboardingState = (
        finalStepMetric: OnboardingStepMetric | null,
        stepMetrics: OnboardingStepMetric[],
        durationMs: number,
        durationSeconds: number,
        newBalance?: number,
        recoveredFromServerError = false,
    ) => {
        setUserProfile((currentProfile) => currentProfile ? {
            ...currentProfile,
            onboardingCompleted: true,
            gumDropsBalance: typeof newBalance === "number" ? newBalance : currentProfile.gumDropsBalance,
            preferences: {
                ...(currentProfile.preferences || {}),
                flavor: flavorPreference || "Sweet",
            },
        } : currentProfile);
        if (completionStorageKey) {
            window.sessionStorage.setItem(completionStorageKey, "true");
        }

        try {
            commitStepMetric(finalStepMetric, {
                completed_step_count: stepMetrics.length,
            });
        } catch (error) {
            reportClientIssue({
                channel: "telemetry",
                severity: "warn",
                message: "Onboarding step completion metric commit failed",
                error,
                detail: {
                    action: "commit_step_metric",
                    scope: "apply_completed_onboarding_state",
                },
                consoleLabel: "[Onboarding] step metric commit failed",
            });
        }

        trackEvent("guided_onboarding_completed", {
            overall_started_at_ms: flowStartedAtRef.current,
            duration_ms: durationMs,
            duration_seconds: durationSeconds,
            completed_step_count: stepMetrics.length,
            selected_flavor: flavorPreference || "Sweet",
            completion_surface: "dashboard_overlay",
            page_path: DASHBOARD_ONBOARDING_PATH,
        });

        setIsVisible(false);
        toast.success(recoveredFromServerError ? "You're all set. We synced your dashboard." : "You're all set. Your dashboard is ready.");
        router.replace(DASHBOARD_ONBOARDING_PATH);
        router.refresh();
        focusDashboardHome();
    };

    const completeOnboarding = async () => {
        if (!user || isCompleting) {
            return;
        }

        setIsCompleting(true);
        const finalStepMetric = buildStepMetric(currentStep, "finished");
        const durationMs = flowStartedAtRef.current ? Math.max(0, Date.now() - flowStartedAtRef.current) : 0;
        const durationSeconds = durationMs ? Math.round(durationMs / 1000) : 0;
        const stepMetrics = [
            ...Object.values(stepMetricsRef.current),
            ...(finalStepMetric && !completedStepIdsRef.current.has(finalStepMetric.stepId) ? [finalStepMetric] : []),
        ];
        try {
            const response = await authFetch("/api/user/complete-onboarding", {
                method: "POST",
                body: JSON.stringify({
                    startedAtMs: flowStartedAtRef.current,
                    durationMs,
                    durationSeconds,
                    stepMetrics,
                    selectedFlavor: flavorPreference || "Sweet",
                    pagePath: DASHBOARD_ONBOARDING_PATH,
                    ...buildViewportPayload(),
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to complete onboarding.");
            }

            setUserProfile((currentProfile) => currentProfile ? {
                ...currentProfile,
                onboardingCompleted: true,
                gumDropsBalance: typeof result?.newBalance === "number" ? result.newBalance : currentProfile.gumDropsBalance,
                preferences: {
                    ...(currentProfile.preferences || {}),
                    flavor: flavorPreference || "Sweet",
                },
            } : currentProfile);
            if (completionStorageKey) {
                window.sessionStorage.setItem(completionStorageKey, "true");
            }

            try {
                commitStepMetric(finalStepMetric, {
                    completed_step_count: stepMetrics.length,
                });
            } catch (error) {
                reportClientIssue({
                    channel: "telemetry",
                    severity: "warn",
                    message: "Onboarding completion metric commit failed",
                    error,
                    detail: {
                        action: "commit_step_metric",
                        scope: "complete_onboarding",
                    },
                    consoleLabel: "[Onboarding] completion metric commit failed",
                });
            }

            trackEvent("guided_onboarding_completed", {
                overall_started_at_ms: flowStartedAtRef.current,
                duration_ms: durationMs,
                duration_seconds: durationSeconds,
                completed_step_count: stepMetrics.length,
                selected_flavor: flavorPreference || "Sweet",
                completion_surface: "dashboard_overlay",
                page_path: DASHBOARD_ONBOARDING_PATH,
            });

            setIsVisible(false);
            toast.success("You’re all set. Your dashboard is ready.");
            focusDashboardHome();
        } catch (error) {
            reportClientIssue({
                channel: "auth",
                message: "Onboarding completion failed",
                error,
                detail: {
                    action: "complete_onboarding",
                },
                consoleLabel: "[Onboarding] completion failed",
            });
            try {
                const userProfileRef = doc(db, "users", user.uid);
                const legacyProfileRef = doc(db, "users", user.uid, "profile", "default");
                const [userProfileSnap, legacyProfileSnap] = await Promise.all([
                    getDoc(userProfileRef),
                    getDoc(legacyProfileRef),
                ]);
                const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : null;
                const legacyProfileData = legacyProfileSnap.exists() ? legacyProfileSnap.data() : null;
                const recoveredCompletion = userProfileData?.onboardingCompleted === true || legacyProfileData?.onboardingCompleted === true;

                if (recoveredCompletion) {
                    if (legacyProfileData?.onboardingCompleted === true && userProfileData?.onboardingCompleted !== true) {
                        await setDoc(userProfileRef, { onboardingCompleted: true }, { merge: true }).catch(() => { });
                    }

                    applyCompletedOnboardingState(
                        finalStepMetric,
                        stepMetrics,
                        durationMs,
                        durationSeconds,
                        typeof userProfileData?.gumDropsBalance === "number" ? userProfileData.gumDropsBalance : undefined,
                        true,
                    );
                    return;
                }
            } catch (recoveryError) {
                reportClientIssue({
                    channel: "auth",
                    severity: "warn",
                    message: "Onboarding recovery verification failed",
                    error: recoveryError,
                    detail: {
                        action: "verify_onboarding_recovery",
                    },
                    consoleLabel: "[Onboarding] recovery verification failed",
                });
            }
            const message = error instanceof Error ? error.message : "Failed to finish onboarding.";
            toast.error(message);
        } finally {
            setIsCompleting(false);
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6">
            <AnimatePresence mode="wait">
                <motion.div
                    key={`onboarding-step-${currentStep}`}
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                    className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0b0b11] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:p-6"
                >
                    <div className="mb-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-purple">
                                Step {currentStep + 1} of {STEP_DEFINITIONS.length}
                            </span>
                            <span className="text-xs font-medium text-gray-500">
                                {STEP_DEFINITIONS[currentStep]?.title}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/8">
                            <div
                                className="h-full rounded-full bg-brand-purple transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {currentStep === 0 ? (
                        <>
                            <div className="mb-5 text-center">
                                <h2 className="text-2xl font-bold text-white">Choose your flavor</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Set the tone for what you want to see first. You can change it later anytime.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {FLAVOR_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const active = flavorPreference === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFlavorPreference(option.value)}
                                            className={`flex w-full items-center gap-4 rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                                                active
                                                    ? option.activeClass
                                                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                            }`}
                                        >
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? option.iconClass : "bg-white/10 text-gray-400"}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${active ? option.accentClass : "text-white"}`}>{option.label}</p>
                                                <p className="mt-0.5 text-xs text-gray-400">{option.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => completeStepAndAdvance("selected_flavor", {
                                    selected_flavor: flavorPreference || "Sweet",
                                })}
                                disabled={!flavorPreference}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Save flavor <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}

                    {currentStep === 1 ? (
                        <>
                            <div className="mb-5 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                                    <CalendarCheck2 className="h-7 w-7" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Claim today&apos;s Gum Drops</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Start your streak now so your first unwrap is closer right away.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCheckInAndContinue}
                                disabled={isCheckingIn}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCheckingIn ? "Checking in..." : hasCheckedInToday ? "Keep going" : "Claim today’s drops"}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}

                    {currentStep === 2 ? (
                        <>
                            <div className="mb-5 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                                    <Gift className="h-7 w-7" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Live drops move fast</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    If a live drop matters to you, unwrap it before the timer ends so it stays in your library.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => completeStepAndAdvance("continued_from_drops")}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all"
                            >
                                I&apos;ll watch the timer <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}

                    {currentStep === 3 ? (
                        <>
                            <div className="mb-5 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                                    <Compass className="h-7 w-7" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Daily experiences keep you stocked</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Use your daily loop to keep Gum Drops coming in without leaving the dashboard rhythm.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => completeStepAndAdvance("continued_from_experiences")}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all"
                            >
                                Show me the routine <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}

                    {currentStep === 4 ? (
                        <>
                            <div className="mb-5 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                                    <BellRing className="h-7 w-7" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Get the heads-up first</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Turn on alerts and we&apos;ll nudge you when drops go live or your daily loop resets.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={handleEnableNotifications}
                                    disabled={isEnablingNotifications}
                                    className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isNotificationStepCompleted
                                        ? "Alerts already on"
                                        : isEnablingNotifications
                                            ? "Turning on..."
                                            : "Turn on alerts"}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => completeStepAndAdvance("skipped_notifications")}
                                    className="w-full rounded-full border border-white/12 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/8"
                                >
                                    Maybe later
                                </button>
                            </div>
                        </>
                    ) : null}

                    {currentStep === 5 ? (
                        <>
                            <div className="mb-5 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                                    <Gift className="h-8 w-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">You&apos;re ready</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Your dashboard is set. You now have <span className="font-bold text-white">100 Gum Drops</span> ready for your first unwrap, and we&apos;ll keep you right here to start.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={completeOnboarding}
                                disabled={isCompleting}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCompleting ? "Finishing..." : "Enter dashboard"}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
