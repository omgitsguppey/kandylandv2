"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { CollectionList } from "@/components/Dashboard/CollectionList";
import { redirect } from "next/navigation";
import { CandyOutlineIcon as Loader2, CandyOutlineIcon as Package, CandyOutlineIcon as Star, CandyOutlineIcon as ArrowRight } from "@/components/ui/Icon";

import Link from "next/link";

import { Drop } from "@/types/db";

interface DashboardClientProps {
    drops: Drop[];
}

export default function DashboardClient({ drops }: DashboardClientProps) {
    const { user, userProfile, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            redirect("/");
        }
    }, [user, loading]);

    // Skeleton UI
    if (loading) {
        return (
            <main className="min-h-screen pt-24 px-4 pb-24 md:pb-12 max-w-7xl mx-auto">
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
        <div className="w-full px-4 pb-32 md:pb-12 max-w-7xl mx-auto">
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
                            <Star className="w-5 h-5 text-brand-purple" /> Your Stats
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
                <div className="lg:col-span-2">
                    <CollectionList drops={drops} userProfile={userProfile} />
                </div>
            </div>
        </div>
    );
}
