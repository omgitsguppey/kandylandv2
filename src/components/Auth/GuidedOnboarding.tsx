"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, Flame, Droplets, Gift, BellRing, ChevronRight, Compass, CalendarCheck2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { buildOnboardingCompletionStorageKey } from "@/hooks/client-runtime";
import { db } from "@/lib/firebase-data";
import { trackEvent } from "@/lib/telemetry";
import { authFetch } from "@/lib/authFetch";
import { getCSTDayBoundaries } from "@/lib/timezone";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";

type FlavorPreference = "Sweet" | "Spicy" | "RAW" | "";

type StepDefinition = {
    id: string;
    title: string;
    description: string;
    path: string;
};

type OnboardingStepMetric = {
    stepId: string;
    stepIndex: number;
    stepTitle: string;
    stepPath: string;
    startedAtMs: number;
    completedAtMs: number;
    durationMs: number;
    completionReason: string;
};

const STEP_DEFINITIONS: StepDefinition[] = [
    {
        id: "flavor_preference",
        title: "Pick your flavor",
        description: "Pick what feels right first. You can always change it later.",
        path: "/dashboard",
    },
    {
        id: "daily_check_in",
        title: "Claim your daily check-in",
        description: "Check in daily to earn Gum Drops. Start your streak now so you can unwrap more sooner.",
        path: "/dashboard",
    },
    {
        id: "live_drops",
        title: "Live KandyDrops",
        description: "Live KandyDrops can disappear when the timer ends. Unwrap while they're active to keep them in your library.",
        path: "/drops",
    },
    {
        id: "experiences",
        title: "Daily Experiences",
        description: "Stay ready to unwrap. Check in, finish three missions, and come back when the timer resets.",
        path: "/experiences",
    },
    {
        id: "notifications",
        title: "Turn on notifications",
        description: "Enable notifications so you never miss a drop. Get the heads-up when fresh drops go live.",
        path: "/experiences",
    },
    {
        id: "complete",
        title: "You're ready to unwrap",
        description: "Taste your unwrapped KandyDrops and earn free Gum Drops. Jump straight into Drops when you're ready.",
        path: "/drops",
    },
];

const FLAVOR_OPTIONS: Array<{
    value: Exclude<FlavorPreference, "">;
    label: string;
    description: string;
    icon: typeof Sparkles;
    accentClass: string;
    activeClass: string;
    iconClass: string;
}> = [
    {
        value: "Sweet",
        label: "Sweet",
        description: "Light, playful, and teasing.",
        icon: Sparkles,
        accentClass: "text-pink-400",
        activeClass: "border-pink-400/60 bg-pink-500/10 shadow-[0_0_24px_rgba(236,72,153,0.16)]",
        iconClass: "bg-pink-500 text-white",
    },
    {
        value: "Spicy",
        label: "Spicy",
        description: "Bold, hot, and attention-grabbing.",
        icon: Flame,
        accentClass: "text-orange-400",
        activeClass: "border-orange-400/60 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,0.16)]",
        iconClass: "bg-orange-500 text-white",
    },
    {
        value: "RAW",
        label: "RAW",
        description: "Direct, intense, and unfiltered.",
        icon: Droplets,
        accentClass: "text-brand-purple",
        activeClass: "border-brand-purple/60 bg-brand-purple/10 shadow-[0_0_24px_rgba(168,85,247,0.16)]",
        iconClass: "bg-brand-purple text-white",
    },
];

function normalizeTimestamp(value: unknown): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const timestamp = Number(value);
    return timestamp > 0 ? Math.floor(timestamp) : 0;
}

function hasClaimedToday(value: unknown): boolean {
    const lastCheckIn = normalizeTimestamp(value);
    if (!lastCheckIn) {
        return false;
    }

    const { startOfDay, endOfDay } = getCSTDayBoundaries(Date.now());
    return lastCheckIn >= startOfDay && lastCheckIn < endOfDay;
}

