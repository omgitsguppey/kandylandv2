import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { ChevronRight, BellRing, Sparkles, Droplets, Flame, Gift } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";
import { toast } from "sonner";

type HighlightRect = {
    top: number;
    left: number;
    width: number;
    height: number;
    rx?: number;
};

type GuidedStepConfig = {
    path?: string;
    page?: string;
    targetSelectors: string[];
    scrollMode: "top" | "target";
};

const GUIDED_STEP_CONFIG: Partial<Record<number, GuidedStepConfig>> = {
    1: {
        path: "/dashboard",
        page: "dashboard",
        targetSelectors: [
            '[data-onboarding-target="daily-reward-claim"]',
            '[data-onboarding-target="daily-reward"]',
        ],
        scrollMode: "target",
    },
    2: {
        path: "/drops",
        page: "drops",
        targetSelectors: ['[data-onboarding-target="drops-nav"]'],
        scrollMode: "top",
    },
    3: {
        path: "/experiences",
        page: "experiences",
        targetSelectors: ['[data-onboarding-target="experiences-nav"]'],
        scrollMode: "top",
    },
    4: {
        path: "/experiences",
        page: "experiences",
        targetSelectors: ['[data-onboarding-target="notification-bell"]'],
        scrollMode: "top",
    },
};

const SCROLL_KEYS = new Set([" ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"]);

