"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { redirect } from "next/navigation";
import { Loader2, Package, Star, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { user, userProfile, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            redirect("/");
        }
    }, [user, loading]);

    // Skeleton UI
    if (loading) {
        return (
            <main className="min-h-screen pt-24 px-4 pb-24 md:pb-12 max-w-7xl mx-auto animate-pulse">
                <header className="mb-8 md:mb-12">
                    <div className="h-10 w-3/4 md:w-1/2 bg-white/10 rounded-xl mb-4" />
                    <div className="h-5 w-1/3 bg-white/5 rounded-lg" />
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6 md:space-y-8">
                        <div className="h-64 bg-white/5 rounded-3xl" /> {/* Check-In Skeleton */}
                        <div className="h-40 bg-white/5 rounded-3xl" /> {/* Stats Skeleton */}
                    </div>
                    <div className="lg:col-span-2">
                        <div className="h-[400px] bg-white/5 rounded-3xl" /> {/* Collection Skeleton */}
                    </div>
                </div>
            </main>
        );
    }

    if (!user) return null; // Handled by redirect

    return (
        <main className="min-h-screen pt-24 px-4 pb-24 md:pb-12 max-w-7xl mx-auto">
            <header className="mb-8 md:mb-12">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Welcome back, {userProfile?.displayName || "Collector"}</h1>
                <p className="text-gray-400">Manage your collection and earn rewards.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Daily Rewards & Stats */}
                <div className="space-y-6 md:space-y-8">
                    <DailyCheckIn />

                    {/* Quick Stats */}
                    <div className="glass-panel p-6 rounded-3xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-brand-yellow" /> Your Stats
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-2xl font-bold text-brand-pink">{userProfile?.gumDropsBalance || 0}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold">Gum Drops</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-2xl font-bold text-brand-cyan">{userProfile?.unlockedContent?.length || 0}</div>
                                <div className="text-xs text-gray-500 uppercase font-bold">Unlocked</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Collection / Activity */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Placeholder for "My Collection" or "Recent Drops" */}
                    <div className="glass-panel p-8 rounded-3xl min-h-[400px] flex flex-col items-center justify-center text-center">
                        <Package className="w-16 h-16 text-white/10 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Your Collection</h2>
                        <p className="text-gray-400 mb-6 max-w-sm">
                            You haven't unlocked any drops yet. Use your Gum Drops to unlock exclusive content!
                        </p>
                        <Link
                            href="/#drops"
                            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center gap-2"
                        >
                            Browse Drops <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
