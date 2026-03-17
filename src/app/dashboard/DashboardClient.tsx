"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { CollectionList } from "@/components/Dashboard/CollectionList";
import { useDrops } from "@/hooks/useDrops";
import { applyDropStatus, isDropActiveNow } from "@/lib/drop-status";
import { trackEvent } from "@/lib/telemetry";
import type { Drop } from "@/types/db";

const RecentActivityFeed = dynamic(
    () => import("@/components/Dashboard/RecentActivityFeed").then((mod) => mod.RecentActivityFeed),
    {
        loading: () => (
            <div className="glass-panel mt-6 rounded-3xl p-6 lg:mt-8">
                <div className="h-5 w-40 rounded-lg bg-white/10" />
                <div className="mt-4 h-24 rounded-2xl bg-white/5" />
            </div>
        ),
    },
);

interface DashboardClientProps {
    drops: Drop[];
}

const DASHBOARD_GREETING_VARIANTS = [
    "Back for another taste, {name}?",
    "We missed you, {name}!",
    "Wanna unwrap more Kandy, {name}?",
    "Welcome back to the Kandy Shop, {name}",
    "Glad to see you here, {name}",
];

export default function DashboardClient({ drops }: DashboardClientProps) {
    const { userProfile, loading } = useAuth();
    const [greetingTemplate] = useState(
        () => DASHBOARD_GREETING_VARIANTS[Math.floor(Math.random() * DASHBOARD_GREETING_VARIANTS.length)],
    );
    const initialActiveDrops = useMemo(() => drops.filter((drop) => isDropActiveNow(drop)), [drops]);
    const { drops: liveActiveDrops, nowMs } = useDrops(["active"], initialActiveDrops);
    const visibleDrops = useMemo(() => {
        const mergedDrops = new Map<string, Drop>();

        drops.forEach((drop) => {
            mergedDrops.set(drop.id, applyDropStatus(drop, nowMs));
        });

        liveActiveDrops.forEach((drop) => {
            mergedDrops.set(drop.id, applyDropStatus(drop, nowMs));
        });

        return Array.from(mergedDrops.values()).sort((a, b) => b.validFrom - a.validFrom);
    }, [drops, liveActiveDrops, nowMs]);

    useEffect(() => {
        if (!userProfile) {
            return;
        }

        trackEvent("dashboard_viewed");
    }, [userProfile]);

    if (loading || !userProfile) {
        return (
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-4">
                <header className="mb-8 md:mb-12">
                    <div className="mb-4 h-10 w-3/4 rounded-xl bg-white/10 md:w-1/2" />
                    <div className="h-5 w-1/3 rounded-lg bg-white/5" />
                </header>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="space-y-6 md:space-y-8">
                        <div className="h-64 rounded-3xl bg-white/5" />
                        <div className="h-40 rounded-3xl bg-white/5" />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="h-[400px] rounded-3xl bg-white/5" />
                    </div>
                </div>
            </div>
        );
    }

    const firstName = userProfile.displayName?.split(" ")[0] || "Collector";
    const greeting = greetingTemplate.replace("{name}", firstName);
    const greetingSizeClass = greeting.length > 34
        ? "text-[clamp(1.25rem,4vw,2.5rem)]"
        : "text-[clamp(1.5rem,4.6vw,3rem)]";

    return (
        <div id="dashboard-home" className="mx-auto w-full max-w-7xl px-3 sm:px-4" data-onboarding-page="dashboard">
            <header className="mb-4 md:mb-6">
                <h1 className={`mb-2 max-w-full whitespace-nowrap text-left font-bold leading-tight tracking-tight text-white ${greetingSizeClass}`}>
                    {greeting}
                </h1>
                <p className="text-sm text-gray-400 sm:text-base">Taste your unwrapped KandyDrops and earn free Gum Drops!</p>
            </header>

            <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-3">
                <div className="space-y-6 md:space-y-8">
                    <DailyCheckIn />

                    <div className="glass-panel rounded-3xl p-4 md:p-6">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                            <Star className="h-5 w-5 text-brand-purple" /> Your Stats
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-3 md:rounded-2xl md:p-4">
                                <span className="text-xs font-bold uppercase text-gray-500 md:text-sm">Gum Drops</span>
                                <span className="text-lg font-bold text-brand-purple md:text-xl">{userProfile.gumDropsBalance || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-3 md:rounded-2xl md:p-4">
                                <span className="text-xs font-bold uppercase text-gray-500 md:text-sm">Unlocked</span>
                                <span className="text-lg font-bold text-brand-purple md:text-xl">{userProfile.unlockedContent?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    <RecentActivityFeed />
                </div>

                <div className="lg:col-span-2">
                    <CollectionList drops={visibleDrops} userProfile={userProfile} currentTimeMs={nowMs} />
                </div>
            </div>
        </div>
    );
}