function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function GuidedOnboarding() {
    const { user, userProfile: profile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const completionStorageKey = user ? `kandydrops_onboarding_completed_${user.uid}` : null;

    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepData, setStepData] = useState({
        username: "",
        preference: ""
    });
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [mountTime, setMountTime] = useState(0);
    const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
    const allowedScrollYRef = useRef(0);
    const isProgrammaticScrollRef = useRef(false);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyOverscroll = document.body.style.overscrollBehavior;
        allowedScrollYRef.current = window.scrollY;

        const preventScroll = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-guided-scroll-allow="true"]')) {
                return;
            }

            event.preventDefault();
        };

        const preventScrollKeys = (event: KeyboardEvent) => {
            if (!SCROLL_KEYS.has(event.key)) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName;
            const isEditable = target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";

            if (isEditable || target?.closest('[data-guided-scroll-allow="true"]')) {
                return;
            }

            event.preventDefault();
        };

        const enforceLockedScroll = () => {
            if (isProgrammaticScrollRef.current) {
                return;
            }

            if (Math.abs(window.scrollY - allowedScrollYRef.current) > 1) {
                window.scrollTo({ top: allowedScrollYRef.current, left: 0, behavior: "instant" as ScrollBehavior });
            }
        };

        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.overscrollBehavior = "none";
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";

        window.addEventListener("wheel", preventScroll, { passive: false });
        window.addEventListener("touchmove", preventScroll, { passive: false });
        window.addEventListener("keydown", preventScrollKeys, { passive: false });
        window.addEventListener("scroll", enforceLockedScroll, { passive: true });

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.overscrollBehavior = previousBodyOverscroll;
            window.removeEventListener("wheel", preventScroll);
            window.removeEventListener("touchmove", preventScroll);
            window.removeEventListener("keydown", preventScrollKeys);
            window.removeEventListener("scroll", enforceLockedScroll);
        };
    }, [isVisible]);

    // Initial trigger
    useEffect(() => {
        if (!user || !profile) return;

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

                if (cancelled) return;

                if (legacyCompleted) {
                    if (completionStorageKey) {
                        window.localStorage.setItem(completionStorageKey, "true");
                    }
                    await setDoc(doc(db, "users", user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => { });
                    setIsVisible(false);
                    return;
                }

                if (profile.username && !isVisible) {
                    setMountTime(Date.now());
                    setIsVisible(true);
                }
            } catch {
                if (!cancelled && profile.username && !isVisible) {
                    setMountTime(Date.now());
                    setIsVisible(true);
                }
            }
        };

        hydrateLegacyCompletion();

        return () => {
            cancelled = true;
        };
    }, [completionStorageKey, isVisible, profile, user]);

    const scrollViewportForStep = useCallback((element: HTMLElement, stepConfig: GuidedStepConfig) => {
        const targetTop = stepConfig.scrollMode === "top"
            ? 0
            : Math.max(window.scrollY + element.getBoundingClientRect().top - 112, 0);

        allowedScrollYRef.current = targetTop;
        isProgrammaticScrollRef.current = true;
        window.scrollTo({ top: targetTop, left: 0, behavior: "instant" as ScrollBehavior });
        window.setTimeout(() => {
            isProgrammaticScrollRef.current = false;
        }, 150);
    }, []);

    const updateHighlight = useCallback((attempt = 0) => {
        if (!isVisible || currentStep < 1 || currentStep > 4) {
            setHighlightRect(null);
            return;
        }

        const stepConfig = GUIDED_STEP_CONFIG[currentStep];
        if (!stepConfig) {
            setHighlightRect(null);
            return;
        }

        if (stepConfig.path && pathname !== stepConfig.path) {
            setHighlightRect(null);
            return;
        }

        if (stepConfig.page && !document.querySelector(`[data-onboarding-page="${stepConfig.page}"]`)) {
            if (attempt < 12) {
                window.setTimeout(() => updateHighlight(attempt + 1), 120);
            }
            return;
        }

        const element = stepConfig.targetSelectors
            .map((selector) => document.querySelector(selector))
            .find((candidate): candidate is HTMLElement => candidate instanceof HTMLElement);

        if (!element) {
            if (attempt < 12) {
                window.setTimeout(() => updateHighlight(attempt + 1), 120);
            } else {
                setHighlightRect(null);
            }
            return;
        }

        scrollViewportForStep(element, stepConfig);

        window.requestAnimationFrame(() => {
            const rect = element.getBoundingClientRect();

            if (rect.width <= 0 || rect.height <= 0) {
                if (attempt < 12) {
                    window.setTimeout(() => updateHighlight(attempt + 1), 120);
                } else {
                    setHighlightRect(null);
                }
                return;
            }

            const targetId = element.dataset.onboardingTarget || "";
            const numericRadius = Number(element.dataset.onboardingRadius);

            setHighlightRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                rx: Number.isFinite(numericRadius)
                    ? numericRadius
                    : targetId.includes("nav") || targetId === "notification-bell"
                        ? 999
                        : 24,
            });
        });
    }, [currentStep, isVisible, pathname, scrollViewportForStep]);

    useEffect(() => {
        updateHighlight();
        const handleResize = () => updateHighlight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [updateHighlight]);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const expectedPath = GUIDED_STEP_CONFIG[currentStep]?.path;
        if (expectedPath && pathname !== expectedPath) {
            setHighlightRect(null);
            router.replace(expectedPath);
        }
    }, [isVisible, pathname, currentStep, router]);

    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleCheckInAndContinue = async () => {
        setIsCheckingIn(true);
        try {
            const claimButton = document.querySelector('[data-onboarding-target="daily-reward-claim"]') as HTMLButtonElement | null;
            const rewardCard = document.querySelector('[data-onboarding-target="daily-reward"]');

            if (!claimButton || claimButton.disabled) {
                if (rewardCard && profile?.lastCheckIn) {
                    toast.info("Today's reward is already claimed. Continuing the tour.");
                    await wait(250);
                    setCurrentStep(2);
                    return;
                }

                throw new Error("The daily check-in card is still loading. Please try again in a moment.");
            }

            await new Promise<void>((resolve, reject) => {
                const handleGuidedCheckIn = (event: Event) => {
                    const detail = (event as CustomEvent<{ status?: string; message?: string }>).detail;

                    cleanup();

                    if (detail?.status === "success" || detail?.status === "already-claimed") {
                        resolve();
                        return;
                    }

                    reject(new Error(detail?.message || "Daily check-in failed."));
                };

                const cleanup = () => {
                    window.clearTimeout(timeoutId);
                    window.removeEventListener("kandydrops:guided-checkin", handleGuidedCheckIn as EventListener);
                };

                const timeoutId = window.setTimeout(() => {
                    cleanup();
                    reject(new Error("Daily check-in timed out. Please try again."));
                }, 8000);

                window.addEventListener("kandydrops:guided-checkin", handleGuidedCheckIn as EventListener);
                claimButton.click();
            });

            await wait(500);
            setCurrentStep(2);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to complete daily check-in.";
            toast.error(message);
            updateHighlight();
        } finally {
            setIsCheckingIn(false);
        }
    };

    const completeOnboarding = async () => {
        if (!user || isCompleting) return;
        setIsCompleting(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch("/api/user/complete-onboarding", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result?.error === "string" ? result.error : "Failed to complete onboarding.");
            }

            try {
                await setDoc(doc(db, "users", user.uid), {
                    preferences: { flavor: stepData.preference || "Sweet" },
                    onboardingCompleted: true,
                }, { merge: true });
            } catch (syncError) {
                console.error("Error syncing onboarding preferences:", syncError);
            }

            if (completionStorageKey) {
                window.localStorage.setItem(completionStorageKey, "true");
            }

            // Track completion event with duration
            const durationSeconds = mountTime ? Math.round((Date.now() - mountTime) / 1000) : 0;
            try {
                trackEvent("guided_onboarding_completed", { durationSeconds });
            } catch (e) { }

            setIsVisible(false);
            router.replace('/drops');
            window.location.replace('/drops');
            return;
        } catch (error) {
            console.error("Error completing onboarding:", error);
            setIsVisible(false); // Failsafe close
        } finally {
            setIsCompleting(false);
        }
    };

    if (!isVisible) return null;

    // Spotlight rendering params
    const isMobileViewport = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
    const spotlightPadding = isMobileViewport ? 10 : 16;
    const ch = typeof window !== 'undefined' ? window.innerHeight : 1000;

    // Dynamic Clip-Path for the blurred backdrop
    const clipPathStyle = highlightRect ? {
        clipPath: `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
            ${highlightRect.left - spotlightPadding}px 0%,
            ${highlightRect.left - spotlightPadding}px ${highlightRect.top - spotlightPadding}px,
            ${highlightRect.left + highlightRect.width + spotlightPadding}px ${highlightRect.top - spotlightPadding}px,
            ${highlightRect.left + highlightRect.width + spotlightPadding}px ${highlightRect.top + highlightRect.height + spotlightPadding}px,
            ${highlightRect.left - spotlightPadding}px ${highlightRect.top + highlightRect.height + spotlightPadding}px,
            ${highlightRect.left - spotlightPadding}px 0%
        )`
    } : {};

    return (
        <div className="fixed inset-0 z-[100] pointer-events-auto overflow-hidden flex items-center justify-center">

            {/* Blurred Backdrop - Full screen when no highlight, punched out when highlight exists */}
            {highlightRect ? (
                // Use a standard radial knockout or polygon path for true masking
                <motion.div
                    className="absolute inset-0 bg-black/50 backdrop-blur-md transition-all duration-500 ease-in-out"
                    style={clipPathStyle}
                />
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-700"
                />
            )}

            {/* Glowing Lavender Ring */}
            <AnimatePresence>
                {highlightRect && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="absolute border-[3px] border-[#E6E6FA] pointer-events-none shadow-[0_0_25px_rgba(230,230,250,0.6)] z-10"
                        style={{
                            top: highlightRect.top - spotlightPadding,
                            left: highlightRect.left - spotlightPadding,
                            width: highlightRect.width + spotlightPadding * 2,
                            height: highlightRect.height + spotlightPadding * 2,
                            borderRadius: highlightRect.rx || highlightRect.height / 2,
                        }}
                    >
                        {/* Inner pulse */}
                        <div className="absolute inset-0 rounded-inherit ring-4 ring-[#E6E6FA]/20 animate-pulse" style={{ borderRadius: 'inherit' }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tooltip & Content Positioning */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <AnimatePresence mode="wait">

                    {/* STEP 1: Flavor Curating */}
                    {currentStep === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
                            <motion.div
                                key="step0"
                                data-guided-scroll-allow="true"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(10px)" }}
                                transition={{ duration: 0.4 }}
                                className="glass-panel p-5 md:p-6 rounded-3xl w-[92%] sm:w-[90%] max-w-sm max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl border border-white/10 relative pointer-events-auto bg-black/80 backdrop-blur-xl"
                            >
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">Curate Your Cravings</h2>
                                <p className="text-gray-400 text-xs sm:text-sm mb-5 text-center leading-relaxed">Customize your experience to see the drops you desire most.</p>

                                <div className="space-y-2 mb-5">
                                    <button
                                        onClick={() => setStepData({ ...stepData, preference: "Sweet" })}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all group flex items-start gap-4 ${stepData.preference === "Sweet" ? "bg-pink-500/10 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                                    >
                                        <div className={`p-2.5 rounded-full ${stepData.preference === "Sweet" ? "bg-pink-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-sm ${stepData.preference === "Sweet" ? "text-pink-400" : "text-white"}`}>Sweet</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Light, playful, and elegantly teasing.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setStepData({ ...stepData, preference: "Spicy" })}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all group flex items-start gap-4 ${stepData.preference === "Spicy" ? "bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)]" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                                    >
                                        <div className={`p-2.5 rounded-full ${stepData.preference === "Spicy" ? "bg-orange-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                            <Flame className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-sm ${stepData.preference === "Spicy" ? "text-orange-400" : "text-white"}`}>Spicy</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Bold, provocative, and highly charged.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setStepData({ ...stepData, preference: "RAW" })}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all group flex items-start gap-4 ${stepData.preference === "RAW" ? "bg-red-500/10 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                                    >
                                        <div className={`p-2.5 rounded-full ${stepData.preference === "RAW" ? "bg-red-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                            <Droplets className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-sm ${stepData.preference === "RAW" ? "text-red-400" : "text-white"}`}>RAW</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Unfiltered, intense, unrestrained excitement.</p>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={!stepData.preference}
                                    className="w-full py-4 rounded-2xl bg-[#E6E6FA] text-black font-extrabold shadow-[0_0_20px_rgba(230,230,250,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    Continue <ChevronRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        </div>
                    )}

                            {/* STEP 5: Completion & Reward */}
                    {currentStep === 5 && (
                        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
                            <motion.div
                                key="step5"
                                data-guided-scroll-allow="true"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(10px)" }}
                                transition={{ duration: 0.4 }}
                                className="glass-panel p-6 sm:p-8 rounded-3xl w-[92%] sm:w-[90%] max-w-sm max-h-[85vh] overflow-y-auto custom-scrollbar shadow-[0_0_50px_rgba(236,72,153,0.3)] border border-pink-500/30 relative pointer-events-auto bg-black/95 backdrop-blur-2xl text-center"
                            >
                                <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-pink-500/30 animate-pulse">
                                    <Gift className="w-10 h-10 text-pink-400" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-purple-400 mb-4 tracking-tight">You're All Set!</h2>
                                <p className="text-gray-300 text-sm sm:text-base mb-2 leading-relaxed font-medium">We've given you <b className="text-pink-400 text-lg">50 Gumdrops</b> to get you started!</p>
                                <p className="text-gray-400 text-xs sm:text-sm mb-8 leading-relaxed">Dive into the Drops feed to unlock your first exclusive experience.</p>

                                <button
                                    onClick={completeOnboarding}
                                    disabled={isCompleting}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-purple to-pink-500 text-white font-extrabold text-lg shadow-[0_0_20px_rgba(236,72,153,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    {isCompleting ? "Finishing..." : "Unwrap KandyDrops"} <ChevronRight className="w-6 h-6" />
                                </button>
                            </motion.div>
                        </div>
                    )}

                    {/* DYNAMIC HIGHLIGHT TOOLTIPS (Steps 1-4) */}
                    {currentStep > 0 && currentStep < 5 && (!GUIDED_STEP_CONFIG[currentStep]?.path || pathname === GUIDED_STEP_CONFIG[currentStep]?.path) && (
                        <motion.div
                            key={`tooltip-${currentStep}`}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: 0.3, type: "spring", damping: 25 }}
                            style={{
                                position: "absolute",
                                left: `${Math.max((((typeof window !== "undefined" ? window.innerWidth : 393) * 0.92) > 340
                                    ? ((typeof window !== "undefined" ? window.innerWidth : 393) - 340) / 2
                                    : ((typeof window !== "undefined" ? window.innerWidth : 393) * 0.04)), 12)}px`,
                                width: `${Math.min((typeof window !== "undefined" ? window.innerWidth : 393) * 0.92, 340)}px`,
                                top: isMobileViewport
                                    ? "auto"
                                    : !highlightRect || currentStep === 4
                                    ? `${Math.max((ch - 260) / 2, 24)}px`
                                    : highlightRect.top < ch / 2
                                        ? highlightRect.top + highlightRect.height + 40
                                        : highlightRect.top - 240,
                                bottom: isMobileViewport ? "calc(env(safe-area-inset-bottom) + 5.5rem)" : "auto",
                            }}
                            className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/20 shadow-2xl text-center z-50 bg-black/95 backdrop-blur-2xl pointer-events-auto"
                        >
                            {currentStep === 1 && (
                                <>
                                    <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-pink-500/30">
                                        <Gift className="w-6 h-6 text-pink-400" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">The Daily Ritual</h3>
                                    <p className="text-xs sm:text-sm text-gray-300 mb-5 leading-relaxed">Consistency pays off. Stack free <b>Gum Drops</b> to spend on premium unwraps without spending real cash. Claim your first drop right now to continue!</p>
                                </>
                            )}
                            {currentStep === 2 && (
                                <>
                                    <div className="w-12 h-12 bg-[#E6E6FA]/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#E6E6FA]/30">
                                        <Sparkles className="w-6 h-6 text-[#E6E6FA]" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">The Hunt Begins</h3>
                                    <p className="text-xs sm:text-sm text-gray-300 mb-5 leading-relaxed">This is where the magic lives. Dive into the <b>Drops</b> tab to unwrap and watch your exclusive, limited-edition content.</p>
                                </>
                            )}
                            {currentStep === 3 && (
                                <>
                                    <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-orange-500/30">
                                        <Flame className="w-6 h-6 text-orange-400" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">More ways to Unwrap</h3>
                                    <p className="text-xs sm:text-sm text-gray-300 mb-5 leading-relaxed">Experiences are a way to connect with your favorite creators and earn <b>free gumdrops</b> to unwrap more exclusive content.</p>
                                </>
                            )}
                            {currentStep === 4 && (
                                <>
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
                                        <BellRing className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Don't miss out!</h3>
                                    <p className="text-xs sm:text-sm text-gray-300 mb-5 leading-relaxed">Enable notifications so you catch new drops the moment they go live and never miss a limited release.</p>
                                </>
                            )}

                            {currentStep === 1 ? (
                                <button
                                    onClick={handleCheckInAndContinue}
                                    disabled={isCheckingIn}
                                    className="w-full py-3.5 rounded-xl bg-brand-purple text-white font-extrabold active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50"
                                >
                                    {isCheckingIn ? "Checking In..." : "Check In & Continue"} <ChevronRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="w-full py-3.5 rounded-xl bg-[#E6E6FA] text-black font-extrabold active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(230,230,250,0.3)]"
                                >
                                    {currentStep === 4 ? "Got it!" : "Got it!"} <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