export function GuidedOnboarding() {
    const { user, userProfile: profile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const completionStorageKey = user ? buildOnboardingCompletionStorageKey(user.uid) : null;

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

    useEffect(() => {
        if (!user || !profile) {
            return;
        }

        const completedLocally = completionStorageKey
            ? window.localStorage.getItem(completionStorageKey) === "true"
            : false;

        if (profile.onboardingCompleted === true || completedLocally) {
            setIsVisible(false);
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
                        window.localStorage.setItem(completionStorageKey, "true");
                    }
                    await setDoc(doc(db, "users", user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => { });
                    setIsVisible(false);
                    return;
                }

                if (profile.username && !isVisible) {
                    const startedAtMs = Date.now();
                    flowStartedAtRef.current = startedAtMs;
                    activeStepIdRef.current = null;
                    stepStartedAtRef.current = {};
                    completedStepIdsRef.current = new Set();
                    stepMetricsRef.current = {};
                    trackEvent("guided_onboarding_started", {
                        source: "auto_after_signup",
                        registration_method: user.providerData[0]?.providerId === "google.com" ? "google" : "email",
                        overall_started_at_ms: startedAtMs,
                    });
                    setCurrentStep(0);
                    setIsVisible(true);
                }
            } catch {
                if (!cancelled && profile.username && !isVisible) {
                    const startedAtMs = Date.now();
                    flowStartedAtRef.current = startedAtMs;
                    activeStepIdRef.current = null;
                    stepStartedAtRef.current = {};
                    completedStepIdsRef.current = new Set();
                    stepMetricsRef.current = {};
                    trackEvent("guided_onboarding_started", {
                        source: "auto_after_signup",
                        registration_method: user.providerData[0]?.providerId === "google.com" ? "google" : "email",
                        overall_started_at_ms: startedAtMs,
                    });
                    setCurrentStep(0);
                    setIsVisible(true);
                }
            }
        };

        hydrateLegacyCompletion();

        return () => {
            cancelled = true;
        };
    }, [completionStorageKey, isVisible, profile, user]);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const step = STEP_DEFINITIONS[currentStep];
        if (!step) {
            return;
        }

        if (activeStepIdRef.current !== step.id) {
            const startedAtMs = Date.now();
            activeStepIdRef.current = step.id;
            stepStartedAtRef.current[step.id] = startedAtMs;

            trackEvent("guided_onboarding_step_started", {
                step_key: step.id,
                step_index: currentStep + 1,
                step_title: step.title,
                step_path: step.path,
                overall_started_at_ms: flowStartedAtRef.current,
            });
            trackEvent("onboarding_step_viewed", {
                step: currentStep + 1,
                step_key: step.id,
                step_title: step.title,
                step_path: step.path,
            });
        }

        if (pathname !== step.path) {
            router.replace(step.path);
        }
    }, [currentStep, isVisible, pathname, router]);

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
    };

    const completeCurrentStep = (completionReason: string, extraParams?: Record<string, string | number | boolean>) => {
        const metric = buildStepMetric(currentStep, completionReason);
        commitStepMetric(metric, extraParams);
    };

    const completeStepAndAdvance = (completionReason: string, extraParams?: Record<string, string | number | boolean>) => {
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
            console.error("Failed to enable browser notifications during onboarding", error);
            toast.error("We could not enable notifications right now.");
        } finally {
            setIsEnablingNotifications(false);
        }
    };

    const completeOnboarding = async () => {
        if (!user || isCompleting) {
            return;
        }

        setIsCompleting(true);
        try {
            const finalStepMetric = buildStepMetric(currentStep, "finished");
            const durationMs = flowStartedAtRef.current ? Math.max(0, Date.now() - flowStartedAtRef.current) : 0;
            const durationSeconds = durationMs ? Math.round(durationMs / 1000) : 0;
            const stepMetrics = [
                ...Object.values(stepMetricsRef.current),
                ...(finalStepMetric && !completedStepIdsRef.current.has(finalStepMetric.stepId) ? [finalStepMetric] : []),
            ];
            const response = await authFetch("/api/user/complete-onboarding", {
                method: "POST",
                body: JSON.stringify({
                    startedAtMs: flowStartedAtRef.current,
                    durationMs,
                    durationSeconds,
                    stepMetrics,
                    viewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
                    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
                    isMobileViewport: typeof window !== "undefined" ? window.innerWidth < 768 : false,
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to complete onboarding.");
            }

            try {
                await setDoc(doc(db, "users", user.uid), {
                    preferences: { flavor: flavorPreference || "Sweet" },
                    onboardingCompleted: true,
                }, { merge: true });
            } catch (syncError) {
                console.error("Error syncing onboarding preferences:", syncError);
            }

            if (completionStorageKey) {
                window.localStorage.setItem(completionStorageKey, "true");
            }

            try {
                commitStepMetric(finalStepMetric, {
                    completed_step_count: stepMetrics.length,
                });
            } catch {
                // noop
            }

            setIsVisible(false);
            router.replace("/drops");
        } catch (error) {
            console.error("Error completing onboarding:", error);
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
                                    Pick what feels right first. You can always change it later.
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
                                Continue <ChevronRight className="h-4 w-4" />
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
                                    Start your streak now so you can unwrap more sooner.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCheckInAndContinue}
                                disabled={isCheckingIn}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCheckingIn ? "Checking in..." : hasCheckedInToday ? "Next" : "Check in"}
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
                                <h2 className="text-2xl font-bold text-white">Live KandyDrops</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Live KandyDrops can disappear when the timer ends. Unwrap while they&apos;re active to keep them in your library.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => completeStepAndAdvance("continued_from_drops")}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}

                    {currentStep === 3 ? (
                        <>
                            <div className="mb-5 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                                    <Compass className="h-7 w-7" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Daily Experiences</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Stay ready to unwrap. Check in, finish three missions, and come back when the timer resets.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => completeStepAndAdvance("continued_from_experiences")}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}

                    {currentStep === 4 ? (
                        <>
                            <div className="mb-5 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                                    <BellRing className="h-7 w-7" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Turn on notifications</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                    Enable notifications so you never miss a drop. Get the heads-up when fresh drops go live.
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
                                        ? "Notifications already on"
                                        : isEnablingNotifications
                                            ? "Turning on..."
                                            : "Enable notifications"}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => completeStepAndAdvance("skipped_notifications")}
                                    className="w-full rounded-full border border-white/12 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/8"
                                >
                                    Skip for now
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
                                    Taste your unwrapped KandyDrops and earn free Gum Drops. You now have <span className="font-bold text-white">100 Gum Drops</span> waiting for your first unwrap.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={completeOnboarding}
                                disabled={isCompleting}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCompleting ? "Finishing..." : "Finish onboarding"}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : null}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
