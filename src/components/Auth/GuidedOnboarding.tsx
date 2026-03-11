"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { ChevronRight, BellRing, Sparkles, Droplets, Flame } from "lucide-react";

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

    const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

    // Initial trigger
    useEffect(() => {
        if (user && profile && profile.onboardingCompleted === false) {
            setIsVisible(true);
            if (profile.displayName && !stepData.username) {
                setStepData(s => ({ ...s, username: profile.displayName || "" }));
            }
        }
    }, [user, profile]);

    // Track targets dynamically based on the step
    const updateHighlight = useCallback(() => {
        if (!isVisible || currentStep < 2) {
            setHighlightRect(null);
            return;
        }

        let targetId = "";
        if (currentStep === 2) targetId = "drops-nav"; // Step 3: The Hunt
        else if (currentStep === 3) targetId = "daily-reward"; // Step 4: Daily Ritual
        else if (currentStep === 4) targetId = "experiences-nav"; // Step 5: Scarcity & Experiences

        if (targetId) {
            // Must delay slightly for DOM rendering
            setTimeout(() => {
                const element = document.querySelector(`[data-onboarding-target="${targetId}"]`);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setHighlightRect({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        rx: targetId.includes('nav') ? 100 : 24 // Circle for nav, rounded rect for card
                    });
                    // scroll into view
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        if (isVisible && pathname !== '/dashboard' && currentStep >= 2) {
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

    const completeOnboarding = async () => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "profile"), {
                onboardingCompleted: true,
                displayName: stepData.username || profile?.displayName || "New Collector",
                preferences: { flavor: stepData.preference }
            });
            setIsVisible(false);
        } catch (error) {
            console.error("Error completing onboarding:", error);
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    // Spotlight rendering params
    const spotlightPadding = 12;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-auto overflow-hidden">
            {/* Base Backdrop Blur Layer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-700"
            />

            {/* Subtractive Spotlight Ring */}
            <AnimatePresence>
                {highlightRect && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                        <defs>
                            <mask id="spotlight-mask">
                                <rect width="100%" height="100%" fill="white" />
                                <motion.rect
                                    animate={{
                                        x: highlightRect.left - spotlightPadding,
                                        y: highlightRect.top - spotlightPadding,
                                        width: highlightRect.width + spotlightPadding * 2,
                                        height: highlightRect.height + spotlightPadding * 2,
                                    }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    rx={highlightRect.rx || highlightRect.height / 2}
                                    fill="black"
                                />
                            </mask>
                        </defs>
                        {/* Dimmer overlay that gets punched out */}
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#spotlight-mask)" />

                        {/* Glowing ring stroke */}
                        <motion.rect
                            animate={{
                                x: highlightRect.left - spotlightPadding,
                                y: highlightRect.top - spotlightPadding,
                                width: highlightRect.width + spotlightPadding * 2,
                                height: highlightRect.height + spotlightPadding * 2,
                            }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            rx={highlightRect.rx || highlightRect.height / 2}
                            fill="none"
                            stroke="rgba(217, 70, 239, 0.8)" /* Brand purple */
                            strokeWidth="3"
                            className="shadow-[0_0_20px_rgba(217,70,239,0.5)] drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] filter"
                        />
                    </svg>
                )}
            </AnimatePresence>

            <div className="absolute inset-0 flex items-center justify-center p-4" style={{ zIndex: 20 }}>
                <AnimatePresence mode="wait">
                    {currentStep === 0 && (
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(10px)" }}
                            transition={{ duration: 0.4 }}
                            className="glass-panel p-8 rounded-[2rem] max-w-sm w-full mx-auto shadow-2xl border border-white/10 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 to-transparent opacity-50 pointer-events-none" />
                            <h2 className="text-3xl font-bold text-white mb-2 relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">Welcome.</h2>
                            <p className="text-gray-400 text-sm mb-8 relative z-10 leading-relaxed">Before we begin the hunt for KandyDrops, what should we call you in the vault?</p>

                            <input
                                type="text"
                                placeholder="Choose your Username"
                                value={stepData.username}
                                onChange={(e) => setStepData({ ...stepData, username: e.target.value })}
                                maxLength={20}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold mb-6 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple shadow-inner transition-all relative z-10"
                            />

                            <button
                                onClick={handleNext}
                                disabled={!stepData.username.trim()}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-purple to-pink-500 font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all relative z-10"
                            >
                                Enter Vault <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </motion.div>
                    )}

                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(10px)" }}
                            transition={{ duration: 0.4 }}
                            className="glass-panel p-8 rounded-[2rem] max-w-md w-full mx-auto shadow-2xl border border-white/10 relative overflow-hidden"
                        >
                            <h2 className="text-2xl font-bold text-white mb-2 text-center">Curate Your Cravings</h2>
                            <p className="text-gray-400 text-sm mb-8 text-center">Customize your experience to see the drops you desire most.</p>

                            <div className="space-y-4 mb-8">
                                <button
                                    onClick={() => setStepData({ ...stepData, preference: "Sweet" })}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all group flex items-start gap-4 ${stepData.preference === "Sweet" ? "bg-pink-500/10 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]" : "bg-black/40 border-white/10 hover:bg-white/5"}`}
                                >
                                    <div className={`p-3 rounded-full ${stepData.preference === "Sweet" ? "bg-pink-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${stepData.preference === "Sweet" ? "text-pink-400" : "text-white"}`}>Sweet</h3>
                                        <p className="text-xs text-gray-400 mt-1">Light, playful, and elegantly teasing content for a gentle rush.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setStepData({ ...stepData, preference: "Spicy" })}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all group flex items-start gap-4 ${stepData.preference === "Spicy" ? "bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)]" : "bg-black/40 border-white/10 hover:bg-white/5"}`}
                                >
                                    <div className={`p-3 rounded-full ${stepData.preference === "Spicy" ? "bg-orange-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                        <Flame className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${stepData.preference === "Spicy" ? "text-orange-400" : "text-white"}`}>Spicy</h3>
                                        <p className="text-xs text-gray-400 mt-1">Bold, provocative, and highly charged exclusive thrills.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setStepData({ ...stepData, preference: "RAW" })}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all group flex items-start gap-4 ${stepData.preference === "RAW" ? "bg-red-500/10 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "bg-black/40 border-white/10 hover:bg-white/5"}`}
                                >
                                    <div className={`p-3 rounded-full ${stepData.preference === "RAW" ? "bg-red-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                        <Droplets className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${stepData.preference === "RAW" ? "text-red-400" : "text-white"}`}>RAW</h3>
                                        <p className="text-xs text-gray-400 mt-1">Unfiltered, intense, completely unrestrained pure excitement.</p>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!stepData.preference}
                                className="w-full py-4 rounded-2xl bg-white text-black font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                            >
                                Continue <ChevronRight className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* Spotlight Tooltips */}
                    {highlightRect && currentStep > 1 && (
                        <motion.div
                            key={`tooltip-${currentStep}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: 0.2 }}
                            style={{
                                position: "absolute",
                                // Place tooltip dynamically relative to highlight box
                                top: highlightRect.top < window.innerHeight / 2
                                    ? highlightRect.top + highlightRect.height + 40
                                    : highlightRect.top - 200,
                                left: "50%",
                                width: "90%",
                                maxWidth: "340px",
                                transform: "translateX(-50%)"
                            }}
                            className="glass-panel p-6 rounded-3xl border border-white/20 shadow-2xl text-center z-50 bg-black/80 backdrop-blur-xl"
                        >
                            {currentStep === 2 && (
                                <>
                                    <div className="w-12 h-12 bg-brand-purple/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Sparkles className="w-6 h-6 text-brand-purple" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">The Hunt Begins</h3>
                                    <p className="text-sm text-gray-300 mb-6 leading-relaxed">This is where the magic lives. Dive into the <b>Drops</b> tab to unwrap limited-edition, exclusive content.</p>
                                </>
                            )}
                            {currentStep === 3 && (
                                <>
                                    <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Flame className="w-6 h-6 text-pink-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Daily Ritual</h3>
                                    <p className="text-sm text-gray-300 mb-6 leading-relaxed">Consistency pays off. Check in right here every day to stack free <b>Gum Drops</b> to spend on premium unwraps.</p>
                                </>
                            )}
                            {currentStep === 4 && (
                                <>
                                    <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <BellRing className="w-6 h-6 text-orange-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Absolute Scarcity</h3>
                                    <p className="text-sm text-gray-300 mb-6 leading-relaxed">Explore <b>Experiences</b> for VIP perks. But remember, Drops are fleeting. Once they're gone, they may never return. <span className="text-orange-400 font-bold block mt-2">Enable notifications below so you never miss a moment.</span></p>
                                </>
                            )}

                            <button
                                onClick={handleNext}
                                className="w-full py-3 rounded-xl bg-white text-black font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {currentStep === 4 ? "Finish & Enable Notifications" : "Got it!"} <ChevronRight className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
