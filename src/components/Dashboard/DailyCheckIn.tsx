"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, serverTimestamp, addDoc, collection, writeBatch } from "firebase/firestore";
import { differenceInHours, isSameDay } from "date-fns";
import { Gift, Loader2, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export function DailyCheckIn() {
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [claimed, setClaimed] = useState(false);

    if (!user || !userProfile) return null;

    const now = Date.now();
    const lastCheckIn = userProfile.lastCheckIn || 0;
    const currentStreak = userProfile.streakCount || 0;

    // Logic:
    // 1. Can claim if last check-in was NOT today.
    // 2. Streak continues if last check-in was yesterday (or today).
    // 3. Streak resets if last check-in was before yesterday.

    const isAlreadyClaimedToday = isSameDay(lastCheckIn, now);

    // Calculate potential streak for TODAY/NEXT CLAIM
    let nextStreak = currentStreak + 1;

    // Check if streak was broken (more than 24h + buffer since last claim, effectively if filtered by day)
    // Simple logic: if difference in days > 1, reset.
    // Actually, simpler: if (now - lastCheckIn) > 48 hours, it's definitely broken.
    // But precise "yesterday" check is better.
    const hoursSinceLast = differenceInHours(now, lastCheckIn);

    if (hoursSinceLast > 48 && lastCheckIn !== 0) {
        nextStreak = 1; // Reset streak
    }

    // Cap streak visual/reward at 7
    const displayStreak = Math.min(nextStreak, 7);
    const rewardAmount = displayStreak * 10; // 10, 20, ..., 70

    const handleClaim = async () => {
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);

            // Determine actual streak to save
            // If claiming today, and it wasn't broken, it's current + 1.
            // If broken, it's 1.
            // We already calculated 'nextStreak' based on time expectation.
            // Wait, if users checks in Day 1 (Streak 1), Day 2 (Streak 2)...
            // If they miss Day 3, and check in Day 4.
            // hoursSinceLast would be > 48. So nextStreak = 1. Correct.

            // Reset after 7 days? User said "resets back to 10" (Day 1).
            // So if currentStreak was 7, nextStreak would be 8 -> Reset to 1?
            // "up to 70 total... then resets back to 10".
            // So if they just claimed Day 7 (70), the NEXT day (Day 8) should be Day 1 (10).
            let finalStreak = nextStreak;
            if (currentStreak >= 7 && !isAlreadyClaimedToday) {
                finalStreak = 1;
            }

            const finalReward = finalStreak * 10;

            const batch = writeBatch(db);

            // 1. Update User Profile
            batch.update(userRef, {
                gumDropsBalance: increment(finalReward),
                lastCheckIn: now,
                streakCount: finalStreak
            });

            // 2. Create Transaction Record
            const transactionRef = doc(collection(db, "transactions"));
            batch.set(transactionRef, {
                userId: user.uid,
                type: "purchase_currency", // Earning
                amount: finalReward,
                description: `Daily Check-in: Day ${finalStreak}`,
                timestamp: serverTimestamp()
            });

            // Commit Batch
            await batch.commit();

            // Analytics
            if (typeof window !== "undefined") {
                import("firebase/analytics").then(({ getAnalytics, logEvent }) => {
                    const analytics = getAnalytics();
                    logEvent(analytics, "earn_virtual_currency", {
                        virtual_currency_name: "Gum Drops",
                        value: finalReward
                    });
                });
            }

            toast.success(`Claimed ${finalReward} Gum Drops!`, {
                description: `Streak: ${finalStreak} days`,
                icon: "🎁"
            });

            // Trigger "School Pride" side cannons
            const end = Date.now() + 1000;
            const colors = ['#ec4899', '#facc15'];

            (function frame() {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

            setClaimed(true);
        } catch (error) {
            console.error("Error claiming daily reward:", error);
            toast.error("Failed to claim reward");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/10 rounded-full blur-[50px] pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Gift className="w-6 h-6 text-brand-pink" /> Daily Rewards
                        </h2>
                        <p className="text-gray-400 text-sm">Check in daily to earn Gum Drops!</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-brand-yellow">{isAlreadyClaimedToday ? currentStreak : (displayStreak > 7 ? 1 : displayStreak)}<span className="text-base text-gray-500">/7</span></div>
                        <div className="text-xs text-brand-yellow font-bold uppercase tracking-wider">Day Streak</div>
                    </div>
                </div>

                {/* Week Visualization */}
                <div className="flex justify-between gap-1 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        // Determine state of each day dot
                        // If streak is 3: Days 1, 2, 3 are filled.
                        // But we want to show progress.
                        // User's current streak is `currentStreak`.
                        // If claiming for tomorrow (nextStreak), visually it's the next one.
                        // Let's rely on 'currentStreak' from DB.

                        const isActive = day <= currentStreak;
                        const isToday = day === (currentStreak + (isAlreadyClaimedToday ? 0 : 1));
                        // Edge case: if streak > 7 (looping), simpler visualization needed or reset?
                        // We reset at 8.

                        return (
                            <div key={day} className="flex flex-col items-center gap-2 flex-1">
                                <div className={cn(
                                    "w-full h-1.5 rounded-full transition-all",
                                    isActive ? "bg-brand-pink shadow-[0_0_10px_#ec4899]" : "bg-white/10"
                                )} />
                                <span className={cn(
                                    "text-xs font-bold",
                                    isActive ? "text-white" : "text-gray-600"
                                )}>
                                    {day * 10}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {isAlreadyClaimedToday ? (
                    <div className="w-full py-4 rounded-xl bg-white/5 border border-white/5 text-center text-gray-400 font-medium flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-brand-green" />
                        Come back tomorrow for {((currentStreak >= 7 ? 1 : currentStreak + 1) * 10)} Drops!
                    </div>
                ) : (
                    <Button
                        variant="brand"
                        onClick={handleClaim}
                        disabled={loading}
                        className="w-full py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>Claim <span className="text-brand-yellow mx-1">{rewardAmount}</span> Gum Drops</>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
