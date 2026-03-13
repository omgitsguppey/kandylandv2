"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { CollectionList } from "@/components/Dashboard/CollectionList";
import { RecentActivityFeed } from "@/components/Dashboard/RecentActivityFeed";
import { Star } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";

import { Drop } from "@/types/db";

interface DashboardClientProps {
    drops: Drop[];
}

export default function DashboardClient({ drops }: DashboardClientProps) {
    const { user, userProfile, loading } = useAuth();

    useEffect(() => {
        if (!userProfile) {
            return;
        }

        trackEvent("dashboard_viewed");
    }, [userProfile]);

    // Skeleton UI while waiting for profile data (auth is already guarded by layout.tsx)
    if (loading || !userProfile) {
        return (
            <div className="w-full px-3 sm:px-4 max-w-7xl mx-auto">
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
            </div>
        );
    }

    return (
        <div className="w-full px-3 sm:px-4 max-w-7xl mx-auto" data-onboarding-page="dashboard">
            <header className="mb-4 md:mb-6">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">Welcome back, {userProfile?.displayName?.split(" ")[0] || "Collector"}</h1>
                <p className="text-sm sm:text-base text-gray-400">Manage your collection and earn rewards.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
                {/* Left Column: Daily Rewards & Stats */}
                <div className="space-y-6 md:space-y-8">
                    <DailyCheckIn />

                    {/* Quick Stats */}
                    <div className="glass-panel p-4 md:p-6 rounded-3xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-brand-purple" /> Your Stats
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                                <span className="text-xs md:text-sm text-gray-500 uppercase font-bold">Gum Drops</span>
                                <span className="text-lg md:text-xl font-bold text-brand-purple">{userProfile?.gumDropsBalance || 0}</span>
                            </div>
                            <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                                <span className="text-xs md:text-sm text-gray-500 uppercase font-bold">Unlocked</span>
                                <span className="text-lg md:text-xl font-bold text-brand-purple">{userProfile?.unlockedContent?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    <RecentActivityFeed />
                </div>

                {/* Right Column: Collection / Activity */}
                <div className="lg:col-span-2">
                    <CollectionList drops={drops} userProfile={userProfile} />
                </div>
            </div>
        </div>
    );
}
