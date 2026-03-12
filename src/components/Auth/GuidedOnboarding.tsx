import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { ChevronRight, BellRing, Sparkles, Droplets, Flame, Gift } from "lucide-react";

type HighlightRect = {
    top: number;
    left: number;
    width: number;
    height: number;
    rx?: number;
};

export function GuidedOnboarding() {
    const { user, userProfile: profile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepData, setStepData] = useState({
        username: "",
        preference: ""
    });
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    // Scroll Lock on Mount
    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [isVisible]);

    const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

    // Initial trigger
    useEffect(() => {
        if (user && profile && profile.onboardingCompleted !== true) {
            // Only trigger if they actually have a username (meaning OnboardingModal finished)
            if (profile.username) {
                setIsVisible(true);
            }
        }
    }, [user, profile]);

    // Track targets dynamically based on the step
    const updateHighlight = useCallback(() => {
        if (!isVisible || currentStep < 1) {
            setHighlightRect(null);
            return;
        }

        let targetId = "";
        if (currentStep === 1) targetId = "daily-reward"; // Step 2: Daily Check-in
        else if (currentStep === 2) targetId = "drops-nav"; // Step 3: Drops Tab
        else if (currentStep === 3) targetId = "experiences-nav"; // Step 4: Experiences (Scarcity)
        // Step 5 doesn't need a highlight (or can point to Notifications settings, assuming standard flow)

        if (targetId) {
            // Delay slightly for DOM rendering
            setTimeout(() => {
                const element = document.querySelector(`[data-onboarding-target="${targetId}"]`);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setHighlightRect({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        rx: targetId.includes('nav') ? 100 : 24
                    });
                    // scroll into view
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Fallback to null if element not found yet
                    setHighlightRect(null);
                }
            }, 300);
        } else {
            setHighlightRect(null);
        }
    }, [isVisible, currentStep]);

    useEffect(() => {
        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        return () => window.removeEventListener('resize', updateHighlight);
    }, [updateHighlight]);

    // Redirect logic to ensure they're on the dashboard where targets exist
    useEffect(() => {
        if (isVisible && pathname !== '/dashboard' && currentStep >= 1) {
            router.push('/dashboard');
        }
    }, [isVisible, pathname, currentStep, router]);

    const handleNext = () => {
        if (currentStep < 4) {
            setCurrentStep(prev => prev + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleCheckInAndContinue = async () => {
        setIsCheckingIn(true);
        try {
            // Attempt to check-in locally to satisfy the requirement
            // It uses the standard fetch interceptor or native fetch wrapper available in app
            // We use standard fetch with Authorization if authFetch is complex to import
            const token = await user?.getIdToken();
            if (token) {
                await fetch("/api/checkin", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error(error); // Proceed anyway if it fails to prevent arbitrary soft-locks
        } finally {
            setIsCheckingIn(false);
            handleNext();
        }
    };

    const completeOnboarding = async () => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "profile"), {
                onboardingCompleted: true,
                preferences: { flavor: stepData.preference || "Sweet" },
            });
            setIsVisible(false);
        } catch (error) {
            console.error("Error completing onboarding:", error);
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    // Spotlight rendering params
    const spotlightPadding = 16;
    const cw = typeof window !== 'undefined' ? window.innerWidth : 1000;
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

                    {/* DYNAMIC HIGHLIGHT TOOLTIPS (Steps 1-4) */}
                    {highlightRect && currentStep > 0 && (
                        <motion.div
                            key={`tooltip-${currentStep}`}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: 0.3, type: "spring", damping: 25 }}
                            style={{
                                position: "absolute",
                                // Dynamically place below or above the highlight depending on screen space
                                top: highlightRect.top < ch / 2
                                    ? highlightRect.top + highlightRect.height + 40
                                    : highlightRect.top - 240,
                                left: "50%",
                                width: "92%",
                                maxWidth: "340px",
                                transform: "translateX(-50%)"
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
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Absolute Scarcity</h3>
                                    <p className="text-xs sm:text-sm text-gray-300 mb-5 leading-relaxed">Drops are fleeting. <b className="text-[#E6E6FA]">Once they're gone, they may never return.</b> Enable notifications so you never miss a rush or experience.</p>
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
                                    {currentStep === 4 ? "Enable Notifications & Finish" : "Got it!"} <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
